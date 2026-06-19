import pytest
from fastapi import status

def test_user_signup_success(client):
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "securepassword123"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data

def test_user_signup_duplicate_email(client):
    payload = {
        "name": "Duplicate User",
        "email": "duplicate@example.com",
        "password": "password123"
    }
    # First registration
    response1 = client.post("/api/v1/auth/signup", json=payload)
    assert response1.status_code == status.HTTP_201_CREATED

    # Second registration with same email
    response2 = client.post("/api/v1/auth/signup", json=payload)
    assert response2.status_code == status.HTTP_400_BAD_REQUEST
    assert response2.json()["detail"] == "A user with this email is already registered."

def test_user_login_success(client):
    signup_payload = {
        "name": "Login User",
        "email": "login@example.com",
        "password": "mypassword123"
    }
    # Register user first
    signup_response = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_response.status_code == status.HTTP_201_CREATED

    # Attempt login
    login_payload = {
        "email": signup_payload["email"],
        "password": signup_payload["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_user_login_incorrect_password(client):
    signup_payload = {
        "name": "Login Fail User",
        "email": "loginfail@example.com",
        "password": "correctpassword"
    }
    # Register user
    signup_response = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_response.status_code == status.HTTP_201_CREATED

    # Login with wrong password
    login_payload = {
        "email": signup_payload["email"],
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect email or password."

def test_get_current_user_me_success(client):
    signup_payload = {
        "name": "Me User",
        "email": "me@example.com",
        "password": "mypassword123"
    }
    client.post("/api/v1/auth/signup", json=signup_payload)

    # Login to get token
    login_payload = {
        "email": signup_payload["email"],
        "password": signup_payload["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    token = response.json()["access_token"]

    # Get /me
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == status.HTTP_200_OK
    data = me_response.json()
    assert data["name"] == signup_payload["name"]
    assert data["email"] == signup_payload["email"]
