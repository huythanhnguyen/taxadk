"""
Tax validation and calculation tools for HTKK AI agents.
These tools handle tax calculations, business rule validation, and compliance checking.
"""
import json
from typing import Dict, Any, List, Optional
from htkk_agents.constants import TAX_RATES

# Mock FormEngine for now - will be replaced with actual implementation
class FormEngine:
    def validate_form_data(self, data):
        return {"valid": True, "errors": []}


def calculate_vat_tax(revenue: float, vat_rate: float = 10.0) -> str:
    """Calculate VAT tax amount.
    
    Args:
        revenue (float): Total revenue amount
        vat_rate (float): VAT rate percentage (default 10%)
        
    Returns:
        str: JSON string containing VAT calculation results
    """
    print(f"--- Tool: calculate_vat_tax called with revenue: {revenue}, rate: {vat_rate}% ---")
    
    try:
        vat_amount = revenue * vat_rate / 100
        net_amount = revenue - vat_amount
        
        return json.dumps({
            "success": True,
            "calculation_type": "vat",
            "revenue": revenue,
            "vat_rate": vat_rate,
            "vat_amount": vat_amount,
            "net_amount": net_amount,
            "message": f"VAT calculated: {vat_amount:,.0f} VND ({vat_rate}% of {revenue:,.0f} VND)"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error calculating VAT tax"
        }, ensure_ascii=False)


def calculate_corporate_tax(taxable_profit: float, business_type: str = "standard") -> str:
    """Calculate corporate tax amount.
    
    Args:
        taxable_profit (float): Taxable profit amount
        business_type (str): Type of business (standard, small_business, high_tech)
        
    Returns:
        str: JSON string containing corporate tax calculation results
    """
    print(f"--- Tool: calculate_corporate_tax called with profit: {taxable_profit}, type: {business_type} ---")
    
    try:
        # Get tax rate based on business type
        corporate_rates = TAX_RATES["corporate"]
        tax_rate = corporate_rates.get(business_type, corporate_rates["standard"])
        
        tax_amount = taxable_profit * tax_rate / 100
        net_profit = taxable_profit - tax_amount
        
        return json.dumps({
            "success": True,
            "calculation_type": "corporate",
            "taxable_profit": taxable_profit,
            "business_type": business_type,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "net_profit": net_profit,
            "message": f"Corporate tax calculated: {tax_amount:,.0f} VND ({tax_rate}% of {taxable_profit:,.0f} VND)"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error calculating corporate tax"
        }, ensure_ascii=False)


def calculate_personal_income_tax(annual_income: float) -> str:
    """Calculate personal income tax using progressive rates.
    
    Args:
        annual_income (float): Annual income amount
        
    Returns:
        str: JSON string containing personal income tax calculation results
    """
    print(f"--- Tool: calculate_personal_income_tax called with income: {annual_income} ---")
    
    try:
        personal_tax = TAX_RATES["personal"]
        rates = personal_tax["rates"]
        thresholds = personal_tax["thresholds"]
        
        total_tax = 0
        remaining_income = annual_income
        tax_breakdown = []
        
        for i, threshold in enumerate(thresholds):
            if remaining_income <= 0:
                break
                
            taxable_at_rate = min(remaining_income, threshold)
            tax_at_rate = taxable_at_rate * rates[i] / 100
            total_tax += tax_at_rate
            
            tax_breakdown.append({
                "rate": rates[i],
                "threshold": threshold,
                "taxable_amount": taxable_at_rate,
                "tax_amount": tax_at_rate
            })
            
            remaining_income -= threshold
        
        # Handle income above highest threshold
        if remaining_income > 0:
            highest_rate = rates[-1]
            tax_at_highest = remaining_income * highest_rate / 100
            total_tax += tax_at_highest
            
            tax_breakdown.append({
                "rate": highest_rate,
                "threshold": "above_highest",
                "taxable_amount": remaining_income,
                "tax_amount": tax_at_highest
            })
        
        net_income = annual_income - total_tax
        
        return json.dumps({
            "success": True,
            "calculation_type": "personal_income",
            "annual_income": annual_income,
            "total_tax": total_tax,
            "net_income": net_income,
            "tax_breakdown": tax_breakdown,
            "message": f"Personal income tax calculated: {total_tax:,.0f} VND from {annual_income:,.0f} VND"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error calculating personal income tax"
        }, ensure_ascii=False)


def validate_tax_form_compliance(form_type: str, form_data: str) -> str:
    """Validate tax form for compliance with Vietnamese tax regulations.
    
    Args:
        form_type (str): HTKK form type
        form_data (str): JSON string of form data
        
    Returns:
        str: JSON string containing compliance validation results
    """
    print(f"--- Tool: validate_tax_form_compliance called for form: {form_type} ---")
    
    try:
        data = json.loads(form_data)
        
        compliance_issues = []
        warnings = []
        
        # Common validations
        if not data.get("tax_code"):
            compliance_issues.append("Tax code is required")
        
        if not data.get("company_name") and not data.get("taxpayer_name"):
            compliance_issues.append("Company name or taxpayer name is required")
        
        # Form-specific validations
        if form_type == "01/GTGT":  # VAT form
            revenue = data.get("total_revenue", 0)
            if revenue > 1000000000:  # 1 billion VND threshold
                if not data.get("vat_registration"):
                    compliance_issues.append("VAT registration required for revenue over 1 billion VND")
            
            vat_amount = data.get("vat_amount", 0)
            vat_rate = data.get("vat_rate", 10)
            expected_vat = revenue * vat_rate / 100
            if abs(vat_amount - expected_vat) > 1000:
                warnings.append(f"VAT amount mismatch: expected {expected_vat:,.0f}, got {vat_amount:,.0f}")
        
        elif form_type == "03/TNDN":  # Corporate tax
            profit = data.get("taxable_profit", 0)
            if profit < 0:
                warnings.append("Negative taxable profit requires additional documentation")
            
            tax_amount = data.get("tax_amount", 0)
            if profit > 0 and tax_amount == 0:
                warnings.append("Positive profit but zero tax amount - please verify")
        
        elif form_type == "02/TNCN":  # Personal income tax
            income = data.get("total_income", 0)
            if income > 100000000:  # 100 million VND
                if not data.get("tax_declaration_submitted"):
                    compliance_issues.append("Tax declaration required for high income earners")
        
        compliance_status = "compliant" if not compliance_issues else "non_compliant"
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "compliance_status": compliance_status,
            "issues": compliance_issues,
            "warnings": warnings,
            "issue_count": len(compliance_issues),
            "warning_count": len(warnings),
            "message": f"Compliance check completed for {form_type}: {compliance_status}"
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
            "message": f"Error validating compliance for {form_type}"
        }, ensure_ascii=False)


def get_current_tax_rates(tax_type: str = "all") -> str:
    """Get current Vietnamese tax rates.
    
    Args:
        tax_type (str): Type of tax rates to retrieve (all, vat, corporate, personal)
        
    Returns:
        str: JSON string containing tax rates
    """
    print(f"--- Tool: get_current_tax_rates called for type: {tax_type} ---")
    
    try:
        if tax_type == "all":
            return json.dumps({
                "success": True,
                "tax_rates": TAX_RATES,
                "message": "All current tax rates retrieved"
            }, ensure_ascii=False)
        elif tax_type in TAX_RATES:
            return json.dumps({
                "success": True,
                "tax_type": tax_type,
                "tax_rates": TAX_RATES[tax_type],
                "message": f"Current {tax_type} tax rates retrieved"
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": f"Unknown tax type: {tax_type}",
                "available_types": list(TAX_RATES.keys()),
                "message": "Please specify a valid tax type"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error retrieving tax rates"
        }, ensure_ascii=False)


def validate_business_rules(form_type: str, form_data: str, rules: str = "[]") -> str:
    """Validate form data against specific business rules.
    
    Args:
        form_type (str): HTKK form type
        form_data (str): JSON string of form data
        rules (str): JSON string of specific rules to validate (optional)
        
    Returns:
        str: JSON string containing business rule validation results
    """
    print(f"--- Tool: validate_business_rules called for form: {form_type} ---")
    
    try:
        data = json.loads(form_data)
        rule_list = json.loads(rules) if rules != "[]" else []
        
        # Default rules for each form type
        if not rule_list:
            if form_type == "01/GTGT":
                rule_list = [
                    {"id": "vat_001", "type": "required_field", "field": "tax_code"},
                    {"id": "vat_002", "type": "required_field", "field": "company_name"},
                    {"id": "vat_003", "type": "min_value", "field": "total_revenue", "value": 0}
                ]
            elif form_type == "03/TNDN":
                rule_list = [
                    {"id": "corp_001", "type": "required_field", "field": "tax_code"},
                    {"id": "corp_002", "type": "required_field", "field": "company_name"}
                ]
        
        rule_results = []
        
        for rule in rule_list:
            rule_id = rule.get("id", "unknown")
            rule_type = rule.get("type", "validation")
            
            passed = True
            message = "Rule passed"
            
            try:
                if rule_type == "required_field":
                    field = rule.get("field")
                    if not data.get(field):
                        passed = False
                        message = f"Required field '{field}' is missing"
                
                elif rule_type == "min_value":
                    field = rule.get("field")
                    min_value = rule.get("value", 0)
                    if data.get(field, 0) < min_value:
                        passed = False
                        message = f"Field '{field}' must be at least {min_value}"
                
                elif rule_type == "max_value":
                    field = rule.get("field")
                    max_value = rule.get("value", float('inf'))
                    if data.get(field, 0) > max_value:
                        passed = False
                        message = f"Field '{field}' must not exceed {max_value}"
            
            except Exception as e:
                passed = False
                message = f"Error validating rule: {str(e)}"
            
            rule_results.append({
                "rule_id": rule_id,
                "rule_type": rule_type,
                "passed": passed,
                "message": message
            })
        
        passed_rules = sum(1 for result in rule_results if result["passed"])
        total_rules = len(rule_results)
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "rule_results": rule_results,
            "passed_rules": passed_rules,
            "total_rules": total_rules,
            "all_rules_passed": passed_rules == total_rules,
            "message": f"Business rule validation completed: {passed_rules}/{total_rules} rules passed"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format",
            "message": "Please provide valid JSON data"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error validating business rules for {form_type}"
        }, ensure_ascii=False) 