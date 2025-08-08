#!/usr/bin/env python3
"""
Test script to verify root agent and subagents configuration
"""
import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    print("🔍 Testing agent import...")
    import agent
    
    print(f"✅ Agent imported successfully")
    print(f"📋 Agent name: {agent.root_agent.name}")
    print(f"🤖 Agent model: {agent.root_agent.model}")
    
    # Check if subagents exist
    if hasattr(agent.root_agent, 'subagents') and agent.root_agent.subagents:
        print(f"✅ Subagents found: {len(agent.root_agent.subagents)}")
        for i, subagent in enumerate(agent.root_agent.subagents):
            print(f"  {i+1}. {subagent.name} - {subagent.description[:50]}...")
    else:
        print("❌ No subagents found!")
        
    # Test individual subagent imports
    print("\n🔍 Testing individual subagent imports...")
    
    try:
        from htkk_agents.sub_agents.form_agent import form_agent
        print(f"✅ Form agent: {form_agent.name}")
    except Exception as e:
        print(f"❌ Form agent error: {e}")
        
    try:
        from htkk_agents.sub_agents.ocr_agent import ocr_agent
        print(f"✅ OCR agent: {ocr_agent.name}")
    except Exception as e:
        print(f"❌ OCR agent error: {e}")
        
    try:
        from htkk_agents.sub_agents.tax_validator_agent import tax_validator_agent
        print(f"✅ Tax validator agent: {tax_validator_agent.name}")
    except Exception as e:
        print(f"❌ Tax validator agent error: {e}")
        
    print("\n🎉 Agent configuration test completed!")
    
except Exception as e:
    print(f"❌ Error importing agent: {e}")
    import traceback
    traceback.print_exc()
