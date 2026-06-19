import uuid
from sqlalchemy import Column, String, DateTime, text, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        server_default=text("gen_random_uuid()")
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    raw_text = Column(Text, nullable=True)
    parsed_content = Column(JSONB, nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        nullable=False
    )

    user = relationship("User", back_populates="resumes")
    ats_reports = relationship("ATSReport", back_populates="resume", cascade="all, delete-orphan")
    skill_gap_reports = relationship("SkillGapReport", back_populates="resume", cascade="all, delete-orphan")
    interview_reports = relationship("InterviewReport", back_populates="resume", cascade="all, delete-orphan")

