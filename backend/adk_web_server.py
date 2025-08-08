"""
ADK Web Server - Khởi động cả Google ADK và FastAPI uvicorn server
Cho phép frontend gọi API đến backend thông qua ADK web protocol
"""
import asyncio
import threading
import time
import sys
import os
import uvicorn
from google.adk.agents import Agent
from google.adk import Runner

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import HTKK agents
from htkk_agents.sub_agents import form_agent, ocr_agent, tax_validator_agent
from htkk_agents.constants import MODEL_GEMINI_2_5_FLASH_LITE
from htkk_agents.prompts import ROOT_AGENT_INSTRUCTION, ROOT_AGENT_DESCRIPTION

# Import FastAPI app
from app.main import app as fastapi_app


def create_root_coordinator_agent():
    """Tạo root coordinator agent với 3 sub-agents"""
    
    root_agent = Agent(
        name="htkk_coordinator",
        model=MODEL_GEMINI_2_5_FLASH_LITE,
        description=ROOT_AGENT_DESCRIPTION,
        instruction=ROOT_AGENT_INSTRUCTION,
        tools=[],  # Root agent delegates to sub-agents
        output_key="coordinator_response"
    )
    
    print("✅ Root coordinator agent created with 3 sub-agents:")
    print("   - form_agent: Xử lý biểu mẫu HTKK")
    print("   - ocr_agent: Xử lý tài liệu PDF/XML")
    print("   - tax_validator_agent: Tính toán và kiểm tra thuế")
    
    return root_agent


def start_fastapi_server():
    """Khởi động FastAPI server với uvicorn"""
    print("🚀 Starting FastAPI server on http://localhost:8000")
    
    uvicorn.run(
        fastapi_app,
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload in production
        log_level="info"
    )


def start_adk_server():
    """Khởi động Google ADK server"""
    print("🤖 Starting Google ADK server on http://localhost:8080")
    
    # Tạo root coordinator agent
    root_agent = create_root_coordinator_agent()
    
    # Khởi động ADK server với Runner
    runner = Runner(
        agent=root_agent,
        host="0.0.0.0",
        port=8080
    )
    runner.run()


def main():
    """Main function - khởi động cả hai servers"""
    print("=" * 60)
    print("🏗️  HTKK AI Tax Declaration System")
    print("   Google ADK Multi-Agent + FastAPI Backend")
    print("=" * 60)
    
    # Khởi động FastAPI server trong thread riêng
    fastapi_thread = threading.Thread(
        target=start_fastapi_server,
        daemon=True,
        name="FastAPI-Server"
    )
    fastapi_thread.start()
    
    # Đợi một chút để FastAPI khởi động
    time.sleep(2)
    
    print("\n📡 Servers starting...")
    print("   - FastAPI API: http://localhost:8000")
    print("   - ADK Web UI: http://localhost:8080")
    print("   - API Docs: http://localhost:8000/docs")
    print("   - Health Check: http://localhost:8000/api/v1/health")
    
    # Khởi động ADK server (blocking)
    try:
        start_adk_server()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down servers...")
    except Exception as e:
        print(f"❌ Error starting ADK server: {e}")
        raise


if __name__ == "__main__":
    main()
