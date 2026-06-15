import { Client, Environment } from 'slack-apimatic-sdk';
import { config } from './config';

let _client: Client | null = null;

export function getSlackClient(): Client {
  if (!_client) {
    _client = new Client({
      authorizationCodeAuthCredentials: {
        oauthClientId: config.slack.oauthClientId,
        oauthClientSecret: config.slack.oauthClientSecret,
        oauthRedirectUri: config.slack.oauthRedirectUri,
        oauthToken: {
          accessToken: config.slack.botToken,
          tokenType: 'bearer',
        },
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
