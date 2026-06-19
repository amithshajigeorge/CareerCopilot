from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    name: str = Field(..., max_length=100, description="The user's full name")
    email: str = Field(..., max_length=255, description="The user's email address")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Plaintext password (min 6 characters)")

class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
