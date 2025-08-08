"""
HTKK Parser Service
Parse HTKK XML templates and business logic files
"""
import os
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class HTKKParser:
    """Parser for HTKK XML templates and configuration files"""
    
    def __init__(self):
        self.htkk_project_path = Path(settings.htkk_project_path)
        self.htkk_templates_path = Path(settings.htkk_templates_path)
        
        # Cache for parsed data
        self._menu_cache = None
        self._templates_cache = {}
        self._business_rules_cache = {}
        
    async def get_available_forms(self) -> List[Dict[str, Any]]:
        """Parse Menu.xml to get available tax forms"""
        try:
            if self._menu_cache is None:
                await self._parse_menu_xml()
            
            return self._menu_cache
            
        except Exception as e:
            logger.error(f"Failed to parse Menu.xml: {e}")
            raise
    
    async def _parse_menu_xml(self):
        """Parse Menu.xml file (1914 lines)"""
        menu_file = self.htkk_project_path / "Menu.xml"
        
        if not menu_file.exists():
            raise FileNotFoundError(f"Menu.xml not found at {menu_file}")
        
        tree = ET.parse(menu_file)
        root = tree.getroot()
        
        forms = []
        
        # Parse menu items that represent tax forms
        for menu in root.findall(".//Menu[@PopID='101']"):  # Tax declaration forms
            form_id = menu.get("ID")
            caption = menu.get("Caption", "")
            form_name = menu.get("FormName", "")
            version_xml = menu.get("VersionXML", "")
            ten_to_khai = menu.get("TenToKhai", "")
            mo_ta_bieu_mau = menu.get("MoTaBieuMau", "")
            ma_file = menu.get("MaFile", "")
            
            # Skip if not a valid form
            if not form_id or not caption or form_id in ["101", "101_1"]:
                continue
            
            forms.append({
                "id": form_id,
                "caption": caption,
                "form_name": form_name,
                "version": version_xml,
                "description": ten_to_khai,
                "detail_description": mo_ta_bieu_mau,
                "file_code": ma_file,
                "sheets": self._parse_form_sheets(menu)
            })
        
        self._menu_cache = forms
        logger.info(f"Parsed {len(forms)} tax forms from Menu.xml")
    
    def _parse_form_sheets(self, menu_element) -> List[Dict[str, Any]]:
        """Parse form sheets from menu validity section"""
        sheets = []
        
        validity = menu_element.find("Validity")
        if validity is not None:
            for sheet in validity.findall("Sheet"):
                sheet_info = {
                    "id": sheet.get("ID"),
                    "caption": sheet.get("Caption", ""),
                    "sheet_name": sheet.get("SheetName", ""),
                    "active": sheet.get("Active", "1") == "1",
                    "data_file": sheet.get("DataFile", ""),
                    "xml_node": sheet.get("XMLnode", ""),
                    "ma_ho_so": sheet.get("MaHoSo", "")
                }
                sheets.append(sheet_info)
        
        return sheets
    
    async def parse_form_template(self, form_id: str) -> Dict[str, Any]:
        """Parse XML template for a specific form"""
        if form_id in self._templates_cache:
            return self._templates_cache[form_id]
        
        try:
            # Find template file
            template_file = await self._find_template_file(form_id)
            
            if not template_file:
                raise FileNotFoundError(f"Template file not found for form {form_id}")
            
            # Parse template
            template = await self._parse_template_file(template_file)
            
            # Cache result
            self._templates_cache[form_id] = template
            
            return template
            
        except Exception as e:
            logger.error(f"Failed to parse template for form {form_id}: {e}")
            raise
    
    async def _find_template_file(self, form_id: str) -> Optional[Path]:
        """Find template file for form ID"""
        xml_dir = self.htkk_templates_path / "xml"
        
        # Common template file patterns
        patterns = [
            f"{form_id}_*.xml",
            f"*{form_id}*.xml"
        ]
        
        for pattern in patterns:
            files = list(xml_dir.glob(pattern))
            if files:
                # Return the most recent or specific file
                return sorted(files)[-1]
        
        return None
    
    async def _parse_template_file(self, template_file: Path) -> Dict[str, Any]:
        """Parse individual template XML file"""
        tree = ET.parse(template_file)
        root = tree.getroot()
        
        template = {
            "version": root.get("Version", ""),
            "sections": []
        }
        
        # Parse sections
        for section in root.findall("Section"):
            section_data = {
                "dynamic": section.get("Dynamic", "0") == "1",
                "max_rows": int(section.get("MaxRows", "0")),
                "cells": []
            }
            
            # Parse cells
            cells_element = section.find("Cells")
            if cells_element is not None:
                for cell in cells_element.findall("Cell"):
                    cell_data = self._parse_cell(cell)
                    section_data["cells"].append(cell_data)
            
            template["sections"].append(section_data)
        
        return template
    
    def _parse_cell(self, cell_element) -> Dict[str, Any]:
        """Parse individual cell element"""
        return {
            "cell_id": cell_element.get("CellID", ""),
            "cell_id2": cell_element.get("CellID2", ""),
            "path": cell_element.get("Path", ""),
            "control_type": int(cell_element.get("Controltype", "0")),
            "default_value": cell_element.get("DefaultValue", ""),
            "value": cell_element.get("Value", ""),
            "max_len": cell_element.get("MaxLen", ""),
            "min_value": cell_element.get("MinValue", ""),
            "max_value": cell_element.get("MaxValue", ""),
            "help_context_id": cell_element.get("HelpContextID", ""),
            "encode": cell_element.get("Encode", "0") == "1",
            "selected_value": cell_element.get("SelectedValue", ""),
            "parent_cell": cell_element.get("ParentCell", ""),
            "child_cell": cell_element.get("ChildCell", "")
        }
    
    async def get_business_rules(self, form_id: str) -> Dict[str, Any]:
        """Get business rules from MapMCT.xml for specific form"""
        if form_id in self._business_rules_cache:
            return self._business_rules_cache[form_id]
        
        try:
            map_file = self.htkk_project_path / "MapMCT.xml"
            
            if not map_file.exists():
                raise FileNotFoundError(f"MapMCT.xml not found at {map_file}")
            
            tree = ET.parse(map_file)
            root = tree.getroot()
            
            # Find rules for specific form
            form_map = root.find(f".//Map[@ID='{form_id}']")
            
            rules = {
                "form_id": form_id,
                "calculation_rules": [],
                "field_mappings": {}
            }
            
            if form_map is not None:
                for item in form_map.findall("Item"):
                    rule = {
                        "cell_id": item.get("CellID", ""),
                        "mct": item.get("MCT", ""),
                        "dieu_chinh_tang": item.get("DieuChinhTang", "0") == "1",
                        "caption": item.get("Caption", "")
                    }
                    rules["calculation_rules"].append(rule)
                    
                    # Create field mapping
                    if rule["cell_id"]:
                        rules["field_mappings"][rule["cell_id"]] = {
                            "mct": rule["mct"],
                            "adjustment_type": "increase" if rule["dieu_chinh_tang"] else "decrease",
                            "description": rule["caption"]
                        }
            
            self._business_rules_cache[form_id] = rules
            return rules
            
        except Exception as e:
            logger.error(f"Failed to parse business rules for form {form_id}: {e}")
            raise
    
    async def get_validation_rules(self, form_id: str) -> Dict[str, Any]:
        """Get validation rules from XSD schemas"""
        try:
            validate_dir = self.htkk_templates_path / "Validate"
            
            # Find XSD file for form
            xsd_files = list(validate_dir.glob(f"*{form_id}*.xsd"))
            
            if not xsd_files:
                return {"form_id": form_id, "rules": []}
            
            # Parse XSD file (simplified - full XSD parsing would be more complex)
            xsd_file = xsd_files[0]
            
            # For now, return basic structure
            # TODO: Implement full XSD parsing
            return {
                "form_id": form_id,
                "xsd_file": str(xsd_file),
                "rules": [
                    {
                        "type": "required_fields",
                        "description": "Fields marked as required in XSD schema"
                    },
                    {
                        "type": "data_types",
                        "description": "Data type validation from XSD"
                    },
                    {
                        "type": "value_ranges",
                        "description": "Min/max value constraints"
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get validation rules for form {form_id}: {e}")
            return {"form_id": form_id, "rules": [], "error": str(e)}
    
    async def get_control_types(self, form_id: str) -> Dict[str, Any]:
        """Get control type mappings for form fields"""
        try:
            template = await self.parse_form_template(form_id)
            
            control_types = {}
            
            for section in template.get("sections", []):
                for cell in section.get("cells", []):
                    cell_id = cell.get("cell_id")
                    control_type = cell.get("control_type", 0)
                    
                    if cell_id:
                        control_types[cell_id] = {
                            "type": self._map_control_type(control_type),
                            "type_code": control_type,
                            "path": cell.get("path", ""),
                            "validation": {
                                "max_len": cell.get("max_len", ""),
                                "min_value": cell.get("min_value", ""),
                                "max_value": cell.get("max_value", "")
                            }
                        }
            
            return {
                "form_id": form_id,
                "control_types": control_types
            }
            
        except Exception as e:
            logger.error(f"Failed to get control types for form {form_id}: {e}")
            raise
    
    def _map_control_type(self, control_type: int) -> str:
        """Map HTKK control type codes to frontend types"""
        mapping = {
            0: "text",
            2: "checkbox", 
            6: "dropdown",
            14: "date",
            16: "number",
            26: "hidden",
            100: "dropdown",  # Province
            101: "dropdown"   # Ward (dependent)
        }
        
        return mapping.get(control_type, "text")
    
    async def get_dropdown_logic(self) -> Dict[str, Any]:
        """Parse ValidCombobox.xml for dropdown dependencies"""
        try:
            valid_combo_file = self.htkk_project_path / "ValidCombobox.xml"
            
            if not valid_combo_file.exists():
                return {"dropdown_rules": []}
            
            tree = ET.parse(valid_combo_file)
            root = tree.getroot()
            
            dropdown_rules = []
            
            for section in root.findall("Section"):
                items = section.find("Items")
                if items is not None:
                    for item in items.findall("Item"):
                        rule = {
                            "id": item.get("ID", ""),
                            "dynamic": item.get("Dynamic", "0") == "1",
                            "sheet_index": item.get("SheetIndex", ""),
                            "table_path": item.get("TablePath", ""),
                            "ct_path": item.get("CtPath", ""),
                            "ct_path_ma": item.get("CtPathMa", "")
                        }
                        dropdown_rules.append(rule)
            
            return {"dropdown_rules": dropdown_rules}
            
        except Exception as e:
            logger.error(f"Failed to parse dropdown logic: {e}")
            return {"dropdown_rules": [], "error": str(e)} 