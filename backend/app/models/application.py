import uuid
from sqlalchemy import Column, String, DateTime, text, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Application(Base):
    __tablename__ = "applications"

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
    role = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="Interested", nullable=False) # Interested, Applied, Assessment, Interview, Rejected, Offer
    applied_date = Column(Date, nullable=True)
    salary = Column(String(100), nullable=True)
    job_url = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=text("now()"), 
        onupdate=text("now()"), 
        nullable=False
    )

    user = relationship("User", back_populates="applications")
