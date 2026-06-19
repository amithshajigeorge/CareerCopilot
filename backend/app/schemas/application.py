from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from uuid import UUID
from typing import Optional

class ApplicationBase(BaseModel):
    role: str = Field(..., description="Job role or title")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    status: str = Field("Interested", description="Status of the application (Interested, Applied, Assessment, Interview, Rejected, Offer)")
    applied_date: Optional[date] = Field(None, description="Date of application")
    salary: Optional[str] = Field(None, description="Offered/expected salary")
    job_url: Optional[str] = Field(None, description="URL to the job posting")
    notes: Optional[str] = Field(None, description="Personal notes about the application")

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    role: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[date] = None
    salary: Optional[str] = None
    job_url: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
