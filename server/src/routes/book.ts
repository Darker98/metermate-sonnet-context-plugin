import { Router } from 'express';
import { randomUUID } from 'crypto';
import { BookSchema } from '../schemas/bookSchema';
import { sessionStore } from '../stores/sessionStore';
import { transactionStore } from '../stores/transactionStore';
import { slackService, buildUC1ProgressBlocks, buildUC1CompletionBlocks } from '../services/slackService';
import { createSubscription, MaxioError } from '../services/maxioService';
import { findConsultant } from '../consultants';
import { MutatingResponse, Transaction } from '../types';

export const bookRouter = Router();

bookRouter.post('/', async (req, res) => {
  const parsed = BookSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: MutatingResponse = {
      status: 'invalid',
      error: parsed.error.errors.map((e) => e.message).join('; '),
    };
    res.status(400).json(response);
    return;
  }

  const input = parsed.data;

  const session = sessionStore.put(input.sessionId, {
    lastSubmission: input as unknown as Record<string, unknown>,
  });

  if (!session) {
    res.status(409).json({ status: 'session_expired', error: 'Session expired. Please refresh and try again.' });
    return;
  }

  const consultant = findConsultant(input.consultantId);
  if (!consultant) {
    res.status(400).json({ status: 'invalid', error: `Unknown consultant: ${input.consultantId}` });
    return;
  }

  const txnId = `txn_${randomUUID()}`;
  const now = Date.now();

  const txn: Transaction = {
    txnId,
    consultantId: input.consultantId,
    clientEmail: input.email,
    type: 'subscription',
    state: 'started',
    createdAt: now,
    updatedAt: now,
  };
  transactionStore.put(txn);

  // Ensure Slack channel (non-blocking on failure)
  let channelId = '';
  let channelName = '';
  try {
    const channelResult = await slackService.ensureTxnChannel(txn, consultant.email);
    channelId = channelResult.channelId;
    channelName = channelResult.channelName;
  } catch (err) {
    console.error('[book] ensureTxnChannel failed (non-fatal):', err);
  }

  // Post in-progress message
  if (channelId) {
    try {
      await slackService.postProgress(channelId, ':hourglass_flowing_sand: Creating subscription…', buildUC1ProgressBlocks());
    } catch { /* non-fatal */ }
  }

  // Run Maxio billing operation
  try {
    const result = await createSubscription({
      txnId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      productHandle: input.productHandle,
      collectionMethod: input.collectionMethod,
      couponCode: input.couponCode,
    });

    transactionStore.updateState(txnId, 'completed');
    const updatedTxn = transactionStore.get(txnId);
    if (updatedTxn) {
      updatedTxn.subscriptionId = result.subscriptionId;
      transactionStore.put(updatedTxn);
    }

    sessionStore.put(input.sessionId, { lastResult: result as unknown as Record<string, unknown> });

    // Post completion to Slack
    if (channelId) {
      try {
        await slackService.postCompletion(
          channelId,
          ':tada: Subscription active',
          buildUC1CompletionBlocks(result)
        );
      } catch { /* non-fatal */ }
    }

    const response: MutatingResponse = {
      status: 'ok',
      txnId,
      channelId,
      channelName,
      subscriptionId: result.subscriptionId,
      subscriptionState: result.state,
      plan: result.productName,
      mrrCents: result.mrrCents.toString(),
      nextAssessmentAt: result.nextAssessmentAt,
      customerName: result.customerName,
    };
    res.json(response);
  } catch (err) {
    transactionStore.updateState(txnId, 'failed');

    const errorSummary = err instanceof MaxioError ? err.message : String(err);
    console.error('[book] Maxio error:', errorSummary);

    if (channelId) {
      try {
        await slackService.postFailure(channelId, errorSummary, 'Booking');
      } catch { /* non-fatal */ }
    }

    const response: MutatingResponse = {
      status: 'maxio_failed',
      txnId,
      channelId,
      channelName,
      error: errorSummary,
    };
    res.status(502).json(response);
  }
});
