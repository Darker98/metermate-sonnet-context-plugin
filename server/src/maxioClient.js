"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaxioClient = getMaxioClient;
var advanced_billing_sdk_1 = require("@maxio-com/advanced-billing-sdk");
var config_1 = require("./config");
function resolveEnvironment() {
    return config_1.config.maxio.environment === 'EU' ? advanced_billing_sdk_1.Environment.EU : advanced_billing_sdk_1.Environment.US;
}
var _client = null;
function getMaxioClient() {
    if (!_client) {
        _client = new advanced_billing_sdk_1.Client({
            basicAuthCredentials: {
                username: config_1.config.maxio.apiKey,
                password: 'x',
            },
            timeout: 120000,
            environment: resolveEnvironment(),
            site: config_1.config.maxio.siteSubdomain,
        });
    }
    return _client;
}
