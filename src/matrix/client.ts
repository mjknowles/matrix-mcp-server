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
      // TLS verification is on by default; it can only be disabled explicitly
      // for a self-signed homeserver via MATRIX_ALLOW_INSECURE_TLS=1.
      const allowInsecure = process.env.MATRIX_ALLOW_INSECURE_TLS === "1";
      const agent = allowInsecure
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;
      return fetch(input, {
        ...(init || {}),
        ...(agent ? { agent } : {}),
      }) as any;
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
    await waitForInitialSync(client, homeserverUrl);

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

const DEFAULT_SYNC_TIMEOUT_MS = 30_000;

/**
 * Turn a matrix-js-sdk sync error into one readable line.
 * A homeserver behind a proxy that is down surfaces as a bare HTTP 502 with
 * no message, which is useless in a log or in an MCP tool error.
 */
function describeSyncError(error: unknown): string {
  if (!error) return "no error reported by the homeserver";
  const e = error as {
    message?: string;
    httpStatus?: number;
    errcode?: string;
    data?: { error?: string; errcode?: string };
  };
  const parts = [
    e.httpStatus ? `HTTP ${e.httpStatus}` : undefined,
    e.errcode ?? e.data?.errcode,
    e.message ?? e.data?.error,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(": ") : String(error);
}

/**
 * Wait until the client's initial sync reaches PREPARED.
 *
 * The sync stream emits SYNCING, RECONNECTING, ERROR and STOPPED before (or
 * instead of) PREPARED, so waiting for the *first* event of any kind fails a
 * perfectly good client on a transient reconnect. This waits for PREPARED,
 * keeps the last error, and gives up after a timeout with a message that names
 * the homeserver and the underlying cause instead of "Sync failed with state:
 * ERROR".
 */
export async function waitForInitialSync(
  client: MatrixClient,
  homeserverUrl: string,
  timeoutMs: number = Number(
    process.env.MATRIX_SYNC_TIMEOUT_MS ?? DEFAULT_SYNC_TIMEOUT_MS
  )
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let lastState = "UNKNOWN";
    let lastError: unknown;

    const cleanup = () => {
      clearTimeout(timer);
      client.off(ClientEvent.Sync, onSync);
    };

    const onSync = (
      state: string,
      _prevState: string | null,
      data?: { error?: unknown }
    ) => {
      lastState = state;
      if (state === "ERROR" && data?.error) lastError = data.error;

      if (state === "PREPARED") {
        cleanup();
        resolve();
        return;
      }
      if (state === "STOPPED") {
        cleanup();
        reject(
          new Error(
            `Matrix sync stopped before completing the initial sync with ${homeserverUrl}.`
          )
        );
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for the initial sync from ${homeserverUrl} ` +
            `(last state: ${lastState}; ${describeSyncError(lastError)}).`
        )
      );
    }, timeoutMs);

    client.on(ClientEvent.Sync, onSync);
  });
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
