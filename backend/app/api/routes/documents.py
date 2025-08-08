"""
Document Processing Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import hashlib
import os

from app.database.connection import get_db
from app.database.models import DocumentCache
from app.services.audit import log_document_action
from app.services.ocr_service import OCRService
from app.config import settings

router = APIRouter()

# Initialize services
ocr_service = OCRService()


# Pydantic models
class DocumentUploadResponse(BaseModel):
    document_id: int
    file_hash: str
    file_type: str
    file_size: int
    status: str


class DocumentProcessResponse(BaseModel):
    document_id: int
    extracted_data: Dict[str, Any]
    processing_status: str
    confidence_score: float = None


class DocumentListResponse(BaseModel):
    id: int
    file_hash: str
    file_type: str
    created_at: str
    processing_status: str


@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = 1,  # TODO: Get from authentication
    db: Session = Depends(get_db)
):
    """Upload document for processing (PDF or XML)"""
    
    # Validate file type
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {settings.allowed_extensions}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.max_file_size} bytes"
        )
    
    # Calculate file hash
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Check if file already exists
    existing_doc = db.query(DocumentCache).filter(
        DocumentCache.file_hash == file_hash
    ).first()
    
    if existing_doc:
        return DocumentUploadResponse(
            document_id=existing_doc.id,
            file_hash=file_hash,
            file_type=existing_doc.file_type,
            file_size=len(content),
            status="already_exists"
        )
    
    # Save file to upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{file_hash}{file_extension}")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document cache entry
    document = DocumentCache(
        user_id=user_id,
        file_hash=file_hash,
        file_type=file_extension[1:],  # Remove the dot
        extracted_data={"file_path": file_path, "original_filename": file.filename}
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Log upload action
    await log_document_action(
        db,
        user_id,
        document.file_type,
        "document_uploaded",
        {
            "filename": file.filename,
            "file_size": len(content),
            "file_hash": file_hash
        }
    )
    
    return DocumentUploadResponse(
        document_id=document.id,
        file_hash=file_hash,
        file_type=document.file_type,
        file_size=len(content),
        status="uploaded"
    )


@router.post("/documents/{document_id}/process", response_model=DocumentProcessResponse)
async def process_document(
    document_id: int,
    user_id: int = 1,  # TODO: Get from authentication
    db: Session = Depends(get_db)
):
    """Process uploaded document with OCR/XML parsing"""
    
    # Get document from cache
    document = db.query(DocumentCache).filter(
        DocumentCache.id == document_id,
        DocumentCache.user_id == user_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    try:
        # Process based on file type
        if document.file_type == "pdf":
            extracted_data = await ocr_service.process_pdf(
                document.extracted_data["file_path"]
            )
        elif document.file_type == "xml":
            extracted_data = await ocr_service.process_xml(
                document.extracted_data["file_path"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {document.file_type}"
            )
        
        # Update document cache with extracted data
        document.extracted_data.update({
            "processed_data": extracted_data,
            "processing_status": "completed"
        })
        
        db.commit()
        
        # Log processing action
        await log_document_action(
            db,
            user_id,
            document.file_type,
            "document_processed",
            {
                "document_id": document_id,
                "extracted_fields": len(extracted_data.get("fields", {})),
                "confidence_score": extracted_data.get("confidence_score")
            }
        )
        
        return DocumentProcessResponse(
            document_id=document_id,
            extracted_data=extracted_data,
            processing_status="completed",
            confidence_score=extracted_data.get("confidence_score")
        )
        
    except Exception as e:
        # Update status to failed
        document.extracted_data.update({
            "processing_status": "failed",
            "error": str(e)
        })
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


@router.get("/documents", response_model=List[DocumentListResponse])
async def list_documents(
    user_id: int = 1,  # TODO: Get from authentication
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List user's uploaded documents"""
    
    documents = db.query(DocumentCache).filter(
        DocumentCache.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    return [
        DocumentListResponse(
            id=doc.id,
            file_hash=doc.file_hash,
            file_type=doc.file_type,
            created_at=doc.created_at.isoformat(),
            processing_status=doc.extracted_data.get("processing_status", "pending")
        )
        for doc in documents
    ]


@router.get("/documents/{document_id}", response_model=DocumentProcessResponse)
async def get_document(
    document_id: int,
    user_id: int = 1,  # TODO: Get from authentication
    db: Session = Depends(get_db)
):
    """Get document processing results"""
    
    document = db.query(DocumentCache).filter(
        DocumentCache.id == document_id,
        DocumentCache.user_id == user_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    processed_data = document.extracted_data.get("processed_data", {})
    processing_status = document.extracted_data.get("processing_status", "pending")
    
    return DocumentProcessResponse(
        document_id=document_id,
        extracted_data=processed_data,
        processing_status=processing_status,
        confidence_score=processed_data.get("confidence_score")
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    user_id: int = 1,  # TODO: Get from authentication
    db: Session = Depends(get_db)
):
    """Delete uploaded document"""
    
    document = db.query(DocumentCache).filter(
        DocumentCache.id == document_id,
        DocumentCache.user_id == user_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete physical file
    file_path = document.extracted_data.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Log deletion
    await log_document_action(
        db,
        user_id,
        document.file_type,
        "document_deleted",
        {"document_id": document_id}
    )
    
    # Delete from database
    db.delete(document)
    db.commit() 