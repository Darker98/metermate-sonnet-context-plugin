"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planChangeRouter = void 0;
var express_1 = require("express");
exports.planChangeRouter = (0, express_1.Router)();
exports.planChangeRouter.post('/preview', function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC3 preview not yet implemented' });
});
exports.planChangeRouter.post('/', function (_req, res) {
    res.status(501).json({ status: 'invalid', error: 'UC3 not yet implemented' });
});
