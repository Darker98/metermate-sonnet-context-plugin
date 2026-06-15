import { Client, Environment } from '@maxio-com/advanced-billing-sdk';
import { config } from './config';

function resolveEnvironment(): Environment {
  return config.maxio.environment === 'EU' ? Environment.EU : Environment.US;
}

let _client: Client | null = null;

export function getMaxioClient(): Client {
  if (!_client) {
    _client = new Client({
      basicAuthCredentials: {
        username: config.maxio.apiKey,
        password: 'x',
      },
      timeout: 120_000,
      environment: resolveEnvironment(),
      site: config.maxio.siteSubdomain,
    });
  }
  return _client;
}
