import "dotenv/config";
import cors from "cors";
import express from "express";
import https from "https";
import fs from "fs";
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

const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
if (corsAllowedOrigins) {
  // Production: Use specific allowed origins
  const allowedOrigins = corsAllowedOrigins
    .split(",")
    .map((origin) => origin.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
} else {
  // Development: Allow all origins (less secure, for local development only)
  app.use(cors());
}

const PORT = parseInt(process.env.PORT || "3000");
const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === "true";
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
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

// Start server with HTTP or HTTPS based on configuration
if (ENABLE_HTTPS) {
  if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
    console.error("HTTPS enabled but SSL_KEY_PATH or SSL_CERT_PATH not provided");
    process.exit(1);
  }

  try {
    const privateKey = fs.readFileSync(SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(SSL_CERT_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(PORT, "127.0.0.1", () => {
      console.log(`MCP HTTPS Server listening on port ${PORT}`);
      console.log(`MCP endpoint: https://localhost:${PORT}/mcp`);
    });
  } catch (error) {
    console.error("Failed to start HTTPS server:", error);
    process.exit(1);
  }
} else {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`MCP HTTP Server listening on port ${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  });
}
