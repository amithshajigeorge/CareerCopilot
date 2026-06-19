from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class InterviewGenerateRequest(BaseModel):
    resume_id: UUID = Field(..., description="The ID of the resume to base the interview questions on")
    job_description: str = Field(..., description="The job description to tailor the interview questions against")

class InterviewQuestion(BaseModel):
    question: str = Field(..., description="The mock interview question")
    type: str = Field(..., description="The type of the question (e.g. technical, behavioral, resume-specific)")
    tip: str = Field(..., description="Helpful tip for answering the question")
    sample_answer: str = Field(..., description="A stellar sample answer outline")

class InterviewReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    resume_id: UUID
    job_description: str
    questions: list[InterviewQuestion]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
