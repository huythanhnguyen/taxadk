#!/usr/bin/env python3
"""
Test script to debug ADK agent import issues
"""
import sys
import os

print("Python path:")
for path in sys.path:
    print(f"  {path}")

print(f"\nCurrent working directory: {os.getcwd()}")

try:
    print("\n1. Testing 'import backend'...")
    import backend
    print(f"   ✅ Success: backend module loaded")
    print(f"   ✅ backend.root_agent: {backend.root_agent.name}")
except Exception as e:
    print(f"   ❌ Error: {e}")

try:
    print("\n2. Testing 'from backend import root_agent'...")
    from backend import root_agent
    print(f"   ✅ Success: root_agent imported")
    print(f"   ✅ root_agent.name: {root_agent.name}")
except Exception as e:
    print(f"   ❌ Error: {e}")

try:
    print("\n3. Testing 'from backend.agent import root_agent'...")
    from backend.agent import root_agent as ra
    print(f"   ✅ Success: root_agent imported from backend.agent")
    print(f"   ✅ root_agent.name: {ra.name}")
except Exception as e:
    print(f"   ❌ Error: {e}")

