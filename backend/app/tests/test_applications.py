from fastapi import status
from app.models.application import Application

def get_auth_headers(client, email="appuser@example.com"):
    signup_payload = {
        "name": "App User",
        "email": email,
        "password": "testpassword123"
    }
    client.post("/api/v1/auth/signup", json=signup_payload)
    
    login_payload = {
        "email": signup_payload["email"],
        "password": signup_payload["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_applications_empty(client):
    headers = get_auth_headers(client, email="empty@example.com")
    response = client.get("/api/v1/applications", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

def test_create_application_success(client, db):
    headers = get_auth_headers(client, email="create@example.com")
    payload = {
        "role": "Backend Engineer",
        "company": "Google",
        "location": "Mountain View, CA",
        "status": "Interested",
        "applied_date": "2026-06-18",
        "salary": "$150,000",
        "job_url": "https://careers.google.com",
        "notes": "Spoke to recruiter."
    }
    response = client.post("/api/v1/applications", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["role"] == payload["role"]
    assert data["company"] == payload["company"]
    assert data["status"] == "Interested"
    assert "id" in data
    
    # Verify in DB
    db_app = db.query(Application).filter(Application.id == data["id"]).first()
    assert db_app is not None
    assert db_app.role == "Backend Engineer"

def test_create_application_invalid_status(client):
    headers = get_auth_headers(client, email="invalidstatus@example.com")
    payload = {
        "role": "Frontend Developer",
        "company": "Meta",
        "status": "InvalidStatus"
    }
    response = client.post("/api/v1/applications", json=payload, headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_update_application_status_success(client, db):
    headers = get_auth_headers(client, email="update@example.com")
    # 1. Create
    payload = {
        "role": "Data Scientist",
        "company": "Amazon",
        "status": "Interested"
    }
    create_res = client.post("/api/v1/applications", json=payload, headers=headers)
    app_id = create_res.json()["id"]
    
    # 2. Update status to Applied
    update_payload = {
        "status": "Applied"
    }
    update_res = client.put(f"/api/v1/applications/{app_id}", json=update_payload, headers=headers)
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["status"] == "Applied"
    
    # Verify in DB
    db_app = db.query(Application).filter(Application.id == app_id).first()
    assert db_app.status == "Applied"

def test_delete_application_success(client, db):
    headers = get_auth_headers(client, email="delete@example.com")
    # 1. Create
    payload = {
        "role": "Architect",
        "company": "Apple",
        "status": "Offer"
    }
    create_res = client.post("/api/v1/applications", json=payload, headers=headers)
    app_id = create_res.json()["id"]
    
    # 2. Delete
    delete_res = client.delete(f"/api/v1/applications/{app_id}", headers=headers)
    assert delete_res.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify not in DB
    db_app = db.query(Application).filter(Application.id == app_id).first()
    assert db_app is None
