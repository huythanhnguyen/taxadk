"""
User Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr

from app.database.connection import get_db
from app.database.models import User, AuditLog
from app.services.audit import log_user_action

router = APIRouter()


# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    tax_code: str = None
    business_name: str = None


class UserUpdate(BaseModel):
    tax_code: str = None
    business_name: str = None


class UserResponse(BaseModel):
    id: int
    email: str
    tax_code: str = None
    business_name: str = None
    created_at: str
    
    class Config:
        from_attributes = True


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        tax_code=user_data.tax_code,
        business_name=user_data.business_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Log user creation
    await log_user_action(db, user.id, "user_created", {"email": user.email})
    
    return user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/users", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all users with pagination"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Update user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.tax_code is not None:
        user.tax_code = user_data.tax_code
    if user_data.business_name is not None:
        user.business_name = user_data.business_name
    
    db.commit()
    db.refresh(user)
    
    # Log user update
    await log_user_action(db, user.id, "user_updated", user_data.dict(exclude_unset=True))
    
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Log user deletion before deleting
    await log_user_action(db, user.id, "user_deleted", {"email": user.email})
    
    db.delete(user)
    db.commit()


@router.get("/users/{user_id}/audit-logs")
async def get_user_audit_logs(
    user_id: int, 
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """Get audit logs for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(
        AuditLog.timestamp.desc()
    ).offset(skip).limit(limit).all()
    
    return logs 