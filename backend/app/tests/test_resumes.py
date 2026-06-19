import io
import os
from unittest.mock import patch, MagicMock
from fastapi import status
from app.models.resume import Resume
from app.services.parser import extract_text_from_pdf

def get_auth_headers(client, email="resumeuser@example.com"):
    signup_payload = {
        "name": "Resume User",
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

def test_resume_upload_success(client, db):
    headers = get_auth_headers(client)
    
    pdf_content = b"%PDF-1.4 mock pdf contents"
    file_name = "test_resume.pdf"
    
    response = client.post(
        "/api/v1/resumes/upload",
        files={"file": (file_name, io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["file_name"] == file_name
    assert data["is_primary"] is True
    assert "id" in data
    assert "file_path" in data
    assert "raw_text" in data
    
    # Verify metadata in DB
    db_resume = db.query(Resume).filter(Resume.id == data["id"]).first()
    assert db_resume is not None
    assert db_resume.file_name == file_name
    
    # Clean up local file created by test
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, db_resume.file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

def test_resume_upload_invalid_type(client):
    headers = get_auth_headers(client, email="txtuser@example.com")
    
    file_content = b"simple text resume format"
    file_name = "test_resume.txt"
    
    response = client.post(
        "/api/v1/resumes/upload",
        files={"file": (file_name, io.BytesIO(file_content), "text/plain")},
        headers=headers
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Only PDF resume uploads are supported."

def test_get_user_resumes(client):
    headers = get_auth_headers(client, email="listuser@example.com")
    
    pdf_content = b"%PDF-1.4 mock pdf contents"
    file_name = "test_resume.pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": (file_name, io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_id = upload_resp.json()["id"]
    file_path = upload_resp.json()["file_path"]

    # List
    response = client.get("/api/v1/resumes", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == resume_id
    assert data[0]["file_name"] == file_name

    # Clean up local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

def test_delete_resume_success(client, db):
    headers = get_auth_headers(client, email="deleteuser@example.com")
    
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("delete_me.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    data = upload_resp.json()
    resume_id = data["id"]
    file_path = data["file_path"]
    
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    assert os.path.exists(abs_path) is True

    # Delete
    delete_resp = client.delete(f"/api/v1/resumes/{resume_id}", headers=headers)
    assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
    
    # Check DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    assert db_resume is None

    # Check local disk
    assert os.path.exists(abs_path) is False

def test_pdf_text_extraction_logic():
    # Mock pdfplumber context manager to simulate reading valid pages
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Extracted resume text content details."
    
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    
    with patch("pdfplumber.open") as mock_open:
        mock_open.return_value.__enter__.return_value = mock_pdf
        
        extracted_text = extract_text_from_pdf("dummy_path.pdf")
        assert extracted_text == "Extracted resume text content details."
        mock_open.assert_called_once_with("dummy_path.pdf")

@patch("app.routers.resumes.ai_service.parse_resume")
def test_parse_raw_text_success(mock_parse, client):
    headers = get_auth_headers(client, email="parsetext@example.com")
    
    mock_parse.return_value = {
        "skills": ["Python", "SQL"],
        "projects": [{"title": "AI Project"}],
        "education": [{"school": "State University"}],
        "work_experience": [{"company": "Tech Corp"}]
    }
    
    payload = {"text": "My raw resume text."}
    response = client.post("/api/v1/resumes/parse-text", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["skills"] == ["Python", "SQL"]
    assert data["projects"][0]["title"] == "AI Project"
    assert data["education"][0]["school"] == "State University"
    assert data["experience"][0]["company"] == "Tech Corp"
    mock_parse.assert_called_once_with("My raw resume text.")

@patch("app.routers.resumes.ai_service.parse_resume")
def test_parse_stored_resume_success(mock_parse, client, db):
    headers = get_auth_headers(client, email="parsestored@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("parse_stored.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Mock return values for parse_resume
    mock_parse.return_value = {
        "skills": ["JavaScript", "React"],
        "projects": [{"title": "Web App"}],
        "education": [{"school": "College"}],
        "work_experience": [{"company": "Retail Group"}]
    }
    
    # Manually set raw_text for the db record to ensure it is not empty
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Mock raw resume text stored in DB."
    db.commit()

    # 2. Call parse endpoint
    response = client.post(f"/api/v1/resumes/{resume_id}/parse", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["skills"] == ["JavaScript", "React"]
    assert data["experience"][0]["company"] == "Retail Group"
    
    # Verify DB model updated
    db.refresh(db_resume)
    assert db_resume.parsed_content == mock_parse.return_value

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

@patch("app.routers.resumes.embedder_service.calculate_match_score")
@patch("app.routers.resumes.ai_service.extract_skills_from_text")
def test_match_resume_to_job_success(mock_extract, mock_score, client, db):
    headers = get_auth_headers(client, email="matchuser@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("match_resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Seed raw text and parsed skills in DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Mock raw resume text with skills."
    db_resume.parsed_content = {
        "skills": ["Python", "FastAPI"]
    }
    db.commit()

    # Setup mocks
    mock_score.return_value = 85.5
    # extract_skills_from_text will only be called for the JD
    mock_extract.return_value = ["Python", "FastAPI", "Docker", "AWS"]

    # 2. Call match endpoint
    payload = {"job_description": "We need a Python developer who knows FastAPI, Docker, and AWS."}
    response = client.post(f"/api/v1/resumes/{resume_id}/match", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["match_score"] == 85.5
    assert set(data["matched_skills"]) == {"Python", "FastAPI"}
    assert set(data["missing_skills"]) == {"Docker", "AWS"}
    
    mock_score.assert_called_once_with(db_resume.raw_text, payload["job_description"])
    mock_extract.assert_called_once_with(payload["job_description"])

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

@patch("app.routers.resumes.ai_service.analyze_ats")
@patch("app.routers.resumes.ai_service.extract_skills_from_text")
def test_analyze_resume_ats_success(mock_extract, mock_analyze, client, db):
    headers = get_auth_headers(client, email="atsuser@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("ats_resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Seed raw text in DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Experienced software engineer with Python and SQL."
    db.commit()

    # Setup mocks
    mock_analyze.return_value = {
        "score": 80,
        "formatting_issues": ["Missing page numbers"],
        "content_issues": ["Add metrics"],
        "key_recommendations": ["Improve summary layout"]
    }
    mock_extract.return_value = ["Python", "SQL", "Docker"]

    # 2. Call ATS endpoint
    payload = {"job_description": "We need a developer with Python, SQL, and Docker."}
    response = client.post(f"/api/v1/resumes/{resume_id}/ats", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["ats_score"] == 80
    assert set(data["keyword_coverage"]) == {"Python", "SQL"}
    assert "Missing page numbers" in data["suggestions"]
    assert "Missing keywords found in job description: Docker" in data["suggestions"]
    
    # Verify report stored in DB
    from app.models.report import ATSReport
    db_report = db.query(ATSReport).filter(ATSReport.resume_id == resume_id).first()
    assert db_report is not None
    assert db_report.score == 80
    assert db_report.feedback["keyword_coverage"] == ["Python", "SQL"]

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

@patch("app.routers.resumes.ai_service.skill_gap_analysis")
def test_analyze_skill_gap_success(mock_gap, client, db):
    headers = get_auth_headers(client, email="gapuser@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("gap_resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Seed raw text in DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Experienced software engineer with Python."
    db.commit()

    # Setup mocks
    mock_gap.return_value = {
        "match_score": 70,
        "matching_skills": ["Python"],
        "missing_critical_skills": ["Docker", "Kubernetes"],
        "missing_secondary_skills": ["FastAPI"],
        "roadmap": ["Step 1: Learn Docker", "Step 2: Learn FastAPI"],
        "learning_resources": [{"skill": "Docker", "resource_name": "Docker Course", "resource_type": "course", "url": "http://example.com/docker"}]
    }

    # 2. Call Gap endpoint
    payload = {"job_description": "We need a Python developer who knows Docker, Kubernetes, and FastAPI."}
    response = client.post(f"/api/v1/resumes/{resume_id}/gap", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert set(data["missing_skills"]) == {"Docker", "Kubernetes", "FastAPI"}
    assert data["roadmap"] == ["Step 1: Learn Docker", "Step 2: Learn FastAPI"]
    assert len(data["learning_resources"]) == 1
    assert data["learning_resources"][0]["skill"] == "Docker"
    
    # Verify report stored in DB
    from app.models.report import SkillGapReport
    db_report = db.query(SkillGapReport).filter(SkillGapReport.resume_id == resume_id).first()
    assert db_report is not None
    assert set(db_report.missing_skills) == {"Docker", "Kubernetes", "FastAPI"}
    assert db_report.roadmap == ["Step 1: Learn Docker", "Step 2: Learn FastAPI"]
    assert db_report.learning_resources[0]["skill"] == "Docker"

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

@patch("app.routers.resumes.ai_service.tailor_resume")
def test_tailor_resume_success(mock_tailor, client, db):
    headers = get_auth_headers(client, email="tailoruser@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("tailor_resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Seed raw text in DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Software engineer with Python."
    db.commit()

    # Setup mocks
    mock_tailor.return_value = {
        "tailored_summary": "Highly motivated Software Engineer with experience in Python development.",
        "section_adjustments": [
            {
                "section_name": "experience",
                "original_text": "Coded python apps",
                "suggested_text": "Developed high performance backend services using Python",
                "reason": "Uses stronger action verbs matching the job description"
            }
        ]
    }

    # 2. Call Tailor endpoint
    payload = {"job_description": "Looking for a Software Engineer experienced in backend development."}
    response = client.post(f"/api/v1/resumes/{resume_id}/tailor", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["tailored_summary"] == "Highly motivated Software Engineer with experience in Python development."
    assert len(data["section_adjustments"]) == 1
    assert data["section_adjustments"][0]["section_name"] == "experience"
    assert data["section_adjustments"][0]["suggested_text"] == "Developed high performance backend services using Python"

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

@patch("app.routers.resumes.ai_service.generate_cover_letter")
def test_generate_cover_letter_success(mock_cover, client, db):
    headers = get_auth_headers(client, email="coveruser@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("cover_resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_data = upload_resp.json()
    resume_id = resume_data["id"]
    file_path = resume_data["file_path"]
    
    # Seed raw text in DB
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    db_resume.raw_text = "Software engineer with Python."
    db.commit()

    # Setup mocks
    mock_cover.return_value = "Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position..."

    # 2. Call Cover Letter endpoint
    payload = {
        "job_description": "Looking for a Software Engineer experienced in backend development.",
        "tone": "Professional"
    }
    response = client.post(f"/api/v1/resumes/{resume_id}/cover-letter", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "Dear Hiring Manager" in data["cover_letter"]
    
    mock_cover.assert_called_once_with(
        "Software engineer with Python.",
        payload["job_description"],
        "Professional"
    )

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

def test_get_resume_ats_reports_success(client, db):
    headers = get_auth_headers(client, email="listats@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("list_ats.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_id = upload_resp.json()["id"]
    file_path = upload_resp.json()["file_path"]

    # 2. Add an ATS report directly to DB
    from app.models.report import ATSReport
    report = ATSReport(
        resume_id=resume_id,
        score=75,
        feedback={"suggestions": ["Fix alignment"]}
    )
    db.add(report)
    db.commit()

    # 3. GET listing
    response = client.get(f"/api/v1/resumes/{resume_id}/ats", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["score"] == 75
    assert data[0]["feedback"]["suggestions"] == ["Fix alignment"]

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

def test_get_resume_skill_gap_reports_success(client, db):
    headers = get_auth_headers(client, email="listgap@example.com")
    
    # 1. Upload mock resume
    pdf_content = b"%PDF-1.4 mock pdf"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("list_gap.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers=headers
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    resume_id = upload_resp.json()["id"]
    file_path = upload_resp.json()["file_path"]

    # Retrieve current user db record to get ID
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    user_id = db_resume.user_id

    # 2. Add a Skill Gap report directly to DB
    from app.models.report import SkillGapReport
    report = SkillGapReport(
        user_id=user_id,
        resume_id=resume_id,
        job_description="Sample JD",
        missing_skills=["Docker"],
        roadmap=["Step 1"],
        learning_resources=[]
    )
    db.add(report)
    db.commit()

    # 3. GET listing
    response = client.get(f"/api/v1/resumes/{resume_id}/gap", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["job_description"] == "Sample JD"
    assert data[0]["missing_skills"] == ["Docker"]

    # Cleanup local file
    from app.services.resume import BASE_DIR
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)
