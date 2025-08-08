# Fix ADK Import Error

## 🐛 **Lỗi gặp phải:**
```
ModuleNotFoundError: No module named 'htkk_agents'
```

## 🔍 **Nguyên nhân:**
- ADK CLI chạy từ thư mục gốc, không thể tìm thấy module `htkk_agents`
- Python path không được set đúng khi ADK CLI import `backend.agent`

## ✅ **Các giải pháp đã implement:**

### 1. **Fix Python Path trong agent.py**
```python
import sys
import os

# Add current directory to Python path for ADK CLI
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
```

### 2. **Fix Python Path trong adk_web_server.py**
```python
# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
```

### 3. **Tạo __init__.py cho backend package**
```python
"""
HTKK AI Backend Package
"""
```

## 🚀 **Cách chạy server:**

### Option 1: ADK + FastAPI (Recommended)
```bash
cd backend
python adk_web_server.py
```

### Option 2: ADK Only
```bash
cd backend
python run_adk_only.py
```

### Option 3: ADK CLI với PYTHONPATH
```bash
cd backend
set PYTHONPATH=%CD%  # Windows
export PYTHONPATH=$(pwd)  # Linux/Mac
python -m google.adk run --port 8080
```

### Option 4: Batch script (Windows)
```bash
cd backend
test_adk_cli.bat
```

## 📡 **Endpoints sau khi fix:**

- **FastAPI API**: http://localhost:8000 (nếu dùng adk_web_server.py)
- **ADK Web UI**: http://localhost:8080
- **API Documentation**: http://localhost:8000/docs

## ✅ **Verification:**

Test import agent:
```bash
cd backend
python -c "import agent; print('✅ Agent works:', agent.root_agent.name)"
```

Test ADK web server:
```bash
cd backend
python -c "import adk_web_server; print('✅ ADK web server works')"
```

## 🔧 **Environment Requirements:**

Tạo file `.env` trong thư mục `backend/`:
```bash
# Copy từ template (nếu có)
cp env.example .env

# Hoặc tạo mới với nội dung cơ bản:
GOOGLE_API_KEY=your-google-api-key-here
GEMINI_MODEL=gemini-2.5-flash-lite
```

**🎉 Sau khi apply các fix này, ADK CLI sẽ có thể import được `htkk_agents` và chạy bình thường!**
