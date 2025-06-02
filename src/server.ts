import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as sdk from "matrix-js-sdk";
import { EventType, MatrixClient } from "matrix-js-sdk";
import { z } from "zod";
import https from "https";
import fetch, { RequestInit, Request } from "node-fetch";

const keycloakUrl = "https://localhost:8444/realms/localrealm";
const matrixClientId = "synapse";
const matrixClientSecret = "myclientsecret";

const server = new McpServer(
  {
    name: "matrix-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {},
      resources: {},
      tools: {},
    },
  }
);

// Tool: List joined rooms
server.tool(
  "list-joined-rooms",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
  },
  async ({ homeserverUrl, domain }, extra): Promise<CallToolResult> => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const rooms = client.getRooms();
      console.log(`Room count: ${rooms.length}`);
      return {
        content: rooms.map((room) => ({
          type: "text",
          text: `Room ID: ${room.roomId}, Name: ${room.name}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to list joined rooms: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Tool: Get room messages
server.tool(
  "get-room-messages",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
    roomId: z.string(),
    limit: z.number().optional().default(20),
  },
  async ({ homeserverUrl, domain, roomId, limit }, extra) => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const messages = await Promise.all(
        room
          .getLiveTimeline()
          .getEvents()
          .slice(-limit)
          .map((event) => processMessage(event, client))
      );

      return {
        content: messages.filter((message) => message !== null),
      };
    } catch (error: any) {
      console.error(`Failed to get room messages: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Tool: Get room members
server.tool(
  "get-room-members",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
    roomId: z.string(),
  },
  async ({ homeserverUrl, domain, roomId }, extra) => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const members = room.getJoinedMembers().map((member) => ({
        user_id: member.userId,
        display_name: member.name || member.userId,
      }));

      return {
        content: members.map((member) => ({
          type: "text",
          text: `User ID: ${member.user_id}, Display Name: ${member.display_name}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to get room members: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Tool: Get messages by date
server.tool(
  "get-messages-by-date",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
    roomId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  },
  async ({ homeserverUrl, domain, roomId, startDate, endDate }, extra) => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      const messages = await Promise.all(
        room
          .getLiveTimeline()
          .getEvents()
          .filter((event) => {
            const timestamp = event.getTs();
            return timestamp >= start && timestamp <= end;
          })
          .map((event) => processMessage(event, client))
      );

      return {
        content: messages.filter((message) => message !== null),
      };
    } catch (error: any) {
      console.error(`Failed to filter messages by date: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Tool: Identify active users
server.tool(
  "identify-active-users",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
    userId: z.string(),
    roomId: z.string(),
    limit: z.number().optional().default(10),
  },
  async ({ homeserverUrl, domain, roomId, limit }, extra) => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const userMessageCounts: Record<string, number> = {};
      room
        .getLiveTimeline()
        .getEvents()
        .filter((event) => event.getType() === EventType.RoomMessage)
        .forEach((event) => {
          const sender = event.getSender();
          if (sender) {
            userMessageCounts[sender] = (userMessageCounts[sender] || 0) + 1;
          }
        });

      const activeUsers = Object.entries(userMessageCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit)
        .map(([userId, count]) => ({ userId, count }));

      return {
        content: activeUsers.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Message Count: ${user.count}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to identify active users: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Tool: Get all users
server.tool(
  "get-all-users",
  {
    homeserverUrl: z.string().default("https://localhost:8008/"),
    domain: z.string().default("matrix.example.com"),
  },
  async ({ homeserverUrl, domain }, extra) => {
    const client = await createMatrixClient(
      homeserverUrl,
      getUserName(extra, domain),
      extra.authInfo?.token || ""
    );

    try {
      const users = client.getUsers();
      return {
        content: users.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Display Name: ${user.displayName}}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to get all users: ${error.message}`);
      throw error;
    } finally {
      client.stopClient();
    }
  }
);

// Define the return type for processMessage
type ProcessedMessage =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

function getUserName(extra, domain: string): string | undefined {
  return `@${
    (extra.authInfo?.extra?.email as string)?.split("@")[0]
  }:${domain}`;
}

// Helper function to process messages
async function processMessage(
  event: sdk.MatrixEvent,
  matrixClient: MatrixClient | null
): Promise<ProcessedMessage | null> {
  if (!matrixClient) {
    throw new Error("Matrix client is not initialized.");
  }
  const content = event.getContent();
  if (event.getType() === EventType.RoomMessage && content) {
    if (content.msgtype === "m.text") {
      return {
        type: "text",
        text: String(content.body || ""),
      };
    } else if (content.msgtype === "m.image" && content.url) {
      try {
        const httpUrl = String(matrixClient.mxcUrlToHttp(content.url) || "");
        const response = await fetch(httpUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");
        return {
          type: "image",
          data: base64Data,
          mimeType: String(
            content.info?.mimetype || "application/octet-stream"
          ),
        };
      } catch (error: any) {
        console.error(`Failed to fetch image content: ${error.message}`);
        return null;
      }
    }
  }
  return null;
}

// Private method to create a Matrix client instance
async function createMatrixClient(
  homeserverUrl: string | undefined,
  userId: string | undefined,
  originalAccessToken: string
): Promise<MatrixClient> {
  if (!homeserverUrl) {
    throw new Error("Homeserver URL is required to create a Matrix client.");
  }
  if (!userId) {
    throw new Error("User ID is required to create a Matrix client.");
  }
  if (!originalAccessToken) {
    throw new Error(
      "Original access token is required for Matrix client authentication."
    );
  }

  const matrixAccessToken = await exchangeToken(
    keycloakUrl,
    matrixClientId,
    matrixClientSecret,
    originalAccessToken
  );

  const client = sdk.createClient({
    baseUrl: homeserverUrl,
    accessToken: matrixAccessToken,
    userId,
    fetchFn: async (
      input: URL | Request | string,
      init?: RequestInit | undefined
    ) => {
      const agent = new https.Agent({ rejectUnauthorized: false });
      return fetch(input, { ...(init || {}), agent });
    },
  });
  await client.startClient({ initialSyncLimit: 100 });
  // Wait for the initial sync to complete
  await new Promise<void>((resolve, reject) => {
    client.once(sdk.ClientEvent.Sync, (state) => {
      if (state === "PREPARED") resolve();
      else reject(new Error(`Sync failed with state: ${state}`));
    });
  });
  return client;
}

async function exchangeToken(
  keycloakUrl: string,
  clientId: string, // MCP server's client_id
  clientSecret: string, // MCP server's client_secret
  subjectToken: string // The original token from the MVC client
): Promise<string> {
  const tokenUrl = `${keycloakUrl}/protocol/openid-connect/token`;
  const params = new URLSearchParams();

  // --- Key for Token Exchange ---
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
  // params.append("resource", resourceUri); // The Matrix homeserver URL is the resource
  // You might also add "scope" here if specific scopes are needed for the Matrix API
  // params.append("scope", "openid profile email"); // Example Matrix-specific scopes if required by Keycloak for this resource

  params.append("audience", matrixClientId);

  console.log(`Performing token exchange with Keycloak at ${tokenUrl}`);
  try {
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Authenticate the MCP server itself as a confidential client to Keycloak
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
      body: params,
      agent: new https.Agent({ rejectUnauthorized: false }), // For local Keycloak with self-signed certs
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

export default server;
