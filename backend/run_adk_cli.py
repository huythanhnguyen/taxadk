#!/usr/bin/env python3
"""
Script chạy ADK CLI với cấu hình đúng
"""
import os
import sys
import subprocess

def main():
    """Chạy ADK CLI với environment đúng"""
    print("=" * 60)
    print("🤖 HTKK AI - ADK CLI Server")
    print("   Running via ADK CLI")
    print("=" * 60)
    
    # Set environment variables
    env = os.environ.copy()
    env['PYTHONPATH'] = os.getcwd()
    
    print("🔧 Environment setup:")
    print(f"   PYTHONPATH: {env.get('PYTHONPATH')}")
    print(f"   Working directory: {os.getcwd()}")
    
    print("\n🚀 Starting ADK CLI server...")
    print("   - ADK Web UI: http://localhost:8080")
    
    try:
        # Chạy ADK CLI
        cmd = [sys.executable, "-m", "google.adk", "run", "--port", "8080"]
        print(f"   Command: {' '.join(cmd)}")
        
        subprocess.run(cmd, env=env, cwd=os.getcwd())
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ADK CLI server...")
    except Exception as e:
        print(f"❌ Error starting ADK CLI: {e}")
        raise

if __name__ == "__main__":
    main()
