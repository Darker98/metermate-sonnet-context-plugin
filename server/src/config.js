"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var dotenv = require("dotenv");
var path = require("path");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
function required(name) {
    var val = process.env[name];
    if (!val)
        throw new Error("Missing required env var: ".concat(name));
    return val;
}
function optional(name, fallback) {
    var _a;
    return (_a = process.env[name]) !== null && _a !== void 0 ? _a : fallback;
}
exports.config = {
    port: parseInt(optional('PORT', '4000'), 10),
    maxio: {
        apiKey: required('MAXIO_API_KEY'),
        siteSubdomain: required('MAXIO_SITE_SUBDOMAIN'),
        environment: optional('MAXIO_ENVIRONMENT', 'US'),
        defaultProductFamily: optional('MAXIO_DEFAULT_PRODUCT_FAMILY', 'metermate'),
    },
    slack: {
        botToken: required('SLACK_BOT_TOKEN'),
        oauthClientId: optional('SLACK_OAUTH_CLIENT_ID', 'placeholder-client-id'),
        oauthClientSecret: optional('SLACK_OAUTH_CLIENT_SECRET', 'placeholder-client-secret'),
        oauthRedirectUri: optional('SLACK_OAUTH_REDIRECT_URI', 'http://localhost:4000/oauth/callback'),
        digestChannel: optional('SLACK_DIGEST_CHANNEL', ''),
    },
    admin: {
        user: optional('ADMIN_USER', 'admin'),
        password: optional('ADMIN_PASSWORD', 'changeme'),
    },
    session: {
        ttlMinutes: parseInt(optional('SESSION_TTL_MINUTES', '30'), 10),
    },
    demoMode: optional('DEMO_MODE', 'true') === 'true',
    digestCron: optional('DIGEST_CRON', '0 9 * * 1'),
};
