import "dotenv/config";
import cors from "cors";
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
import { verifyAccessToken } from "./auth/verifyAccessToken.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  console.debug(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

app.use((req, res, next) => {
  const oldSend = res.send;
  res.send = function (body) {
    const wwwAuth = res.getHeader("WWW-Authenticate");
    console.debug(
      `[${new Date().toISOString()}] RESPONSE ${req.method} ${
        req.originalUrl
      } ${res.statusCode} ${
        typeof body === "string" ? body : JSON.stringify(body)
      }${wwwAuth ? `\nWWW-Authenticate: ${wwwAuth}` : ""}`
    );
    // @ts-ignore
    return oldSend.call(this, body);
  };
  next();
});

const PORT = parseInt(process.env.PORT || "3000");
const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
let proxyProvider: ProxyOAuthServerProvider | undefined;
let oauthMetadata: OAuthMetadata | undefined;
let scopesSupported: string[] | undefined;
let idpIssuerUrl: URL | undefined;
let mcpServerUrl: URL | undefined;

if (ENABLE_OAUTH) {
  const authUrlStr = process.env.IDP_AUTHORIZATION_URL || "";
  const tokenUrlStr = process.env.IDP_TOKEN_URL || "";
  const registrationUrlStr = process.env.IDP_REGISTRATION_URL || "";
  const revocationUrlStr = process.env.IDP_REVOCATION_URL || "";
  const issuerUrlStr = process.env.IDP_ISSUER_URL || "";
  const callbackUrl =
    process.env.OAUTH_CALLBACK_URL || `http://localhost:${PORT}/callback`;

  idpIssuerUrl = new URL(issuerUrlStr);
  mcpServerUrl = new URL(
    process.env.MCP_SERVER_URL || `http://localhost:${PORT}/mcp`
  );

  proxyProvider = new ProxyOAuthServerProvider({
    endpoints: {
      authorizationUrl: authUrlStr,
      registrationUrl: registrationUrlStr,
      tokenUrl: tokenUrlStr,
      revocationUrl: revocationUrlStr,
    },
    verifyAccessToken: async (token) => {
      // Call your real verifyAccessToken implementation
      return await verifyAccessToken(token);
    },
    getClient: async (client_id) => {
      return {
        client_id,
        redirect_uris: [callbackUrl],
      };
    },
  });

  scopesSupported = process.env.OAUTH_SCOPES_SUPPORTED
    ? process.env.OAUTH_SCOPES_SUPPORTED.split(",").map((scope) => scope.trim())
    : [];

  oauthMetadata = createOAuthMetadata({
    provider: proxyProvider,
    issuerUrl: idpIssuerUrl,
    scopesSupported,
  });
  oauthMetadata.registration_endpoint = registrationUrlStr;
  oauthMetadata.authorization_endpoint = authUrlStr;
  oauthMetadata.token_endpoint = tokenUrlStr;
  oauthMetadata.revocation_endpoint = revocationUrlStr;
}

// Add OAuth routes and middleware only if OAuth is enabled
if (
  ENABLE_OAUTH &&
  oauthMetadata &&
  mcpServerUrl &&
  scopesSupported &&
  proxyProvider &&
  idpIssuerUrl
) {
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
      issuerUrl: idpIssuerUrl,
      baseUrl: mcpServerUrl,
      serviceDocumentationUrl: new URL("https://docs.example.com/"),
    })
  );

  app.use(
    "/mcp",
    requireBearerAuth({
      verifier: proxyProvider,
      requiredScopes: scopesSupported,
      resourceMetadataUrl: idpIssuerUrl.toString(),
    }),
    routes
  );
} else {
  // No OAuth - direct access to MCP endpoint
  app.use("/mcp", routes);
}

app.listen(PORT, () => {
  console.log(`MCP HTTP Server listening on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});
