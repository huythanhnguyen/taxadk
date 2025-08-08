"""
Health Check Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import psutil
import os

from app.database.connection import get_db, test_connection
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "service": "HTKK AI Backend"
    }


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with system info"""
    
    # Database health
    db_healthy = test_connection()
    
    # System metrics
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "service": "HTKK AI Backend",
        "checks": {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "url": settings.database_url.split('@')[1] if '@' in settings.database_url else "hidden"
            },
            "system": {
                "memory_usage_percent": memory.percent,
                "disk_usage_percent": disk.percent,
                "cpu_count": psutil.cpu_count()
            }
        },
        "environment": {
            "debug": settings.debug,
            "htkk_templates_path": settings.htkk_templates_path,
            "htkk_project_path": settings.htkk_project_path
        }
    }


@router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe for Kubernetes"""
    db_healthy = test_connection()
    
    if not db_healthy:
        return {"status": "not ready", "reason": "database connection failed"}, 503
    
    # Check if HTKK templates are accessible
    templates_exist = os.path.exists(settings.htkk_templates_path)
    project_exists = os.path.exists(settings.htkk_project_path)
    
    if not templates_exist or not project_exists:
        return {
            "status": "not ready", 
            "reason": "HTKK templates not accessible",
            "templates_exist": templates_exist,
            "project_exists": project_exists
        }, 503
    
    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check():
    """Liveness probe for Kubernetes"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()} 