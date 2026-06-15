import { Client, Environment, OauthScope } from 'slack-apimatic-sdk';
import { config } from './config';

let _client: Client | null = null;

export function getSlackClient(): Client {
  if (!_client) {
    _client = new Client({
      authorizationCodeAuthCredentials: {
        oauthClientId: config.slack.oauthClientId,
        oauthClientSecret: config.slack.oauthClientSecret,
        oauthRedirectUri: config.slack.oauthRedirectUri,
        oauthScopes: [
          OauthScope.Channelswrite,
          OauthScope.Groupswrite,
          OauthScope.Imwrite,
          OauthScope.Mpimwrite,
          OauthScope.Chatwritebot,
          OauthScope.UsersreadEmail,
          OauthScope.Usersread,
          OauthScope.Groupsread,
          OauthScope.Channelsread,
        ],
      },
      timeout: 30_000,
      environment: Environment.Production,
    });
  }
  return _client;
}

export function getBotToken(): string {
  return config.slack.botToken;
}
