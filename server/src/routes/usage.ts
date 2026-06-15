import { Router } from 'express';
import { UsageSchema } from '../schemas/usageSchema';
import { sessionStore } from '../stores/sessionStore';
import { transactionStore } from '../stores/transactionStore';
import { slackService, buildUC2ProgressBlocks, buildUC2CompletionBlocks } from '../services/slackService';
import { recordUsage, MaxioError } from '../services/maxioService';
import { MutatingResponse } from '../types';

export const usageRouter = Router();

usageRouter.post('/', async (req, res) => {
  const parsed = UsageSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: MutatingResponse = {
      status: 'invalid',
      error: parsed.error.errors.map((e) => e.message).join('; '),
    };
    res.status(400).json(response);
    return;
  }

  const input = parsed.data;

  sessionStore.put(input.sessionId, { lastSubmission: input as unknown as Record<string, unknown> });

  const txn = transactionStore.get(input.txnRef);
  if (!txn) {
    res.status(409).json({ status: 'session_expired', error: 'Transaction not found. It may have expired — please rebook.' });
    return;
  }

  if (!txn.subscriptionId) {
    res.status(409).json({ status: 'invalid', error: 'Transaction has no active subscription to report usage against.' });
    return;
  }

  const channelId = txn.channelId ?? '';
  const channelName = txn.channelName ?? '';

  if (channelId) {
    try {
      await slackService.postProgress(channelId, ':bar_chart: Recording usage…', buildUC2ProgressBlocks(input.componentHandle, input.quantity));
    } catch { /* non-fatal */ }
  }

  try {
    const result = await recordUsage({
      subscriptionId: txn.subscriptionId,
      componentHandle: input.componentHandle,
      quantity: input.quantity,
      memo: input.memo,
    });

    transactionStore.updateState(input.txnRef, 'completed');

    if (channelId) {
      try {
        await slackService.postCompletion(channelId, ':white_check_mark: Usage recorded', buildUC2CompletionBlocks(result));
      } catch { /* non-fatal */ }
    }

    const response: MutatingResponse = {
      status: 'ok',
      txnId: input.txnRef,
      channelId,
      channelName,
      quantity: result.quantity,
      componentHandle: result.componentHandle,
      periodTotalQuantity: result.periodTotalQuantity,
      memo: result.memo ?? undefined,
    };
    res.json(response);
  } catch (err) {
    const errorSummary = err instanceof MaxioError ? err.message : String(err);
    console.error('[usage] Maxio error:', errorSummary);

    if (channelId) {
      try {
        await slackService.postFailure(channelId, errorSummary, 'Usage reporting');
      } catch { /* non-fatal */ }
    }

    const response: MutatingResponse = {
      status: 'maxio_failed',
      txnId: input.txnRef,
      channelId,
      channelName,
      error: errorSummary,
    };
    res.status(502).json(response);
  }
});
