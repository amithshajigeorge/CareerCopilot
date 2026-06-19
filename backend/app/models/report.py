import uuid
from sqlalchemy import Column, Integer, DateTime, text, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class ATSReport(Base):
    __tablename__ = "ats_reports"

    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        server_default=text("gen_random_uuid()")
    )
    resume_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("resumes.id", ondelete="CASCADE"), 
        nullable=False
    )
    score = Column(Integer, nullable=False)
    feedback = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        nullable=False
    )

    resume = relationship("Resume", back_populates="ats_reports")

class SkillGapReport(Base):
    __tablename__ = "skill_gap_reports"

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
    resume_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("resumes.id", ondelete="CASCADE"), 
        nullable=False
    )
    job_description = Column(Text, nullable=False)
    missing_skills = Column(JSONB, nullable=False)
    roadmap = Column(JSONB, nullable=False)
    learning_resources = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        nullable=False
    )

    resume = relationship("Resume", back_populates="skill_gap_reports")


class InterviewReport(Base):
    __tablename__ = "interview_reports"

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
    resume_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("resumes.id", ondelete="CASCADE"), 
        nullable=False
    )
    job_description = Column(Text, nullable=False)
    questions = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        nullable=False
    )

    user = relationship("User", back_populates="interview_reports")
    resume = relationship("Resume", back_populates="interview_reports")

