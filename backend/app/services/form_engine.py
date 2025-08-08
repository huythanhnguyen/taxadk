"""
Form Engine Service
Handle tax calculations, form validation, and XML export
"""
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

from app.services.htkk_parser import HTKKParser

logger = logging.getLogger(__name__)


class ValidationResult:
    """Validation result container"""
    def __init__(self):
        self.is_valid = True
        self.errors = []
        self.warnings = []
    
    def add_error(self, field: str, message: str, error_type: str = "validation"):
        self.errors.append({
            "field": field,
            "message": message,
            "type": error_type
        })
        self.is_valid = False
    
    def add_warning(self, field: str, message: str):
        self.warnings.append({
            "field": field,
            "message": message,
            "type": "warning"
        })


class FormEngine:
    """Engine for form processing, validation, and calculations"""
    
    def __init__(self):
        self.htkk_parser = HTKKParser()
        
        # Tax rates configuration
        self.tax_rates = {
            "GTGT": {
                "rate_5": Decimal("0.05"),   # 5% VAT rate
                "rate_10": Decimal("0.10"),  # 10% VAT rate
                "rate_0": Decimal("0.00")    # 0% VAT rate
            },
            "TNDN": {
                "standard": Decimal("0.20"),      # 20% Corporate tax
                "preferential": Decimal("0.15"),  # 15% Preferential rate
                "small_business": Decimal("0.17") # 17% Small business rate
            }
        }
    
    async def validate_form(self, form_id: str, form_data: Dict[str, Any]) -> ValidationResult:
        """Validate form data against business rules and XSD schemas"""
        result = ValidationResult()
        
        try:
            # Get validation rules
            validation_rules = await self.htkk_parser.get_validation_rules(form_id)
            business_rules = await self.htkk_parser.get_business_rules(form_id)
            template = await self.htkk_parser.parse_form_template(form_id)
            
            # Validate field types and constraints
            await self._validate_field_constraints(form_data, template, result)
            
            # Validate business rules
            await self._validate_business_rules(form_id, form_data, business_rules, result)
            
            # Form-specific validations
            if form_id.startswith("01") or form_id.startswith("D1"):  # VAT forms
                await self._validate_vat_form(form_data, result)
            elif form_id.startswith("03"):  # Corporate tax forms
                await self._validate_corporate_tax_form(form_data, result)
            
            logger.info(f"Form validation completed: {form_id}, valid: {result.is_valid}")
            
        except Exception as e:
            logger.error(f"Form validation failed: {e}")
            result.add_error("general", f"Validation error: {str(e)}", "system_error")
        
        return result
    
    async def _validate_field_constraints(
        self, 
        form_data: Dict[str, Any], 
        template: Dict[str, Any], 
        result: ValidationResult
    ):
        """Validate field constraints from template"""
        for section in template.get("sections", []):
            for cell in section.get("cells", []):
                cell_id = cell.get("cell_id")
                if not cell_id:
                    continue
                
                value = form_data.get(cell_id)
                if value is None or value == "":
                    continue
                
                # Validate max length
                max_len = cell.get("max_len")
                if max_len and max_len.isdigit():
                    if len(str(value)) > int(max_len):
                        result.add_error(
                            cell_id, 
                            f"Giá trị vượt quá độ dài tối đa {max_len} ký tự"
                        )
                
                # Validate numeric ranges
                control_type = cell.get("control_type", 0)
                if control_type == 16:  # Numeric field
                    try:
                        numeric_value = Decimal(str(value))
                        
                        min_value = cell.get("min_value")
                        if min_value and min_value.replace("-", "").isdigit():
                            if numeric_value < Decimal(min_value):
                                result.add_error(
                                    cell_id,
                                    f"Giá trị không được nhỏ hơn {min_value}"
                                )
                        
                        max_value = cell.get("max_value")
                        if max_value and max_value.isdigit():
                            if numeric_value > Decimal(max_value):
                                result.add_error(
                                    cell_id,
                                    f"Giá trị không được lớn hơn {max_value}"
                                )
                    
                    except (ValueError, TypeError):
                        result.add_error(cell_id, "Giá trị phải là số")
    
    async def _validate_business_rules(
        self,
        form_id: str,
        form_data: Dict[str, Any],
        business_rules: Dict[str, Any],
        result: ValidationResult
    ):
        """Validate business-specific rules"""
        field_mappings = business_rules.get("field_mappings", {})
        
        # Check required calculations
        for cell_id, mapping in field_mappings.items():
            if cell_id in form_data:
                value = form_data[cell_id]
                if value and mapping.get("adjustment_type") == "increase":
                    # Validate positive values for increase adjustments
                    try:
                        if Decimal(str(value)) < 0:
                            result.add_warning(
                                cell_id,
                                f"Giá trị âm cho chỉ tiêu tăng: {mapping.get('description', '')}"
                            )
                    except (ValueError, TypeError):
                        pass
    
    async def _validate_vat_form(self, form_data: Dict[str, Any], result: ValidationResult):
        """Validate VAT-specific business rules"""
        # Get common VAT fields
        input_vat = self._get_decimal_value(form_data, "ct24")  # Input VAT
        output_vat = self._get_decimal_value(form_data, "ct28")  # Output VAT
        revenue_5 = self._get_decimal_value(form_data, "ct30")  # Revenue at 5%
        revenue_10 = self._get_decimal_value(form_data, "ct32")  # Revenue at 10%
        
        # Validate input VAT vs output VAT ratio
        if input_vat and output_vat and output_vat > 0:
            ratio = input_vat / output_vat
            if ratio > 2:
                result.add_warning(
                    "ct24",
                    "Thuế đầu vào cao bất thường so với thuế đầu ra"
                )
        
        # Validate VAT calculations
        if revenue_5 and revenue_5 > 0:
            expected_vat_5 = revenue_5 * self.tax_rates["GTGT"]["rate_5"]
            actual_vat_5 = self._get_decimal_value(form_data, "ct31")
            
            if actual_vat_5 and abs(actual_vat_5 - expected_vat_5) > Decimal("1"):
                result.add_error(
                    "ct31",
                    f"Thuế GTGT 5% không đúng. Tính toán: {expected_vat_5}, Nhập: {actual_vat_5}"
                )
        
        if revenue_10 and revenue_10 > 0:
            expected_vat_10 = revenue_10 * self.tax_rates["GTGT"]["rate_10"]
            actual_vat_10 = self._get_decimal_value(form_data, "ct33")
            
            if actual_vat_10 and abs(actual_vat_10 - expected_vat_10) > Decimal("1"):
                result.add_error(
                    "ct33",
                    f"Thuế GTGT 10% không đúng. Tính toán: {expected_vat_10}, Nhập: {actual_vat_10}"
                )
    
    async def _validate_corporate_tax_form(self, form_data: Dict[str, Any], result: ValidationResult):
        """Validate corporate tax-specific business rules"""
        revenue = self._get_decimal_value(form_data, "revenue")
        expenses = self._get_decimal_value(form_data, "expenses")
        
        # Revenue vs expenses validation
        if revenue and expenses and expenses > revenue:
            result.add_warning(
                "expenses",
                "Chi phí vượt quá doanh thu"
            )
        
        # Profit calculation validation
        if revenue and expenses:
            profit = revenue - expenses
            declared_profit = self._get_decimal_value(form_data, "profit")
            
            if declared_profit and abs(declared_profit - profit) > Decimal("1"):
                result.add_error(
                    "profit",
                    f"Lợi nhuận không đúng. Tính toán: {profit}, Khai báo: {declared_profit}"
                )
    
    async def calculate_taxes(self, form_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate taxes based on form data and business rules"""
        try:
            business_rules = await self.htkk_parser.get_business_rules(form_id)
            calculated_fields = {}
            
            # Form-specific calculations
            if form_id.startswith("01") or form_id.startswith("D1"):  # VAT forms
                calculated_fields.update(await self._calculate_vat_taxes(form_data))
            elif form_id.startswith("03"):  # Corporate tax forms
                calculated_fields.update(await self._calculate_corporate_taxes(form_data))
            
            # Apply business rule calculations
            calculated_fields.update(
                await self._apply_business_rule_calculations(form_data, business_rules)
            )
            
            return {
                "form_id": form_id,
                "calculated_fields": calculated_fields,
                "calculation_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Tax calculation failed for form {form_id}: {e}")
            raise
    
    async def _calculate_vat_taxes(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate VAT taxes"""
        calculated = {}
        
        # Calculate VAT at 5%
        revenue_5 = self._get_decimal_value(form_data, "ct30")
        if revenue_5:
            vat_5 = revenue_5 * self.tax_rates["GTGT"]["rate_5"]
            calculated["ct31"] = float(vat_5.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        
        # Calculate VAT at 10%
        revenue_10 = self._get_decimal_value(form_data, "ct32")
        if revenue_10:
            vat_10 = revenue_10 * self.tax_rates["GTGT"]["rate_10"]
            calculated["ct33"] = float(vat_10.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        
        # Calculate total output VAT
        output_vat_5 = self._get_decimal_value(form_data, "ct31") or Decimal("0")
        output_vat_10 = self._get_decimal_value(form_data, "ct33") or Decimal("0")
        total_output_vat = output_vat_5 + output_vat_10
        calculated["ct35"] = float(total_output_vat)
        
        # Calculate VAT payable
        input_vat = self._get_decimal_value(form_data, "ct24") or Decimal("0")
        vat_payable = total_output_vat - input_vat
        calculated["ct36"] = float(max(vat_payable, Decimal("0")))
        
        return calculated
    
    async def _calculate_corporate_taxes(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate corporate taxes"""
        calculated = {}
        
        revenue = self._get_decimal_value(form_data, "revenue") or Decimal("0")
        expenses = self._get_decimal_value(form_data, "expenses") or Decimal("0")
        
        # Calculate profit
        profit = revenue - expenses
        calculated["profit"] = float(profit)
        
        # Calculate corporate tax
        if profit > 0:
            # Determine tax rate (simplified logic)
            tax_rate = self.tax_rates["TNDN"]["standard"]
            if revenue < Decimal("200000000000"):  # 200 billion VND
                tax_rate = self.tax_rates["TNDN"]["small_business"]
            
            corporate_tax = profit * tax_rate
            calculated["corporate_tax"] = float(corporate_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        else:
            calculated["corporate_tax"] = 0.0
        
        return calculated
    
    async def _apply_business_rule_calculations(
        self, 
        form_data: Dict[str, Any], 
        business_rules: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply calculations from MapMCT.xml business rules"""
        calculated = {}
        
        # This would implement the complex business rules from MapMCT.xml
        # For now, return basic structure
        calculation_rules = business_rules.get("calculation_rules", [])
        
        for rule in calculation_rules:
            cell_id = rule.get("cell_id")
            mct = rule.get("mct")
            
            # Apply rule-specific calculations
            # TODO: Implement full MapMCT.xml logic
            
        return calculated
    
    async def export_to_xml(self, form_id: str, form_data: Dict[str, Any]) -> str:
        """Export form data to HTKK-compatible XML"""
        try:
            template = await self.htkk_parser.parse_form_template(form_id)
            
            # Create XML structure
            root = ET.Element("HSoThueDTu")
            hso_khai_thue = ET.SubElement(root, "HSoKhaiThue")
            
            # Add form data based on template paths
            for section in template.get("sections", []):
                for cell in section.get("cells", []):
                    cell_id = cell.get("cell_id")
                    path = cell.get("path")
                    
                    if cell_id in form_data and path:
                        value = form_data[cell_id]
                        if value is not None and value != "":
                            self._set_xml_value(hso_khai_thue, path, str(value))
            
            # Add metadata
            self._add_xml_metadata(hso_khai_thue, form_id)
            
            # Convert to string
            xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            return xml_str.decode("utf-8")
            
        except Exception as e:
            logger.error(f"XML export failed for form {form_id}: {e}")
            raise
    
    def _set_xml_value(self, parent: ET.Element, path: str, value: str):
        """Set value at XML path"""
        path_parts = path.split("/")
        current = parent
        
        for part in path_parts:
            if not part:
                continue
            
            child = current.find(part)
            if child is None:
                child = ET.SubElement(current, part)
            current = child
        
        current.text = value
    
    def _add_xml_metadata(self, hso_khai_thue: ET.Element, form_id: str):
        """Add metadata to XML"""
        # Add timestamp
        ttin_chung = ET.SubElement(hso_khai_thue, "TTinChung")
        ttin_tkhai = ET.SubElement(ttin_chung, "TTinTKhaiThue")
        tkhai_thue = ET.SubElement(ttin_tkhai, "TKhaiThue")
        
        ET.SubElement(tkhai_thue, "ngayKy").text = datetime.now().strftime("%d/%m/%Y")
        ET.SubElement(tkhai_thue, "nguoiKy").text = "Người nộp thuế"
    
    def _get_decimal_value(self, form_data: Dict[str, Any], field: str) -> Optional[Decimal]:
        """Get decimal value from form data"""
        value = form_data.get(field)
        if value is None or value == "":
            return None
        
        try:
            return Decimal(str(value))
        except (ValueError, TypeError):
            return None 