"""
Tax Validator Agent - Handles tax calculations, business rule validation, and compliance checking
"""
from typing import Dict, Any, List, Optional
import logging
from app.agents.base_agent import BaseAgent
from app.services.form_engine import FormEngine

logger = logging.getLogger(__name__)


class TaxValidatorAgent(BaseAgent):
    """
    Tax Validator Agent for applying tax calculations, validating business rules, and checking compliance
    """
    
    def __init__(self):
        super().__init__(
            agent_id="tax_validator_agent",
            name="Tax Validator Agent",
            description="Handles tax calculations, business rule validation, and compliance checking"
        )
        self.form_engine = FormEngine()
        self.validation_cache = {}
        self.tax_rates = {
            "vat": {"standard": 10, "reduced": 5, "zero": 0},
            "corporate": {"standard": 20, "small_business": 17, "high_tech": 15},
            "personal": {"standard": [5, 10, 15, 20, 25, 30, 35], "threshold": [5000000, 10000000, 18000000, 32000000, 52000000, 80000000]}
        }
    
    async def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Validate input data for tax validation operations
        """
        required_fields = ["action"]
        
        if not all(field in input_data for field in required_fields):
            logger.error(f"Missing required fields: {required_fields}")
            return False
        
        valid_actions = ["validate_tax_form", "calculate_tax", "check_compliance", "validate_business_rules", "get_tax_rates"]
        if input_data["action"] not in valid_actions:
            logger.error(f"Invalid action: {input_data['action']}")
            return False
        
        return True
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process tax validation requests
        """
        if not await self.validate_input(input_data):
            return {"error": "Invalid input data", "success": False}
        
        action = input_data["action"]
        
        try:
            if action == "validate_tax_form":
                return await self._validate_tax_form(input_data)
            elif action == "calculate_tax":
                return await self._calculate_tax(input_data)
            elif action == "check_compliance":
                return await self._check_compliance(input_data)
            elif action == "validate_business_rules":
                return await self._validate_business_rules(input_data)
            elif action == "get_tax_rates":
                return await self._get_tax_rates(input_data)
            else:
                return {"error": f"Unknown action: {action}", "success": False}
                
        except Exception as e:
            logger.error(f"Error processing tax validation action {action}: {str(e)}")
            return {"error": str(e), "success": False}
    
    async def _validate_tax_form(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a complete tax form
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Check cache first
        cache_key = f"{form_type}_{hash(str(form_data))}"
        if cache_key in self.validation_cache:
            cached_result = self.validation_cache[cache_key]
            logger.info(f"Using cached validation result for {form_type}")
            return cached_result
        
        # Validate form data
        validation_result = self.form_engine.validate_form_data({
            "form_type": form_type,
            "data": form_data
        })
        
        # Additional tax-specific validations
        tax_validation = await self._perform_tax_validations(form_type, form_data)
        
        # Combine results
        combined_result = {
            "success": True,
            "form_type": form_type,
            "basic_validation": validation_result,
            "tax_validation": tax_validation,
            "overall_valid": validation_result.get("valid", False) and tax_validation.get("valid", False),
            "message": "Tax form validation completed"
        }
        
        # Cache the result
        self.validation_cache[cache_key] = combined_result
        self.update_memory(f"validation_{cache_key}", combined_result)
        
        return combined_result
    
    async def _calculate_tax(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate taxes based on form data
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        # Calculate taxes using form engine
        tax_calculation = self.form_engine.calculate_tax({
            "form_type": form_type,
            **form_data
        })
        
        # Add detailed tax breakdown
        detailed_calculation = await self._get_detailed_tax_calculation(form_type, form_data, tax_calculation)
        
        return {
            "success": True,
            "form_type": form_type,
            "tax_calculation": tax_calculation,
            "detailed_calculation": detailed_calculation,
            "message": f"Tax calculation completed for {form_type}"
        }
    
    async def _check_compliance(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check tax compliance and identify potential issues
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        compliance_issues = []
        warnings = []
        
        # Check for common compliance issues
        if form_type == "01/GTGT":  # VAT form
            compliance_issues.extend(await self._check_vat_compliance(form_data))
        elif form_type == "03/TNDN":  # Corporate tax
            compliance_issues.extend(await self._check_corporate_tax_compliance(form_data))
        elif form_type == "02/TNCN":  # Personal income tax
            compliance_issues.extend(await self._check_personal_tax_compliance(form_data))
        
        # Check general compliance rules
        general_issues = await self._check_general_compliance(form_data)
        compliance_issues.extend(general_issues)
        
        return {
            "success": True,
            "form_type": form_type,
            "compliance_status": "compliant" if not compliance_issues else "non_compliant",
            "issues": compliance_issues,
            "warnings": warnings,
            "issue_count": len(compliance_issues),
            "message": f"Compliance check completed for {form_type}"
        }
    
    async def _validate_business_rules(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate specific business rules
        """
        form_type = input_data.get("form_type")
        form_data = input_data.get("form_data", {})
        rules = input_data.get("rules", [])
        
        if not form_type:
            return {"error": "form_type is required", "success": False}
        
        rule_results = []
        
        for rule in rules:
            rule_result = await self._validate_single_rule(rule, form_data)
            rule_results.append(rule_result)
        
        # If no specific rules provided, validate all default rules for form type
        if not rules:
            default_rules = await self._get_default_rules(form_type)
            for rule in default_rules:
                rule_result = await self._validate_single_rule(rule, form_data)
                rule_results.append(rule_result)
        
        passed_rules = sum(1 for result in rule_results if result["passed"])
        total_rules = len(rule_results)
        
        return {
            "success": True,
            "form_type": form_type,
            "rule_results": rule_results,
            "passed_rules": passed_rules,
            "total_rules": total_rules,
            "all_rules_passed": passed_rules == total_rules,
            "message": f"Business rule validation completed: {passed_rules}/{total_rules} rules passed"
        }
    
    async def _get_tax_rates(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get current tax rates
        """
        tax_type = input_data.get("tax_type", "all")
        
        if tax_type == "all":
            return {
                "success": True,
                "tax_rates": self.tax_rates,
                "message": "All tax rates retrieved"
            }
        elif tax_type in self.tax_rates:
            return {
                "success": True,
                "tax_type": tax_type,
                "tax_rates": self.tax_rates[tax_type],
                "message": f"Tax rates retrieved for {tax_type}"
            }
        else:
            return {"error": f"Unknown tax type: {tax_type}", "success": False}
    
    async def _perform_tax_validations(self, form_type: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform tax-specific validations
        """
        errors = []
        warnings = []
        
        if form_type == "01/GTGT":  # VAT form
            # Validate VAT calculations
            revenue = form_data.get("total_revenue", 0)
            vat_amount = form_data.get("vat_amount", 0)
            vat_rate = form_data.get("vat_rate", 10)
            
            expected_vat = revenue * vat_rate / 100
            if abs(vat_amount - expected_vat) > 1000:  # Allow small rounding differences
                errors.append(f"VAT amount mismatch: expected {expected_vat}, got {vat_amount}")
        
        elif form_type == "03/TNDN":  # Corporate tax
            # Validate corporate tax calculations
            profit = form_data.get("taxable_profit", 0)
            tax_amount = form_data.get("tax_amount", 0)
            
            if profit > 0 and tax_amount == 0:
                warnings.append("Positive profit but zero tax amount - please verify")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    async def _get_detailed_tax_calculation(self, form_type: str, form_data: Dict[str, Any], basic_calculation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get detailed tax calculation breakdown
        """
        detailed = {
            "form_type": form_type,
            "calculation_method": "standard",
            "breakdown": {}
        }
        
        if form_type == "01/GTGT":  # VAT
            revenue = form_data.get("total_revenue", 0)
            vat_rate = form_data.get("vat_rate", 10)
            detailed["breakdown"] = {
                "revenue": revenue,
                "vat_rate": vat_rate,
                "vat_amount": revenue * vat_rate / 100,
                "net_amount": revenue - (revenue * vat_rate / 100)
            }
        
        return detailed
    
    async def _check_vat_compliance(self, form_data: Dict[str, Any]) -> List[str]:
        """Check VAT-specific compliance issues"""
        issues = []
        
        revenue = form_data.get("total_revenue", 0)
        if revenue > 1000000000:  # 1 billion VND threshold
            if not form_data.get("vat_registration"):
                issues.append("VAT registration required for revenue over 1 billion VND")
        
        return issues
    
    async def _check_corporate_tax_compliance(self, form_data: Dict[str, Any]) -> List[str]:
        """Check corporate tax compliance issues"""
        issues = []
        
        profit = form_data.get("taxable_profit", 0)
        if profit < 0:
            issues.append("Negative taxable profit requires additional documentation")
        
        return issues
    
    async def _check_personal_tax_compliance(self, form_data: Dict[str, Any]) -> List[str]:
        """Check personal income tax compliance issues"""
        issues = []
        
        income = form_data.get("total_income", 0)
        if income > 100000000:  # 100 million VND
            if not form_data.get("tax_declaration_submitted"):
                issues.append("Tax declaration required for high income earners")
        
        return issues
    
    async def _check_general_compliance(self, form_data: Dict[str, Any]) -> List[str]:
        """Check general compliance rules"""
        issues = []
        
        # Check required fields
        if not form_data.get("tax_code"):
            issues.append("Tax code is required")
        
        if not form_data.get("company_name") and not form_data.get("taxpayer_name"):
            issues.append("Company name or taxpayer name is required")
        
        return issues
    
    async def _validate_single_rule(self, rule: Dict[str, Any], form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single business rule"""
        rule_id = rule.get("id", "unknown")
        rule_type = rule.get("type", "validation")
        condition = rule.get("condition", {})
        
        # Simple rule validation logic
        passed = True
        message = "Rule passed"
        
        try:
            if rule_type == "required_field":
                field = condition.get("field")
                if not form_data.get(field):
                    passed = False
                    message = f"Required field '{field}' is missing"
            
            elif rule_type == "min_value":
                field = condition.get("field")
                min_value = condition.get("value", 0)
                if form_data.get(field, 0) < min_value:
                    passed = False
                    message = f"Field '{field}' must be at least {min_value}"
            
            elif rule_type == "max_value":
                field = condition.get("field")
                max_value = condition.get("value", float('inf'))
                if form_data.get(field, 0) > max_value:
                    passed = False
                    message = f"Field '{field}' must not exceed {max_value}"
        
        except Exception as e:
            passed = False
            message = f"Error validating rule: {str(e)}"
        
        return {
            "rule_id": rule_id,
            "rule_type": rule_type,
            "passed": passed,
            "message": message
        }
    
    async def _get_default_rules(self, form_type: str) -> List[Dict[str, Any]]:
        """Get default business rules for a form type"""
        rules = []
        
        if form_type == "01/GTGT":
            rules = [
                {"id": "vat_001", "type": "required_field", "condition": {"field": "tax_code"}},
                {"id": "vat_002", "type": "required_field", "condition": {"field": "company_name"}},
                {"id": "vat_003", "type": "min_value", "condition": {"field": "total_revenue", "value": 0}}
            ]
        elif form_type == "03/TNDN":
            rules = [
                {"id": "corp_001", "type": "required_field", "condition": {"field": "tax_code"}},
                {"id": "corp_002", "type": "required_field", "condition": {"field": "company_name"}}
            ]
        
        return rules
    
    async def initialize(self) -> None:
        """
        Initialize Tax Validator Agent
        """
        await super().initialize()
        logger.info("Tax Validator Agent initialized with current tax rates and business rules") 