import express, { Request, Response } from "express";
import {
  createOAuthMetadata,
  mcpAuthMetadataRouter,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import routes from "./routes.js";

const app = express();
app.use(express.json());

const PORT = 3000;
const kcAuthUrlStr =
  "https://localhost:8443/realms/localrealm/protocol/openid-connect/auth";
const kcAuthUrl = new URL(kcAuthUrlStr);
const mcpServerUrl = new URL("http://localhost:3000/mcp");

const proxyProvider = new ProxyOAuthServerProvider({
  endpoints: {
    authorizationUrl: kcAuthUrlStr,
    tokenUrl:
      "https://localhost:8443/realms/localrealm/protocol/openid-connect/token",
    revocationUrl:
      "https://localhost:8443/realms/localrealm/protocol/openid-connect/revoke",
  },
  verifyAccessToken: async (token) => {
    return {
      token,
      clientId: "123",
      scopes: ["openid", "email", "profile"],
    };
  },
  getClient: async (client_id) => {
    return {
      client_id,
      redirect_uris: ["http://localhost:3000/callback"],
    };
  },
});

const oauthMetadata: OAuthMetadata = createOAuthMetadata({
  provider: proxyProvider,
  issuerUrl: kcAuthUrl,
  scopesSupported: ["mcp:tools"],
});
oauthMetadata.registration_endpoint =
  "https://localhost:8443/realms/localrealm/clients-registrations/openid-connect";

// Add metadata routes to the main MCP server
app.use(
  mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: mcpServerUrl,
    scopesSupported: ["mcp:tools"],
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
    requiredScopes: ["default"],
    resourceMetadataUrl: kcAuthUrl.toString(),
  }),
  routes
);

app.listen(PORT, () => {
  console.log(`MCP HTTP Server listening on port ${PORT}`);
});
