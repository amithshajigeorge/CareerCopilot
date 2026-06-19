import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user
from pydantic import BaseModel, Field
from app.models.user import User
from app.models.report import ATSReport, SkillGapReport
from app.schemas.resume import ResumeResponse, ParsedResumeResponse, JobMatchRequest, JobMatchResponse, TailorResumeRequest, TailorResumeResponse, CoverLetterRequest, CoverLetterResponse
from app.schemas.report import ATSAnalysisRequest, ATSAnalysisResponse, SkillGapRequest, SkillGapResponse, ATSReportResponse, SkillGapReportResponse
from app.services import resume as resume_service
from app.services import parser as parser_service
from app.services import ai as ai_service
from app.services import embedder as embedder_service

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate PDF extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resume uploads are supported."
        )
    
    # Read file data
    contents = await file.read()
    
    # Save file to disk
    file_path = resume_service.save_uploaded_file(contents, file.filename)
    
    # Extract text content from PDF
    abs_file_path = os.path.join(resume_service.BASE_DIR, file_path)
    raw_text = parser_service.extract_text_from_pdf(abs_file_path)
    
    # Store metadata in DB
    db_resume = resume_service.create_resume(db, current_user.id, file.filename, file_path, raw_text)
    return db_resume

@router.get("", response_model=list[ResumeResponse])
def get_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return resume_service.get_user_resumes(db, current_user.id)

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this resume."
        )
    
    resume_service.delete_resume(db, resume_id)
    return

class ParseTextRequest(BaseModel):
    text: str = Field(..., description="The raw resume text to parse")

@router.post("/parse-text", response_model=ParsedResumeResponse)
def parse_raw_text(
    payload: ParseTextRequest,
    current_user: User = Depends(get_current_user)
):
    parsed = ai_service.parse_resume(payload.text)
    return {
        "skills": parsed.get("skills", []),
        "projects": parsed.get("projects", []),
        "education": parsed.get("education", []),
        "experience": parsed.get("work_experience", [])
    }

@router.post("/{resume_id}/parse", response_model=ParsedResumeResponse)
def parse_stored_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to parse this resume."
        )
    
    if not resume.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume does not contain text. Make sure it was uploaded correctly."
        )
        
    parsed = ai_service.parse_resume(resume.raw_text)
    
    # Save parsed JSON to database
    resume.parsed_content = parsed
    db.commit()
    
    return {
        "skills": parsed.get("skills", []),
        "projects": parsed.get("projects", []),
        "education": parsed.get("education", []),
        "experience": parsed.get("work_experience", [])
    }

@router.post("/{resume_id}/match", response_model=JobMatchResponse)
def match_resume_to_job(
    resume_id: UUID,
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
            detail="Resume text is empty. Cannot perform job matching."
        )
        
    # 1. Calculate semantic match score using Sentence Transformers
    match_score = embedder_service.calculate_match_score(resume.raw_text, payload.job_description)
    
    # 2. Resolve candidate skills
    candidate_skills = []
    if resume.parsed_content and "skills" in resume.parsed_content:
        candidate_skills = resume.parsed_content["skills"]
    else:
        # Fallback to extracting skills dynamically from the raw text
        candidate_skills = ai_service.extract_skills_from_text(resume.raw_text)
        
    # 3. Extract required skills from the job description
    required_skills = ai_service.extract_skills_from_text(payload.job_description)
    
    # 4. Perform case-insensitive intersection and difference logic
    candidate_skills_lower = {skill.lower(): skill for skill in candidate_skills}
    required_skills_lower = {skill.lower(): skill for skill in required_skills}
    
    matched_set = set(candidate_skills_lower.keys()).intersection(set(required_skills_lower.keys()))
    missing_set = set(required_skills_lower.keys()).difference(set(candidate_skills_lower.keys()))
    
    # Map matched/missing sets back to their original capitalization format
    matched_skills = [required_skills_lower[skill] for skill in matched_set]
    missing_skills = [required_skills_lower[skill] for skill in missing_set]
    
    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }

@router.post("/{resume_id}/ats", response_model=ATSAnalysisResponse)
def analyze_resume_ats(
    resume_id: UUID,
    payload: ATSAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
            detail="Resume text is empty. Cannot perform ATS analysis."
        )
        
    # 1. Use Gemini to perform core ATS evaluation
    analysis_result = ai_service.analyze_ats(resume.raw_text)
    
    # 2. Extract required skills from the job description to calculate keyword coverage
    jd_skills = ai_service.extract_skills_from_text(payload.job_description)
    
    # Check coverage of each JD skill in raw resume text (case-insensitive check)
    raw_text_lower = resume.raw_text.lower()
    keyword_coverage = []
    missing_keywords = []
    
    for skill in jd_skills:
        if skill.lower() in raw_text_lower:
            keyword_coverage.append(skill)
        else:
            missing_keywords.append(skill)
            
    # 3. Consolidate formatting suggestions, content issues, and missing keyword warnings
    suggestions = []
    suggestions.extend(analysis_result.get("formatting_issues", []))
    suggestions.extend(analysis_result.get("content_issues", []))
    suggestions.extend(analysis_result.get("key_recommendations", []))
    
    # Add warnings for missing keywords
    if missing_keywords:
        suggestions.append(f"Missing keywords found in job description: {', '.join(missing_keywords[:8])}")
        
    # 4. Save report to PostgreSQL DB
    report = ATSReport(
        resume_id=resume.id,
        score=analysis_result.get("score", 0),
        feedback={
            "keyword_coverage": keyword_coverage,
            "suggestions": suggestions
        }
    )
    db.add(report)
    db.commit()
    
    return {
        "ats_score": report.score,
        "keyword_coverage": keyword_coverage,
        "suggestions": suggestions
    }

@router.post("/{resume_id}/gap", response_model=SkillGapResponse)
def analyze_skill_gap(
    resume_id: UUID,
    payload: SkillGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
            detail="Resume text is empty. Cannot perform skill gap analysis."
        )
        
    # Call Gemini service
    analysis_result = ai_service.skill_gap_analysis(resume.raw_text, payload.job_description)
    
    # Consolidate missing skills (critical + secondary)
    missing_skills = []
    missing_skills.extend(analysis_result.get("missing_critical_skills", []))
    missing_skills.extend(analysis_result.get("missing_secondary_skills", []))
    
    roadmap = analysis_result.get("roadmap", [])
    learning_resources = analysis_result.get("learning_resources", [])
    
    # Save SkillGapReport database record
    report = SkillGapReport(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description=payload.job_description,
        missing_skills=missing_skills,
        roadmap=roadmap,
        learning_resources=learning_resources
    )
    db.add(report)
    db.commit()
    
    return {
        "missing_skills": missing_skills,
        "roadmap": roadmap,
        "learning_resources": learning_resources
    }

@router.post("/{resume_id}/tailor", response_model=TailorResumeResponse)
def tailor_resume_endpoint(
    resume_id: UUID,
    payload: TailorResumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
            detail="Resume text is empty. Cannot perform resume tailoring."
        )
        
    # Call Gemini service
    tailoring_result = ai_service.tailor_resume(resume.raw_text, payload.job_description)
    
    return {
        "tailored_summary": tailoring_result.get("tailored_summary", ""),
        "section_adjustments": tailoring_result.get("section_adjustments", [])
    }

@router.post("/{resume_id}/cover-letter", response_model=CoverLetterResponse)
def generate_resume_cover_letter(
    resume_id: UUID,
    payload: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
            detail="Resume text is empty. Cannot generate cover letter."
        )
        
    cover_letter_text = ai_service.generate_cover_letter(
        resume.raw_text, 
        payload.job_description, 
        payload.tone
    )
    
    return {
        "cover_letter": cover_letter_text
    }

@router.get("/{resume_id}/ats", response_model=list[ATSReportResponse])
def get_resume_ats_reports(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
    
    return db.query(ATSReport).filter(ATSReport.resume_id == resume_id).order_by(ATSReport.created_at.desc()).all()

@router.get("/{resume_id}/gap", response_model=list[SkillGapReportResponse])
def get_resume_skill_gap_reports(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = resume_service.get_resume(db, resume_id)
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
        
    return db.query(SkillGapReport).filter(SkillGapReport.resume_id == resume_id).order_by(SkillGapReport.created_at.desc()).all()
