import os
import uuid
from sqlalchemy.orm import Session
from app.models.resume import Resume
from uuid import UUID

# Locate backend root folder to store uploads in backend/uploads/resumes
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "resumes")

def save_uploaded_file(file_content: bytes, original_filename: str) -> str:
    """Save file to local storage and return the path relative to the backend root."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename to avoid collision
    file_ext = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    return os.path.join("uploads", "resumes", unique_filename)

def create_resume(db: Session, user_id: UUID, file_name: str, file_path: str, raw_text: str | None = None) -> Resume:
    """Save resume metadata in the database.
    If this is the first resume for the user, set it as primary."""
    has_resumes = db.query(Resume).filter(Resume.user_id == user_id).first()
    is_primary = False if has_resumes else True
    
    db_resume = Resume(
        user_id=user_id,
        file_name=file_name,
        file_path=file_path,
        raw_text=raw_text,
        is_primary=is_primary
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

def get_user_resumes(db: Session, user_id: UUID) -> list[Resume]:
    """Get all resumes uploaded by a user."""
    return db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).all()

def get_resume(db: Session, resume_id: UUID) -> Resume | None:
    """Retrieve resume metadata by ID."""
    return db.query(Resume).filter(Resume.id == resume_id).first()

def delete_resume_file(file_path: str) -> None:
    """Delete the file from local storage if it exists."""
    abs_path = os.path.join(BASE_DIR, file_path)
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
        except Exception:
            pass

def delete_resume(db: Session, resume_id: UUID) -> bool:
    """Delete resume metadata and remove its file from disk."""
    resume = get_resume(db, resume_id)
    if not resume:
        return False
    
    db.delete(resume)
    db.commit()
    
    delete_resume_file(resume.file_path)
    return True
