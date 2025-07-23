import * as sdk from "matrix-js-sdk";
import { MatrixClient, ClientEvent } from "matrix-js-sdk";
import https from "https";
import fetch from "node-fetch";
import { exchangeToken, TokenExchangeConfig } from "../auth/tokenExchange.js";
import { getCachedClient, cacheClient, removeCachedClient } from "./clientCache.js";

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
 * Creates and initializes a Matrix client instance, using cache when possible
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

  // Check for cached client first
  const cachedClient = getCachedClient(userId, homeserverUrl);
  if (cachedClient) {
    return cachedClient;
  }

  // No cached client, create a new one
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

  try {
    if (enableOAuth && matrixAccessToken && enableTokenExchange) {
      // OAuth mode: use token exchange result to login
      const matrixLoginResponse = await client.loginRequest({
        type: "org.matrix.login.jwt",
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

    // Cache the successfully created and synced client
    cacheClient(client, userId, homeserverUrl);
    
    return client;
  } catch (error) {
    // If client creation failed, make sure to stop the client and don't cache it
    try {
      client.stopClient();
    } catch (stopError) {
      console.warn("Error stopping failed client:", stopError);
    }
    throw error;
  }
}

/**
 * Safely stops a Matrix client and cleans up resources
 * Note: This function is now deprecated since clients are cached and managed automatically.
 * Clients should not be manually stopped as they may be reused by other operations.
 *
 * @param client - Matrix client to stop
 * @deprecated Use cached clients instead, they are managed automatically
 */
export function stopMatrixClient(_client: MatrixClient): void {
  // For now, do nothing - clients are managed by the cache
  // In the future, we may want to remove this function entirely
  console.warn("stopMatrixClient called - clients are now cached and should not be manually stopped");
}

/**
 * Remove a client from cache and stop it (for error recovery)
 *
 * @param userId - Matrix user ID  
 * @param homeserverUrl - Matrix homeserver URL
 */
export function removeClientFromCache(userId: string, homeserverUrl: string): void {
  removeCachedClient(userId, homeserverUrl);
}
