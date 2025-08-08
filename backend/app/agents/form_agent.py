"""
Form Agent - Handles form template parsing, rendering, and field updates
"""
from typing import Dict, Any, List, Optional
import logging
from app.agents.base_agent import BaseAgent
from app.services.htkk_parser import HTKKParser
from app.services.form_engine import FormEngine

logger = logging.getLogger(__name__)


class FormAgent(BaseAgent):
    """
    Form Agent for handling HTKK form templates and dynamic rendering
    """
    
    def __init__(self):
        super().__init__(
            agent_id="form_agent",
            name="Form Agent",
            description="Handles form template parsing, rendering, and field updates"
        )
        self.htkk_parser = HTKKParser()
        self.form_engine = FormEngine()
        self.loaded_templates = {}
    
    async def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Validate input data for form operations
        """
        required_fields = ["action"]
        
        if not all(field in input_data for field in required_fields):
            logger.error(f"Missing required fields: {required_fields}")
            return False
        
        valid_actions = ["parse_template", "render_form", "update_field", "validate_form", "export_xml"]
        if input_data["action"] not in valid_actions:
            logger.error(f"Invalid action: {input_data['action']}")
            return False
        
        return True
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process form-related requests
        """
        if not await self.validate_input(input_data):
            return {"error": "Invalid input data", "success": False}
        
        action = input_data["action"]
        
        try:
            if action == "parse_template":
                return await self._parse_template(input_data)
            elif action == "render_form":
                return await self._render_form(input_data)
            elif action == "update_field":
                return await self._update_field(input_data)
            elif action == "validate_form":
                return await self._validate_form(input_data)
            elif action == "export_xml":
                return await self._export_xml(input_data)
            else:
                return {"error": f"Unknown action: {action}", "success": False}
                
        except Exception as e:
            logger.error(f"Error processing form action {action}: {str(e)}")
            return {"error": str(e), "success": False}
    
    async def _parse_template(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a form template
        """
        form_type = input_data.get("form_type")
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Check if template is already loaded
        if form_type in self.loaded_templates:
            template = self.loaded_templates[form_type]
            logger.info(f"Using cached template for {form_type}")
        else:
            # Parse template
            template = self.htkk_parser.parse_form_template(form_type)
            if template:
                self.loaded_templates[form_type] = template
                self.update_memory(f"template_{form_type}", template)
                logger.info(f"Parsed and cached template for {form_type}")
            else:
                return {"error": f"Failed to parse template for {form_type}", "success": False}
        
        return {
            "success": True,
            "template": template,
            "form_type": form_type,
            "message": f"Template parsed successfully for {form_type}"
        }
    
    async def _render_form(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Render a form from template
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Get template
        template = self.loaded_templates.get(form_type) or self.get_memory(f"template_{form_type}")
        if not template:
            # Try to parse template
            parse_result = await self._parse_template({"form_type": form_type})
            if not parse_result["success"]:
                return parse_result
            template = parse_result["template"]
        
        # Render form structure
        form_structure = self.form_engine.render_form_structure(template)
        
        # Apply form data if provided
        if form_data:
            form_structure = self._apply_form_data(form_structure, form_data)
        
        return {
            "success": True,
            "form_structure": form_structure,
            "form_type": form_type,
            "message": f"Form rendered successfully for {form_type}"
        }
    
    async def _update_field(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a specific field and handle dependencies
        """
        form_type = input_data.get("form_type")
        field_path = input_data.get("field_path")
        field_value = input_data.get("field_value")
        current_data = input_data.get("current_data", {})
        
        if not all([form_type, field_path is not None]):
            return {"error": "form_type and field_path are required", "success": False}
        
        # Calculate field dependencies
        dependency_result = self.form_engine.calculate_field_dependencies({
            "form_type": form_type,
            "field": field_path,
            "dependencies": current_data,
            "new_value": field_value
        })
        
        return {
            "success": True,
            "field_path": field_path,
            "field_value": field_value,
            "calculated_dependencies": dependency_result,
            "message": f"Field {field_path} updated successfully"
        }
    
    async def _validate_form(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate form data
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Validate form data
        validation_result = self.form_engine.validate_form_data({
            "form_type": form_type,
            "data": form_data
        })
        
        return {
            "success": True,
            "validation_result": validation_result,
            "form_type": form_type,
            "message": "Form validation completed"
        }
    
    async def _export_xml(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Export form data to HTKK-compatible XML
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Export to XML
        xml_content = self.form_engine.export_to_xml({
            "form_type": form_type,
            "data": form_data
        })
        
        return {
            "success": True,
            "xml_content": xml_content,
            "form_type": form_type,
            "message": f"XML exported successfully for {form_type}"
        }
    
    def _apply_form_data(self, form_structure: Dict[str, Any], form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply form data to form structure
        """
        # This would recursively apply form data to the structure
        # For now, just add the data to the structure
        form_structure["data"] = form_data
        return form_structure
    
    async def get_available_templates(self) -> List[str]:
        """
        Get list of available form templates
        """
        try:
            templates = self.htkk_parser.get_available_templates()
            return templates
        except Exception as e:
            logger.error(f"Error getting available templates: {str(e)}")
            return []
    
    async def initialize(self) -> None:
        """
        Initialize Form Agent
        """
        await super().initialize()
        
        # Pre-load common templates
        common_templates = ["01/GTGT", "03/TNDN", "02/TNCN"]
        for template in common_templates:
            try:
                await self._parse_template({"form_type": template})
            except Exception as e:
                logger.warning(f"Failed to pre-load template {template}: {str(e)}")
        
        logger.info("Form Agent initialized with pre-loaded templates") 