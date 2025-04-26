# mcp_matrix_server.py

import asyncio
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

from matrix_client.client import MatrixClient, MatrixRequestError  #
from mcp.server.fastmcp import FastMCP, Context
import mcp.types as types

# --- Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- MCP Server Setup ---
# Initialize FastMCP server
mcp = FastMCP(
    name="matrix-mcp-server",  # Ensure the name matches your server's purpose
    dependencies=[],  # Adjust dependencies as needed
)

# FastAPI app setup
app = FastAPI()

class MatrixCredentials(BaseModel):
    homeserver_url: str
    user_id: Optional[str] = None
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    device_id: Optional[str] = None

@app.post("/connect")
async def connect(credentials: MatrixCredentials):
    try:
        result = await connect_matrix(
            homeserver_url=credentials.homeserver_url,
            user_id=credentials.user_id,
            token=credentials.token,
            username=credentials.username,
            password=credentials.password,
            device_id=credentials.device_id
        )
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Matrix Client State Management (Simplified) ---
# WARNING: This simple global state is NOT suitable for production.
# A real server needs proper session management to handle multiple users securely.
matrix_client_instance: Optional[MatrixClient] = None

# --- MCP Tools ---

@mcp.tool()
async def connect_matrix(
    homeserver_url: str,
    user_id: Optional[str] = None,
    token: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    device_id: Optional[str] = None,
    ctx: Context = Context()
) -> str:
    """
    Connects to a Matrix homeserver. Provide either a token or username/password.

    Args:
        homeserver_url: The base URL of the Matrix homeserver (e.g., https://matrix.org).
        user_id: Optional. The full Matrix User ID (e.g., @user:matrix.org). Required if using a token.
        token: Optional. Matrix access token.
        username: Optional. Matrix username for password login.
        password: Optional. Matrix password for password login.
        device_id: Optional. A unique ID for this device.
        ctx: MCP Context (automatically injected).
    """
    global matrix_client_instance
    if matrix_client_instance:
        # Optionally disconnect the old client or return an error/warning
        logger.warning("Matrix client already connected. Reconnecting.")
        try:
            # Attempt graceful stop if implementing background listening
            if hasattr(matrix_client_instance, 'stop_listener_thread'):
                 matrix_client_instance.stop_listener_thread() #
            if hasattr(matrix_client_instance, 'logout'):
                 await asyncio.to_thread(matrix_client_instance.logout) #
        except Exception as e:
            logger.error(f"Error logging out previous Matrix client: {e}")
        matrix_client_instance = None

    try:
        if token and homeserver_url:
            # Connect using token
            logger.info(f"Connecting to {homeserver_url} with token for user {user_id}")
            # We need user_id to initialize the client object state even with token
            # The client.py implementation fetches user_id via /whoami if token is provided
            # but let's instantiate it first. A better client.py might handle this internally.
            client = MatrixClient(base_url=homeserver_url, token=token, valid_cert_check=True, cache_level=CACHE.ALL) #
            # Verify connection by getting user ID again or doing a sync
            await asyncio.to_thread(client._sync) # Initial sync
            matrix_client_instance = client
            return f"Successfully connected to {homeserver_url} as {client.user_id}."
        elif username and password and homeserver_url:
            # Connect using username/password
            logger.info(f"Connecting to {homeserver_url} with username {username}")
            client = MatrixClient(base_url=homeserver_url, valid_cert_check=True, cache_level=CACHE.ALL) #
            # client.py's login function handles token setting and initial sync
            await asyncio.to_thread(
                client.login, #
                username=username,
                password=password,
                sync=True, # Perform initial sync after login
                device_id=device_id
            )
            matrix_client_instance = client
            return f"Successfully logged in and connected to {homeserver_url} as {client.user_id}."
        else:
            raise ValueError("Insufficient details. Provide homeserver_url and either token or username/password.")

    except MatrixRequestError as e:
        logger.error(f"Matrix connection error: {e.code} - {e.content}")
        matrix_client_instance = None
        # Returning error details in the result might be better for the client
        raise ConnectionError(f"Matrix connection failed: {e.code} - {e.content}") from e
    except Exception as e:
        logger.exception("Failed to connect to Matrix.")
        matrix_client_instance = None
        raise ConnectionError(f"An unexpected error occurred during Matrix connection: {e}") from e

@mcp.tool()
async def list_joined_rooms(ctx: Context = Context()) -> List[Dict[str, str]]:
    """
    Lists the rooms the connected Matrix user has joined.

    Args:
        ctx: MCP Context (automatically injected).

    Returns:
        A list of dictionaries, each containing 'room_id' and 'name' (if available).
    """
    if not matrix_client_instance:
        raise ConnectionError("Not connected to Matrix. Use connect_matrix first.")

    try:
        # The client.py populates self.rooms during sync
        # Ensure an up-to-date sync before accessing
        await asyncio.to_thread(matrix_client_instance._sync) #

        room_list = []
        # client.rooms is a dict {room_id: Room}
        for room_id, room_obj in matrix_client_instance.rooms.items():
            # Attempt to get a display name for the room
            # Room object in client.py might have methods like get_display_name()
            # or attributes like display_name, canonical_alias. Assuming a hypothetical `get_display_name`
            # based on common client library patterns. You'll need to adapt this based on client.py's Room class.
            name = room_id # Default to ID
            if hasattr(room_obj, 'display_name') and room_obj.display_name:
                 name = room_obj.display_name
            elif hasattr(room_obj, 'canonical_alias') and room_obj.canonical_alias:
                 name = room_obj.canonical_alias

            room_list.append({"room_id": room_id, "name": name})
        return room_list
    except Exception as e:
        logger.exception("Failed to list Matrix rooms.")
        raise RuntimeError(f"Failed to list rooms: {e}") from e

@mcp.tool()
async def get_room_messages(room_id: str, limit: int = 20, ctx: Context = Context()) -> List[Dict[str, Any]]:
    """
    Gets the most recent messages from a specific Matrix room.

    Args:
        room_id: The ID of the room to fetch messages from.
        limit: The maximum number of messages to retrieve.
        ctx: MCP Context (automatically injected).

    Returns:
        A list of message event dictionaries.
    """
    if not matrix_client_instance:
        raise ConnectionError("Not connected to Matrix. Use connect_matrix first.")
    if room_id not in matrix_client_instance.rooms:
        # Try to join or check if it's an invite? For now, assume joined.
         # Or maybe sync first to populate rooms?
        await asyncio.to_thread(matrix_client_instance._sync) # Refresh room list
        if room_id not in matrix_client_instance.rooms:
             raise ValueError(f"Not a member of room {room_id} or room not found.")

    room = matrix_client_instance.rooms[room_id]

    try:
        # client.py Room object stores events fetched via _sync
        # It might need a dedicated method like get_recent_events or fetch_more_messages.
        # Let's simulate fetching or accessing cached events.
        # The _sync method fetches timeline events, but accessing them directly might need
        # specific Room methods in client.py. Assuming `room.events` exists or adapting.

        # Perform a sync to ensure recent messages are potentially available
        await asyncio.to_thread(matrix_client_instance._sync) #

        # Check if the room object has stored events after sync
        events = []
        if hasattr(room, 'events') and isinstance(room.events, list):
             # Get the last 'limit' events, assuming newest are appended
            events = room.events[-limit:]
        else:
             # Fallback or alternative: If Room has a method to fetch messages explicitly?
             # E.g., events = await asyncio.to_thread(room.get_messages, limit=limit)
             # This depends heavily on the actual implementation of Room in client.py
             # For now, we'll rely on the sync having populated *some* state/timeline.
             logger.warning(f"Room object for {room_id} doesn't have a standard 'events' list. Returning empty. Check Room class implementation in client.py.")
             # Attempting a sync might populate internal state even if not directly exposed.

        # Minimal formatting, returning raw-ish event dictionary
        # A production server might format this more nicely.
        formatted_events = []
        for event in events:
             # Ensure event is a dictionary before proceeding
            if isinstance(event, dict):
                formatted_events.append({
                    "event_id": event.get("event_id"),
                    "sender": event.get("sender"),
                    "type": event.get("type"),
                    "origin_server_ts": event.get("origin_server_ts"),
                    "content": event.get("content", {}), # Ensure content exists
                 })
            else:
                 logger.warning(f"Skipping non-dictionary event in room {room_id}: {event}")


        return formatted_events

    except Exception as e:
        logger.exception(f"Failed to get messages for room {room_id}.")
        raise RuntimeError(f"Failed to get messages for room {room_id}: {e}") from e


@mcp.tool()
async def get_missed_messages(room_id: str, since_token: Optional[str] = None, ctx: Context = Context()) -> Dict[str, Any]:
    """
    Gets messages in a room since a specific point (sync token).
    Useful for catching up.

    Args:
        room_id: The ID of the room to fetch messages from.
        since_token: Optional. The sync token from a previous sync response.
                     If omitted, gets messages since the last server sync.
        ctx: MCP Context (automatically injected).

    Returns:
        A dictionary containing 'messages' (list of events) and 'next_sync_token'.
    """
    if not matrix_client_instance:
        raise ConnectionError("Not connected to Matrix. Use connect_matrix first.")

    # Store the current global sync token before performing a room-specific sync
    # Note: Matrix API doesn't directly support room-specific sync with a 'since' token easily
    # via the high-level client.py methods shown. A full sync is usually done.
    # We can *filter* the result of a full sync.
    # A better approach might involve lower-level API calls or if client.py supports it.

    # Use the provided 'since_token' if available, otherwise use the client's current token
    current_sync_token = since_token or matrix_client_instance.sync_token
    logger.info(f"Syncing room {room_id} since token: {current_sync_token}")

    try:
        # Perform a sync. We need to filter the response manually.
        # The `sync` function takes a filter, but applying it *only* to one room and
        # using 'since' requires crafting a specific filter JSON.
        # Let's do a standard sync and extract the relevant room's timeline.

        # This sync updates the *global* sync token. Store the one *before* the sync.
        token_before_sync = matrix_client_instance.sync_token
        sync_response = await asyncio.to_thread(matrix_client_instance.api.sync, current_sync_token, timeout_ms=10000) # Use lower level API if needed

        next_batch_token = sync_response.get("next_batch")
        matrix_client_instance.sync_token = next_batch_token # Update global token

        room_data = sync_response.get("rooms", {}).get("join", {}).get(room_id, {})
        timeline_events = room_data.get("timeline", {}).get("events", [])

        # Minimal formatting
        formatted_events = []
        for event in timeline_events:
             if isinstance(event, dict):
                formatted_events.append({
                    "event_id": event.get("event_id"),
                    "sender": event.get("sender"),
                    "type": event.get("type"),
                    "origin_server_ts": event.get("origin_server_ts"),
                    "content": event.get("content", {}),
                 })
             else:
                  logger.warning(f"Skipping non-dictionary event in room {room_id} during sync: {event}")


        logger.info(f"Found {len(formatted_events)} new events in room {room_id}. Next token: {next_batch_token}")

        return {
            "messages": formatted_events,
            "next_sync_token": next_batch_token
        }

    except Exception as e:
        logger.exception(f"Failed to sync messages for room {room_id}.")
        # Restore previous sync token on failure? Depends on desired behaviour.
        matrix_client_instance.sync_token = token_before_sync
        raise RuntimeError(f"Failed to sync messages for room {room_id}: {e}") from e


@mcp.tool()
async def get_room_members(room_id: str, ctx: Context = Context()) -> List[Dict[str, str]]:
    """
    Gets the list of members currently in a specific Matrix room.

    Args:
        room_id: The ID of the room.
        ctx: MCP Context (automatically injected).

    Returns:
        A list of dictionaries, each containing 'user_id' and 'display_name'.
    """
    if not matrix_client_instance:
        raise ConnectionError("Not connected to Matrix. Use connect_matrix first.")
    if room_id not in matrix_client_instance.rooms:
        await asyncio.to_thread(matrix_client_instance._sync) # Refresh room list
        if room_id not in matrix_client_instance.rooms:
             raise ValueError(f"Not a member of room {room_id} or room not found.")

    room = matrix_client_instance.rooms[room_id]

    try:
        # client.py Room object likely has a way to get members, e.g., room.get_joined_members()
        # or accessing a 'members' attribute updated by sync. Adapt based on client.py.
        # Assuming a hypothetical `get_joined_members()` method exists on the Room object.
        if not hasattr(room, 'get_joined_members'):
             logger.error(f"Room object for {room_id} lacks expected 'get_joined_members' method. Cannot fetch members.")
             # Try syncing state as a fallback?
             await asyncio.to_thread(room._fetch_members) # Assuming another hypothetical method
             if not hasattr(room, 'get_joined_members'): # Check again after potential fetch
                  raise NotImplementedError("Matrix client Room object doesn't support member listing as expected.")


        members = await asyncio.to_thread(room.get_joined_members) # This call might be sync or async in client.py

        member_list = []
        for user in members:
            # User object in client.py should have attributes like user_id, displayname
             if hasattr(user, 'user_id'):
                member_list.append({
                    "user_id": user.user_id,
                    # Use displayname if available, else user_id
                    "display_name": getattr(user, 'displayname', user.user_id)
                 })
             else:
                  logger.warning(f"Found member object without user_id in room {room_id}: {user}")


        return member_list

    except Exception as e:
        logger.exception(f"Failed to get members for room {room_id}.")
        raise RuntimeError(f"Failed to get members for room {room_id}: {e}") from e


# --- Server Execution ---
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Matrix MCP Server with FastAPI...")
    uvicorn.run(app, host="0.0.0.0", port=8000)