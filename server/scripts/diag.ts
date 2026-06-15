/**
 * Diagnostic: find which product family the 'basic' product belongs to,
 * and confirm the subscription's product family.
 * Run: npx tsx scripts/diag.ts [subscriptionId]
 */

import 'dotenv/config';
import {
  Client,
  Environment,
  ProductsController,
  SubscriptionsController,
  ComponentsController,
  ProductFamiliesController,
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

async function main() {
  const subscriptionId = Number(process.argv[2]);
  const productsCtl = new ProductsController(client);
  const subsCtl = new SubscriptionsController(client);
  const familiesCtl = new ProductFamiliesController(client);
  const componentsCtl = new ComponentsController(client);

  // 1. Read the 'basic' product
  console.log('\n── Product "basic" ──');
  try {
    const pResp = await productsCtl.readProductByHandle('basic');
    const p = pResp.result?.product;
    console.log(`  id:              ${p?.id}`);
    console.log(`  name:            ${p?.name}`);
    console.log(`  handle:          ${p?.handle}`);
    console.log(`  productFamily:   ${JSON.stringify(p?.productFamily)}`);
  } catch (err) {
    console.error('  Error reading basic product:', extractErr(err));
  }

  // 2. Read the 'metermate' product family
  console.log('\n── Product family "metermate" ──');
  try {
    const families = await familiesCtl.listProductFamilies({});
    const mm = (families.result ?? []).find((f) => f.productFamily?.handle === 'metermate');
    if (mm) {
      console.log(`  id:     ${mm.productFamily?.id}`);
      console.log(`  handle: ${mm.productFamily?.handle}`);
      console.log(`  name:   ${mm.productFamily?.name}`);
    } else {
      console.log('  NOT FOUND');
    }

    // 3. List products in the metermate family by its numeric ID
    if (mm?.productFamily?.id) {
      const mmId = mm.productFamily.id;
      console.log(`\n── Products in metermate family (id=${mmId}) ──`);
      try {
        const prods = await familiesCtl.listProductsForProductFamily({ productFamilyId: String(mmId) });
        for (const r of prods.result ?? []) {
          console.log(`  handle=${r.product?.handle}  id=${r.product?.id}`);
        }
      } catch (err) {
        console.error('  Error listing products:', extractErr(err));
      }

      console.log(`\n── Components in metermate family (id=${mmId}) ──`);
      try {
        const comps = await componentsCtl.listComponentsForProductFamily({ productFamilyId: mmId, perPage: 200 });
        for (const r of comps.result ?? []) {
          console.log(`  handle=${r.component?.handle}  id=${r.component?.id}`);
        }
      } catch (err) {
        console.error('  Error listing components:', extractErr(err));
      }
    }
  } catch (err) {
    console.error('  Error reading families:', extractErr(err));
  }

  // 4. Read the subscription (if provided)
  if (subscriptionId) {
    console.log(`\n── Subscription ${subscriptionId} ──`);
    try {
      const sResp = await subsCtl.readSubscription(subscriptionId);
      const s = sResp.result?.subscription;
      console.log(`  state:           ${s?.state}`);
      console.log(`  product handle:  ${s?.product?.handle}`);
      console.log(`  product family:  ${JSON.stringify(s?.product?.productFamily)}`);
    } catch (err) {
      console.error('  Error reading subscription:', extractErr(err));
    }
  }
}

main().catch((err) => {
  console.error('\nDiag failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
