import { Router } from 'express';
import { ProductsController } from '@maxio-com/advanced-billing-sdk';
import { sessionStore } from '../stores/sessionStore';
import { transactionStore } from '../stores/transactionStore';
import { slackService } from '../services/slackService';
import { getMaxioClient } from '../maxioClient';
import { config } from '../config';

export const metaRouter = Router();

const DEMO_CONSULTANTS = [
  { id: 'c1', name: 'Alice Consultant', email: 'alice@example.com' },
  { id: 'c2', name: 'Bob Consultant', email: 'bob@example.com' },
];

metaRouter.get('/health', async (_req, res) => {
  let slackOk = false;
  try {
    slackOk = await slackService.checkHealth();
  } catch {
    slackOk = false;
  }

  res.json({
    status: 'ok',
    sessions: sessionStore.size(),
    transactions: transactionStore.size(),
    maxioSite: config.maxio.siteSubdomain,
    slackOk,
  });
});

metaRouter.get('/consultants', (_req, res) => {
  res.json({ consultants: DEMO_CONSULTANTS });
});

metaRouter.get('/products', async (_req, res) => {
  try {
    const productsController = new ProductsController(getMaxioClient());
    const response = await productsController.listProducts({ page: 1, perPage: 50 });
    const products = (response.result ?? []).map((p) => ({
      id: p.product?.id,
      handle: p.product?.handle,
      name: p.product?.name,
      priceInCents: p.product?.priceInCents,
      interval: p.product?.interval,
      intervalUnit: p.product?.intervalUnit,
    }));
    res.json({ products });
  } catch (err) {
    console.error('[meta] /products error:', err);
    res.status(502).json({ status: 'maxio_failed', error: 'Could not fetch products' });
  }
});
