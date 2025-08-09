"""
Simple test agent for debugging ADK
"""
from google.adk.agents import Agent

# Create a simple test agent
root_agent = Agent(
    name="simple_test_agent",
    model="gemini-2.5-flash-lite",
    description="Simple test agent for debugging",
    instruction="You are a simple test agent. Just respond with 'Hello from simple agent!'",
    output_key="simple_response"
)
