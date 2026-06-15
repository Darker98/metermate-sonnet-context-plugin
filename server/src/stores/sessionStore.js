"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStore = void 0;
var config_1 = require("../config");
var store = new Map();
exports.sessionStore = {
    get: function (sessionId) {
        return store.get(sessionId);
    },
    put: function (sessionId, data) {
        var _a;
        var now = Date.now();
        var existing = store.get(sessionId);
        var session = __assign(__assign({ sessionId: sessionId, createdAt: (_a = existing === null || existing === void 0 ? void 0 : existing.createdAt) !== null && _a !== void 0 ? _a : now, updatedAt: now }, existing), data);
        store.set(sessionId, session);
        return session;
    },
    delete: function (sessionId) {
        store.delete(sessionId);
    },
    sweep: function () {
        var cutoff = Date.now() - config_1.config.session.ttlMinutes * 60 * 1000;
        var removed = 0;
        for (var _i = 0, _a = store.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], session = _b[1];
            if (session.updatedAt < cutoff) {
                store.delete(id);
                removed++;
            }
        }
        return removed;
    },
    size: function () {
        return store.size;
    },
};
