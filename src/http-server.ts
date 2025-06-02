import express from "express";
import {
  createOAuthMetadata,
  mcpAuthMetadataRouter,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import routes from "./routes.js";
import { verifyAccessToken } from "./verifyAccessToken.js";

const app = express();
app.use(express.json());

const PORT = 3000;
const kcAuthUrlStr =
  "https://localhost:8444/realms/localrealm/protocol/openid-connect/auth";
const kcTokenUrlStr =
  "https://localhost:8444/realms/localrealm/protocol/openid-connect/token";
const kcRegistrationUrlStr =
  "https://localhost:8444/realms/localrealm/clients-registrations/openid-connect";
const kcRevocationUrlStr =
  "https://localhost:8444/realms/localrealm/protocol/openid-connect/revoke";
const kcAuthUrl = new URL(kcAuthUrlStr);
const mcpServerUrl = new URL("http://localhost:3000/mcp");

const proxyProvider = new ProxyOAuthServerProvider({
  endpoints: {
    authorizationUrl: kcAuthUrlStr,
    registrationUrl: kcRegistrationUrlStr,
    tokenUrl: kcTokenUrlStr,
    revocationUrl: kcRevocationUrlStr,
  },
  verifyAccessToken: async (token) => {
    // Call your real verifyAccessToken implementation
    return await verifyAccessToken(token);
  },
  getClient: async (client_id) => {
    return {
      client_id,
      redirect_uris: ["http://localhost:3000/callback"],
    };
  },
});

const scopesSupported: string[] = [
  "mcp:tools",
  "profile",
  "openid",
  "email",
  "auto-add-audience",
];
const oauthMetadata: OAuthMetadata = createOAuthMetadata({
  provider: proxyProvider,
  issuerUrl: kcAuthUrl,
  scopesSupported,
});
oauthMetadata.registration_endpoint = kcRegistrationUrlStr;
oauthMetadata.authorization_endpoint = kcAuthUrlStr;
oauthMetadata.token_endpoint = kcTokenUrlStr;
oauthMetadata.revocation_endpoint = kcRevocationUrlStr;

// Add metadata routes to the main MCP server
app.use(
  mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: mcpServerUrl,
    scopesSupported,
    resourceName: "Matrix MCP Server",
  })
);

app.use(
  mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl: kcAuthUrl,
    baseUrl: mcpServerUrl,
    serviceDocumentationUrl: new URL("https://docs.example.com/"),
  })
);

app.use(
  "/mcp",
  requireBearerAuth({
    verifier: proxyProvider,
    requiredScopes: scopesSupported,
    resourceMetadataUrl: kcAuthUrl.toString(),
  }),
  routes
);

app.listen(PORT, () => {
  console.log(`MCP HTTP Server listening on port ${PORT}`);
});
