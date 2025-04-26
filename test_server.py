import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_connect_with_valid_credentials():
    response = client.post(
        "/connect",
        json={
            "homeserver_url": "https://matrix.org",
            "username": "testuser",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    assert "message" in response.json()

def test_connect_with_invalid_credentials():
    response = client.post(
        "/connect",
        json={
            "homeserver_url": "https://matrix.org",
            "username": "invaliduser",
            "password": "invalidpassword"
        }
    )
    assert response.status_code == 400
    assert "detail" in response.json()