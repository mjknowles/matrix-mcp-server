import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import https from "https";

const keycloakUrl = "https://localhost:8444/realms/localrealm";
const client = jwksClient({
  jwksUri: `${keycloakUrl}/protocol/openid-connect/certs`,
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
    jwt.verify(token, getKey, {}, (err, decoded: any) => {
      if (err) return reject(err);
      const clientId = decoded.azp || decoded.client_id;
      const scopes =
        typeof decoded.scope === "string" ? decoded.scope.split(" ") : [];
      const expiresAt = decoded.exp;
      const extra = { ...decoded };

      const authInfo: AuthInfo = {
        token,
        clientId,
        scopes,
        expiresAt,
        extra,
      };
      console.log("AuthInfo:", authInfo);
      resolve(authInfo);
    });
  });
}
