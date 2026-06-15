import { Transaction, TransactionState } from '../types';

const txnStore = new Map<string, Transaction>();
const channelMap = new Map<string, string>();

function channelKey(consultantId: string, clientEmail: string): string {
  return `${consultantId}::${clientEmail.toLowerCase()}`;
}

export const transactionStore = {
  get(txnId: string): Transaction | undefined {
    return txnStore.get(txnId);
  },

  put(txn: Transaction): Transaction {
    txn.updatedAt = Date.now();
    txnStore.set(txn.txnId, txn);
    if (txn.channelId) {
      channelMap.set(channelKey(txn.consultantId, txn.clientEmail), txn.channelId);
    }
    return txn;
  },

  updateState(txnId: string, state: TransactionState): Transaction | undefined {
    const txn = txnStore.get(txnId);
    if (!txn) return undefined;
    txn.state = state;
    txn.updatedAt = Date.now();
    txnStore.set(txnId, txn);
    return txn;
  },

  setChannel(txnId: string, channelId: string, channelName: string): Transaction | undefined {
    const txn = txnStore.get(txnId);
    if (!txn) return undefined;
    txn.channelId = channelId;
    txn.channelName = channelName;
    txn.updatedAt = Date.now();
    txnStore.set(txnId, txn);
    channelMap.set(channelKey(txn.consultantId, txn.clientEmail), channelId);
    return txn;
  },

  getChannelId(consultantId: string, clientEmail: string): string | undefined {
    return channelMap.get(channelKey(consultantId, clientEmail));
  },

  findByConsultantAndClient(consultantId: string, clientEmail: string): Transaction | undefined {
    for (const txn of txnStore.values()) {
      if (
        txn.consultantId === consultantId &&
        txn.clientEmail.toLowerCase() === clientEmail.toLowerCase()
      ) {
        return txn;
      }
    }
    return undefined;
  },

  listAll(): Transaction[] {
    return Array.from(txnStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  size(): number {
    return txnStore.size;
  },

  delete(txnId: string): void {
    const txn = txnStore.get(txnId);
    if (txn) {
      channelMap.delete(channelKey(txn.consultantId, txn.clientEmail));
      txnStore.delete(txnId);
    }
  },
};
