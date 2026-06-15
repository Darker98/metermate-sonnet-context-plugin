"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookRouter = void 0;
var express_1 = require("express");
exports.bookRouter = (0, express_1.Router)();
exports.bookRouter.post('/', function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC1 not yet implemented' });
});
