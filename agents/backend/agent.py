"""
Root coordinator agent for the HTKK AI Tax Declaration System.
Compatible with ADK Web native command.
"""
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from google.adk.agents import Agent
from htkk_agents.constants import MODEL_GEMINI_2_5_FLASH_LITE
from htkk_agents.sub_agents.form_agent import form_agent
from htkk_agents.sub_agents.ocr_agent import ocr_agent
from htkk_agents.sub_agents.tax_validator_agent import tax_validator_agent
from htkk_agents.prompts import ROOT_AGENT_INSTRUCTION, ROOT_AGENT_DESCRIPTION

# Create coordinator root agent
agent = Agent(
    name="htkk_coordinator_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=ROOT_AGENT_DESCRIPTION,
    instruction=ROOT_AGENT_INSTRUCTION,
    tools=[],  # Root agent doesn't need tools directly as it delegates
    output_key="last_coordinator_response"
)

print(f"✅ HTKK AI Agent loaded: {agent.name}")
print(f"   Model: {agent.model}")
print(f"   Sub-agents available: form_agent, ocr_agent, tax_validator_agent")
