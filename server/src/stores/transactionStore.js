"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionStore = void 0;
var txnStore = new Map();
var channelMap = new Map();
function channelKey(consultantId, clientEmail) {
    return "".concat(consultantId, "::").concat(clientEmail.toLowerCase());
}
exports.transactionStore = {
    get: function (txnId) {
        return txnStore.get(txnId);
    },
    put: function (txn) {
        txn.updatedAt = Date.now();
        txnStore.set(txn.txnId, txn);
        if (txn.channelId) {
            channelMap.set(channelKey(txn.consultantId, txn.clientEmail), txn.channelId);
        }
        return txn;
    },
    updateState: function (txnId, state) {
        var txn = txnStore.get(txnId);
        if (!txn)
            return undefined;
        txn.state = state;
        txn.updatedAt = Date.now();
        txnStore.set(txnId, txn);
        return txn;
    },
    setChannel: function (txnId, channelId, channelName) {
        var txn = txnStore.get(txnId);
        if (!txn)
            return undefined;
        txn.channelId = channelId;
        txn.channelName = channelName;
        txn.updatedAt = Date.now();
        txnStore.set(txnId, txn);
        channelMap.set(channelKey(txn.consultantId, txn.clientEmail), channelId);
        return txn;
    },
    getChannelId: function (consultantId, clientEmail) {
        return channelMap.get(channelKey(consultantId, clientEmail));
    },
    findByConsultantAndClient: function (consultantId, clientEmail) {
        for (var _i = 0, _a = txnStore.values(); _i < _a.length; _i++) {
            var txn = _a[_i];
            if (txn.consultantId === consultantId &&
                txn.clientEmail.toLowerCase() === clientEmail.toLowerCase()) {
                return txn;
            }
        }
        return undefined;
    },
    listAll: function () {
        return Array.from(txnStore.values()).sort(function (a, b) { return b.createdAt - a.createdAt; });
    },
    size: function () {
        return txnStore.size;
    },
    delete: function (txnId) {
        var txn = txnStore.get(txnId);
        if (txn) {
            channelMap.delete(channelKey(txn.consultantId, txn.clientEmail));
            txnStore.delete(txnId);
        }
    },
};
