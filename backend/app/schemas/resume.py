from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
from typing import Any

class ResumeResponse(BaseModel):
    id: UUID
    user_id: UUID
    file_name: str
    file_path: str
    raw_text: str | None = None
    parsed_content: dict | None = None
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ParsedResumeResponse(BaseModel):
    skills: list[str]
    projects: list[dict[str, Any]]
    education: list[dict[str, Any]]
    experience: list[dict[str, Any]]

class JobMatchRequest(BaseModel):
    job_description: str = Field(..., description="The target job description text to match against")

class JobMatchResponse(BaseModel):
    match_score: float = Field(..., description="Cosine similarity match percentage (0-100)")
    matched_skills: list[str] = Field(..., description="Required skills present in candidate's profile")
    missing_skills: list[str] = Field(..., description="Required skills missing from candidate's profile")

class TailorResumeRequest(BaseModel):
    job_description: str = Field(..., description="The job description to tailor the resume against")

class SectionAdjustment(BaseModel):
    section_name: str = Field(..., description="The section name (e.g. experience, projects, skills)")
    original_text: str = Field(..., description="The original text from the resume")
    suggested_text: str = Field(..., description="The tailored / suggested text")
    reason: str = Field(..., description="Why this adjustment was recommended")

class TailorResumeResponse(BaseModel):
    tailored_summary: str = Field(..., description="A suggested updated profile/summary paragraph")
    section_adjustments: list[SectionAdjustment] = Field(..., description="List of proposed section-by-section adjustments")

class CoverLetterRequest(BaseModel):
    job_description: str = Field(..., description="The target job description text to generate the cover letter for")
    tone: str = Field("Professional", description="The tone of the cover letter (e.g. Professional, Creative, Enthusiastic)")

class CoverLetterResponse(BaseModel):
    cover_letter: str = Field(..., description="The generated custom cover letter text")
