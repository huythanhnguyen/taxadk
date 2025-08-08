"""
Tax Forms Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from app.database.connection import get_db
from app.services.audit import log_form_action
from app.services.htkk_parser import HTKKParser
from app.services.form_engine import FormEngine

router = APIRouter()

# Initialize services
htkk_parser = HTKKParser()
form_engine = FormEngine()


# Pydantic models
class FormListResponse(BaseModel):
    id: str
    caption: str
    form_name: str
    version: str
    description: str


class FormTemplateResponse(BaseModel):
    form_id: str
    template: Dict[str, Any]
    validation_rules: Dict[str, Any]
    business_rules: Dict[str, Any]


class FormDataRequest(BaseModel):
    form_id: str
    form_data: Dict[str, Any]
    user_id: int


class FormValidationResponse(BaseModel):
    is_valid: bool
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]


@router.get("/forms", response_model=List[FormListResponse])
async def list_available_forms():
    """Get list of available tax forms from HTKK Menu.xml"""
    try:
        forms = await htkk_parser.get_available_forms()
        return forms
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load forms: {str(e)}"
        )


@router.get("/forms/{form_id}/template", response_model=FormTemplateResponse)
async def get_form_template(form_id: str):
    """Get form template structure for rendering"""
    try:
        template = await htkk_parser.parse_form_template(form_id)
        validation_rules = await htkk_parser.get_validation_rules(form_id)
        business_rules = await htkk_parser.get_business_rules(form_id)
        
        return FormTemplateResponse(
            form_id=form_id,
            template=template,
            validation_rules=validation_rules,
            business_rules=business_rules
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Form template not found: {form_id}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load form template: {str(e)}"
        )


@router.post("/forms/validate", response_model=FormValidationResponse)
async def validate_form_data(
    request: FormDataRequest,
    db: Session = Depends(get_db)
):
    """Validate form data against business rules and XSD schemas"""
    try:
        # Validate using form engine
        validation_result = await form_engine.validate_form(
            request.form_id,
            request.form_data
        )
        
        # Log validation action
        await log_form_action(
            db,
            request.user_id,
            request.form_id,
            "form_validated",
            {
                "is_valid": validation_result.is_valid,
                "error_count": len(validation_result.errors),
                "warning_count": len(validation_result.warnings)
            }
        )
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@router.post("/forms/calculate")
async def calculate_taxes(
    request: FormDataRequest,
    db: Session = Depends(get_db)
):
    """Calculate taxes based on form data and business rules"""
    try:
        # Calculate using form engine
        calculation_result = await form_engine.calculate_taxes(
            request.form_id,
            request.form_data
        )
        
        # Log calculation action
        await log_form_action(
            db,
            request.user_id,
            request.form_id,
            "taxes_calculated",
            {
                "calculated_fields": list(calculation_result.get("calculated_fields", {}).keys())
            }
        )
        
        return calculation_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tax calculation failed: {str(e)}"
        )


@router.post("/forms/export-xml")
async def export_form_to_xml(
    request: FormDataRequest,
    db: Session = Depends(get_db)
):
    """Export form data to HTKK-compatible XML"""
    try:
        # Export using form engine
        xml_content = await form_engine.export_to_xml(
            request.form_id,
            request.form_data
        )
        
        # Log export action
        await log_form_action(
            db,
            request.user_id,
            request.form_id,
            "form_exported",
            {
                "export_format": "xml",
                "xml_size": len(xml_content)
            }
        )
        
        return {
            "xml_content": xml_content,
            "form_id": request.form_id,
            "export_timestamp": "2025-08-07T00:00:00Z"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"XML export failed: {str(e)}"
        )


@router.get("/forms/{form_id}/business-rules")
async def get_form_business_rules(form_id: str):
    """Get business rules for a specific form"""
    try:
        rules = await htkk_parser.get_business_rules(form_id)
        return {
            "form_id": form_id,
            "business_rules": rules
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load business rules: {str(e)}"
        )


@router.get("/forms/{form_id}/control-types")
async def get_form_control_types(form_id: str):
    """Get control type mappings for a form"""
    try:
        control_types = await htkk_parser.get_control_types(form_id)
        return {
            "form_id": form_id,
            "control_types": control_types
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load control types: {str(e)}"
        ) 