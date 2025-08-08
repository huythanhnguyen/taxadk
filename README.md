# 🏛️ HTKK AI Tax Declaration System

**Hệ thống kê khai thuế tự động sử dụng Google ADK Multi-Agent AI**

[![Google ADK](https://img.shields.io/badge/Google-ADK-blue)](https://cloud.google.com/adk)
[![Python](https://img.shields.io/badge/Python-3.11+-green)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 📋 Tổng quan

HTKK AI là hệ thống kê khai thuế thông minh được xây dựng trên nền tảng **Google Agent Development Kit (ADK)**, tái tạo và cải tiến từ hệ thống HTKK của Tổng cục Thuế Việt Nam.

### ✨ Tính năng chính

- 🤖 **Multi-Agent AI System** - 3 chuyên gia AI độc lập
- 📋 **Form Processing** - Xử lý 90+ biểu mẫu thuế HTKK
- 📄 **Document OCR** - Trích xuất dữ liệu từ PDF/XML
- 🧮 **Tax Calculations** - Tính toán thuế tự động theo quy định VN
- 🔍 **Compliance Check** - Kiểm tra tuân thủ pháp luật
- 🌐 **Vietnamese Language** - Hỗ trợ đầy đủ tiếng Việt

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────┐
│   Frontend      │    │         Backend                 │    │   Database      │
│   (React)       │◄──►│      (Google ADK)               │◄──►│ (PostgreSQL)    │
│                 │    │                                 │    │   Minimal       │
│ - Tax Forms UI  │    │ ┌─────────────────────────────┐ │    │                 │
│ - AI Chat       │    │ │     Multi-Agent System      │ │    │ - User Data     │
│ - File Upload   │    │ │                             │ │    │ - Sessions      │
│ - XML Export    │    │ │ ┌─────┐ ┌─────┐ ┌─────────┐ │ │    │ - Form Cache    │
└─────────────────┘    │ │ │Form │ │OCR  │ │Tax      │ │ │    │                 │
                       │ │ │Agent│ │Agent│ │Validator│ │ │    └─────────────────┘
                       │ │ └─────┘ └─────┘ └─────────┘ │ │
                       │ │                             │ │
                       │ │    Gemini 2.5 Flash        │ │
                       │ └─────────────────────────────┘ │
                       │                                 │
                       │ - Google ADK Server             │
                       │ - XML Template Parser           │
                       │ - Document Processing           │
                       └─────────────────────────────────┘
```

## 🤖 Multi-Agent System

### Root Coordinator Agent
- **Vai trò:** Điều phối chính, routing requests
- **Khả năng:** Phân tích yêu cầu, định tuyến đến chuyên gia phù hợp

### Form Agent
- **Chuyên môn:** Xử lý biểu mẫu HTKK
- **Tools:** 6 công cụ cho XML parsing, validation, export
- **Forms:** 01/GTGT, 02/TNCN, 03/TNDN, 04/TTDB, 05/TNMT

### OCR Agent  
- **Chuyên môn:** Xử lý tài liệu PDF/XML
- **Tools:** 6 công cụ cho OCR, data extraction, mapping
- **Formats:** PDF invoices, XML documents, batch processing

### Tax Validator Agent
- **Chuyên môn:** Tính toán thuế và kiểm tra tuân thủ
- **Tools:** 6 công cụ cho tax calculations, compliance
- **Taxes:** VAT (0%, 5%, 10%), Corporate (15%, 17%, 20%), Personal (5%-35%)

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Python 3.11+
- Google ADK 1.5.0+
- PostgreSQL 15+ (optional)

### 1. Clone repository
```bash
git clone https://github.com/huythanhnguyen/taxadk.git
cd taxadk
```

### 2. Cài đặt dependencies
```bash
pip install google-adk>=1.5.0
pip install -r backend/requirements.txt
```

### 3. Chạy Google ADK server
```bash
cd backend
adk web . --port=8080 --host=0.0.0.0
```

### 4. Truy cập web interface
```
http://localhost:8080
```

## 📚 Sử dụng

### Qua Google ADK Web UI
1. Mở http://localhost:8080
2. Chat với AI agents
3. Upload documents để xử lý
4. Tạo và export forms

### Ví dụ chat commands
```
"Tạo form kê khai thuế GTGT"
"Xử lý hóa đơn PDF này"  
"Tính thuế VAT cho doanh thu 10 triệu"
"Kiểm tra tuân thủ form 03/TNDN"
```

## 📁 Cấu trúc project

```
taxadk/
├── backend/
│   ├── agent.py                 # Root agent entry point
│   ├── htkk_agents/
│   │   ├── constants.py         # Model configs & tax rates
│   │   ├── prompts.py          # Root agent prompts
│   │   ├── sub_agents/         # Individual agents
│   │   │   ├── form_agent.py
│   │   │   ├── ocr_agent.py
│   │   │   └── tax_validator_agent.py
│   │   └── tools/              # ADK tools
│   │       ├── form_tools.py   # 6 form tools
│   │       ├── ocr_tools.py    # 6 OCR tools
│   │       └── tax_tools.py    # 6 tax tools
│   └── app/                    # Backend services
├── frontend/                   # React frontend (future)
├── docs/                      # Documentation
│   ├── PRD.md                 # Product Requirements
│   └── TASKLOG.md            # Development log
└── README.md
```

## 🛠️ Development

### Phase 1: ✅ Foundation (Completed)
- Backend infrastructure
- HTKK business logic
- Form system
- Core tax forms

### Phase 2: ✅ AI Integration (Completed)  
- Google ADK Multi-Agent system
- 18 ADK tools implemented
- Agent coordination
- Vietnamese language support

### Phase 3: 🔄 Advanced Features (In Progress)
- Frontend integration
- Production deployment
- Advanced analytics

## 📊 Technical Specs

- **Backend:** Google ADK + Python 3.11
- **AI Model:** Gemini 2.5 Flash
- **Database:** PostgreSQL (minimal schema)
- **Frontend:** React + TypeScript (planned)
- **Tools:** 18 ADK tools across 3 categories
- **Forms:** 90+ HTKK templates supported

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Tổng cục Thuế Việt Nam for HTKK system reference
- Google Cloud for ADK platform
- Vietnamese tax law and regulations

## 📞 Contact

- **Author:** Huy Thanh Nguyen
- **Email:** [your-email@example.com]
- **GitHub:** [@huythanhnguyen](https://github.com/huythanhnguyen)

---

**⚡ Powered by Google ADK & Gemini 2.5 Flash** 