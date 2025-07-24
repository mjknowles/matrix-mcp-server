import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: Search public rooms
export const searchPublicRoomsHandler = async (
  { searchTerm, server, limit }: { searchTerm?: string; server?: string; limit: number },
  { requestInfo, authInfo }: any
): Promise<CallToolResult> => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
    const searchOptions: any = {
      limit,
      include_all_known_networks: true,
    };

    if (server) {
      searchOptions.server = server;
    }

    if (searchTerm) {
      searchOptions.filter = {
        generic_search_term: searchTerm,
      };
    }

    const publicRooms = await client.publicRooms(searchOptions);

    if (!publicRooms.chunk || publicRooms.chunk.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: searchTerm
              ? `No public rooms found matching "${searchTerm}"`
              : "No public rooms found",
          },
        ],
      };
    }

    const roomList = publicRooms.chunk.map((room: any) => {
      const name = room.name || "Unnamed Room";
      const topic = room.topic || "No topic";
      const members = room.num_joined_members || 0;
      const alias = room.canonical_alias || room.room_id;
      const avatar = room.avatar_url ? "Has avatar" : "No avatar";

      return {
        type: "text" as const,
        text: `${name} (${alias})
Topic: ${topic}
Members: ${members}
Avatar: ${avatar}
Room ID: ${room.room_id}`,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${publicRooms.chunk.length} public rooms${
            searchTerm ? ` matching "${searchTerm}"` : ""
          }:`,
        },
        ...roomList,
      ],
    };
  } catch (error: any) {
    console.error(`Failed to search public rooms: ${error.message}`);
    removeClientFromCache(matrixUserId, homeserverUrl);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Failed to search public rooms - ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

// Registration function
export const registerSearchTools: ToolRegistrationFunction = (server) => {
  // Tool: Search public rooms
  server.registerTool(
    "search-public-rooms",
    {
      title: "Search Public Matrix Rooms",
      description: "Search for public Matrix rooms that you can join, with optional filtering by name or topic",
      inputSchema: {
        searchTerm: z
          .string()
          .optional()
          .describe("Search term to filter rooms by name or topic"),
        server: z
          .string()
          .optional()
          .describe("Specific server to search rooms on (defaults to your homeserver)"),
        limit: z
          .number()
          .default(20)
          .describe("Maximum number of rooms to return (default: 20)"),
      },
    },
    searchPublicRoomsHandler
  );
};