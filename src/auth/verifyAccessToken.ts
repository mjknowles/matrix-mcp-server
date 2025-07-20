import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import https from "https";
import fetch from "node-fetch";

const idpUrl = process.env.IDP_ISSUER_URL || "";
const userInfoUrl = `${idpUrl}/protocol/openid-connect/userinfo`;
const client = jwksClient({
  jwksUri: `${idpUrl}/protocol/openid-connect/certs`,
  requestHeaders: {},
  requestAgent: new https.Agent({ rejectUnauthorized: false }),
});

function getKey(
  header: jwt.JwtHeader,
  callback: (err: Error | null, signingKey?: string) => void
) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    if (!key) {
      return callback(new Error("Signing key not found"));
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {}, async (err, decoded: any) => {
      if (err) return reject(err);
      const clientId = decoded.azp || decoded.client_id;
      const scopes =
        typeof decoded.scope === "string" ? decoded.scope.split(" ") : [];
      const expiresAt = decoded.exp;

      let userInfo: Record<string, unknown> = {};
      try {
        const resp = await fetch(userInfoUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          agent: new https.Agent({ rejectUnauthorized: false }),
        });
        if (resp.ok) {
          userInfo = (await resp.json()) as Record<string, unknown>;
        } else {
          // Log error details for debugging
          const errorBody = await resp.text();
          console.error(
            `Failed to fetch userinfo: ${resp.status} ${resp.statusText}`,
            errorBody
          );
          userInfo = {
            error: `Failed to fetch userinfo: ${resp.status}`,
            details: errorBody,
          };
        }
      } catch (e) {
        userInfo = {
          error: "Exception fetching userinfo",
          details: (e as Error).message,
        };
      }

      const authInfo: AuthInfo = {
        token,
        clientId,
        scopes,
        expiresAt,
        extra: userInfo,
      };
      resolve(authInfo);
    });
  });
}
