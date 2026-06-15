"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlackClient = getSlackClient;
exports.getBotToken = getBotToken;
var slack_apimatic_sdk_1 = require("slack-apimatic-sdk");
var config_1 = require("./config");
var _client = null;
function getSlackClient() {
    if (!_client) {
        _client = new slack_apimatic_sdk_1.Client({
            authorizationCodeAuthCredentials: {
                oauthClientId: config_1.config.slack.oauthClientId,
                oauthClientSecret: config_1.config.slack.oauthClientSecret,
                oauthRedirectUri: config_1.config.slack.oauthRedirectUri,
                oauthScopes: [
                    slack_apimatic_sdk_1.OauthScope.Channelswrite,
                    slack_apimatic_sdk_1.OauthScope.Groupswrite,
                    slack_apimatic_sdk_1.OauthScope.Imwrite,
                    slack_apimatic_sdk_1.OauthScope.Mpimwrite,
                    slack_apimatic_sdk_1.OauthScope.Chatwritebot,
                    slack_apimatic_sdk_1.OauthScope.UsersreadEmail,
                    slack_apimatic_sdk_1.OauthScope.Usersread,
                    slack_apimatic_sdk_1.OauthScope.Groupsread,
                    slack_apimatic_sdk_1.OauthScope.Channelsread,
                ],
            },
            timeout: 30000,
            environment: slack_apimatic_sdk_1.Environment.Production,
        });
    }
    return _client;
}
function getBotToken() {
    return config_1.config.slack.botToken;
}
