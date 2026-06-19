import pytest
from unittest.mock import patch
from uuid import uuid4
from fastapi import status

from app.models.user import User
from app.models.resume import Resume
from app.models.report import InterviewReport

def get_auth_headers_and_user(client, db, email="testuser@example.com"):
    # Clear existing user with this email to avoid duplicates
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()

    signup_payload = {
        "name": "Test User",
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
    
    user = db.query(User).filter(User.email == email).first()
    return {"Authorization": f"Bearer {token}"}, user

MOCK_QUESTIONS_LIST = [
    {
        "question": "Describe your experience with Python.",
        "type": "technical",
        "tip": "Focus on backend development.",
        "sample_answer": "I have used Python for 5 years building APIs."
    },
    {
        "question": "Tell me about a time you resolved a conflict.",
        "type": "behavioral",
        "tip": "Use STAR method.",
        "sample_answer": "I aligned stakeholders on database schema design."
    }
]

@patch("app.services.ai._call_gemini_api")
def test_generate_interview_success(mock_gemini, client, db):
    import json
    mock_gemini.return_value = json.dumps(MOCK_QUESTIONS_LIST)

    headers, user = get_auth_headers_and_user(client, db, email="interview_success@example.com")
    
    # Create resume
    resume = Resume(
        user_id=user.id,
        file_name="resume.pdf",
        file_path="uploads/resume.pdf",
        raw_text="Highly skilled Python and database engineer.",
        is_primary=True
    )
    db.add(resume)
    db.commit()

    payload = {
        "resume_id": str(resume.id),
        "job_description": "Wanted: Senior backend engineer proficient in Python and SQL."
    }

    response = client.post("/api/v1/interviews/generate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    
    data = response.json()
    assert "id" in data
    assert data["user_id"] == str(user.id)
    assert data["resume_id"] == str(resume.id)
    assert data["job_description"] == payload["job_description"]
    assert len(data["questions"]) == 2
    assert data["questions"][0]["question"] == "Describe your experience with Python."
    
    # Check DB
    db_report = db.query(InterviewReport).filter(InterviewReport.id == data["id"]).first()
    assert db_report is not None
    assert db_report.user_id == user.id
    assert db_report.resume_id == resume.id
    assert len(db_report.questions) == 2

def test_generate_interview_unauthorized_resume(client, db):
    headers_a, user_a = get_auth_headers_and_user(client, db, email="usera@example.com")
    headers_b, user_b = get_auth_headers_and_user(client, db, email="userb@example.com")

    # Create resume for user B
    resume_b = Resume(
        user_id=user_b.id,
        file_name="resume_b.pdf",
        file_path="uploads/resume_b.pdf",
        raw_text="User B raw text resume content.",
        is_primary=True
    )
    db.add(resume_b)
    db.commit()

    payload = {
        "resume_id": str(resume_b.id),
        "job_description": "Professor of Computer Science."
    }

    # User A tries to generate using user B's resume
    response = client.post("/api/v1/interviews/generate", json=payload, headers=headers_a)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "You do not have permission to access this resume."

def test_generate_interview_not_found_resume(client, db):
    headers, user = get_auth_headers_and_user(client, db, email="missing_resume@example.com")

    payload = {
        "resume_id": str(uuid4()),
        "job_description": "Data Scientist description."
    }

    response = client.post("/api/v1/interviews/generate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Resume not found."

def test_generate_interview_empty_resume(client, db):
    headers, user = get_auth_headers_and_user(client, db, email="empty_resume@example.com")

    # Create empty resume
    resume = Resume(
        user_id=user.id,
        file_name="empty.pdf",
        file_path="uploads/empty.pdf",
        raw_text=None,
        is_primary=True
    )
    db.add(resume)
    db.commit()

    payload = {
        "resume_id": str(resume.id),
        "job_description": "Cloud Architect."
    }

    response = client.post("/api/v1/interviews/generate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Resume text is empty. Cannot generate interview questions."

@patch("app.services.ai._call_gemini_api")
def test_get_user_interviews(mock_gemini, client, db):
    import json
    mock_gemini.return_value = json.dumps(MOCK_QUESTIONS_LIST)

    headers, user = get_auth_headers_and_user(client, db, email="list_interviews@example.com")
    
    # Create resume
    resume = Resume(
        user_id=user.id,
        file_name="resume.pdf",
        file_path="uploads/resume.pdf",
        raw_text="Experienced engineer.",
        is_primary=True
    )
    db.add(resume)
    db.commit()

    # Generate
    payload = {
        "resume_id": str(resume.id),
        "job_description": "QA Tester."
    }
    gen_response = client.post("/api/v1/interviews/generate", json=payload, headers=headers)
    assert gen_response.status_code == status.HTTP_201_CREATED
    report_id = gen_response.json()["id"]

    # List
    response = client.get("/api/v1/interviews/user", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == report_id
    assert data[0]["job_description"] == "QA Tester."

@patch("app.services.ai._call_gemini_api")
def test_get_interview_by_id(mock_gemini, client, db):
    import json
    mock_gemini.return_value = json.dumps(MOCK_QUESTIONS_LIST)

    headers, user = get_auth_headers_and_user(client, db, email="get_interview@example.com")
    
    # Create resume
    resume = Resume(
        user_id=user.id,
        file_name="resume.pdf",
        file_path="uploads/resume.pdf",
        raw_text="Senior fullstack developer.",
        is_primary=True
    )
    db.add(resume)
    db.commit()

    # Generate
    payload = {
        "resume_id": str(resume.id),
        "job_description": "Product Owner description."
    }
    gen_response = client.post("/api/v1/interviews/generate", json=payload, headers=headers)
    report_id = gen_response.json()["id"]

    # Get by ID
    response = client.get(f"/api/v1/interviews/{report_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == report_id
    assert data["job_description"] == "Product Owner description."

def test_get_interview_unauthorized_report(client, db):
    headers_a, user_a = get_auth_headers_and_user(client, db, email="usera_get@example.com")
    headers_b, user_b = get_auth_headers_and_user(client, db, email="userb_get@example.com")

    # Create resume for user A
    resume_a = Resume(
        user_id=user_a.id,
        file_name="resume_a.pdf",
        file_path="uploads/resume_a.pdf",
        raw_text="Resume A content text.",
        is_primary=True
    )
    db.add(resume_a)
    db.commit()

    # Create report for user A
    report_a = InterviewReport(
        user_id=user_a.id,
        resume_id=resume_a.id,
        job_description="DevOps engineer",
        questions=MOCK_QUESTIONS_LIST
    )
    db.add(report_a)
    db.commit()

    # User B tries to fetch User A's report by ID
    response = client.get(f"/api/v1/interviews/{report_a.id}", headers=headers_b)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Interview report not found."
