import fetch from "node-fetch";
import https from "https";

/**
 * Configuration for OAuth token exchange
 */
export interface TokenExchangeConfig {
  idpUrl: string;
  clientId: string;
  clientSecret: string;
  matrixClientId: string;
}

/**
 * Exchanges an OAuth access token for a Matrix-specific token using OAuth 2.0 Token Exchange
 * 
 * @param config - Token exchange configuration
 * @param subjectToken - The original OAuth access token
 * @returns Promise<string> - The exchanged Matrix access token
 */
export async function exchangeToken(
  config: TokenExchangeConfig,
  subjectToken: string
): Promise<string> {
  const { idpUrl, clientId, clientSecret, matrixClientId } = config;
  const tokenUrl = `${idpUrl}/protocol/openid-connect/token`;
  const params = new URLSearchParams();

  // OAuth 2.0 Token Exchange parameters
  params.append(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:token-exchange"
  );
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("subject_token", subjectToken);
  params.append(
    "subject_token_type",
    "urn:ietf:params:oauth:token-type:access_token"
  );
  params.append(
    "requested_token_type",
    "urn:ietf:params:oauth:token-type:access_token"
  );
  params.append("audience", matrixClientId);

  console.log(`Performing token exchange with IDP at ${tokenUrl}`);
  
  try {
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
      body: params,
      agent: new https.Agent({ rejectUnauthorized: false }), // For local development with self-signed certs
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(
        `Token exchange request failed. Status: ${resp.status} ${resp.statusText}`
      );
      console.error(`Response body: ${text}`);
      throw new Error(
        `Failed to exchange token: ${resp.statusText} (${resp.status})`
      );
    }

    let data: any;
    try {
      data = await resp.json();
    } catch (jsonErr) {
      const text = await resp.text();
      console.error("Failed to parse JSON from token exchange response.");
      console.error(`Raw response: ${text}`);
      throw new Error("Failed to parse token exchange response as JSON.");
    }

    if (!data.access_token) {
      console.error("Access token not found in token exchange response:", data);
      throw new Error("Access token not found in token exchange response.");
    }

    console.log("Successfully exchanged token.");
    return data.access_token;
  } catch (err: any) {
    console.error("Error occurred during token exchange:", err);
    throw err;
  }
}