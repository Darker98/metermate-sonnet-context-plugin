"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleRouter = void 0;
var express_1 = require("express");
exports.lifecycleRouter = (0, express_1.Router)();
exports.lifecycleRouter.post('/', function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC4 not yet implemented' });
});
