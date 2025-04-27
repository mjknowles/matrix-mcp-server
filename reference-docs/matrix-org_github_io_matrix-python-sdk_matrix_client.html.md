# Consolidated Documentation for https://matrix-org.github.io/matrix-python-sdk/matrix_client.html

This file contains content from multiple pages related to https://matrix-org.github.io/matrix-python-sdk/matrix_client.html.
Each section represents a different page that was crawled.

---


## Untitled Page
URL: https://matrix-org.github.io/matrix-python-sdk/matrix_client.html

[ Matrix Python SDK ](index.html)

0.3.2 

  * [matrix_client package](#)
    * [matrix_client.client](#module-matrix_client.client)
    * [matrix_client.api](#module-matrix_client.api)
    * [matrix_client.user](#module-matrix_client.user)
    * [matrix_client.room](#module-matrix_client.room)
    * [matrix_client.checks](#module-matrix_client.checks)
    * [matrix_client.errors](#module-matrix_client.errors)



[Matrix Python SDK](index.html)

  * [Docs](index.html) »
  * matrix_client package
  * [ View page source](_sources/matrix_client.txt)



# matrix_client package[¶](#matrix-client-package "Permalink to this headline")

## matrix_client.client[¶](#module-matrix_client.client "Permalink to this headline")

_class_`matrix_client.client.``CACHE`[[source]](_modules/matrix_client/client.html#CACHE)[¶](#matrix_client.client.CACHE "Permalink to this definition")
    

Bases: `int`

`ALL` _= 1_[¶](#matrix_client.client.CACHE.ALL "Permalink to this definition")

`NONE` _= -1_[¶](#matrix_client.client.CACHE.NONE "Permalink to this definition")

`SOME` _= 0_[¶](#matrix_client.client.CACHE.SOME "Permalink to this definition")

_class_`matrix_client.client.``MatrixClient`(_base_url_ , _token=None_ , _user_id=None_ , _valid_cert_check=True_ , _sync_filter_limit=20_ , _cache_level=1_)[[source]](_modules/matrix_client/client.html#MatrixClient)[¶](#matrix_client.client.MatrixClient "Permalink to this definition")
    

Bases: `object`

The client API for Matrix. For the raw HTTP calls, see MatrixHttpApi.

Parameters:| 

  * **base_url** (_str_) – The url of the HS preceding /_matrix. e.g. (ex: <https://localhost:8008> )
  * **token** (_Optional[str]_) – If you have an access token supply it here.
  * **user_id** (_Optional[str]_) – You must supply the user_id (as obtained when initially logging in to obtain the token) if supplying a token; otherwise, ignored.
  * **valid_cert_check** (_bool_) – Check the homeservers certificate on connections?

  
---|---  
Returns:| MatrixClient  
Raises:| MatrixRequestError, ValueError  
  
Examples

Create a new user and send a message:

```
client = MatrixClient("https://matrix.org") token = client.register_with_password(username="foobar", password="monkey") room = client.create_room("myroom") room.send_image(file_like_object) 
```

Send a message with an already logged in user:

```
client = MatrixClient("https://matrix.org", token="foobar", user_id="@foobar:matrix.org") client.add_listener(func) # NB: event stream callback client.rooms[0].add_listener(func) # NB: callbacks just for this room. room = client.join_room("#matrix:matrix.org") response = room.send_text("Hello!") response = room.kick("@bob:matrix.org") 
```

Incoming event callbacks (scopes):

```
def user_callback(user, incoming_event): pass def room_callback(room, incoming_event): pass def global_callback(incoming_event): pass 
```

`add_ephemeral_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_ephemeral_listener)[¶](#matrix_client.client.MatrixClient.add_ephemeral_listener "Permalink to this definition")
    

Add an ephemeral listener that will send a callback when the client recieves an ephemeral event.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an ephemeral event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_invite_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_invite_listener)[¶](#matrix_client.client.MatrixClient.add_invite_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client receives an invite.

Parameters:| **callback** (_func(room_id, state_) – Callback called when an invite arrives.  
---|---  
  
`add_leave_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_leave_listener)[¶](#matrix_client.client.MatrixClient.add_leave_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client has left a room.

Parameters:| 

  * **callback** (_func(room_id, room_) – Callback called when the client
  * **left a room.** (_has_) – 

  
---|---  
  
`add_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_listener)[¶](#matrix_client.client.MatrixClient.add_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client recieves an event.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_presence_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_presence_listener)[¶](#matrix_client.client.MatrixClient.add_presence_listener "Permalink to this definition")
    

Add a presence listener that will send a callback when the client receives a presence update.

Parameters:| **callback** (_func(roomchunk_) – Callback called when a presence update arrives.  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`create_room`(_alias=None_ , _is_public=False_ , _invitees=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.create_room)[¶](#matrix_client.client.MatrixClient.create_room "Permalink to this definition")
    

Create a new room on the homeserver.

Parameters:| 

  * **alias** (_str_) – The canonical_alias of the room.
  * **is_public** (_bool_) – The public/private visibility of the room.
  * **invitees** (_str[]_) – A set of user ids to invite into the room.

  
---|---  
Returns:| Room  
Raises:| `MatrixRequestError`  
  
`get_rooms`()[[source]](_modules/matrix_client/client.html#MatrixClient.get_rooms)[¶](#matrix_client.client.MatrixClient.get_rooms "Permalink to this definition")
    

Return a dict of {room_id: Room objects} that the user has joined.

Returns:| Rooms the user has joined.  
---|---  
Return type:| Room{}  
  
`get_sync_token`()[[source]](_modules/matrix_client/client.html#MatrixClient.get_sync_token)[¶](#matrix_client.client.MatrixClient.get_sync_token "Permalink to this definition")

`get_user`(_user_id_)[[source]](_modules/matrix_client/client.html#MatrixClient.get_user)[¶](#matrix_client.client.MatrixClient.get_user "Permalink to this definition")
    

Return a User by their id.

NOTE: This function only returns a user object, it does not verify
    the user with the Home Server.
Parameters:| **user_id** (_str_) – The matrix user id of a user.  
---|---  
  
`join_room`(_room_id_or_alias_)[[source]](_modules/matrix_client/client.html#MatrixClient.join_room)[¶](#matrix_client.client.MatrixClient.join_room "Permalink to this definition")
    

Join a room.

Parameters:| **room_id_or_alias** (_str_) – Room ID or an alias.  
---|---  
Returns:| Room  
Raises:| `MatrixRequestError`  
  
`listen_for_events`(_timeout_ms=30000_)[[source]](_modules/matrix_client/client.html#MatrixClient.listen_for_events)[¶](#matrix_client.client.MatrixClient.listen_for_events "Permalink to this definition")
    

This function just calls _sync()

In a future version of this sdk, this function will be deprecated and _sync method will be renamed sync with the intention of it being called by downstream code.

Parameters:| **timeout_ms** (_int_) – How long to poll the Home Server for before retrying.  
---|---  
  
`listen_forever`(_timeout_ms=30000_ , _exception_handler=None_ , _bad_sync_timeout=5_)[[source]](_modules/matrix_client/client.html#MatrixClient.listen_forever)[¶](#matrix_client.client.MatrixClient.listen_forever "Permalink to this definition")
    

Keep listening for events forever.

Parameters:| 

  * **timeout_ms** (_int_) – How long to poll the Home Server for before retrying.
  * **exception_handler** (_func(exception_) – Optional exception handler function which can be used to handle exceptions in the caller thread.
  * **bad_sync_timeout** (_int_) – Base time to wait after an error before retrying. Will be increased according to exponential backoff.

  
---|---  
  
`login`(_username_ , _password_ , _limit=10_ , _sync=True_ , _device_id=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.login)[¶](#matrix_client.client.MatrixClient.login "Permalink to this definition")
    

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password
  * **limit** (_int_) – Deprecated. How many messages to return when syncing. This will be replaced by a filter API in a later release.
  * **sync** (_bool_) – Optional. Whether to initiate a /sync request after logging in.
  * **device_id** (_str_) – Optional. ID of the client device. The server will auto-generate a device_id if this is not specified.

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`login_with_password`(_username_ , _password_ , _limit=10_)[[source]](_modules/matrix_client/client.html#MatrixClient.login_with_password)[¶](#matrix_client.client.MatrixClient.login_with_password "Permalink to this definition")
    

Deprecated. Use `login` with `sync=True`.

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password
  * **limit** (_int_) – Deprecated. How many messages to return when syncing. This will be replaced by a filter API in a later release.

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`login_with_password_no_sync`(_username_ , _password_)[[source]](_modules/matrix_client/client.html#MatrixClient.login_with_password_no_sync)[¶](#matrix_client.client.MatrixClient.login_with_password_no_sync "Permalink to this definition")
    

Deprecated. Use `login` with `sync=False`.

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`logout`()[[source]](_modules/matrix_client/client.html#MatrixClient.logout)[¶](#matrix_client.client.MatrixClient.logout "Permalink to this definition")
    

Logout from the homeserver.

`register_as_guest`()[[source]](_modules/matrix_client/client.html#MatrixClient.register_as_guest)[¶](#matrix_client.client.MatrixClient.register_as_guest "Permalink to this definition")
    

Register a guest account on this HS. Note: HS must have guest registration enabled. :returns: Access Token :rtype: str

Raises:| `MatrixRequestError`  
---|---  
  
`register_with_password`(_username_ , _password_)[[source]](_modules/matrix_client/client.html#MatrixClient.register_with_password)[¶](#matrix_client.client.MatrixClient.register_with_password "Permalink to this definition")
    

Register for a new account on this HS.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password

  
---|---  
Returns:| Access Token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`remove_ephemeral_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_ephemeral_listener)[¶](#matrix_client.client.MatrixClient.remove_ephemeral_listener "Permalink to this definition")
    

Remove ephemeral listener with given uid.

Parameters:| **uuid.UUID** – Unique id of the listener to remove.  
---|---  
  
`remove_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_listener)[¶](#matrix_client.client.MatrixClient.remove_listener "Permalink to this definition")
    

Remove listener with given uid.

Parameters:| **uuid.UUID** – Unique id of the listener to remove.  
---|---  
  
`remove_presence_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_presence_listener)[¶](#matrix_client.client.MatrixClient.remove_presence_listener "Permalink to this definition")
    

Remove presence listener with given uid

Parameters:| **uuid.UUID** – Unique id of the listener to remove  
---|---  
  
`remove_room_alias`(_room_alias_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_room_alias)[¶](#matrix_client.client.MatrixClient.remove_room_alias "Permalink to this definition")
    

Remove mapping of an alias

Parameters:| **room_alias** (_str_) – The alias to be removed.  
---|---  
Returns:| True if the alias is removed, False otherwise.  
Return type:| bool  
  
`set_sync_token`(_token_)[[source]](_modules/matrix_client/client.html#MatrixClient.set_sync_token)[¶](#matrix_client.client.MatrixClient.set_sync_token "Permalink to this definition")

`set_user_id`(_user_id_)[[source]](_modules/matrix_client/client.html#MatrixClient.set_user_id)[¶](#matrix_client.client.MatrixClient.set_user_id "Permalink to this definition")

`should_listen` _= None_[¶](#matrix_client.client.MatrixClient.should_listen "Permalink to this definition")
    

Time to wait before attempting a /sync request after failing.

`start_listener_thread`(_timeout_ms=30000_ , _exception_handler=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.start_listener_thread)[¶](#matrix_client.client.MatrixClient.start_listener_thread "Permalink to this definition")
    

Start a listener thread to listen for events in the background.

Parameters:| 

  * **timeout** (_int_) – How long to poll the Home Server for before retrying.
  * **exception_handler** (_func(exception_) – Optional exception handler function which can be used to handle exceptions in the caller thread.

  
---|---  
  
`stop_listener_thread`()[[source]](_modules/matrix_client/client.html#MatrixClient.stop_listener_thread)[¶](#matrix_client.client.MatrixClient.stop_listener_thread "Permalink to this definition")
    

Stop listener thread running in the background

`upload`(_content_ , _content_type_)[[source]](_modules/matrix_client/client.html#MatrixClient.upload)[¶](#matrix_client.client.MatrixClient.upload "Permalink to this definition")
    

Upload content to the home server and recieve a MXC url.

Parameters:| 

  * **content** (_bytes_) – The data of the content.
  * **content_type** (_str_) – The mimetype of the content.

  
---|---  
Raises:| 

  * `MatrixUnexpectedResponse` – If the homeserver gave a strange response
  * `MatrixRequestError` – If the upload failed for some reason.

  
  
## matrix_client.api[¶](#module-matrix_client.api "Permalink to this headline")

_class_`matrix_client.api.``MatrixHttpApi`(_base_url_ , _token=None_ , _identity=None_ , _default_429_wait_ms=5000_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi)[¶](#matrix_client.api.MatrixHttpApi "Permalink to this definition")
    

Bases: `object`

Contains all raw Matrix HTTP Client-Server API calls.

For room and sync handling, consider using MatrixClient.

Parameters:| 

  * **base_url** (_str_) – The home server URL e.g. ‘<http://localhost:8008>‘
  * **token** (_str_) – Optional. The client’s access token.
  * **identity** (_str_) – Optional. The mxid to act as (For application services only).
  * **default_429_wait_ms** (_int_) – Optional. Time in millseconds to wait before retrying a request when server returns a HTTP 429 response without a ‘retry_after_ms’ key.

  
---|---  
  
Examples

Create a client and send a message:

```
matrix = MatrixHttpApi("https://matrix.org", token="foobar") response = matrix.sync() response = matrix.send_message("!roomid:matrix.org", "Hello!") 
```

`add_user_tag`(_user_id_ , _room_id_ , _tag_ , _order=None_ , _body=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.add_user_tag)[¶](#matrix_client.api.MatrixHttpApi.add_user_tag "Permalink to this definition")

`ban_user`(_room_id_ , _user_id_ , _reason=''_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.ban_user)[¶](#matrix_client.api.MatrixHttpApi.ban_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/ban

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the banee(sic)
  * **reason** (_str_) – The reason for this ban

  
---|---  
  
`claim_keys`(_key_request_ , _timeout=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.claim_keys)[¶](#matrix_client.api.MatrixHttpApi.claim_keys "Permalink to this definition")
    

Claims one-time keys for use in pre-key messages.

Parameters:| 

  * **key_request** (_dict_) – The keys to be claimed. Format should be <user_id>: { <device_id>: <algorithm> }.
  * **timeout** (_int_) – Optional. The time (in milliseconds) to wait when downloading keys from remote servers.

  
---|---  
  
`create_filter`(_user_id_ , _filter_params_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.create_filter)[¶](#matrix_client.api.MatrixHttpApi.create_filter "Permalink to this definition")

`create_room`(_alias=None_ , _is_public=False_ , _invitees=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.create_room)[¶](#matrix_client.api.MatrixHttpApi.create_room "Permalink to this definition")
    

Perform /createRoom.

Parameters:| 

  * **alias** (_str_) – Optional. The room alias name to set for this room.
  * **is_public** (_bool_) – Optional. The public/private visibility.
  * **invitees** (_list <str>_) – Optional. The list of user IDs to invite.

  
---|---  
  
`delete_device`(_auth_body_ , _device_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.delete_device)[¶](#matrix_client.api.MatrixHttpApi.delete_device "Permalink to this definition")
    

Deletes the given device, and invalidates any access token associated with it.

NOTE: This endpoint uses the User-Interactive Authentication API.

Parameters:| 

  * **auth_body** (_dict_) – Authentication params.
  * **device_id** (_str_) – The device ID of the device to delete.

  
---|---  
  
`delete_devices`(_auth_body_ , _devices_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.delete_devices)[¶](#matrix_client.api.MatrixHttpApi.delete_devices "Permalink to this definition")
    

Bulk deletion of devices.

NOTE: This endpoint uses the User-Interactive Authentication API.

Parameters:| 

  * **auth_body** (_dict_) – Authentication params.
  * **devices** (_list_) – List of device ID”s to delete.

  
---|---  
  
`event_stream`(_from_token_ , _timeout=30000_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.event_stream)[¶](#matrix_client.api.MatrixHttpApi.event_stream "Permalink to this definition")
    

Deprecated. Use sync instead. Performs /events

Parameters:| 

  * **from_token** (_str_) – The ‘from’ query parameter.
  * **timeout** (_int_) – Optional. The ‘timeout’ query parameter.

  
---|---  
  
`forget_room`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.forget_room)[¶](#matrix_client.api.MatrixHttpApi.forget_room "Permalink to this definition")
    

Perform POST /rooms/$room_id/forget

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_avatar_url`(_user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_avatar_url)[¶](#matrix_client.api.MatrixHttpApi.get_avatar_url "Permalink to this definition")

`get_device`(_device_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_device)[¶](#matrix_client.api.MatrixHttpApi.get_device "Permalink to this definition")
    

Gets information on a single device, by device id.

`get_devices`()[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_devices)[¶](#matrix_client.api.MatrixHttpApi.get_devices "Permalink to this definition")
    

Gets information about all devices for the current user.

`get_display_name`(_user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_display_name)[¶](#matrix_client.api.MatrixHttpApi.get_display_name "Permalink to this definition")

`get_download_url`(_mxcurl_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_download_url)[¶](#matrix_client.api.MatrixHttpApi.get_download_url "Permalink to this definition")

`get_emote_body`(_text_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_emote_body)[¶](#matrix_client.api.MatrixHttpApi.get_emote_body "Permalink to this definition")

`get_filter`(_user_id_ , _filter_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_filter)[¶](#matrix_client.api.MatrixHttpApi.get_filter "Permalink to this definition")

`get_membership`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_membership)[¶](#matrix_client.api.MatrixHttpApi.get_membership "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.member/$user_id

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID

  
---|---  
  
`get_power_levels`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_power_levels)[¶](#matrix_client.api.MatrixHttpApi.get_power_levels "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.power_levels

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_room_id`(_room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_id)[¶](#matrix_client.api.MatrixHttpApi.get_room_id "Permalink to this definition")
    

Get room id from its alias

Parameters:| **room_alias** (_str_) – The room alias name.  
---|---  
Returns:| Wanted room’s id.  
  
`get_room_members`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_members)[¶](#matrix_client.api.MatrixHttpApi.get_room_members "Permalink to this definition")
    

Get the list of members for this room.

Parameters:| **room_id** (_str_) – The room to get the member events for.  
---|---  
  
`get_room_messages`(_room_id_ , _token_ , _direction_ , _limit=10_ , _to=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_messages)[¶](#matrix_client.api.MatrixHttpApi.get_room_messages "Permalink to this definition")
    

Perform GET /rooms/{roomId}/messages.

Parameters:| 

  * **room_id** (_str_) – The room’s id.
  * **token** (_str_) – The token to start returning events from.
  * **direction** (_str_) – The direction to return events from. One of: [“b”, “f”].
  * **limit** (_int_) – The maximum number of events to return.
  * **to** (_str_) – The token to stop returning events at.

  
---|---  
  
`get_room_name`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_name)[¶](#matrix_client.api.MatrixHttpApi.get_room_name "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.name :param room_id: The room ID :type room_id: str

`get_room_state`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_state)[¶](#matrix_client.api.MatrixHttpApi.get_room_state "Permalink to this definition")
    

Perform GET /rooms/$room_id/state

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_room_topic`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_topic)[¶](#matrix_client.api.MatrixHttpApi.get_room_topic "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.topic :param room_id: The room ID :type room_id: str

`get_text_body`(_text_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_text_body)[¶](#matrix_client.api.MatrixHttpApi.get_text_body "Permalink to this definition")

`get_user_tags`(_user_id_ , _room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_user_tags)[¶](#matrix_client.api.MatrixHttpApi.get_user_tags "Permalink to this definition")

`initial_sync`(_limit=1_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.initial_sync)[¶](#matrix_client.api.MatrixHttpApi.initial_sync "Permalink to this definition")
    

Warning

Deprecated. Use sync instead.

Perform /initialSync.

Parameters:| **limit** (_int_) – The limit= param to provide.  
---|---  
  
`invite_user`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.invite_user)[¶](#matrix_client.api.MatrixHttpApi.invite_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/invite

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the invitee

  
---|---  
  
`join_room`(_room_id_or_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.join_room)[¶](#matrix_client.api.MatrixHttpApi.join_room "Permalink to this definition")
    

Performs /join/$room_id

Parameters:| **room_id_or_alias** (_str_) – The room ID or room alias to join.  
---|---  
  
`key_changes`(_from_token_ , _to_token_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.key_changes)[¶](#matrix_client.api.MatrixHttpApi.key_changes "Permalink to this definition")
    

Gets a list of users who have updated their device identity keys.

Parameters:| 

  * **from_token** (_str_) – The desired start point of the list. Should be the next_batch field from a response to an earlier call to /sync.
  * **to_token** (_str_) – The desired end point of the list. Should be the next_batch field from a recent call to /sync - typically the most recent such call.

  
---|---  
  
`kick_user`(_room_id_ , _user_id_ , _reason=''_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.kick_user)[¶](#matrix_client.api.MatrixHttpApi.kick_user "Permalink to this definition")
    

Calls set_membership with membership=”leave” for the user_id provided

`leave_room`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.leave_room)[¶](#matrix_client.api.MatrixHttpApi.leave_room "Permalink to this definition")
    

Perform POST /rooms/$room_id/leave

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`login`(_login_type_ , _**kwargs_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.login)[¶](#matrix_client.api.MatrixHttpApi.login "Permalink to this definition")
    

Perform /login.

Parameters:| 

  * **login_type** (_str_) – The value for the ‘type’ key.
  * ****kwargs** – Additional key/values to add to the JSON submitted.

  
---|---  
  
`logout`()[[source]](_modules/matrix_client/api.html#MatrixHttpApi.logout)[¶](#matrix_client.api.MatrixHttpApi.logout "Permalink to this definition")
    

Perform /logout.

`media_upload`(_content_ , _content_type_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.media_upload)[¶](#matrix_client.api.MatrixHttpApi.media_upload "Permalink to this definition")

`query_keys`(_user_devices_ , _timeout=None_ , _token=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.query_keys)[¶](#matrix_client.api.MatrixHttpApi.query_keys "Permalink to this definition")
    

Query HS for public keys by user and optionally device.

Parameters:| 

  * **user_devices** (_dict_) – The devices whose keys to download. Should be formatted as <user_id>: [<device_ids>]. No device_ids indicates all devices for the corresponding user.
  * **timeout** (_int_) – Optional. The time (in milliseconds) to wait when downloading keys from remote servers.
  * **token** (_str_) – Optional. If the client is fetching keys as a result of a device update received in a sync request, this should be the ‘since’ token of that sync request, or any later sync token.

  
---|---  
  
`redact_event`(_room_id_ , _event_id_ , _reason=None_ , _txn_id=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.redact_event)[¶](#matrix_client.api.MatrixHttpApi.redact_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/redact/$event_id/$txn_id/

Parameters:| 

  * **room_id** (_str_) – The room ID to redact the message event in.
  * **event_id** (_str_) – The event id to redact.
  * **reason** (_str_) – Optional. The reason the message was redacted.
  * **txn_id** (_int_) – Optional. The transaction ID to use.
  * **timestamp** (_int_) – Optional. Set origin_server_ts (For application services only)

  
---|---  
  
`register`(_content=None_ , _kind='user'_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.register)[¶](#matrix_client.api.MatrixHttpApi.register "Permalink to this definition")
    

Performs /register.

Parameters:| 

  * **content** (_dict_) – The request payload. Should be specified for all non-guest registrations. username (string): The local part of the desired Matrix ID. If omitted, the homeserver MUST generate a Matrix ID local part. bind_email (boolean): If true, the server binds the email used for authentication to the Matrix ID with the ID Server. _Email Registration not currently supported_ password (string): Required. The desired password for the account. auth (dict): Authentication Data session (string): The value of the session key given by the homeserver. type (string): Required. The login type that the client is attempting to complete. “m.login.dummy” is the only non-interactive type.
  * **kind** (_str_) – Specify kind=”guest” to register as guest.

  
---|---  
  
`remove_room_alias`(_room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.remove_room_alias)[¶](#matrix_client.api.MatrixHttpApi.remove_room_alias "Permalink to this definition")
    

Remove mapping of an alias

Parameters:| **room_alias** (_str_) – The alias to be removed.  
---|---  
Raises:| `MatrixRequestError`  
  
`remove_user_tag`(_user_id_ , _room_id_ , _tag_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.remove_user_tag)[¶](#matrix_client.api.MatrixHttpApi.remove_user_tag "Permalink to this definition")

`send_content`(_room_id_ , _item_url_ , _item_name_ , _msg_type_ , _extra_information=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_content)[¶](#matrix_client.api.MatrixHttpApi.send_content "Permalink to this definition")

`send_emote`(_room_id_ , _text_content_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_emote)[¶](#matrix_client.api.MatrixHttpApi.send_emote "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message with m.emote msgtype

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.emote body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_location`(_room_id_ , _geo_uri_ , _name_ , _thumb_url=None_ , _thumb_info=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_location)[¶](#matrix_client.api.MatrixHttpApi.send_location "Permalink to this definition")
    

Send m.location message event

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **geo_uri** (_str_) – The geo uri representing the location.
  * **name** (_str_) – Description for the location.
  * **thumb_url** (_str_) – URL to the thumbnail of the location.
  * **thumb_info** (_dict_) – Metadata about the thumbnail, type ImageInfo.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_message`(_room_id_ , _text_content_ , _msgtype='m.text'_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_message)[¶](#matrix_client.api.MatrixHttpApi.send_message "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.text body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_message_event`(_room_id_ , _event_type_ , _content_ , _txn_id=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_message_event)[¶](#matrix_client.api.MatrixHttpApi.send_message_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/$event_type

Parameters:| 

  * **room_id** (_str_) – The room ID to send the message event in.
  * **event_type** (_str_) – The event type to send.
  * **content** (_dict_) – The JSON content to send.
  * **txn_id** (_int_) – Optional. The transaction ID to use.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_notice`(_room_id_ , _text_content_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_notice)[¶](#matrix_client.api.MatrixHttpApi.send_notice "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message with m.notice msgtype

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.notice body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_state_event`(_room_id_ , _event_type_ , _content_ , _state_key=''_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_state_event)[¶](#matrix_client.api.MatrixHttpApi.send_state_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/$event_type

Parameters:| 

  * **room_id** (_str_) – The room ID to send the state event in.
  * **event_type** (_str_) – The state event type to send.
  * **content** (_dict_) – The JSON content to send.
  * **state_key** (_str_) – Optional. The state key for the event.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_to_device`(_event_type_ , _messages_ , _txn_id=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_to_device)[¶](#matrix_client.api.MatrixHttpApi.send_to_device "Permalink to this definition")
    

Sends send-to-device events to a set of client devices.

Parameters:| 

  * **event_type** (_str_) – The type of event to send.
  * **messages** (_dict_) – The messages to send. Format should be <user_id>: {<device_id>: <event_content>}. The device ID may also be ‘*’, meaning all known devices for the user.
  * **txn_id** (_str_) – Optional. The transaction ID for this event, will be generated automatically otherwise.

  
---|---  
  
`set_account_data`(_user_id_ , _type_ , _account_data_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_account_data)[¶](#matrix_client.api.MatrixHttpApi.set_account_data "Permalink to this definition")

`set_avatar_url`(_user_id_ , _avatar_url_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_avatar_url)[¶](#matrix_client.api.MatrixHttpApi.set_avatar_url "Permalink to this definition")

`set_display_name`(_user_id_ , _display_name_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_display_name)[¶](#matrix_client.api.MatrixHttpApi.set_display_name "Permalink to this definition")

`set_guest_access`(_room_id_ , _guest_access_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_guest_access)[¶](#matrix_client.api.MatrixHttpApi.set_guest_access "Permalink to this definition")
    

Set the guest access policy of the room.

Parameters:| 

  * **room_id** (_str_) – The room to set the rules for.
  * **guest_access** (_str_) – Wether guests can join. One of: [“can_join”, “forbidden”]

  
---|---  
  
`set_join_rule`(_room_id_ , _join_rule_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_join_rule)[¶](#matrix_client.api.MatrixHttpApi.set_join_rule "Permalink to this definition")
    

Set the rule for users wishing to join the room.

Parameters:| 

  * **room_id** (_str_) – The room to set the rules for.
  * **join_rule** (_str_) – The chosen rule. One of: [“public”, “knock”, “invite”, “private”]

  
---|---  
  
`set_membership`(_room_id_ , _user_id_ , _membership_ , _reason=''_ , _profile=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_membership)[¶](#matrix_client.api.MatrixHttpApi.set_membership "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.member/$user_id

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID
  * **membership** (_str_) – New membership value
  * **reason** (_str_) – The reason
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`set_power_levels`(_room_id_ , _content_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_power_levels)[¶](#matrix_client.api.MatrixHttpApi.set_power_levels "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.power_levels

Note that any power levels which are not explicitly specified in the content arg are reset to default values.

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **content** (_dict_) – The JSON content to send. See example content below.

  
---|---  
  
Example:

```
api = MatrixHttpApi("http://example.com", token="foobar") api.set_power_levels("!exampleroom:example.com", { "ban": 50, # defaults to 50 if unspecified "events": { "m.room.name": 100, # must have PL 100 to change room name "m.room.power_levels": 100 # must have PL 100 to change PLs }, "events_default": 0, # defaults to 0 "invite": 50, # defaults to 50 "kick": 50, # defaults to 50 "redact": 50, # defaults to 50 "state_default": 50, # defaults to 50 if m.room.power_levels exists "users": { "@someguy:example.com": 100 # defaults to 0 }, "users_default": 0 # defaults to 0 } ) 
```

`set_room_account_data`(_user_id_ , _room_id_ , _type_ , _account_data_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_account_data)[¶](#matrix_client.api.MatrixHttpApi.set_room_account_data "Permalink to this definition")

`set_room_alias`(_room_id_ , _room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_alias)[¶](#matrix_client.api.MatrixHttpApi.set_room_alias "Permalink to this definition")
    

Set alias to room id

Parameters:| 

  * **room_id** (_str_) – The room id.
  * **room_alias** (_str_) – The room wanted alias name.

  
---|---  
  
`set_room_name`(_room_id_ , _name_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_name)[¶](#matrix_client.api.MatrixHttpApi.set_room_name "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.name :param room_id: The room ID :type room_id: str :param name: The new room name :type name: str :param timestamp: Set origin_server_ts (For application services only) :type timestamp: int

`set_room_topic`(_room_id_ , _topic_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_topic)[¶](#matrix_client.api.MatrixHttpApi.set_room_topic "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.topic :param room_id: The room ID :type room_id: str :param topic: The new room topic :type topic: str :param timestamp: Set origin_server_ts (For application services only) :type timestamp: int

`sync`(_since=None_ , _timeout_ms=30000_ , _filter=None_ , _full_state=None_ , _set_presence=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.sync)[¶](#matrix_client.api.MatrixHttpApi.sync "Permalink to this definition")
    

Perform a sync request.

Parameters:| 

  * **since** (_str_) – Optional. A token which specifies where to continue a sync from.
  * **timeout_ms** (_int_) – Optional. The time in milliseconds to wait.
  * **filter** (_int|str_) – Either a Filter ID or a JSON string.
  * **full_state** (_bool_) – Return the full state for every room the user has joined Defaults to false.
  * **set_presence** (_str_) – Should the client be marked as “online” or” offline”

  
---|---  
  
`unban_user`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.unban_user)[¶](#matrix_client.api.MatrixHttpApi.unban_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/unban

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the banee(sic)

  
---|---  
  
`update_device_info`(_device_id_ , _display_name_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.update_device_info)[¶](#matrix_client.api.MatrixHttpApi.update_device_info "Permalink to this definition")
    

Update the display name of a device.

Parameters:| 

  * **device_id** (_str_) – The device ID of the device to update.
  * **display_name** (_str_) – New display name for the device.

  
---|---  
  
`upload_keys`(_device_keys=None_ , _one_time_keys=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.upload_keys)[¶](#matrix_client.api.MatrixHttpApi.upload_keys "Permalink to this definition")
    

Publishes end-to-end encryption keys for the device.

Said device must be the one used when logging in.

Parameters:| 

  * **device_keys** (_dict_) – Optional. Identity keys for the device. The required keys are: user_id (str): The ID of the user the device belongs to. Must match the user ID used when logging in. device_id (str): The ID of the device these keys belong to. Must match the device ID used when logging in. algorithms (list<str>): The encryption algorithms supported by this device. keys (dict): Public identity keys. Should be formatted as <algorithm:device_id>: <key>. signatures (dict): Signatures for the device key object. Should be formatted as <user_id>: {<algorithm:device_id>: <key>}
  * **one_time_keys** (_dict_) – Optional. One-time public keys. Should be formatted as <algorithm:key_id>: <key>, the key format being determined by the algorithm.

  
---|---  
  
`validate_certificate`(_valid_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.validate_certificate)[¶](#matrix_client.api.MatrixHttpApi.validate_certificate "Permalink to this definition")

## matrix_client.user[¶](#module-matrix_client.user "Permalink to this headline")

_class_`matrix_client.user.``User`(_api_ , _user_id_ , _displayname=None_)[[source]](_modules/matrix_client/user.html#User)[¶](#matrix_client.user.User "Permalink to this definition")
    

Bases: `object`

The User class can be used to call user specific functions.

`get_avatar_url`()[[source]](_modules/matrix_client/user.html#User.get_avatar_url)[¶](#matrix_client.user.User.get_avatar_url "Permalink to this definition")

`get_display_name`()[[source]](_modules/matrix_client/user.html#User.get_display_name)[¶](#matrix_client.user.User.get_display_name "Permalink to this definition")
    

Get this users display name.
    See also get_friendly_name()
Returns:| Display Name  
---|---  
Return type:| str  
  
`get_friendly_name`()[[source]](_modules/matrix_client/user.html#User.get_friendly_name)[¶](#matrix_client.user.User.get_friendly_name "Permalink to this definition")

`set_avatar_url`(_avatar_url_)[[source]](_modules/matrix_client/user.html#User.set_avatar_url)[¶](#matrix_client.user.User.set_avatar_url "Permalink to this definition")
    

Set this users avatar.

Parameters:| **avatar_url** (_str_) – mxc url from previously uploaded  
---|---  
  
`set_display_name`(_display_name_)[[source]](_modules/matrix_client/user.html#User.set_display_name)[¶](#matrix_client.user.User.set_display_name "Permalink to this definition")
    

Set this users display name.

Parameters:| **display_name** (_str_) – Display Name  
---|---  
  
## matrix_client.room[¶](#module-matrix_client.room "Permalink to this headline")

_class_`matrix_client.room.``Room`(_client_ , _room_id_)[[source]](_modules/matrix_client/room.html#Room)[¶](#matrix_client.room.Room "Permalink to this definition")
    

Bases: `object`

Call room-specific functions after joining a room from the client.

`add_ephemeral_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_ephemeral_listener)[¶](#matrix_client.room.Room.add_ephemeral_listener "Permalink to this definition")
    

Add a callback handler for ephemeral events going to this room.

Parameters:| 

  * **callback** (_func(room, event_) – Callback called when an ephemeral event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_listener)[¶](#matrix_client.room.Room.add_listener "Permalink to this definition")
    

Add a callback handler for events going to this room.

Parameters:| 

  * **callback** (_func(room, event_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_room_alias`(_room_alias_)[[source]](_modules/matrix_client/room.html#Room.add_room_alias)[¶](#matrix_client.room.Room.add_room_alias "Permalink to this definition")
    

Add an alias to the room and return True if successful.

`add_state_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_state_listener)[¶](#matrix_client.room.Room.add_state_listener "Permalink to this definition")
    

Add a callback handler for state events going to this room.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
  
`add_tag`(_tag_ , _order=None_ , _content=None_)[[source]](_modules/matrix_client/room.html#Room.add_tag)[¶](#matrix_client.room.Room.add_tag "Permalink to this definition")

`backfill_previous_messages`(_reverse=False_ , _limit=10_)[[source]](_modules/matrix_client/room.html#Room.backfill_previous_messages)[¶](#matrix_client.room.Room.backfill_previous_messages "Permalink to this definition")
    

Backfill handling of previous messages.

Parameters:| 

  * **reverse** (_bool_) – When false messages will be backfilled in their original order (old to new), otherwise the order will be reversed (new to old).
  * **limit** (_int_) – Number of messages to go back.

  
---|---  
  
`ban_user`(_user_id_ , _reason_)[[source]](_modules/matrix_client/room.html#Room.ban_user)[¶](#matrix_client.room.Room.ban_user "Permalink to this definition")
    

Ban a user from this room

Parameters:| 

  * **user_id** (_str_) – The matrix user id of a user.
  * **reason** (_str_) – A reason for banning the user.

  
---|---  
Returns:| The user was banned.  
Return type:| boolean  
  
`display_name`[¶](#matrix_client.room.Room.display_name "Permalink to this definition")
    

Calculates the display name for a room.

`get_events`()[[source]](_modules/matrix_client/room.html#Room.get_events)[¶](#matrix_client.room.Room.get_events "Permalink to this definition")
    

Get the most recent events for this room.

`get_html_content`(_html_ , _body=None_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/room.html#Room.get_html_content)[¶](#matrix_client.room.Room.get_html_content "Permalink to this definition")

`get_joined_members`()[[source]](_modules/matrix_client/room.html#Room.get_joined_members)[¶](#matrix_client.room.Room.get_joined_members "Permalink to this definition")
    

Returns list of joined members (User objects).

`get_tags`()[[source]](_modules/matrix_client/room.html#Room.get_tags)[¶](#matrix_client.room.Room.get_tags "Permalink to this definition")

`invite_user`(_user_id_)[[source]](_modules/matrix_client/room.html#Room.invite_user)[¶](#matrix_client.room.Room.invite_user "Permalink to this definition")
    

Invite a user to this room.

Returns:| Whether invitation was sent.  
---|---  
Return type:| boolean  
  
`kick_user`(_user_id_ , _reason=''_)[[source]](_modules/matrix_client/room.html#Room.kick_user)[¶](#matrix_client.room.Room.kick_user "Permalink to this definition")
    

Kick a user from this room.

Parameters:| 

  * **user_id** (_str_) – The matrix user id of a user.
  * **reason** (_str_) – A reason for kicking the user.

  
---|---  
Returns:| Whether user was kicked.  
Return type:| boolean  
  
`leave`()[[source]](_modules/matrix_client/room.html#Room.leave)[¶](#matrix_client.room.Room.leave "Permalink to this definition")
    

Leave the room.

Returns:| Leaving the room was successful.  
---|---  
Return type:| boolean  
  
`modify_required_power_levels`(_events=None_ , _**kwargs_)[[source]](_modules/matrix_client/room.html#Room.modify_required_power_levels)[¶](#matrix_client.room.Room.modify_required_power_levels "Permalink to this definition")
    

Modifies room power level requirements.

Parameters:| 

  * **events** (_dict_) – Power levels required for sending specific event types, in the form {“m.room.whatever0”: 60, “m.room.whatever2”: None}. Overrides events_default and state_default for the specified events. A level of None causes the target event to revert to the default level as specified by events_default or state_default.
  * ****kwargs** – Key/value pairs specifying the power levels required for various actions:
    * events_default(int): Default level for sending message events
    * state_default(int): Default level for sending state events
    * invite(int): Inviting a user
    * redact(int): Redacting an event
    * ban(int): Banning a user
    * kick(int): Kicking a user

  
---|---  
Returns:| True if successful, False if not  
  
`modify_user_power_levels`(_users=None_ , _users_default=None_)[[source]](_modules/matrix_client/room.html#Room.modify_user_power_levels)[¶](#matrix_client.room.Room.modify_user_power_levels "Permalink to this definition")
    

Modify the power level for a subset of users

Parameters:| 

  * **users** (_dict_) – Power levels to assign to specific users, in the form {“@name0:host0”: 10, “@name1:host1”: 100, “@name3:host3”, None} A level of None causes the user to revert to the default level as specified by users_default.
  * **users_default** (_int_) – Default power level for users in the room

  
---|---  
Returns:| True if successful, False if not  
  
`prev_batch`[¶](#matrix_client.room.Room.prev_batch "Permalink to this definition")

`redact_message`(_event_id_ , _reason=None_)[[source]](_modules/matrix_client/room.html#Room.redact_message)[¶](#matrix_client.room.Room.redact_message "Permalink to this definition")
    

Redacts the message with specified event_id for the given reason.

See <https://matrix.org/docs/spec/r0.0.1/client_server.html#id112>

`remove_ephemeral_listener`(_uid_)[[source]](_modules/matrix_client/room.html#Room.remove_ephemeral_listener)[¶](#matrix_client.room.Room.remove_ephemeral_listener "Permalink to this definition")
    

Remove ephemeral listener with given uid.

`remove_listener`(_uid_)[[source]](_modules/matrix_client/room.html#Room.remove_listener)[¶](#matrix_client.room.Room.remove_listener "Permalink to this definition")
    

Remove listener with given uid.

`remove_tag`(_tag_)[[source]](_modules/matrix_client/room.html#Room.remove_tag)[¶](#matrix_client.room.Room.remove_tag "Permalink to this definition")

`send_audio`(_url_ , _name_ , _**audioinfo_)[[source]](_modules/matrix_client/room.html#Room.send_audio)[¶](#matrix_client.room.Room.send_audio "Permalink to this definition")
    

Send a pre-uploaded audio to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-audio> for audioinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the audio.
  * **name** (_str_) – The filename of the audio.
  * **()** (_audioinfo_) – Extra information about the audio.

  
---|---  
  
`send_emote`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_emote)[¶](#matrix_client.room.Room.send_emote "Permalink to this definition")
    

Send an emote (/me style) message to the room.

`send_file`(_url_ , _name_ , _**fileinfo_)[[source]](_modules/matrix_client/room.html#Room.send_file)[¶](#matrix_client.room.Room.send_file "Permalink to this definition")
    

Send a pre-uploaded file to the room.

See <http://matrix.org/docs/spec/r0.2.0/client_server.html#m-file> for fileinfo.

Parameters:| 

  * **url** (_str_) – The mxc url of the file.
  * **name** (_str_) – The filename of the image.
  * **()** (_fileinfo_) – Extra information about the file

  
---|---  
  
`send_html`(_html_ , _body=None_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/room.html#Room.send_html)[¶](#matrix_client.room.Room.send_html "Permalink to this definition")
    

Send an html formatted message.

Parameters:| 

  * **html** (_str_) – The html formatted message to be sent.
  * **body** (_str_) – The unformatted body of the message to be sent.

  
---|---  
  
`send_image`(_url_ , _name_ , _**imageinfo_)[[source]](_modules/matrix_client/room.html#Room.send_image)[¶](#matrix_client.room.Room.send_image "Permalink to this definition")
    

Send a pre-uploaded image to the room.

See <http://matrix.org/docs/spec/r0.0.1/client_server.html#m-image> for imageinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the image.
  * **name** (_str_) – The filename of the image.
  * **()** (_imageinfo_) – Extra information about the image.

  
---|---  
  
`send_location`(_geo_uri_ , _name_ , _thumb_url=None_ , _**thumb_info_)[[source]](_modules/matrix_client/room.html#Room.send_location)[¶](#matrix_client.room.Room.send_location "Permalink to this definition")
    

Send a location to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-location> for thumb_info

Parameters:| 

  * **geo_uri** (_str_) – The geo uri representing the location.
  * **name** (_str_) – Description for the location.
  * **thumb_url** (_str_) – URL to the thumbnail of the location.
  * **()** (_thumb_info_) – Metadata about the thumbnail, type ImageInfo.

  
---|---  
  
`send_notice`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_notice)[¶](#matrix_client.room.Room.send_notice "Permalink to this definition")
    

Send a notice (from bot) message to the room.

`send_state_event`(_event_type_ , _content_ , _state_key=''_)[[source]](_modules/matrix_client/room.html#Room.send_state_event)[¶](#matrix_client.room.Room.send_state_event "Permalink to this definition")
    

Send a state event to the room.

Parameters:| 

  * **event_type** (_str_) – The type of event that you are sending.
  * **()** (_content_) – An object with the content of the message.
  * **state_key** (_str, optional_) – A unique key to identify the state.

  
---|---  
  
`send_text`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_text)[¶](#matrix_client.room.Room.send_text "Permalink to this definition")
    

Send a plain text message to the room.

`send_video`(_url_ , _name_ , _**videoinfo_)[[source]](_modules/matrix_client/room.html#Room.send_video)[¶](#matrix_client.room.Room.send_video "Permalink to this definition")
    

Send a pre-uploaded video to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-video> for videoinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the video.
  * **name** (_str_) – The filename of the video.
  * **()** (_videoinfo_) – Extra information about the video.

  
---|---  
  
`set_account_data`(_type_ , _account_data_)[[source]](_modules/matrix_client/room.html#Room.set_account_data)[¶](#matrix_client.room.Room.set_account_data "Permalink to this definition")

`set_guest_access`(_allow_guests_)[[source]](_modules/matrix_client/room.html#Room.set_guest_access)[¶](#matrix_client.room.Room.set_guest_access "Permalink to this definition")
    

Set whether guests can join the room and return True if successful.

`set_invite_only`(_invite_only_)[[source]](_modules/matrix_client/room.html#Room.set_invite_only)[¶](#matrix_client.room.Room.set_invite_only "Permalink to this definition")
    

Set how the room can be joined.

Parameters:| **invite_only** (_bool_) – If True, users will have to be invited to join the room. If False, anyone who knows the room link can join.  
---|---  
Returns:| True if successful, False if not  
  
`set_room_name`(_name_)[[source]](_modules/matrix_client/room.html#Room.set_room_name)[¶](#matrix_client.room.Room.set_room_name "Permalink to this definition")
    

Return True if room name successfully changed.

`set_room_topic`(_topic_)[[source]](_modules/matrix_client/room.html#Room.set_room_topic)[¶](#matrix_client.room.Room.set_room_topic "Permalink to this definition")
    

Set room topic.

Returns:| True if the topic changed, False if not  
---|---  
Return type:| boolean  
  
`set_user_profile`(_displayname=None_ , _avatar_url=None_ , _reason='Changing room profile information'_)[[source]](_modules/matrix_client/room.html#Room.set_user_profile)[¶](#matrix_client.room.Room.set_user_profile "Permalink to this definition")
    

Set user profile within a room.

This sets displayname and avatar_url for the logged in user only in a specific room. It does not change the user’s global user profile.

`unban_user`(_user_id_)[[source]](_modules/matrix_client/room.html#Room.unban_user)[¶](#matrix_client.room.Room.unban_user "Permalink to this definition")
    

Unban a user from this room

Returns:| The user was unbanned.  
---|---  
Return type:| boolean  
  
`update_aliases`()[[source]](_modules/matrix_client/room.html#Room.update_aliases)[¶](#matrix_client.room.Room.update_aliases "Permalink to this definition")
    

Get aliases information from room state.

Returns:| True if the aliases changed, False if not  
---|---  
Return type:| boolean  
  
`update_room_name`()[[source]](_modules/matrix_client/room.html#Room.update_room_name)[¶](#matrix_client.room.Room.update_room_name "Permalink to this definition")
    

Updates self.name and returns True if room name has changed.

`update_room_topic`()[[source]](_modules/matrix_client/room.html#Room.update_room_topic)[¶](#matrix_client.room.Room.update_room_topic "Permalink to this definition")
    

Updates self.topic and returns True if room topic has changed.

## matrix_client.checks[¶](#module-matrix_client.checks "Permalink to this headline")

`matrix_client.checks.``check_room_id`(_room_id_)[[source]](_modules/matrix_client/checks.html#check_room_id)[¶](#matrix_client.checks.check_room_id "Permalink to this definition")

`matrix_client.checks.``check_user_id`(_user_id_)[[source]](_modules/matrix_client/checks.html#check_user_id)[¶](#matrix_client.checks.check_user_id "Permalink to this definition")

## matrix_client.errors[¶](#module-matrix_client.errors "Permalink to this headline")

_exception_`matrix_client.errors.``MatrixError`[[source]](_modules/matrix_client/errors.html#MatrixError)[¶](#matrix_client.errors.MatrixError "Permalink to this definition")
    

Bases: `Exception`

A generic Matrix error. Specific errors will subclass this.

_exception_`matrix_client.errors.``MatrixHttpLibError`(_original_exception_ , _method_ , _endpoint_)[[source]](_modules/matrix_client/errors.html#MatrixHttpLibError)[¶](#matrix_client.errors.MatrixHttpLibError "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The library used for http requests raised an exception.

_exception_`matrix_client.errors.``MatrixRequestError`(_code=0_ , _content=''_)[[source]](_modules/matrix_client/errors.html#MatrixRequestError)[¶](#matrix_client.errors.MatrixRequestError "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The home server returned an error response.

_exception_`matrix_client.errors.``MatrixUnexpectedResponse`(_content=''_)[[source]](_modules/matrix_client/errors.html#MatrixUnexpectedResponse)[¶](#matrix_client.errors.MatrixUnexpectedResponse "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The home server gave an unexpected response.

[ Previous](index.html "Welcome to Matrix Python SDK’s documentation!")

© Copyright 2016, matrix.org. 

Built with [Sphinx](http://sphinx-doc.org/) using a [theme](https://github.com/snide/sphinx_rtd_theme) provided by [Read the Docs](https://readthedocs.org). 


---



## Untitled Page
URL: https://matrix-org.github.io/matrix-python-sdk/matrix_client.html

[ Matrix Python SDK ](index.html)

0.3.2 

  * [matrix_client package](#)
    * [matrix_client.client](#module-matrix_client.client)
    * [matrix_client.api](#module-matrix_client.api)
    * [matrix_client.user](#module-matrix_client.user)
    * [matrix_client.room](#module-matrix_client.room)
    * [matrix_client.checks](#module-matrix_client.checks)
    * [matrix_client.errors](#module-matrix_client.errors)



[Matrix Python SDK](index.html)

  * [Docs](index.html) »
  * matrix_client package
  * [ View page source](_sources/matrix_client.txt)



# matrix_client package[¶](#matrix-client-package "Permalink to this headline")

## matrix_client.client[¶](#module-matrix_client.client "Permalink to this headline")

_class_`matrix_client.client.``CACHE`[[source]](_modules/matrix_client/client.html#CACHE)[¶](#matrix_client.client.CACHE "Permalink to this definition")
    

Bases: `int`

`ALL` _= 1_[¶](#matrix_client.client.CACHE.ALL "Permalink to this definition")

`NONE` _= -1_[¶](#matrix_client.client.CACHE.NONE "Permalink to this definition")

`SOME` _= 0_[¶](#matrix_client.client.CACHE.SOME "Permalink to this definition")

_class_`matrix_client.client.``MatrixClient`(_base_url_ , _token=None_ , _user_id=None_ , _valid_cert_check=True_ , _sync_filter_limit=20_ , _cache_level=1_)[[source]](_modules/matrix_client/client.html#MatrixClient)[¶](#matrix_client.client.MatrixClient "Permalink to this definition")
    

Bases: `object`

The client API for Matrix. For the raw HTTP calls, see MatrixHttpApi.

Parameters:| 

  * **base_url** (_str_) – The url of the HS preceding /_matrix. e.g. (ex: <https://localhost:8008> )
  * **token** (_Optional[str]_) – If you have an access token supply it here.
  * **user_id** (_Optional[str]_) – You must supply the user_id (as obtained when initially logging in to obtain the token) if supplying a token; otherwise, ignored.
  * **valid_cert_check** (_bool_) – Check the homeservers certificate on connections?

  
---|---  
Returns:| MatrixClient  
Raises:| MatrixRequestError, ValueError  
  
Examples

Create a new user and send a message:

```
client = MatrixClient("https://matrix.org") token = client.register_with_password(username="foobar", password="monkey") room = client.create_room("myroom") room.send_image(file_like_object) 
```

Send a message with an already logged in user:

```
client = MatrixClient("https://matrix.org", token="foobar", user_id="@foobar:matrix.org") client.add_listener(func) # NB: event stream callback client.rooms[0].add_listener(func) # NB: callbacks just for this room. room = client.join_room("#matrix:matrix.org") response = room.send_text("Hello!") response = room.kick("@bob:matrix.org") 
```

Incoming event callbacks (scopes):

```
def user_callback(user, incoming_event): pass def room_callback(room, incoming_event): pass def global_callback(incoming_event): pass 
```

`add_ephemeral_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_ephemeral_listener)[¶](#matrix_client.client.MatrixClient.add_ephemeral_listener "Permalink to this definition")
    

Add an ephemeral listener that will send a callback when the client recieves an ephemeral event.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an ephemeral event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_invite_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_invite_listener)[¶](#matrix_client.client.MatrixClient.add_invite_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client receives an invite.

Parameters:| **callback** (_func(room_id, state_) – Callback called when an invite arrives.  
---|---  
  
`add_leave_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_leave_listener)[¶](#matrix_client.client.MatrixClient.add_leave_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client has left a room.

Parameters:| 

  * **callback** (_func(room_id, room_) – Callback called when the client
  * **left a room.** (_has_) – 

  
---|---  
  
`add_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_listener)[¶](#matrix_client.client.MatrixClient.add_listener "Permalink to this definition")
    

Add a listener that will send a callback when the client recieves an event.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_presence_listener`(_callback_)[[source]](_modules/matrix_client/client.html#MatrixClient.add_presence_listener)[¶](#matrix_client.client.MatrixClient.add_presence_listener "Permalink to this definition")
    

Add a presence listener that will send a callback when the client receives a presence update.

Parameters:| **callback** (_func(roomchunk_) – Callback called when a presence update arrives.  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`create_room`(_alias=None_ , _is_public=False_ , _invitees=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.create_room)[¶](#matrix_client.client.MatrixClient.create_room "Permalink to this definition")
    

Create a new room on the homeserver.

Parameters:| 

  * **alias** (_str_) – The canonical_alias of the room.
  * **is_public** (_bool_) – The public/private visibility of the room.
  * **invitees** (_str[]_) – A set of user ids to invite into the room.

  
---|---  
Returns:| Room  
Raises:| `MatrixRequestError`  
  
`get_rooms`()[[source]](_modules/matrix_client/client.html#MatrixClient.get_rooms)[¶](#matrix_client.client.MatrixClient.get_rooms "Permalink to this definition")
    

Return a dict of {room_id: Room objects} that the user has joined.

Returns:| Rooms the user has joined.  
---|---  
Return type:| Room{}  
  
`get_sync_token`()[[source]](_modules/matrix_client/client.html#MatrixClient.get_sync_token)[¶](#matrix_client.client.MatrixClient.get_sync_token "Permalink to this definition")

`get_user`(_user_id_)[[source]](_modules/matrix_client/client.html#MatrixClient.get_user)[¶](#matrix_client.client.MatrixClient.get_user "Permalink to this definition")
    

Return a User by their id.

NOTE: This function only returns a user object, it does not verify
    the user with the Home Server.
Parameters:| **user_id** (_str_) – The matrix user id of a user.  
---|---  
  
`join_room`(_room_id_or_alias_)[[source]](_modules/matrix_client/client.html#MatrixClient.join_room)[¶](#matrix_client.client.MatrixClient.join_room "Permalink to this definition")
    

Join a room.

Parameters:| **room_id_or_alias** (_str_) – Room ID or an alias.  
---|---  
Returns:| Room  
Raises:| `MatrixRequestError`  
  
`listen_for_events`(_timeout_ms=30000_)[[source]](_modules/matrix_client/client.html#MatrixClient.listen_for_events)[¶](#matrix_client.client.MatrixClient.listen_for_events "Permalink to this definition")
    

This function just calls _sync()

In a future version of this sdk, this function will be deprecated and _sync method will be renamed sync with the intention of it being called by downstream code.

Parameters:| **timeout_ms** (_int_) – How long to poll the Home Server for before retrying.  
---|---  
  
`listen_forever`(_timeout_ms=30000_ , _exception_handler=None_ , _bad_sync_timeout=5_)[[source]](_modules/matrix_client/client.html#MatrixClient.listen_forever)[¶](#matrix_client.client.MatrixClient.listen_forever "Permalink to this definition")
    

Keep listening for events forever.

Parameters:| 

  * **timeout_ms** (_int_) – How long to poll the Home Server for before retrying.
  * **exception_handler** (_func(exception_) – Optional exception handler function which can be used to handle exceptions in the caller thread.
  * **bad_sync_timeout** (_int_) – Base time to wait after an error before retrying. Will be increased according to exponential backoff.

  
---|---  
  
`login`(_username_ , _password_ , _limit=10_ , _sync=True_ , _device_id=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.login)[¶](#matrix_client.client.MatrixClient.login "Permalink to this definition")
    

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password
  * **limit** (_int_) – Deprecated. How many messages to return when syncing. This will be replaced by a filter API in a later release.
  * **sync** (_bool_) – Optional. Whether to initiate a /sync request after logging in.
  * **device_id** (_str_) – Optional. ID of the client device. The server will auto-generate a device_id if this is not specified.

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`login_with_password`(_username_ , _password_ , _limit=10_)[[source]](_modules/matrix_client/client.html#MatrixClient.login_with_password)[¶](#matrix_client.client.MatrixClient.login_with_password "Permalink to this definition")
    

Deprecated. Use `login` with `sync=True`.

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password
  * **limit** (_int_) – Deprecated. How many messages to return when syncing. This will be replaced by a filter API in a later release.

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`login_with_password_no_sync`(_username_ , _password_)[[source]](_modules/matrix_client/client.html#MatrixClient.login_with_password_no_sync)[¶](#matrix_client.client.MatrixClient.login_with_password_no_sync "Permalink to this definition")
    

Deprecated. Use `login` with `sync=False`.

Login to the homeserver.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password

  
---|---  
Returns:| Access token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`logout`()[[source]](_modules/matrix_client/client.html#MatrixClient.logout)[¶](#matrix_client.client.MatrixClient.logout "Permalink to this definition")
    

Logout from the homeserver.

`register_as_guest`()[[source]](_modules/matrix_client/client.html#MatrixClient.register_as_guest)[¶](#matrix_client.client.MatrixClient.register_as_guest "Permalink to this definition")
    

Register a guest account on this HS. Note: HS must have guest registration enabled. :returns: Access Token :rtype: str

Raises:| `MatrixRequestError`  
---|---  
  
`register_with_password`(_username_ , _password_)[[source]](_modules/matrix_client/client.html#MatrixClient.register_with_password)[¶](#matrix_client.client.MatrixClient.register_with_password "Permalink to this definition")
    

Register for a new account on this HS.

Parameters:| 

  * **username** (_str_) – Account username
  * **password** (_str_) – Account password

  
---|---  
Returns:| Access Token  
Return type:| str  
Raises:| `MatrixRequestError`  
  
`remove_ephemeral_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_ephemeral_listener)[¶](#matrix_client.client.MatrixClient.remove_ephemeral_listener "Permalink to this definition")
    

Remove ephemeral listener with given uid.

Parameters:| **uuid.UUID** – Unique id of the listener to remove.  
---|---  
  
`remove_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_listener)[¶](#matrix_client.client.MatrixClient.remove_listener "Permalink to this definition")
    

Remove listener with given uid.

Parameters:| **uuid.UUID** – Unique id of the listener to remove.  
---|---  
  
`remove_presence_listener`(_uid_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_presence_listener)[¶](#matrix_client.client.MatrixClient.remove_presence_listener "Permalink to this definition")
    

Remove presence listener with given uid

Parameters:| **uuid.UUID** – Unique id of the listener to remove  
---|---  
  
`remove_room_alias`(_room_alias_)[[source]](_modules/matrix_client/client.html#MatrixClient.remove_room_alias)[¶](#matrix_client.client.MatrixClient.remove_room_alias "Permalink to this definition")
    

Remove mapping of an alias

Parameters:| **room_alias** (_str_) – The alias to be removed.  
---|---  
Returns:| True if the alias is removed, False otherwise.  
Return type:| bool  
  
`set_sync_token`(_token_)[[source]](_modules/matrix_client/client.html#MatrixClient.set_sync_token)[¶](#matrix_client.client.MatrixClient.set_sync_token "Permalink to this definition")

`set_user_id`(_user_id_)[[source]](_modules/matrix_client/client.html#MatrixClient.set_user_id)[¶](#matrix_client.client.MatrixClient.set_user_id "Permalink to this definition")

`should_listen` _= None_[¶](#matrix_client.client.MatrixClient.should_listen "Permalink to this definition")
    

Time to wait before attempting a /sync request after failing.

`start_listener_thread`(_timeout_ms=30000_ , _exception_handler=None_)[[source]](_modules/matrix_client/client.html#MatrixClient.start_listener_thread)[¶](#matrix_client.client.MatrixClient.start_listener_thread "Permalink to this definition")
    

Start a listener thread to listen for events in the background.

Parameters:| 

  * **timeout** (_int_) – How long to poll the Home Server for before retrying.
  * **exception_handler** (_func(exception_) – Optional exception handler function which can be used to handle exceptions in the caller thread.

  
---|---  
  
`stop_listener_thread`()[[source]](_modules/matrix_client/client.html#MatrixClient.stop_listener_thread)[¶](#matrix_client.client.MatrixClient.stop_listener_thread "Permalink to this definition")
    

Stop listener thread running in the background

`upload`(_content_ , _content_type_)[[source]](_modules/matrix_client/client.html#MatrixClient.upload)[¶](#matrix_client.client.MatrixClient.upload "Permalink to this definition")
    

Upload content to the home server and recieve a MXC url.

Parameters:| 

  * **content** (_bytes_) – The data of the content.
  * **content_type** (_str_) – The mimetype of the content.

  
---|---  
Raises:| 

  * `MatrixUnexpectedResponse` – If the homeserver gave a strange response
  * `MatrixRequestError` – If the upload failed for some reason.

  
  
## matrix_client.api[¶](#module-matrix_client.api "Permalink to this headline")

_class_`matrix_client.api.``MatrixHttpApi`(_base_url_ , _token=None_ , _identity=None_ , _default_429_wait_ms=5000_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi)[¶](#matrix_client.api.MatrixHttpApi "Permalink to this definition")
    

Bases: `object`

Contains all raw Matrix HTTP Client-Server API calls.

For room and sync handling, consider using MatrixClient.

Parameters:| 

  * **base_url** (_str_) – The home server URL e.g. ‘<http://localhost:8008>‘
  * **token** (_str_) – Optional. The client’s access token.
  * **identity** (_str_) – Optional. The mxid to act as (For application services only).
  * **default_429_wait_ms** (_int_) – Optional. Time in millseconds to wait before retrying a request when server returns a HTTP 429 response without a ‘retry_after_ms’ key.

  
---|---  
  
Examples

Create a client and send a message:

```
matrix = MatrixHttpApi("https://matrix.org", token="foobar") response = matrix.sync() response = matrix.send_message("!roomid:matrix.org", "Hello!") 
```

`add_user_tag`(_user_id_ , _room_id_ , _tag_ , _order=None_ , _body=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.add_user_tag)[¶](#matrix_client.api.MatrixHttpApi.add_user_tag "Permalink to this definition")

`ban_user`(_room_id_ , _user_id_ , _reason=''_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.ban_user)[¶](#matrix_client.api.MatrixHttpApi.ban_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/ban

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the banee(sic)
  * **reason** (_str_) – The reason for this ban

  
---|---  
  
`claim_keys`(_key_request_ , _timeout=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.claim_keys)[¶](#matrix_client.api.MatrixHttpApi.claim_keys "Permalink to this definition")
    

Claims one-time keys for use in pre-key messages.

Parameters:| 

  * **key_request** (_dict_) – The keys to be claimed. Format should be <user_id>: { <device_id>: <algorithm> }.
  * **timeout** (_int_) – Optional. The time (in milliseconds) to wait when downloading keys from remote servers.

  
---|---  
  
`create_filter`(_user_id_ , _filter_params_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.create_filter)[¶](#matrix_client.api.MatrixHttpApi.create_filter "Permalink to this definition")

`create_room`(_alias=None_ , _is_public=False_ , _invitees=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.create_room)[¶](#matrix_client.api.MatrixHttpApi.create_room "Permalink to this definition")
    

Perform /createRoom.

Parameters:| 

  * **alias** (_str_) – Optional. The room alias name to set for this room.
  * **is_public** (_bool_) – Optional. The public/private visibility.
  * **invitees** (_list <str>_) – Optional. The list of user IDs to invite.

  
---|---  
  
`delete_device`(_auth_body_ , _device_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.delete_device)[¶](#matrix_client.api.MatrixHttpApi.delete_device "Permalink to this definition")
    

Deletes the given device, and invalidates any access token associated with it.

NOTE: This endpoint uses the User-Interactive Authentication API.

Parameters:| 

  * **auth_body** (_dict_) – Authentication params.
  * **device_id** (_str_) – The device ID of the device to delete.

  
---|---  
  
`delete_devices`(_auth_body_ , _devices_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.delete_devices)[¶](#matrix_client.api.MatrixHttpApi.delete_devices "Permalink to this definition")
    

Bulk deletion of devices.

NOTE: This endpoint uses the User-Interactive Authentication API.

Parameters:| 

  * **auth_body** (_dict_) – Authentication params.
  * **devices** (_list_) – List of device ID”s to delete.

  
---|---  
  
`event_stream`(_from_token_ , _timeout=30000_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.event_stream)[¶](#matrix_client.api.MatrixHttpApi.event_stream "Permalink to this definition")
    

Deprecated. Use sync instead. Performs /events

Parameters:| 

  * **from_token** (_str_) – The ‘from’ query parameter.
  * **timeout** (_int_) – Optional. The ‘timeout’ query parameter.

  
---|---  
  
`forget_room`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.forget_room)[¶](#matrix_client.api.MatrixHttpApi.forget_room "Permalink to this definition")
    

Perform POST /rooms/$room_id/forget

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_avatar_url`(_user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_avatar_url)[¶](#matrix_client.api.MatrixHttpApi.get_avatar_url "Permalink to this definition")

`get_device`(_device_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_device)[¶](#matrix_client.api.MatrixHttpApi.get_device "Permalink to this definition")
    

Gets information on a single device, by device id.

`get_devices`()[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_devices)[¶](#matrix_client.api.MatrixHttpApi.get_devices "Permalink to this definition")
    

Gets information about all devices for the current user.

`get_display_name`(_user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_display_name)[¶](#matrix_client.api.MatrixHttpApi.get_display_name "Permalink to this definition")

`get_download_url`(_mxcurl_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_download_url)[¶](#matrix_client.api.MatrixHttpApi.get_download_url "Permalink to this definition")

`get_emote_body`(_text_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_emote_body)[¶](#matrix_client.api.MatrixHttpApi.get_emote_body "Permalink to this definition")

`get_filter`(_user_id_ , _filter_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_filter)[¶](#matrix_client.api.MatrixHttpApi.get_filter "Permalink to this definition")

`get_membership`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_membership)[¶](#matrix_client.api.MatrixHttpApi.get_membership "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.member/$user_id

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID

  
---|---  
  
`get_power_levels`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_power_levels)[¶](#matrix_client.api.MatrixHttpApi.get_power_levels "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.power_levels

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_room_id`(_room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_id)[¶](#matrix_client.api.MatrixHttpApi.get_room_id "Permalink to this definition")
    

Get room id from its alias

Parameters:| **room_alias** (_str_) – The room alias name.  
---|---  
Returns:| Wanted room’s id.  
  
`get_room_members`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_members)[¶](#matrix_client.api.MatrixHttpApi.get_room_members "Permalink to this definition")
    

Get the list of members for this room.

Parameters:| **room_id** (_str_) – The room to get the member events for.  
---|---  
  
`get_room_messages`(_room_id_ , _token_ , _direction_ , _limit=10_ , _to=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_messages)[¶](#matrix_client.api.MatrixHttpApi.get_room_messages "Permalink to this definition")
    

Perform GET /rooms/{roomId}/messages.

Parameters:| 

  * **room_id** (_str_) – The room’s id.
  * **token** (_str_) – The token to start returning events from.
  * **direction** (_str_) – The direction to return events from. One of: [“b”, “f”].
  * **limit** (_int_) – The maximum number of events to return.
  * **to** (_str_) – The token to stop returning events at.

  
---|---  
  
`get_room_name`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_name)[¶](#matrix_client.api.MatrixHttpApi.get_room_name "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.name :param room_id: The room ID :type room_id: str

`get_room_state`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_state)[¶](#matrix_client.api.MatrixHttpApi.get_room_state "Permalink to this definition")
    

Perform GET /rooms/$room_id/state

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`get_room_topic`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_room_topic)[¶](#matrix_client.api.MatrixHttpApi.get_room_topic "Permalink to this definition")
    

Perform GET /rooms/$room_id/state/m.room.topic :param room_id: The room ID :type room_id: str

`get_text_body`(_text_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_text_body)[¶](#matrix_client.api.MatrixHttpApi.get_text_body "Permalink to this definition")

`get_user_tags`(_user_id_ , _room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.get_user_tags)[¶](#matrix_client.api.MatrixHttpApi.get_user_tags "Permalink to this definition")

`initial_sync`(_limit=1_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.initial_sync)[¶](#matrix_client.api.MatrixHttpApi.initial_sync "Permalink to this definition")
    

Warning

Deprecated. Use sync instead.

Perform /initialSync.

Parameters:| **limit** (_int_) – The limit= param to provide.  
---|---  
  
`invite_user`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.invite_user)[¶](#matrix_client.api.MatrixHttpApi.invite_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/invite

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the invitee

  
---|---  
  
`join_room`(_room_id_or_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.join_room)[¶](#matrix_client.api.MatrixHttpApi.join_room "Permalink to this definition")
    

Performs /join/$room_id

Parameters:| **room_id_or_alias** (_str_) – The room ID or room alias to join.  
---|---  
  
`key_changes`(_from_token_ , _to_token_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.key_changes)[¶](#matrix_client.api.MatrixHttpApi.key_changes "Permalink to this definition")
    

Gets a list of users who have updated their device identity keys.

Parameters:| 

  * **from_token** (_str_) – The desired start point of the list. Should be the next_batch field from a response to an earlier call to /sync.
  * **to_token** (_str_) – The desired end point of the list. Should be the next_batch field from a recent call to /sync - typically the most recent such call.

  
---|---  
  
`kick_user`(_room_id_ , _user_id_ , _reason=''_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.kick_user)[¶](#matrix_client.api.MatrixHttpApi.kick_user "Permalink to this definition")
    

Calls set_membership with membership=”leave” for the user_id provided

`leave_room`(_room_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.leave_room)[¶](#matrix_client.api.MatrixHttpApi.leave_room "Permalink to this definition")
    

Perform POST /rooms/$room_id/leave

Parameters:| **room_id** (_str_) – The room ID  
---|---  
  
`login`(_login_type_ , _**kwargs_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.login)[¶](#matrix_client.api.MatrixHttpApi.login "Permalink to this definition")
    

Perform /login.

Parameters:| 

  * **login_type** (_str_) – The value for the ‘type’ key.
  * ****kwargs** – Additional key/values to add to the JSON submitted.

  
---|---  
  
`logout`()[[source]](_modules/matrix_client/api.html#MatrixHttpApi.logout)[¶](#matrix_client.api.MatrixHttpApi.logout "Permalink to this definition")
    

Perform /logout.

`media_upload`(_content_ , _content_type_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.media_upload)[¶](#matrix_client.api.MatrixHttpApi.media_upload "Permalink to this definition")

`query_keys`(_user_devices_ , _timeout=None_ , _token=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.query_keys)[¶](#matrix_client.api.MatrixHttpApi.query_keys "Permalink to this definition")
    

Query HS for public keys by user and optionally device.

Parameters:| 

  * **user_devices** (_dict_) – The devices whose keys to download. Should be formatted as <user_id>: [<device_ids>]. No device_ids indicates all devices for the corresponding user.
  * **timeout** (_int_) – Optional. The time (in milliseconds) to wait when downloading keys from remote servers.
  * **token** (_str_) – Optional. If the client is fetching keys as a result of a device update received in a sync request, this should be the ‘since’ token of that sync request, or any later sync token.

  
---|---  
  
`redact_event`(_room_id_ , _event_id_ , _reason=None_ , _txn_id=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.redact_event)[¶](#matrix_client.api.MatrixHttpApi.redact_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/redact/$event_id/$txn_id/

Parameters:| 

  * **room_id** (_str_) – The room ID to redact the message event in.
  * **event_id** (_str_) – The event id to redact.
  * **reason** (_str_) – Optional. The reason the message was redacted.
  * **txn_id** (_int_) – Optional. The transaction ID to use.
  * **timestamp** (_int_) – Optional. Set origin_server_ts (For application services only)

  
---|---  
  
`register`(_content=None_ , _kind='user'_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.register)[¶](#matrix_client.api.MatrixHttpApi.register "Permalink to this definition")
    

Performs /register.

Parameters:| 

  * **content** (_dict_) – The request payload. Should be specified for all non-guest registrations. username (string): The local part of the desired Matrix ID. If omitted, the homeserver MUST generate a Matrix ID local part. bind_email (boolean): If true, the server binds the email used for authentication to the Matrix ID with the ID Server. _Email Registration not currently supported_ password (string): Required. The desired password for the account. auth (dict): Authentication Data session (string): The value of the session key given by the homeserver. type (string): Required. The login type that the client is attempting to complete. “m.login.dummy” is the only non-interactive type.
  * **kind** (_str_) – Specify kind=”guest” to register as guest.

  
---|---  
  
`remove_room_alias`(_room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.remove_room_alias)[¶](#matrix_client.api.MatrixHttpApi.remove_room_alias "Permalink to this definition")
    

Remove mapping of an alias

Parameters:| **room_alias** (_str_) – The alias to be removed.  
---|---  
Raises:| `MatrixRequestError`  
  
`remove_user_tag`(_user_id_ , _room_id_ , _tag_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.remove_user_tag)[¶](#matrix_client.api.MatrixHttpApi.remove_user_tag "Permalink to this definition")

`send_content`(_room_id_ , _item_url_ , _item_name_ , _msg_type_ , _extra_information=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_content)[¶](#matrix_client.api.MatrixHttpApi.send_content "Permalink to this definition")

`send_emote`(_room_id_ , _text_content_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_emote)[¶](#matrix_client.api.MatrixHttpApi.send_emote "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message with m.emote msgtype

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.emote body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_location`(_room_id_ , _geo_uri_ , _name_ , _thumb_url=None_ , _thumb_info=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_location)[¶](#matrix_client.api.MatrixHttpApi.send_location "Permalink to this definition")
    

Send m.location message event

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **geo_uri** (_str_) – The geo uri representing the location.
  * **name** (_str_) – Description for the location.
  * **thumb_url** (_str_) – URL to the thumbnail of the location.
  * **thumb_info** (_dict_) – Metadata about the thumbnail, type ImageInfo.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_message`(_room_id_ , _text_content_ , _msgtype='m.text'_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_message)[¶](#matrix_client.api.MatrixHttpApi.send_message "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.text body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_message_event`(_room_id_ , _event_type_ , _content_ , _txn_id=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_message_event)[¶](#matrix_client.api.MatrixHttpApi.send_message_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/$event_type

Parameters:| 

  * **room_id** (_str_) – The room ID to send the message event in.
  * **event_type** (_str_) – The event type to send.
  * **content** (_dict_) – The JSON content to send.
  * **txn_id** (_int_) – Optional. The transaction ID to use.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_notice`(_room_id_ , _text_content_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_notice)[¶](#matrix_client.api.MatrixHttpApi.send_notice "Permalink to this definition")
    

Perform PUT /rooms/$room_id/send/m.room.message with m.notice msgtype

Parameters:| 

  * **room_id** (_str_) – The room ID to send the event in.
  * **text_content** (_str_) – The m.notice body to send.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_state_event`(_room_id_ , _event_type_ , _content_ , _state_key=''_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_state_event)[¶](#matrix_client.api.MatrixHttpApi.send_state_event "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/$event_type

Parameters:| 

  * **room_id** (_str_) – The room ID to send the state event in.
  * **event_type** (_str_) – The state event type to send.
  * **content** (_dict_) – The JSON content to send.
  * **state_key** (_str_) – Optional. The state key for the event.
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`send_to_device`(_event_type_ , _messages_ , _txn_id=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.send_to_device)[¶](#matrix_client.api.MatrixHttpApi.send_to_device "Permalink to this definition")
    

Sends send-to-device events to a set of client devices.

Parameters:| 

  * **event_type** (_str_) – The type of event to send.
  * **messages** (_dict_) – The messages to send. Format should be <user_id>: {<device_id>: <event_content>}. The device ID may also be ‘*’, meaning all known devices for the user.
  * **txn_id** (_str_) – Optional. The transaction ID for this event, will be generated automatically otherwise.

  
---|---  
  
`set_account_data`(_user_id_ , _type_ , _account_data_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_account_data)[¶](#matrix_client.api.MatrixHttpApi.set_account_data "Permalink to this definition")

`set_avatar_url`(_user_id_ , _avatar_url_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_avatar_url)[¶](#matrix_client.api.MatrixHttpApi.set_avatar_url "Permalink to this definition")

`set_display_name`(_user_id_ , _display_name_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_display_name)[¶](#matrix_client.api.MatrixHttpApi.set_display_name "Permalink to this definition")

`set_guest_access`(_room_id_ , _guest_access_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_guest_access)[¶](#matrix_client.api.MatrixHttpApi.set_guest_access "Permalink to this definition")
    

Set the guest access policy of the room.

Parameters:| 

  * **room_id** (_str_) – The room to set the rules for.
  * **guest_access** (_str_) – Wether guests can join. One of: [“can_join”, “forbidden”]

  
---|---  
  
`set_join_rule`(_room_id_ , _join_rule_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_join_rule)[¶](#matrix_client.api.MatrixHttpApi.set_join_rule "Permalink to this definition")
    

Set the rule for users wishing to join the room.

Parameters:| 

  * **room_id** (_str_) – The room to set the rules for.
  * **join_rule** (_str_) – The chosen rule. One of: [“public”, “knock”, “invite”, “private”]

  
---|---  
  
`set_membership`(_room_id_ , _user_id_ , _membership_ , _reason=''_ , _profile=None_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_membership)[¶](#matrix_client.api.MatrixHttpApi.set_membership "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.member/$user_id

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID
  * **membership** (_str_) – New membership value
  * **reason** (_str_) – The reason
  * **timestamp** (_int_) – Set origin_server_ts (For application services only)

  
---|---  
  
`set_power_levels`(_room_id_ , _content_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_power_levels)[¶](#matrix_client.api.MatrixHttpApi.set_power_levels "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.power_levels

Note that any power levels which are not explicitly specified in the content arg are reset to default values.

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **content** (_dict_) – The JSON content to send. See example content below.

  
---|---  
  
Example:

```
api = MatrixHttpApi("http://example.com", token="foobar") api.set_power_levels("!exampleroom:example.com", { "ban": 50, # defaults to 50 if unspecified "events": { "m.room.name": 100, # must have PL 100 to change room name "m.room.power_levels": 100 # must have PL 100 to change PLs }, "events_default": 0, # defaults to 0 "invite": 50, # defaults to 50 "kick": 50, # defaults to 50 "redact": 50, # defaults to 50 "state_default": 50, # defaults to 50 if m.room.power_levels exists "users": { "@someguy:example.com": 100 # defaults to 0 }, "users_default": 0 # defaults to 0 } ) 
```

`set_room_account_data`(_user_id_ , _room_id_ , _type_ , _account_data_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_account_data)[¶](#matrix_client.api.MatrixHttpApi.set_room_account_data "Permalink to this definition")

`set_room_alias`(_room_id_ , _room_alias_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_alias)[¶](#matrix_client.api.MatrixHttpApi.set_room_alias "Permalink to this definition")
    

Set alias to room id

Parameters:| 

  * **room_id** (_str_) – The room id.
  * **room_alias** (_str_) – The room wanted alias name.

  
---|---  
  
`set_room_name`(_room_id_ , _name_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_name)[¶](#matrix_client.api.MatrixHttpApi.set_room_name "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.name :param room_id: The room ID :type room_id: str :param name: The new room name :type name: str :param timestamp: Set origin_server_ts (For application services only) :type timestamp: int

`set_room_topic`(_room_id_ , _topic_ , _timestamp=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.set_room_topic)[¶](#matrix_client.api.MatrixHttpApi.set_room_topic "Permalink to this definition")
    

Perform PUT /rooms/$room_id/state/m.room.topic :param room_id: The room ID :type room_id: str :param topic: The new room topic :type topic: str :param timestamp: Set origin_server_ts (For application services only) :type timestamp: int

`sync`(_since=None_ , _timeout_ms=30000_ , _filter=None_ , _full_state=None_ , _set_presence=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.sync)[¶](#matrix_client.api.MatrixHttpApi.sync "Permalink to this definition")
    

Perform a sync request.

Parameters:| 

  * **since** (_str_) – Optional. A token which specifies where to continue a sync from.
  * **timeout_ms** (_int_) – Optional. The time in milliseconds to wait.
  * **filter** (_int|str_) – Either a Filter ID or a JSON string.
  * **full_state** (_bool_) – Return the full state for every room the user has joined Defaults to false.
  * **set_presence** (_str_) – Should the client be marked as “online” or” offline”

  
---|---  
  
`unban_user`(_room_id_ , _user_id_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.unban_user)[¶](#matrix_client.api.MatrixHttpApi.unban_user "Permalink to this definition")
    

Perform POST /rooms/$room_id/unban

Parameters:| 

  * **room_id** (_str_) – The room ID
  * **user_id** (_str_) – The user ID of the banee(sic)

  
---|---  
  
`update_device_info`(_device_id_ , _display_name_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.update_device_info)[¶](#matrix_client.api.MatrixHttpApi.update_device_info "Permalink to this definition")
    

Update the display name of a device.

Parameters:| 

  * **device_id** (_str_) – The device ID of the device to update.
  * **display_name** (_str_) – New display name for the device.

  
---|---  
  
`upload_keys`(_device_keys=None_ , _one_time_keys=None_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.upload_keys)[¶](#matrix_client.api.MatrixHttpApi.upload_keys "Permalink to this definition")
    

Publishes end-to-end encryption keys for the device.

Said device must be the one used when logging in.

Parameters:| 

  * **device_keys** (_dict_) – Optional. Identity keys for the device. The required keys are: user_id (str): The ID of the user the device belongs to. Must match the user ID used when logging in. device_id (str): The ID of the device these keys belong to. Must match the device ID used when logging in. algorithms (list<str>): The encryption algorithms supported by this device. keys (dict): Public identity keys. Should be formatted as <algorithm:device_id>: <key>. signatures (dict): Signatures for the device key object. Should be formatted as <user_id>: {<algorithm:device_id>: <key>}
  * **one_time_keys** (_dict_) – Optional. One-time public keys. Should be formatted as <algorithm:key_id>: <key>, the key format being determined by the algorithm.

  
---|---  
  
`validate_certificate`(_valid_)[[source]](_modules/matrix_client/api.html#MatrixHttpApi.validate_certificate)[¶](#matrix_client.api.MatrixHttpApi.validate_certificate "Permalink to this definition")

## matrix_client.user[¶](#module-matrix_client.user "Permalink to this headline")

_class_`matrix_client.user.``User`(_api_ , _user_id_ , _displayname=None_)[[source]](_modules/matrix_client/user.html#User)[¶](#matrix_client.user.User "Permalink to this definition")
    

Bases: `object`

The User class can be used to call user specific functions.

`get_avatar_url`()[[source]](_modules/matrix_client/user.html#User.get_avatar_url)[¶](#matrix_client.user.User.get_avatar_url "Permalink to this definition")

`get_display_name`()[[source]](_modules/matrix_client/user.html#User.get_display_name)[¶](#matrix_client.user.User.get_display_name "Permalink to this definition")
    

Get this users display name.
    See also get_friendly_name()
Returns:| Display Name  
---|---  
Return type:| str  
  
`get_friendly_name`()[[source]](_modules/matrix_client/user.html#User.get_friendly_name)[¶](#matrix_client.user.User.get_friendly_name "Permalink to this definition")

`set_avatar_url`(_avatar_url_)[[source]](_modules/matrix_client/user.html#User.set_avatar_url)[¶](#matrix_client.user.User.set_avatar_url "Permalink to this definition")
    

Set this users avatar.

Parameters:| **avatar_url** (_str_) – mxc url from previously uploaded  
---|---  
  
`set_display_name`(_display_name_)[[source]](_modules/matrix_client/user.html#User.set_display_name)[¶](#matrix_client.user.User.set_display_name "Permalink to this definition")
    

Set this users display name.

Parameters:| **display_name** (_str_) – Display Name  
---|---  
  
## matrix_client.room[¶](#module-matrix_client.room "Permalink to this headline")

_class_`matrix_client.room.``Room`(_client_ , _room_id_)[[source]](_modules/matrix_client/room.html#Room)[¶](#matrix_client.room.Room "Permalink to this definition")
    

Bases: `object`

Call room-specific functions after joining a room from the client.

`add_ephemeral_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_ephemeral_listener)[¶](#matrix_client.room.Room.add_ephemeral_listener "Permalink to this definition")
    

Add a callback handler for ephemeral events going to this room.

Parameters:| 

  * **callback** (_func(room, event_) – Callback called when an ephemeral event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_listener)[¶](#matrix_client.room.Room.add_listener "Permalink to this definition")
    

Add a callback handler for events going to this room.

Parameters:| 

  * **callback** (_func(room, event_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
Returns:| Unique id of the listener, can be used to identify the listener.  
Return type:| uuid.UUID  
  
`add_room_alias`(_room_alias_)[[source]](_modules/matrix_client/room.html#Room.add_room_alias)[¶](#matrix_client.room.Room.add_room_alias "Permalink to this definition")
    

Add an alias to the room and return True if successful.

`add_state_listener`(_callback_ , _event_type=None_)[[source]](_modules/matrix_client/room.html#Room.add_state_listener)[¶](#matrix_client.room.Room.add_state_listener "Permalink to this definition")
    

Add a callback handler for state events going to this room.

Parameters:| 

  * **callback** (_func(roomchunk_) – Callback called when an event arrives.
  * **event_type** (_str_) – The event_type to filter for.

  
---|---  
  
`add_tag`(_tag_ , _order=None_ , _content=None_)[[source]](_modules/matrix_client/room.html#Room.add_tag)[¶](#matrix_client.room.Room.add_tag "Permalink to this definition")

`backfill_previous_messages`(_reverse=False_ , _limit=10_)[[source]](_modules/matrix_client/room.html#Room.backfill_previous_messages)[¶](#matrix_client.room.Room.backfill_previous_messages "Permalink to this definition")
    

Backfill handling of previous messages.

Parameters:| 

  * **reverse** (_bool_) – When false messages will be backfilled in their original order (old to new), otherwise the order will be reversed (new to old).
  * **limit** (_int_) – Number of messages to go back.

  
---|---  
  
`ban_user`(_user_id_ , _reason_)[[source]](_modules/matrix_client/room.html#Room.ban_user)[¶](#matrix_client.room.Room.ban_user "Permalink to this definition")
    

Ban a user from this room

Parameters:| 

  * **user_id** (_str_) – The matrix user id of a user.
  * **reason** (_str_) – A reason for banning the user.

  
---|---  
Returns:| The user was banned.  
Return type:| boolean  
  
`display_name`[¶](#matrix_client.room.Room.display_name "Permalink to this definition")
    

Calculates the display name for a room.

`get_events`()[[source]](_modules/matrix_client/room.html#Room.get_events)[¶](#matrix_client.room.Room.get_events "Permalink to this definition")
    

Get the most recent events for this room.

`get_html_content`(_html_ , _body=None_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/room.html#Room.get_html_content)[¶](#matrix_client.room.Room.get_html_content "Permalink to this definition")

`get_joined_members`()[[source]](_modules/matrix_client/room.html#Room.get_joined_members)[¶](#matrix_client.room.Room.get_joined_members "Permalink to this definition")
    

Returns list of joined members (User objects).

`get_tags`()[[source]](_modules/matrix_client/room.html#Room.get_tags)[¶](#matrix_client.room.Room.get_tags "Permalink to this definition")

`invite_user`(_user_id_)[[source]](_modules/matrix_client/room.html#Room.invite_user)[¶](#matrix_client.room.Room.invite_user "Permalink to this definition")
    

Invite a user to this room.

Returns:| Whether invitation was sent.  
---|---  
Return type:| boolean  
  
`kick_user`(_user_id_ , _reason=''_)[[source]](_modules/matrix_client/room.html#Room.kick_user)[¶](#matrix_client.room.Room.kick_user "Permalink to this definition")
    

Kick a user from this room.

Parameters:| 

  * **user_id** (_str_) – The matrix user id of a user.
  * **reason** (_str_) – A reason for kicking the user.

  
---|---  
Returns:| Whether user was kicked.  
Return type:| boolean  
  
`leave`()[[source]](_modules/matrix_client/room.html#Room.leave)[¶](#matrix_client.room.Room.leave "Permalink to this definition")
    

Leave the room.

Returns:| Leaving the room was successful.  
---|---  
Return type:| boolean  
  
`modify_required_power_levels`(_events=None_ , _**kwargs_)[[source]](_modules/matrix_client/room.html#Room.modify_required_power_levels)[¶](#matrix_client.room.Room.modify_required_power_levels "Permalink to this definition")
    

Modifies room power level requirements.

Parameters:| 

  * **events** (_dict_) – Power levels required for sending specific event types, in the form {“m.room.whatever0”: 60, “m.room.whatever2”: None}. Overrides events_default and state_default for the specified events. A level of None causes the target event to revert to the default level as specified by events_default or state_default.
  * ****kwargs** – Key/value pairs specifying the power levels required for various actions:
    * events_default(int): Default level for sending message events
    * state_default(int): Default level for sending state events
    * invite(int): Inviting a user
    * redact(int): Redacting an event
    * ban(int): Banning a user
    * kick(int): Kicking a user

  
---|---  
Returns:| True if successful, False if not  
  
`modify_user_power_levels`(_users=None_ , _users_default=None_)[[source]](_modules/matrix_client/room.html#Room.modify_user_power_levels)[¶](#matrix_client.room.Room.modify_user_power_levels "Permalink to this definition")
    

Modify the power level for a subset of users

Parameters:| 

  * **users** (_dict_) – Power levels to assign to specific users, in the form {“@name0:host0”: 10, “@name1:host1”: 100, “@name3:host3”, None} A level of None causes the user to revert to the default level as specified by users_default.
  * **users_default** (_int_) – Default power level for users in the room

  
---|---  
Returns:| True if successful, False if not  
  
`prev_batch`[¶](#matrix_client.room.Room.prev_batch "Permalink to this definition")

`redact_message`(_event_id_ , _reason=None_)[[source]](_modules/matrix_client/room.html#Room.redact_message)[¶](#matrix_client.room.Room.redact_message "Permalink to this definition")
    

Redacts the message with specified event_id for the given reason.

See <https://matrix.org/docs/spec/r0.0.1/client_server.html#id112>

`remove_ephemeral_listener`(_uid_)[[source]](_modules/matrix_client/room.html#Room.remove_ephemeral_listener)[¶](#matrix_client.room.Room.remove_ephemeral_listener "Permalink to this definition")
    

Remove ephemeral listener with given uid.

`remove_listener`(_uid_)[[source]](_modules/matrix_client/room.html#Room.remove_listener)[¶](#matrix_client.room.Room.remove_listener "Permalink to this definition")
    

Remove listener with given uid.

`remove_tag`(_tag_)[[source]](_modules/matrix_client/room.html#Room.remove_tag)[¶](#matrix_client.room.Room.remove_tag "Permalink to this definition")

`send_audio`(_url_ , _name_ , _**audioinfo_)[[source]](_modules/matrix_client/room.html#Room.send_audio)[¶](#matrix_client.room.Room.send_audio "Permalink to this definition")
    

Send a pre-uploaded audio to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-audio> for audioinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the audio.
  * **name** (_str_) – The filename of the audio.
  * **()** (_audioinfo_) – Extra information about the audio.

  
---|---  
  
`send_emote`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_emote)[¶](#matrix_client.room.Room.send_emote "Permalink to this definition")
    

Send an emote (/me style) message to the room.

`send_file`(_url_ , _name_ , _**fileinfo_)[[source]](_modules/matrix_client/room.html#Room.send_file)[¶](#matrix_client.room.Room.send_file "Permalink to this definition")
    

Send a pre-uploaded file to the room.

See <http://matrix.org/docs/spec/r0.2.0/client_server.html#m-file> for fileinfo.

Parameters:| 

  * **url** (_str_) – The mxc url of the file.
  * **name** (_str_) – The filename of the image.
  * **()** (_fileinfo_) – Extra information about the file

  
---|---  
  
`send_html`(_html_ , _body=None_ , _msgtype='m.text'_)[[source]](_modules/matrix_client/room.html#Room.send_html)[¶](#matrix_client.room.Room.send_html "Permalink to this definition")
    

Send an html formatted message.

Parameters:| 

  * **html** (_str_) – The html formatted message to be sent.
  * **body** (_str_) – The unformatted body of the message to be sent.

  
---|---  
  
`send_image`(_url_ , _name_ , _**imageinfo_)[[source]](_modules/matrix_client/room.html#Room.send_image)[¶](#matrix_client.room.Room.send_image "Permalink to this definition")
    

Send a pre-uploaded image to the room.

See <http://matrix.org/docs/spec/r0.0.1/client_server.html#m-image> for imageinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the image.
  * **name** (_str_) – The filename of the image.
  * **()** (_imageinfo_) – Extra information about the image.

  
---|---  
  
`send_location`(_geo_uri_ , _name_ , _thumb_url=None_ , _**thumb_info_)[[source]](_modules/matrix_client/room.html#Room.send_location)[¶](#matrix_client.room.Room.send_location "Permalink to this definition")
    

Send a location to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-location> for thumb_info

Parameters:| 

  * **geo_uri** (_str_) – The geo uri representing the location.
  * **name** (_str_) – Description for the location.
  * **thumb_url** (_str_) – URL to the thumbnail of the location.
  * **()** (_thumb_info_) – Metadata about the thumbnail, type ImageInfo.

  
---|---  
  
`send_notice`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_notice)[¶](#matrix_client.room.Room.send_notice "Permalink to this definition")
    

Send a notice (from bot) message to the room.

`send_state_event`(_event_type_ , _content_ , _state_key=''_)[[source]](_modules/matrix_client/room.html#Room.send_state_event)[¶](#matrix_client.room.Room.send_state_event "Permalink to this definition")
    

Send a state event to the room.

Parameters:| 

  * **event_type** (_str_) – The type of event that you are sending.
  * **()** (_content_) – An object with the content of the message.
  * **state_key** (_str, optional_) – A unique key to identify the state.

  
---|---  
  
`send_text`(_text_)[[source]](_modules/matrix_client/room.html#Room.send_text)[¶](#matrix_client.room.Room.send_text "Permalink to this definition")
    

Send a plain text message to the room.

`send_video`(_url_ , _name_ , _**videoinfo_)[[source]](_modules/matrix_client/room.html#Room.send_video)[¶](#matrix_client.room.Room.send_video "Permalink to this definition")
    

Send a pre-uploaded video to the room.

See <http://matrix.org/docs/spec/client_server/r0.2.0.html#m-video> for videoinfo

Parameters:| 

  * **url** (_str_) – The mxc url of the video.
  * **name** (_str_) – The filename of the video.
  * **()** (_videoinfo_) – Extra information about the video.

  
---|---  
  
`set_account_data`(_type_ , _account_data_)[[source]](_modules/matrix_client/room.html#Room.set_account_data)[¶](#matrix_client.room.Room.set_account_data "Permalink to this definition")

`set_guest_access`(_allow_guests_)[[source]](_modules/matrix_client/room.html#Room.set_guest_access)[¶](#matrix_client.room.Room.set_guest_access "Permalink to this definition")
    

Set whether guests can join the room and return True if successful.

`set_invite_only`(_invite_only_)[[source]](_modules/matrix_client/room.html#Room.set_invite_only)[¶](#matrix_client.room.Room.set_invite_only "Permalink to this definition")
    

Set how the room can be joined.

Parameters:| **invite_only** (_bool_) – If True, users will have to be invited to join the room. If False, anyone who knows the room link can join.  
---|---  
Returns:| True if successful, False if not  
  
`set_room_name`(_name_)[[source]](_modules/matrix_client/room.html#Room.set_room_name)[¶](#matrix_client.room.Room.set_room_name "Permalink to this definition")
    

Return True if room name successfully changed.

`set_room_topic`(_topic_)[[source]](_modules/matrix_client/room.html#Room.set_room_topic)[¶](#matrix_client.room.Room.set_room_topic "Permalink to this definition")
    

Set room topic.

Returns:| True if the topic changed, False if not  
---|---  
Return type:| boolean  
  
`set_user_profile`(_displayname=None_ , _avatar_url=None_ , _reason='Changing room profile information'_)[[source]](_modules/matrix_client/room.html#Room.set_user_profile)[¶](#matrix_client.room.Room.set_user_profile "Permalink to this definition")
    

Set user profile within a room.

This sets displayname and avatar_url for the logged in user only in a specific room. It does not change the user’s global user profile.

`unban_user`(_user_id_)[[source]](_modules/matrix_client/room.html#Room.unban_user)[¶](#matrix_client.room.Room.unban_user "Permalink to this definition")
    

Unban a user from this room

Returns:| The user was unbanned.  
---|---  
Return type:| boolean  
  
`update_aliases`()[[source]](_modules/matrix_client/room.html#Room.update_aliases)[¶](#matrix_client.room.Room.update_aliases "Permalink to this definition")
    

Get aliases information from room state.

Returns:| True if the aliases changed, False if not  
---|---  
Return type:| boolean  
  
`update_room_name`()[[source]](_modules/matrix_client/room.html#Room.update_room_name)[¶](#matrix_client.room.Room.update_room_name "Permalink to this definition")
    

Updates self.name and returns True if room name has changed.

`update_room_topic`()[[source]](_modules/matrix_client/room.html#Room.update_room_topic)[¶](#matrix_client.room.Room.update_room_topic "Permalink to this definition")
    

Updates self.topic and returns True if room topic has changed.

## matrix_client.checks[¶](#module-matrix_client.checks "Permalink to this headline")

`matrix_client.checks.``check_room_id`(_room_id_)[[source]](_modules/matrix_client/checks.html#check_room_id)[¶](#matrix_client.checks.check_room_id "Permalink to this definition")

`matrix_client.checks.``check_user_id`(_user_id_)[[source]](_modules/matrix_client/checks.html#check_user_id)[¶](#matrix_client.checks.check_user_id "Permalink to this definition")

## matrix_client.errors[¶](#module-matrix_client.errors "Permalink to this headline")

_exception_`matrix_client.errors.``MatrixError`[[source]](_modules/matrix_client/errors.html#MatrixError)[¶](#matrix_client.errors.MatrixError "Permalink to this definition")
    

Bases: `Exception`

A generic Matrix error. Specific errors will subclass this.

_exception_`matrix_client.errors.``MatrixHttpLibError`(_original_exception_ , _method_ , _endpoint_)[[source]](_modules/matrix_client/errors.html#MatrixHttpLibError)[¶](#matrix_client.errors.MatrixHttpLibError "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The library used for http requests raised an exception.

_exception_`matrix_client.errors.``MatrixRequestError`(_code=0_ , _content=''_)[[source]](_modules/matrix_client/errors.html#MatrixRequestError)[¶](#matrix_client.errors.MatrixRequestError "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The home server returned an error response.

_exception_`matrix_client.errors.``MatrixUnexpectedResponse`(_content=''_)[[source]](_modules/matrix_client/errors.html#MatrixUnexpectedResponse)[¶](#matrix_client.errors.MatrixUnexpectedResponse "Permalink to this definition")
    

Bases: [`matrix_client.errors.MatrixError`](#matrix_client.errors.MatrixError "matrix_client.errors.MatrixError")

The home server gave an unexpected response.

[ Previous](index.html "Welcome to Matrix Python SDK’s documentation!")

© Copyright 2016, matrix.org. 

Built with [Sphinx](http://sphinx-doc.org/) using a [theme](https://github.com/snide/sphinx_rtd_theme) provided by [Read the Docs](https://readthedocs.org). 


---

