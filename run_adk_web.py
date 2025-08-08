#!/usr/bin/env python3
"""
Script chạy ADK Web native command
Khởi động cả ADK web UI và FastAPI uvicorn server
"""
import os
import sys
import subprocess

def main():
    """Chạy ADK Web native command"""
    print("=" * 60)
    print("🚀 HTKK AI Tax Declaration System")
    print("   ADK Web Native + FastAPI Uvicorn")
    print("=" * 60)
    
    # Set environment variables
    env = os.environ.copy()
    
    # Ensure we have the right working directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    agents_dir = os.path.join(project_root, "agents")
    
    print("🔧 Configuration:")
    print(f"   Project root: {project_root}")
    print(f"   Agents directory: {agents_dir}")
    print(f"   Working directory: {os.getcwd()}")
    
    # Check if agents directory exists
    if not os.path.exists(agents_dir):
        print(f"❌ Agents directory not found: {agents_dir}")
        return
    
    if not os.path.exists(os.path.join(agents_dir, "backend", "agent.py")):
        print(f"❌ Backend agent not found: {os.path.join(agents_dir, 'backend', 'agent.py')}")
        return
    
    print("\n🚀 Starting ADK Web server...")
    print("   - ADK Web UI: http://localhost:8080")
    print("   - FastAPI included via ADK Web native")
    print("   - Available agents: backend")
    
    try:
        # Run ADK Web native command
        cmd = [
            sys.executable, "-m", "google.adk", "web",
            "--host", "0.0.0.0",
            "--port", "8080",
            "--reload",
            "--verbose",
            agents_dir
        ]
        
        print(f"\n📋 Command: {' '.join(cmd)}")
        print("🔄 Starting server...\n")
        
        subprocess.run(cmd, env=env, cwd=project_root)
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ADK Web server...")
    except Exception as e:
        print(f"❌ Error starting ADK Web: {e}")
        raise

if __name__ == "__main__":
    main()
