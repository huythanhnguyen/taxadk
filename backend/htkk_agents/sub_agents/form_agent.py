"""
Form agent for handling HTKK form templates, rendering, and validation.
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
from htkk_agents.sub_agents.form_prompts import FORM_AGENT_INSTRUCTION, FORM_AGENT_DESCRIPTION

# Initialize the Form Agent
form_agent = Agent(
    name="form_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=FORM_AGENT_DESCRIPTION,
    instruction=FORM_AGENT_INSTRUCTION,
    tools=[
        parse_htkk_template,
        render_form_structure,
        validate_form_data,
        calculate_field_dependencies,
        export_form_to_xml,
        get_available_form_types
    ],
    output_key="last_form_response"
) 