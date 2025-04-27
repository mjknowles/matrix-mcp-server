# matrix-mcp-server

## Overview

`matrix-mcp` is a FastAPI-based server that provides tools for interacting with a Matrix homeserver. It includes features such as connecting to a Matrix server, listing joined rooms, fetching room messages, and more.

## Prerequisites

- Python 3.8 or higher
- `pip` (Python package installer)

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd matrix-mcp-server
   ```

2. **Install Dependencies**
   Ensure you have a `requirements.txt` file in the project directory. Install the dependencies using:

   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Server**
   Start the FastAPI server using `uvicorn`:

   ```bash
   python server.py
   ```

   By default, the server will run on `http://0.0.0.0:8000`.

## Test the Server

```
fastmcp dev server.py
```

## Example Usage

### Connect to a Matrix Homeserver

Send a POST request to `/connect` with the following JSON payload:

```json
{
  "homeserver_url": "https://matrix.org",
  "username": "your-username",
  "password": "your-password"
}
```

### List Joined Rooms

Send a request to the `/list_joined_rooms` endpoint after connecting.

## Notes

- This project is for development purposes. For production use, ensure proper session management and security measures are implemented.
- Refer to the `client.py` and other dependencies for additional configuration options.

## License

This project is licensed under the MIT License.
