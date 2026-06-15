"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageRouter = void 0;
var express_1 = require("express");
exports.usageRouter = (0, express_1.Router)();
exports.usageRouter.post('/', function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC2 not yet implemented' });
});
