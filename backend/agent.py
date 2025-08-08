"""
Root coordinator agent for the HTKK AI Tax Declaration System.
"""

from google.adk.agents import Agent

from backend.htkk_agents.constants import MODEL_GEMINI_2_5_FLASH
from backend.htkk_agents.sub_agents.form_agent import form_agent
from backend.htkk_agents.sub_agents.ocr_agent import ocr_agent
from backend.htkk_agents.sub_agents.tax_validator_agent import tax_validator_agent
from backend.htkk_agents.prompts import ROOT_AGENT_INSTRUCTION, ROOT_AGENT_DESCRIPTION

# Create coordinator root agent
root_agent = Agent(
    name="htkk_coordinator_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    description=ROOT_AGENT_DESCRIPTION,
    instruction=ROOT_AGENT_INSTRUCTION,
    tools=[],  # Root agent doesn't need tools directly as it delegates
    sub_agents=[
        form_agent,
        ocr_agent,
        tax_validator_agent
    ],
    output_key="last_coordinator_response"
)

# This is required for ADK web UI to find the agent
agent = root_agent 