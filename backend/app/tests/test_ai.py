import pytest
from unittest.mock import patch
from app.services import ai

# Mock JSON responses
MOCK_PARSE_RESUME = '{"contact_details": {"name": "Amith", "email": "amith@example.com", "phone": "123", "location": "USA", "links": []}, "work_experience": [], "projects": [], "skills": ["Python"], "education": []}'
MOCK_ANALYZE_ATS = '{"score": 85, "formatting_issues": ["No page numbers"], "content_issues": [], "key_recommendations": ["Add metrics"]}'
MOCK_SKILL_GAP = '{"match_score": 70, "matching_skills": ["Python"], "missing_critical_skills": ["FastAPI"], "missing_secondary_skills": [], "learning_resources": []}'
MOCK_TAILOR_RESUME = '{"tailored_summary": "Tailored career summary.", "section_adjustments": []}'
MOCK_INTERVIEW_QUESTIONS = '[{"question": "Tell me about your Python experience.", "type": "technical", "tip": "Mention projects.", "sample_answer": "I built backend APIs."}]'
MOCK_COVER_LETTER = "Dear hiring manager, I am applying for the role..."

@patch("app.services.ai._call_gemini_api")
def test_parse_resume_success(mock_api):
    mock_api.return_value = MOCK_PARSE_RESUME
    result = ai.parse_resume("my raw resume text")
    assert result["contact_details"]["name"] == "Amith"
    assert "Python" in result["skills"]
    mock_api.assert_called_once()

@patch("app.services.ai._call_gemini_api")
def test_analyze_ats_success(mock_api):
    mock_api.return_value = MOCK_ANALYZE_ATS
    result = ai.analyze_ats("resume text")
    assert result["score"] == 85
    assert "No page numbers" in result["formatting_issues"]

@patch("app.services.ai._call_gemini_api")
def test_skill_gap_analysis_success(mock_api):
    mock_api.return_value = MOCK_SKILL_GAP
    result = ai.skill_gap_analysis("resume text", "jd text")
    assert result["match_score"] == 70
    assert "FastAPI" in result["missing_critical_skills"]

@patch("app.services.ai._call_gemini_api")
def test_tailor_resume_success(mock_api):
    mock_api.return_value = MOCK_TAILOR_RESUME
    result = ai.tailor_resume("resume text", "jd text")
    assert result["tailored_summary"] == "Tailored career summary."

@patch("app.services.ai._call_gemini_api")
def test_generate_cover_letter_success(mock_api):
    mock_api.return_value = MOCK_COVER_LETTER
    result = ai.generate_cover_letter("resume text", "jd text")
    assert "Dear hiring manager" in result

@patch("app.services.ai._call_gemini_api")
def test_generate_interview_questions_success(mock_api):
    mock_api.return_value = MOCK_INTERVIEW_QUESTIONS
    result = ai.generate_interview_questions("resume text", "jd text")
    assert len(result) == 1
    assert result[0]["question"] == "Tell me about your Python experience."
