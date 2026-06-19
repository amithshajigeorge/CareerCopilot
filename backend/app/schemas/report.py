from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class ATSAnalysisRequest(BaseModel):
    job_description: str = Field(..., description="The job description to analyze the resume against")

class ATSAnalysisResponse(BaseModel):
    ats_score: int = Field(..., description="The calculated ATS score from 0 to 100")
    keyword_coverage: list[str] = Field(..., description="Key technical terms and keywords identified in the analysis")
    suggestions: list[str] = Field(..., description="A list of actionable suggestions and recommendations to improve the resume")

class ATSReportResponse(BaseModel):
    id: UUID
    resume_id: UUID
    score: int
    feedback: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SkillGapRequest(BaseModel):
    job_description: str = Field(..., description="The job description to perform skill gap analysis against")

class SkillGapResponse(BaseModel):
    missing_skills: list[str] = Field(..., description="Required skills missing from candidate's profile")
    roadmap: list[str] = Field(..., description="Structured steps to bridge the missing skill gap")
    learning_resources: list[dict] = Field(..., description="Suggested training, courses, and certifications")

class SkillGapReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    resume_id: UUID
    job_description: str
    missing_skills: list[str]
    roadmap: list[str]
    learning_resources: list[dict]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
