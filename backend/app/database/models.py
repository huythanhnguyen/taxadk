"""
HTKK AI Database Models
Minimal schema as specified in PRD - only 4 tables
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    """User Management Table"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    tax_code = Column(String(20), index=True)
    business_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    adk_sessions = relationship("ADKSession", back_populates="user")
    document_cache = relationship("DocumentCache", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', tax_code='{self.tax_code}')>"


class ADKSession(Base):
    """ADK Session Storage Table"""
    __tablename__ = "adk_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255), unique=True, index=True, nullable=False)
    session_data = Column(JSON)  # Store ADK session state and memory
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="adk_sessions")
    
    def __repr__(self):
        return f"<ADKSession(id={self.id}, user_id={self.user_id}, session_id='{self.session_id}')>"


class DocumentCache(Base):
    """Document Cache Table"""
    __tablename__ = "document_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    extracted_data = Column(JSON)  # OCR results and extracted data
    file_type = Column(String(10), nullable=False)  # 'xml' or 'pdf'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="document_cache")
    
    def __repr__(self):
        return f"<DocumentCache(id={self.id}, user_id={self.user_id}, file_type='{self.file_type}')>"


class AuditLog(Base):
    """Audit Logs Table"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(JSON)  # Action details and metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action='{self.action}')>" 