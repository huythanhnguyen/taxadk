"""
Root coordinator agent for the HTKK AI Tax Declaration System.
"""
import sys
import os

# Add current directory to Python path for ADK CLI
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from google.adk.agents import Agent

from htkk_agents.constants import MODEL_GEMINI_2_5_FLASH_LITE
from htkk_agents.prompts import ROOT_AGENT_INSTRUCTION, ROOT_AGENT_DESCRIPTION
from htkk_agents.sub_agents.form_agent import form_agent
from htkk_agents.sub_agents.ocr_agent import ocr_agent

# Create coordinator root agent with sub_agents
root_agent = Agent(
    name="htkk_coordinator_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=ROOT_AGENT_DESCRIPTION,
    instruction=ROOT_AGENT_INSTRUCTION,
    sub_agents=[
        form_agent,
        ocr_agent
    ],  # Sub-agents for delegation - root agent only redirects
    output_key="last_coordinator_response"
)

# This is required for ADK web UI to find the agent
agent = root_agent 