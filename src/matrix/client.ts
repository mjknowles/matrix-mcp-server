import * as sdk from "matrix-js-sdk";
import { MatrixClient, ClientEvent } from "matrix-js-sdk";
import https from "https";
import fetch from "node-fetch";
import { exchangeToken, TokenExchangeConfig } from "../auth/tokenExchange.js";

/**
 * Configuration for Matrix client creation
 */
export interface MatrixClientConfig {
  homeserverUrl: string;
  userId: string;
  accessToken: string;
  enableOAuth: boolean;
  tokenExchangeConfig?: TokenExchangeConfig;
  enableTokenExchange: boolean;
}

/**
 * Creates and initializes a Matrix client instance
 *
 * @param config - Matrix client configuration
 * @returns Promise<MatrixClient> - Initialized Matrix client
 */
export async function createMatrixClient(
  config: MatrixClientConfig
): Promise<MatrixClient> {
  const {
    homeserverUrl,
    userId,
    accessToken,
    enableOAuth,
    tokenExchangeConfig,
    enableTokenExchange,
  } = config;

  if (!homeserverUrl) {
    throw new Error("Homeserver URL is required to create a Matrix client.");
  }
  if (!userId) {
    throw new Error("User ID is required to create a Matrix client.");
  }

  let matrixAccessToken: string;

  if (enableOAuth && enableTokenExchange) {
    if (!accessToken) {
      throw new Error("Access token is required for OAuth token exchange.");
    }
    if (!tokenExchangeConfig) {
      throw new Error(
        "Token exchange configuration is required for OAuth mode."
      );
    }
    matrixAccessToken = await exchangeToken(tokenExchangeConfig, accessToken);
  } else {
    // In non-OAuth mode, expect a direct Matrix access token
    matrixAccessToken = accessToken;
  }

  const client = sdk.createClient({
    baseUrl: homeserverUrl,
    userId,
    fetchFn: async (input: any, init?: any) => {
      const agent = new https.Agent({ rejectUnauthorized: false });
      return fetch(input, { ...(init || {}), agent }) as any;
    },
  });

  if (enableOAuth && matrixAccessToken && enableTokenExchange) {
    // OAuth mode: use token exchange result to login
    const matrixLoginResponse = await client.loginRequest({
      type: "m.login.token",
      token: matrixAccessToken,
    });
    client.setAccessToken(matrixLoginResponse.access_token);
  } else if (matrixAccessToken) {
    // Non-OAuth mode: use provided Matrix access token directly
    client.setAccessToken(matrixAccessToken);
  } else {
    throw new Error("No valid access token available for Matrix client.");
  }

  await client.startClient({ initialSyncLimit: 100 });

  // Wait for the initial sync to complete
  await new Promise<void>((resolve, reject) => {
    client.once(ClientEvent.Sync, (state) => {
      if (state === "PREPARED") resolve();
      else reject(new Error(`Sync failed with state: ${state}`));
    });
  });

  return client;
}

/**
 * Safely stops a Matrix client and cleans up resources
 *
 * @param client - Matrix client to stop
 */
export function stopMatrixClient(client: MatrixClient): void {
  try {
    client.stopClient();
  } catch (error) {
    console.warn("Error stopping Matrix client:", error);
  }
}
