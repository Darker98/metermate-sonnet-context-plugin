"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var path = require("path");
var config_1 = require("./config");
var sessionStore_1 = require("./stores/sessionStore");
var meta_1 = require("./routes/meta");
var book_1 = require("./routes/book");
var usage_1 = require("./routes/usage");
var planChange_1 = require("./routes/planChange");
var lifecycle_1 = require("./routes/lifecycle");
var invoices_1 = require("./routes/invoices");
var digest_1 = require("./routes/digest");
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api', meta_1.metaRouter);
app.use('/api/book', book_1.bookRouter);
app.use('/api/usage', usage_1.usageRouter);
app.use('/api/plan-change', planChange_1.planChangeRouter);
app.use('/api/lifecycle', lifecycle_1.lifecycleRouter);
app.use('/api/invoices', invoices_1.invoicesRouter);
app.use('/api/digest', digest_1.digestRouter);
if (process.env.NODE_ENV === 'production') {
    var webDist_1 = path.resolve(__dirname, '../../web/dist');
    app.use(express_1.default.static(webDist_1));
    app.get('*', function (_req, res) {
        res.sendFile(path.join(webDist_1, 'index.html'));
    });
}
var ttlMs = config_1.config.session.ttlMinutes * 60 * 1000;
setInterval(function () {
    var removed = sessionStore_1.sessionStore.sweep();
    if (removed > 0)
        console.log("[session sweep] removed ".concat(removed, " expired sessions"));
}, ttlMs);
app.listen(config_1.config.port, function () {
    console.log("[metermate] Server running on http://localhost:".concat(config_1.config.port));
    console.log("[metermate] Maxio site: ".concat(config_1.config.maxio.siteSubdomain, " (").concat(config_1.config.maxio.environment, ")"));
    console.log("[metermate] Demo mode: ".concat(config_1.config.demoMode));
});
exports.default = app;
