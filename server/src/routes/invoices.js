"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesRouter = void 0;
var express_1 = require("express");
var auth_1 = require("../auth");
exports.invoicesRouter = (0, express_1.Router)();
exports.invoicesRouter.post('/', auth_1.adminGuard, function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC5 not yet implemented' });
});
