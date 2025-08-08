"""
Tax validator agent for handling tax calculations and compliance validation.
"""

from google.adk.agents import Agent

from htkk_agents.constants import MODEL_GEMINI_2_5_FLASH_LITE
from htkk_agents.tools.tax_tools import (
    calculate_vat_tax,
    calculate_corporate_tax,
    calculate_personal_income_tax,
    validate_tax_form_compliance,
    get_current_tax_rates,
    validate_business_rules
)
from htkk_agents.sub_agents.tax_prompts import TAX_VALIDATOR_AGENT_INSTRUCTION, TAX_VALIDATOR_AGENT_DESCRIPTION

# Initialize the Tax Validator Agent
tax_validator_agent = Agent(
    name="tax_validator_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=TAX_VALIDATOR_AGENT_DESCRIPTION,
    instruction=TAX_VALIDATOR_AGENT_INSTRUCTION,
    tools=[
        calculate_vat_tax,
        calculate_corporate_tax,
        calculate_personal_income_tax,
        validate_tax_form_compliance,
        get_current_tax_rates,
        validate_business_rules
    ],
    output_key="last_tax_response"
) 