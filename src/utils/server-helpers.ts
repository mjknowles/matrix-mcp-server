import { createMatrixClient } from "../matrix/client.js";
import { TokenExchangeConfig } from "../auth/tokenExchange.js";

// Environment configuration
export const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
export const ENABLE_TOKEN_EXCHANGE = process.env.ENABLE_TOKEN_EXCHANGE === "true";
export const defaultHomeserverUrl =
  process.env.MATRIX_HOMESERVER_URL || "https://localhost:8008/";

// OAuth/Token exchange configuration
export const tokenExchangeConfig: TokenExchangeConfig = {
  idpUrl: process.env.IDP_ISSUER_URL || "",
  clientId: process.env.MATRIX_CLIENT_ID || "",
  clientSecret: process.env.MATRIX_CLIENT_SECRET || "",
  matrixClientId: process.env.MATRIX_CLIENT_ID || "",
};

/**
 * Helper function to get access token based on OAuth mode
 */
export function getAccessToken(
  headers: Record<string, string | string[] | undefined> | undefined,
  oauthToken: string | undefined
): string {
  const matrixTokenFromHeader = headers?.["matrix_access_token"];

  // Prioritize matrix_access_token from headers
  if (matrixTokenFromHeader) {
    if (Array.isArray(matrixTokenFromHeader)) {
      // If it's an array, take the first non-empty string.
      const firstMatrixToken = matrixTokenFromHeader.find(
        (token) => typeof token === "string" && token !== ""
      );
      if (firstMatrixToken) {
        return firstMatrixToken;
      }
    } else if (
      typeof matrixTokenFromHeader === "string" &&
      matrixTokenFromHeader !== ""
    ) {
      return matrixTokenFromHeader;
    }
  }

  // If no valid matrix_access_token, and OAuth is enabled, use oauthToken
  if (ENABLE_OAUTH && typeof oauthToken === "string" && oauthToken !== "") {
    return oauthToken;
  }

  return "";
}

/**
 * Helper function to extract matrixUserId and homeserverUrl from headers
 */
export function getMatrixContext(
  headers: Record<string, string | string[] | undefined> | undefined
): { matrixUserId: string; homeserverUrl: string } {
  const matrixUserId =
    (Array.isArray(headers?.["matrix_user_id"])
      ? headers?.["matrix_user_id"][0]
      : headers?.["matrix_user_id"]) || "";
  const homeserverUrl =
    (Array.isArray(headers?.["matrix_homeserver_url"])
      ? headers?.["matrix_homeserver_url"][0]
      : headers?.["matrix_homeserver_url"]) || defaultHomeserverUrl;
  return { matrixUserId, homeserverUrl };
}

/**
 * Helper function to create Matrix client with proper configuration
 */
export async function createConfiguredMatrixClient(
  homeserverUrl: string,
  matrixUserId: string,
  accessToken: string
) {
  return createMatrixClient({
    homeserverUrl,
    userId: matrixUserId,
    accessToken,
    enableOAuth: ENABLE_OAUTH,
    tokenExchangeConfig: tokenExchangeConfig,
    enableTokenExchange: ENABLE_TOKEN_EXCHANGE,
  });
}