"""
Form agent for handling HTKK form templates, rendering, validation, and tax calculations.
Merged with tax validator functionality for comprehensive form processing.
"""

from google.adk.agents import Agent

from htkk_agents.constants import MODEL_GEMINI_2_5_FLASH_LITE
from htkk_agents.tools.form_tools import (
    parse_htkk_template,
    render_form_structure,
    validate_form_data,
    calculate_field_dependencies,
    export_form_to_xml,
    get_available_form_types
)
from htkk_agents.tools.tax_tools import (
    calculate_vat_tax,
    calculate_corporate_tax,
    calculate_personal_income_tax,
    validate_tax_form_compliance,
    get_current_tax_rates,
    validate_business_rules
)
from htkk_agents.sub_agents.form_prompts import FORM_AGENT_INSTRUCTION, FORM_AGENT_DESCRIPTION

# Initialize the Form Agent (merged with tax validator functionality)
form_agent = Agent(
    name="form_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=FORM_AGENT_DESCRIPTION,
    instruction=FORM_AGENT_INSTRUCTION,
    tools=[
        # Form tools
        parse_htkk_template,
        render_form_structure,
        validate_form_data,
        calculate_field_dependencies,
        export_form_to_xml,
        get_available_form_types,
        # Tax calculation tools (merged from tax_validator_agent)
        calculate_vat_tax,
        calculate_corporate_tax,
        calculate_personal_income_tax,
        validate_tax_form_compliance,
        get_current_tax_rates,
        validate_business_rules
    ],
    output_key="last_form_response"
) 