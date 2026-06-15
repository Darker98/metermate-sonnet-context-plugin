import {
  SubscriptionsController,
  CustomersController,
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
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e instanceof ErrorListResponseError && e.result) {
      const r = e.result as Record<string, unknown>;
      if (Array.isArray(r['errors'])) return (r['errors'] as string[]).join(', ');
    }
    if (typeof e['body'] === 'string') {
      try {
        const parsed = JSON.parse(e['body'] as string) as Record<string, unknown>;
        if (Array.isArray(parsed['errors'])) return (parsed['errors'] as string[]).join(', ');
        if (parsed['error']) return String(parsed['error']);
      } catch {
        return e['body'] as string;
      }
    }
    if (e['message']) return String(e['message']);
  }
  return String(err);
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
