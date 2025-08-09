# HTKK AI Backend Server

## Cấu trúc mới sau khi restructure

### ✅ Đã hoàn thành:
- ❌ **Xóa folder `app/agents/`** - Không còn sử dụng
- ✅ **Sử dụng `htkk_agents/`** - Multi-agent system hoàn chỉnh
- ✅ **ADK Web Protocol** - Khởi động cả uvicorn và ADK server

### 🏗️ Cấu trúc HTKK Agents:

```
backend/
├── htkk_agents/                    # Google ADK Multi-Agent System
│   ├── sub_agents/                 # 3 chuyên gia chính
│   │   ├── form_agent.py          # Xử lý biểu mẫu HTKK
│   │   ├── ocr_agent.py           # Xử lý tài liệu PDF/XML
│   │   └── tax_validator_agent.py # Tính toán và kiểm tra thuế
│   ├── tools/                     # 18 tools cho agents
│   │   ├── form_tools.py          # 6 tools cho form processing
│   │   ├── ocr_tools.py           # 6 tools cho document processing
│   │   └── tax_tools.py           # 6 tools cho tax calculations
│   ├── constants.py               # Constants và tax rates
│   └── prompts.py                 # Root coordinator prompts
├── app/                           # FastAPI application
│   ├── api/routes/                # REST API endpoints
│   ├── services/                  # Business logic services
│   └── database/                  # Database models & connection
├── adk_web_server.py              # ADK + FastAPI dual server
└── start_server.py                # Entry point script
```

### 🚀 Khởi động Server:

#### Cách 1: Script chính
```bash
cd backend
python start_server.py
```

#### Cách 2: Module trực tiếp
```bash
cd backend
python adk_web_server.py
```

### 📡 Endpoints sau khi khởi động:

- **FastAPI API**: http://localhost:8000
- **ADK Web UI**: http://localhost:8080  
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

### 🤖 Multi-Agent System:

#### Root Coordinator Agent:
- **Name**: `htkk_coordinator`
- **Model**: `gemini-2.5-flash`
- **Role**: Điều phối 3 sub-agents
- **Port**: 8080 (ADK Web UI)

#### Sub-Agents:
1. **form_agent**: Xử lý biểu mẫu HTKK (6 tools)
2. **ocr_agent**: Xử lý tài liệu PDF/XML (6 tools)  
3. **tax_validator_agent**: Tính toán thuế (6 tools)

### 🔧 Tools Available:

#### Form Tools (6):
- `parse_htkk_template()` - Parse XML templates
- `render_form_structure()` - Render dynamic forms
- `validate_form_data()` - Validate form data
- `calculate_field_dependencies()` - Calculate field dependencies
- `export_form_to_xml()` - Export to HTKK XML
- `get_available_form_types()` - Get form types

#### OCR Tools (6):
- `process_pdf_document()` - Process PDF files
- `process_xml_document()` - Process XML files
- `extract_text_from_pdf()` - Extract text from PDF
- `map_extracted_data_to_form()` - Map data to forms
- `process_invoice_batch()` - Batch processing
- `get_cached_document_data()` - Get cached data

#### Tax Tools (6):
- `calculate_vat_tax()` - Calculate VAT
- `calculate_corporate_tax()` - Calculate corporate tax
- `calculate_personal_income_tax()` - Calculate personal tax
- `validate_tax_form_compliance()` - Validate compliance
- `get_current_tax_rates()` - Get tax rates
- `validate_business_rules()` - Validate business rules

### 🔄 Frontend Integration:

Frontend có thể gọi API đến backend qua:
1. **REST API** (port 8000) - Cho CRUD operations
2. **ADK Web** (port 8080) - Cho AI agent interactions

### ⚙️ Environment Setup:

Tạo file `.env` từ `env.example`:
```bash
cp env.example .env
# Cập nhật GOOGLE_API_KEY với key thực của bạn
```

### 📋 Dependencies:

Tất cả dependencies đã được cập nhật trong `requirements.txt`:
- google-adk>=1.5.0
- fastapi>=0.104.0
- uvicorn>=0.24.0
- psutil>=5.9.0
- email-validator>=2.0.0
- ... (xem đầy đủ trong requirements.txt)

### ✅ Status:

- [x] Xóa folder agents/ cũ
- [x] HTKK agents hoạt động đầy đủ với 18 tools
- [x] ADK web protocol khởi động cả uvicorn và ADK
- [x] Tất cả imports đã được sửa
- [x] Dependencies đã được cài đặt
- [x] Server có thể khởi động thành công

**🎉 Backend đã sẵn sàng cho Phase 2 development!**
