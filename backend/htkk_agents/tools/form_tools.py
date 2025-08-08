"""
Form-related tools for HTKK AI agents.
These tools handle XML template parsing, form rendering, and validation.
"""
import json
from typing import Dict, Any, List, Optional

# Mock services for now - will be replaced with actual implementations
class HTKKParser:
    def parse_form_template(self, form_type: str):
        return {"form_type": form_type, "fields": [], "sections": []}

class FormEngine:
    def render_form_structure(self, template):
        return {"structure": "mock", "fields": []}
    
    def validate_form_data(self, data):
        return {"valid": True, "errors": []}
    
    def calculate_field_dependencies(self, data):
        return {"dependencies": {}}
    
    def export_to_xml(self, data):
        return f"<xml>{data}</xml>"


def parse_htkk_template(form_type: str) -> str:
    """Parse HTKK XML template and return form structure.
    
    Args:
        form_type (str): The HTKK form type (e.g., "01/GTGT", "03/TNDN")
        
    Returns:
        str: JSON string containing the parsed form structure
    """
    print(f"--- Tool: parse_htkk_template called with form_type: {form_type} ---")
    
    try:
        parser = HTKKParser()
        template = parser.parse_form_template(form_type)
        
        if template:
            return json.dumps({
                "success": True,
                "form_type": form_type,
                "template": template,
                "message": f"Successfully parsed template for {form_type}"
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": f"Failed to parse template for {form_type}",
                "message": "Template not found or parsing failed"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error parsing template for {form_type}"
        }, ensure_ascii=False)


def render_form_structure(form_type: str, form_data: str = "{}") -> str:
    """Render form structure from template with optional data.
    
    Args:
        form_type (str): The HTKK form type
        form_data (str): JSON string of form data to populate (optional)
        
    Returns:
        str: JSON string containing the rendered form structure
    """
    print(f"--- Tool: render_form_structure called with form_type: {form_type} ---")
    
    try:
        parser = HTKKParser()
        engine = FormEngine()
        
        # Parse template
        template = parser.parse_form_template(form_type)
        if not template:
            return json.dumps({
                "success": False,
                "error": f"Template not found for {form_type}"
            }, ensure_ascii=False)
        
        # Render form structure
        form_structure = engine.render_form_structure(template)
        
        # Apply form data if provided
        if form_data and form_data != "{}":
            try:
                data = json.loads(form_data)
                form_structure["data"] = data
            except json.JSONDecodeError:
                pass
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "form_structure": form_structure,
            "message": f"Form structure rendered for {form_type}"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error rendering form structure for {form_type}"
        }, ensure_ascii=False)


def validate_form_data(form_type: str, form_data: str) -> str:
    """Validate form data against HTKK business rules.
    
    Args:
        form_type (str): The HTKK form type
        form_data (str): JSON string of form data to validate
        
    Returns:
        str: JSON string containing validation results
    """
    print(f"--- Tool: validate_form_data called with form_type: {form_type} ---")
    
    try:
        engine = FormEngine()
        data = json.loads(form_data)
        
        # Validate form data
        validation_result = engine.validate_form_data({
            "form_type": form_type,
            "data": data
        })
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "validation_result": validation_result,
            "message": "Form validation completed"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format in form_data",
            "message": "Please provide valid JSON data"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error validating form data for {form_type}"
        }, ensure_ascii=False)


def calculate_field_dependencies(form_type: str, field_path: str, form_data: str) -> str:
    """Calculate field dependencies and auto-fill related fields.
    
    Args:
        form_type (str): The HTKK form type
        field_path (str): The path of the field that changed
        form_data (str): JSON string of current form data
        
    Returns:
        str: JSON string containing calculated dependencies
    """
    print(f"--- Tool: calculate_field_dependencies called with field: {field_path} ---")
    
    try:
        engine = FormEngine()
        data = json.loads(form_data)
        
        # Calculate dependencies
        dependency_result = engine.calculate_field_dependencies({
            "form_type": form_type,
            "field": field_path,
            "dependencies": data
        })
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "field_path": field_path,
            "calculated_dependencies": dependency_result,
            "message": f"Dependencies calculated for field {field_path}"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format in form_data",
            "message": "Please provide valid JSON data"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error calculating dependencies for {field_path}"
        }, ensure_ascii=False)


def export_form_to_xml(form_type: str, form_data: str) -> str:
    """Export form data to HTKK-compatible XML format.
    
    Args:
        form_type (str): The HTKK form type
        form_data (str): JSON string of form data to export
        
    Returns:
        str: JSON string containing the XML export result
    """
    print(f"--- Tool: export_form_to_xml called with form_type: {form_type} ---")
    
    try:
        engine = FormEngine()
        data = json.loads(form_data)
        
        # Export to XML
        xml_content = engine.export_to_xml({
            "form_type": form_type,
            "data": data
        })
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "xml_content": xml_content,
            "message": f"XML exported successfully for {form_type}"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format in form_data",
            "message": "Please provide valid JSON data"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error exporting XML for {form_type}"
        }, ensure_ascii=False)


def get_available_form_types() -> str:
    """Get list of available HTKK form types.
    
    Returns:
        str: JSON string containing available form types
    """
    print("--- Tool: get_available_form_types called ---")
    
    try:
        from backend.htkk_agents.constants import HTKK_FORM_TYPES
        
        return json.dumps({
            "success": True,
            "form_types": HTKK_FORM_TYPES,
            "message": "Available form types retrieved successfully"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error retrieving form types"
        }, ensure_ascii=False) 