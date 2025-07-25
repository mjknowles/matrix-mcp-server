import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import tool registration functions
// Tier 0 (Read-only tools)
import { registerRoomTools } from "./tools/tier0/rooms.js";
import { registerMessageTools } from "./tools/tier0/messages.js";
import { registerUserTools } from "./tools/tier0/users.js";
import { registerSearchTools } from "./tools/tier0/search.js";
import { registerNotificationTools } from "./tools/tier0/notifications.js";

// Tier 1 (Action tools)
import { registerMessagingTools } from "./tools/tier1/messaging.js";
import { registerRoomManagementTools } from "./tools/tier1/room-management.js";
import { registerRoomAdminTools } from "./tools/tier1/room-admin.js";

// Create MCP server instance
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

// Register all tool modules
// Tier 0: Read-only Matrix tools
registerRoomTools(server);        // list-joined-rooms, get-room-info, get-room-members
registerMessageTools(server);     // get-room-messages, get-messages-by-date, identify-active-users
registerUserTools(server);        // get-user-profile, get-my-profile, get-all-users
registerSearchTools(server);      // search-public-rooms
registerNotificationTools(server); // get-notification-counts, get-direct-messages

// Tier 1: Action Matrix tools
registerMessagingTools(server);       // send-message, send-direct-message
registerRoomManagementTools(server);  // create-room, join-room, leave-room, invite-user
registerRoomAdminTools(server);       // set-room-name, set-room-topic

export default server;