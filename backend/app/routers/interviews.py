from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.report import InterviewReport
from app.schemas.interview import InterviewGenerateRequest, InterviewReportResponse
from app.services import ai as ai_service

router = APIRouter(prefix="/interviews", tags=["interviews"])

@router.post("/generate", response_model=InterviewReportResponse, status_code=status.HTTP_201_CREATED)
def generate_interview(
    payload: InterviewGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the resume
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resume."
        )
    if not resume.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is empty. Cannot generate interview questions."
        )
        
    # Generate mock questions using AI service
    questions = ai_service.generate_interview_questions(resume.raw_text, payload.job_description)
    
    # Store in database
    db_report = InterviewReport(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description=payload.job_description,
        questions=questions
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/user", response_model=list[InterviewReportResponse])
def get_user_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(InterviewReport).filter(
        InterviewReport.user_id == current_user.id
    ).order_by(InterviewReport.created_at.desc()).all()

@router.get("/{id}", response_model=InterviewReportResponse)
def get_interview(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(InterviewReport).filter(
        InterviewReport.id == id,
        InterviewReport.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview report not found."
        )
    return report
