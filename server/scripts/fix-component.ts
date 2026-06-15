/**
 * One-off recovery script: finds and archives the stray "consulting-minutes"
 * component that blocks seeding, then prints next steps.
 *
 * Run: npx tsx scripts/fix-component.ts
 */

import 'dotenv/config';
import {
  Client,
  Environment,
  ProductFamiliesController,
  ComponentsController,
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
  const TARGET_HANDLE = 'consulting-minutes';

  console.log(`\nSearching ALL families (including archived) for handle: ${TARGET_HANDLE}\n`);

  const familiesCtl = new ProductFamiliesController(client);
  const componentsCtl = new ComponentsController(client);

  const familiesResp = await familiesCtl.listProductFamilies({});
  const families = familiesResp.result ?? [];

  console.log(`Found ${families.length} product families.\n`);

  type Found = { familyId: number; familyHandle: string; componentId: number; archived: boolean };
  const hits: Found[] = [];

  for (const f of families) {
    const familyId = f.productFamily?.id;
    const familyHandle = f.productFamily?.handle ?? String(familyId);
    if (!familyId) continue;

    try {
      // includeArchived=true reveals archived components in this family
      const resp = await componentsCtl.listComponentsForProductFamily({
        productFamilyId: familyId,
        includeArchived: true,
        perPage: 200,
      });
      for (const r of resp.result ?? []) {
        const c = r.component;
        if (!c || c.handle !== TARGET_HANDLE) continue;
        const archived = c.archivedAt !== undefined && c.archivedAt !== null;
        console.log(
          `  FOUND in family "${familyHandle}" (id=${familyId})  component id=${c.id}  archived=${archived}`
        );
        if (c.id !== undefined) {
          hits.push({ familyId, familyHandle, componentId: c.id, archived });
        }
      }
    } catch (err) {
      console.warn(`  [warn] Could not list family "${familyHandle}": ${extractErr(err)}`);
    }
  }

  if (hits.length === 0) {
    console.log(`\n[result] Component "${TARGET_HANDLE}" not found in ANY family (including archived).`);
    console.log('  The handle is reserved at the site level but the component is in an orphaned/deleted family.');
    console.log('  → You cannot free this handle via the API.');
    console.log('  → Update seed.ts to use handle "mm-consulting-minutes" instead.\n');
    process.exit(2);
  }

  for (const hit of hits) {
    if (hit.archived) {
      console.log(`\n[result] Component is ARCHIVED in family "${hit.familyHandle}" (id=${hit.componentId}).`);
      console.log('  Archived handles are permanently reserved — Maxio does not release them.');
      console.log('  → Update seed.ts to use handle "mm-consulting-minutes" instead.\n');
      process.exit(3);
    }

    // Active component in wrong family — archive it so the handle is freed
    console.log(`\n[action] Archiving active component id=${hit.componentId} in family "${hit.familyHandle}"…`);
    try {
      await componentsCtl.archiveComponent(hit.familyId, String(hit.componentId));
      console.log('  [ok] Archived successfully.');
      console.log('\n  → Run "npx tsx scripts/seed.ts" to recreate it correctly in the metermate family.\n');
    } catch (err) {
      console.error(`  [error] Archive failed: ${extractErr(err)}`);
      console.log('  → Update seed.ts to use handle "mm-consulting-minutes" instead.\n');
      process.exit(4);
    }
  }
}

main().catch((err) => {
  console.error('\nScript failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
