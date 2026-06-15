"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGuard = adminGuard;
var config_1 = require("./config");
function adminGuard(req, res, next) {
    var authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.status(401).json({ status: 'invalid', error: 'Admin authentication required' });
        return;
    }
    var encoded = authHeader.slice('Basic '.length);
    var decoded;
    try {
        decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    }
    catch (_a) {
        res.status(401).json({ status: 'invalid', error: 'Malformed authorization header' });
        return;
    }
    var _b = decoded.split(':'), user = _b[0], rest = _b.slice(1);
    var password = rest.join(':');
    if (user !== config_1.config.admin.user || password !== config_1.config.admin.password) {
        res.status(403).json({ status: 'invalid', error: 'Invalid admin credentials' });
        return;
    }
    next();
}
