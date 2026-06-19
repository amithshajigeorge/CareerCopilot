from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=list[ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.created_at.desc()).all()

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allowed status values
    allowed_statuses = {"Interested", "Applied", "Assessment", "Interview", "Rejected", "Offer"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid application status. Must be one of: {', '.join(allowed_statuses)}"
        )
        
    db_application = Application(
        user_id=current_user.id,
        role=payload.role,
        company=payload.company,
        location=payload.location,
        status=payload.status,
        applied_date=payload.applied_date,
        salary=payload.salary,
        job_url=payload.job_url,
        notes=payload.notes
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@router.put("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == current_user.id
    ).first()
    
    if not db_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or access denied."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    # Allowed status values if status is being updated
    if "status" in update_data:
        allowed_statuses = {"Interested", "Applied", "Assessment", "Interview", "Rejected", "Offer"}
        if update_data["status"] not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid application status. Must be one of: {', '.join(allowed_statuses)}"
            )
            
    for key, value in update_data.items():
        setattr(db_application, key, value)
        
    db.commit()
    db.refresh(db_application)
    return db_application

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == current_user.id
    ).first()
    
    if not db_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or access denied."
        )
        
    db.delete(db_application)
    db.commit()
    return
