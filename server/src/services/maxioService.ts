import {
  SubscriptionsController,
  CustomersController,
  SubscriptionComponentsController,
  ComponentsController,
  ProductFamiliesController,
  CreateSubscriptionRequest,
  CollectionMethod,
  ApiError,
  ErrorListResponseError,
} from '@maxio-com/advanced-billing-sdk';
import { getMaxioClient } from '../maxioClient';
import { CollectionMethod as AppCollectionMethod } from '../types';

export class MaxioError extends Error {
  constructor(
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'MaxioError';
  }
}

export function extractMaxioError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as Record<string, unknown>;

  // ErrorListResponseError — structured list of errors in .result.errors
  if (e instanceof ErrorListResponseError && e.result) {
    const r = e.result as Record<string, unknown>;
    if (Array.isArray(r['errors']) && (r['errors'] as string[]).length > 0) {
      return (r['errors'] as string[]).join(', ');
    }
  }

  // ApiError — try to parse the raw body string
  const rawBody = e['body'];
  if (typeof rawBody === 'string' && rawBody.length > 0) {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      if (Array.isArray(parsed['errors']) && (parsed['errors'] as string[]).length > 0) {
        return (parsed['errors'] as string[]).join(', ');
      }
      if (parsed['error']) return String(parsed['error']);
    } catch {
      return rawBody;
    }
  }

  // Some SDKs wrap the body as an object
  if (rawBody && typeof rawBody === 'object') {
    const b = rawBody as Record<string, unknown>;
    if (Array.isArray(b['errors']) && (b['errors'] as string[]).length > 0) {
      return (b['errors'] as string[]).join(', ');
    }
    if (b['error']) return String(b['error']);
  }

  // Fall back to .message, then full JSON dump
  if (typeof e['message'] === 'string' && e['message'].length > 0) return e['message'];
  try { return JSON.stringify(err); } catch { return '[unserializable error]'; }
}

export interface SubscriptionResult {
  subscriptionId: number;
  state: string;
  productName: string;
  productHandle: string;
  mrrCents: bigint;
  nextAssessmentAt: string | null;
  customerName: string;
  customerEmail: string;
  maxioUrl: string;
}

async function findCustomerIdByEmail(email: string): Promise<number | null> {
  try {
    const controller = new CustomersController(getMaxioClient());
    const response = await controller.listCustomers({ q: email, perPage: 5 });
    const customers = response.result ?? [];
    const match = customers.find((c) => c.customer?.email === email);
    return match?.customer?.id ?? null;
  } catch {
    return null;
  }
}

export async function createSubscription(params: {
  txnId: string;
  firstName: string;
  lastName: string;
  email: string;
  productHandle: string;
  collectionMethod: AppCollectionMethod;
  couponCode?: string;
}): Promise<SubscriptionResult> {
  const controller = new SubscriptionsController(getMaxioClient());

  const sdkCollectionMethod =
    params.collectionMethod === 'automatic'
      ? CollectionMethod.Automatic
      : CollectionMethod.Remittance;

  const existingCustomerId = await findCustomerIdByEmail(params.email);

  const body: CreateSubscriptionRequest = {
    subscription: {
      productHandle: params.productHandle,
      paymentCollectionMethod: sdkCollectionMethod,
      ...(existingCustomerId
        ? { customerId: existingCustomerId }
        : {
            customerAttributes: {
              firstName: params.firstName,
              lastName: params.lastName,
              email: params.email,
              // no reference — avoids uniqueness conflicts on retry
            },
          }),
      reference: params.txnId,   // unique per attempt
      ...(params.couponCode ? { couponCode: params.couponCode } : {}),
    },
  };

  let response;
  try {
    response = await controller.createSubscription(body);
  } catch (err) {
    if (err instanceof ApiError) {
      throw new MaxioError(extractMaxioError(err), String(err.body));
    }
    throw new MaxioError(extractMaxioError(err));
  }

  const sub = response.result?.subscription;
  if (!sub || !sub.id) {
    throw new MaxioError('Subscription created but no data returned');
  }

  return {
    subscriptionId: sub.id,
    state: sub.state ?? 'unknown',
    productName: sub.product?.name ?? params.productHandle,
    productHandle: sub.product?.handle ?? params.productHandle,
    mrrCents: sub.productPriceInCents ?? BigInt(0),
    nextAssessmentAt: sub.nextAssessmentAt ?? null,
    customerName: `${sub.customer?.firstName ?? params.firstName} ${sub.customer?.lastName ?? params.lastName}`,
    customerEmail: sub.customer?.email ?? params.email,
    maxioUrl: `https://app.chargify.com/subscriptions/${sub.id}`,
  };
}

// ─── Component ID cache (handle → numeric ID) ────────────────────────────────
// The SDK URL-encodes the colon in "handle:foo", causing 404s. We resolve
// handles to numeric IDs once and cache them for the process lifetime.

const componentIdCache = new Map<string, number>();

async function resolveComponentId(handle: string): Promise<number> {
  const cached = componentIdCache.get(handle);
  if (cached !== undefined) return cached;

  // Search all product families for the component — handles the case where a
  // component ended up in a non-metermate family due to seed URL-encoding bugs
  const familiesCtl = new ProductFamiliesController(getMaxioClient());
  const componentsCtl = new ComponentsController(getMaxioClient());

  const familiesResp = await familiesCtl.listProductFamilies({});
  const families = familiesResp.result ?? [];

  const found: string[] = [];
  for (const f of families) {
    const familyId = f.productFamily?.id;
    if (!familyId) continue;
    try {
      const componentsResp = await componentsCtl.listComponentsForProductFamily({ productFamilyId: familyId, perPage: 200 });
      for (const r of componentsResp.result ?? []) {
        const c = r.component;
        if (c?.handle && c.id !== undefined) {
          componentIdCache.set(c.handle, c.id);
          found.push(`${c.handle}=${c.id}(family=${f.productFamily?.handle ?? familyId})`);
        }
      }
    } catch { /* skip families we can't read */ }
  }
  console.log(`[maxioService] all components across all families: [${found.join(', ') || 'none'}]`);

  const resolved = componentIdCache.get(handle);
  if (resolved === undefined) {
    throw new MaxioError(`Component handle "${handle}" not found across any product family. Run the seed script.`);
  }
  return resolved;
}

// ─── UC2: Record Usage ────────────────────────────────────────────────────────

export interface UsageResult {
  quantity: number;
  componentHandle: string;
  memo: string | null;
  periodTotalQuantity: number;
}

export async function recordUsage(params: {
  subscriptionId: number;
  componentHandle: string;
  quantity: number;
  memo?: string;
}): Promise<UsageResult> {
  const controller = new SubscriptionComponentsController(getMaxioClient());

  // Resolve handle → numeric ID (SDK URL-encodes "handle:foo" causing 404)
  const componentNumericId = await resolveComponentId(params.componentHandle);

  let usageResult;
  try {
    usageResult = await controller.createUsage(params.subscriptionId, componentNumericId, {
      usage: {
        quantity: params.quantity,
        ...(params.memo ? { memo: params.memo } : {}),
      },
    });
  } catch (err) {
    console.error('[maxioService] createUsage raw error:', err);
    if (err instanceof ApiError) {
      throw new MaxioError(extractMaxioError(err), String(err.body));
    }
    throw new MaxioError(extractMaxioError(err));
  }

  const recorded = usageResult.result?.usage;
  if (!recorded) {
    throw new MaxioError('Usage recorded but no data returned');
  }

  // Sum all usage records for the current billing period to get the running total
  let periodTotal = 0;
  try {
    const listResp = await controller.listUsages({
      subscriptionIdOrReference: params.subscriptionId,
      componentId: componentNumericId,
      perPage: 200,
    });
    for (const r of listResp.result ?? []) {
      periodTotal += Number(r.usage?.quantity ?? 0);
    }
  } catch {
    // Non-fatal — period total stays at this report's quantity
    periodTotal = params.quantity;
  }

  return {
    quantity: params.quantity,
    componentHandle: params.componentHandle,
    memo: recorded.memo ?? null,
    periodTotalQuantity: periodTotal,
  };
}
