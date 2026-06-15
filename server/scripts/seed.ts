/**
 * Seed script — creates the MeterMate product catalog in your Maxio test site.
 * Run: npx tsx scripts/seed.ts
 * Safe to run multiple times — skips anything already created.
 */

import 'dotenv/config';
import {
  Client,
  Environment,
  ProductFamiliesController,
  ProductsController,
  ComponentsController,
  IntervalUnit,
  PricingScheme,
  ApiError,
} from '@maxio-com/advanced-billing-sdk';

const apiKey = process.env.MAXIO_API_KEY;
const site = process.env.MAXIO_SITE_SUBDOMAIN;
const env = process.env.MAXIO_ENVIRONMENT;

if (!apiKey || !site) {
  console.error('MAXIO_API_KEY and MAXIO_SITE_SUBDOMAIN must be set in .env');
  process.exit(1);
}

const client = new Client({
  basicAuthCredentials: { username: apiKey, password: 'x' },
  timeout: 120_000,
  environment: env === 'EU' ? Environment.EU : Environment.US,
  site,
});

function extractErr(err: unknown): string {
  if (err instanceof ApiError) {
    return `HTTP ${err.statusCode}: ${typeof err.body === 'string' ? err.body : JSON.stringify(err.body)}`;
  }
  return String(err);
}

function isTaken(err: unknown): boolean {
  if (err instanceof ApiError && err.statusCode === 422) return true;
  return false;
}

async function ensureProductFamily(handle: string, name: string): Promise<number> {
  const ctl = new ProductFamiliesController(client);

  // Try creating first
  try {
    const res = await ctl.createProductFamily({
      productFamily: { name, handle, description: 'MeterMate consulting billing plans' },
    });
    const id = res.result?.productFamily?.id;
    if (!id) throw new Error('No id returned from createProductFamily');
    console.log(`  [created] Product family "${name}" (id=${id})`);
    return id;
  } catch (err) {
    if (!isTaken(err)) throw new Error(`Failed to create product family: ${extractErr(err)}`);
  }

  // Already exists — find it by handle
  const list = await ctl.listProductFamilies({});
  const match = (list.result ?? []).find((r) => r.productFamily?.handle === handle);
  const id = match?.productFamily?.id;
  if (!id) throw new Error(`Product family "${handle}" not found after 422`);
  console.log(`  [skip] Product family "${name}" already exists (id=${id})`);
  return id;
}

async function ensureProduct(
  familyHandle: string,
  handle: string,
  name: string,
  priceInCents: bigint,
  description: string
): Promise<void> {
  const ctl = new ProductsController(client);

  try {
    const existing = await ctl.readProductByHandle(handle);
    if (existing.result?.product?.id) {
      console.log(`  [skip] Product "${name}" already exists`);
      return;
    }
  } catch {
    // 404 → doesn't exist, create it
  }

  try {
    await ctl.createProduct(`handle:${familyHandle}`, {
      product: {
        name,
        handle,
        description,
        priceInCents,
        interval: 1,
        intervalUnit: IntervalUnit.Month,
        requireCreditCard: false,
      },
    });
    console.log(`  [created] Product "${name}" ($${Number(priceInCents) / 100}/mo)`);
  } catch (err) {
    if (isTaken(err)) {
      console.log(`  [skip] Product "${name}" handle already taken`);
      return;
    }
    throw new Error(`Failed to create product "${name}": ${extractErr(err)}`);
  }
}

async function ensureMeteredComponent(
  familyId: number,
  handle: string,
  name: string,
  unitName: string,
  unitPrice: string
): Promise<void> {
  const ctl = new ComponentsController(client);

  try {
    const existing = await ctl.readComponent(familyId, `handle:${handle}`);
    if (existing.result?.component?.id) {
      console.log(`  [skip] Component "${name}" already exists`);
      return;
    }
  } catch {
    // 404 → doesn't exist, create it
  }

  try {
    await ctl.createMeteredComponent(String(familyId), {
      meteredComponent: {
        name,
        handle,
        unitName,
        pricingScheme: PricingScheme.PerUnit,
        taxable: false,
        prices: [{ startingQuantity: 1, unitPrice }],
      },
    });
    console.log(`  [created] Component "${name}" ($${unitPrice}/${unitName})`);
  } catch (err) {
    if (isTaken(err)) {
      console.log(`  [skip] Component "${name}" handle already taken`);
      return;
    }
    throw new Error(`Failed to create component "${name}": ${extractErr(err)}`);
  }
}

async function main() {
  console.log(`\nSeeding Maxio site: ${site}\n`);

  console.log('→ Product family');
  const familyId = await ensureProductFamily('metermate', 'MeterMate');

  console.log('\n→ Products');
  await ensureProduct('metermate', 'basic', 'Basic', BigInt(9900), 'Basic consulting plan — $99/mo');
  await ensureProduct('metermate', 'pro', 'Pro', BigInt(29900), 'Pro consulting plan — $299/mo');

  console.log('\n→ Metered components');
  await ensureMeteredComponent(familyId, 'consulting-minutes', 'Consulting Minutes', 'minute', '2.00');
  await ensureMeteredComponent(familyId, 'api-calls', 'API Calls', 'call', '0.01');

  console.log('\nDone. Your Maxio site is ready for MeterMate.\n');
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
