#!/usr/bin/env python3
"""
Script chạy chỉ ADK server (không FastAPI)
Để debug và test ADK agents
"""
import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from google.adk import Runner
from agent import root_agent

def main():
    """Chạy chỉ ADK server"""
    print("=" * 60)
    print("🤖 HTKK AI - ADK Server Only")
    print("   Google ADK Multi-Agent System")
    print("=" * 60)
    
    print(f"✅ Root agent loaded: {root_agent.name}")
    print(f"   Model: {root_agent.model}")
    print(f"   Tools: {len(root_agent.tools)} tools")
    
    print("\n🚀 Starting ADK server...")
    print("   - ADK Web UI: http://localhost:8080")
    
    try:
        # Khởi động ADK server
        runner = Runner(
            agent=root_agent,
            host="0.0.0.0",
            port=8080
        )
        runner.run()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ADK server...")
    except Exception as e:
        print(f"❌ Error starting ADK server: {e}")
        raise

if __name__ == "__main__":
    main()
