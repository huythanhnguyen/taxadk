"""
Audit Logging Service
"""
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from app.database.models import AuditLog

logger = logging.getLogger(__name__)


async def log_user_action(
    db: Session, 
    user_id: int, 
    action: str, 
    details: Dict[str, Any] = None
) -> AuditLog:
    """
    Log user action to audit trail
    
    Args:
        db: Database session
        user_id: User ID performing the action
        action: Action description
        details: Additional action details
    
    Returns:
        Created audit log entry
    """
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            details=details or {}
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        logger.info(f"Audit log created: user_id={user_id}, action={action}")
        return audit_log
        
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")
        db.rollback()
        raise


async def log_form_action(
    db: Session,
    user_id: int,
    form_type: str,
    action: str,
    details: Dict[str, Any] = None
) -> AuditLog:
    """
    Log form-related action
    
    Args:
        db: Database session
        user_id: User ID
        form_type: Type of tax form (e.g., '01_GTGT')
        action: Action performed (e.g., 'form_created', 'form_submitted')
        details: Additional details
    """
    action_details = {
        "form_type": form_type,
        **(details or {})
    }
    
    return await log_user_action(db, user_id, action, action_details)


async def log_document_action(
    db: Session,
    user_id: int,
    document_type: str,
    action: str,
    details: Dict[str, Any] = None
) -> AuditLog:
    """
    Log document processing action
    
    Args:
        db: Database session
        user_id: User ID
        document_type: Type of document ('xml', 'pdf')
        action: Action performed (e.g., 'document_uploaded', 'ocr_processed')
        details: Additional details
    """
    action_details = {
        "document_type": document_type,
        **(details or {})
    }
    
    return await log_user_action(db, user_id, action, action_details)


async def log_ai_action(
    db: Session,
    user_id: int,
    agent_type: str,
    action: str,
    details: Dict[str, Any] = None
) -> AuditLog:
    """
    Log AI agent action
    
    Args:
        db: Database session
        user_id: User ID
        agent_type: Type of agent ('form_agent', 'ocr_agent', 'tax_validator')
        action: Action performed
        details: Additional details
    """
    action_details = {
        "agent_type": agent_type,
        **(details or {})
    }
    
    return await log_user_action(db, user_id, action, action_details) 