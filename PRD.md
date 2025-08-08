# Product Requirements Document (PRD)
## HTKK AI Tax Declaration System

### 1. Tổng quan dự án

**Tên dự án:** HTKK AI Tax Declaration System  
**Phiên bản:** 1.0  
**Ngày tạo:** 2025-08-07  

### 2. Mục tiêu dự án

Xây dựng hệ thống kê khai thuế tự động sử dụng Google ADK Multi-Agent AI, tái tạo và cải tiến từ hệ thống HTKK hiện tại của Tổng cục Thuế Việt Nam. Hệ thống sẽ có khả năng:

- Tái tạo các form kê khai thuế online từ XML templates của HTKK
- Sử dụng Google ADK Multi-Agent với Gemini 2.5 Flash Lite để tự động xử lý
- Input từ XML hóa đơn hoặc PDF documents với OCR
- Export trực tiếp ra XML format tương thích HTKK (bỏ Excel)
- Giao diện web hiện đại tái sử dụng từ agent_front

### 3. Kiến trúc hệ thống (System Architecture)

#### 3.1 Tổng quan kiến trúc
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
                       │ │    Gemini 2.5 Flash Lite   │ │
                       │ └─────────────────────────────┘ │
                       │                                 │
                       │ - FastAPI Server                │
                       │ - XML Template Parser           │
                       │ - Document Processing           │
                       └─────────────────────────────────┘
```

#### 3.2 Chi tiết các thành phần

**Frontend (React - Tái sử dụng agent_front)**
- Form kê khai thuế online (không cần Excel)
- Multi-agent chat interface từ agent_front
- File upload cho XML hóa đơn và PDF
- XML export functionality
- Real-time form validation

**Backend (Google ADK Multi-Agent System)**
- **Root Coordinator Agent:** Main orchestration agent using `google.adk.agents.Agent`
- **Form Agent:** Sub-agent for XML template parsing and form rendering
- **OCR Agent:** Sub-agent for PDF/XML document processing and data extraction
- **Tax Validator Agent:** Sub-agent for business rule validation and tax calculations
- **Tools:** Python functions wrapped as ADK tools for specific functionalities
- Google ADK server with built-in web UI and streaming support
- Gemini 2.5 Flash integration via Google ADK

**Database (PostgreSQL - Minimized)**
- User sessions và authentication
- Form cache và temporary data
- Audit logs (không cần lưu form metadata vì ADK handle)

### 4. Cơ sở dữ liệu (Database Design - Minimized)

#### 4.1 Mục đích sử dụng Database (Simplified)
- **User management:** Authentication, basic user info
- **Session storage:** ADK session state, temporary form data
- **Cache layer:** Processed documents, form instances
- **Audit trail:** Basic logging cho compliance

**Lý do minimize:** Google ADK đã có built-in AI engine, session management, và memory service. Không cần lưu form metadata vì ADK agents handle dynamic form generation.

#### 4.2 Cấu trúc Database tối giản

**Tables chính (chỉ 4 tables):**
```sql
-- User Management
users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    tax_code VARCHAR(20),
    business_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ADK Session Storage
adk_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    session_data JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Cache
document_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_hash VARCHAR(64),
    extracted_data JSONB,
    file_type VARCHAR(10), -- 'xml' or 'pdf'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 4.3 Dữ liệu lưu trữ (Simplified)
- **User data:** Chỉ thông tin cơ bản để authentication
- **ADK sessions:** Google ADK session state và memory
- **Document cache:** Kết quả OCR và extracted data
- **Audit logs:** Compliance tracking cơ bản

**Không cần lưu:**
- Form templates (ADK agents parse XML trực tiếp)
- Form metadata (ADK dynamic generation)
- AI conversation history (ADK memory service)
- Business rules (hardcoded trong agents)

### 5. Tính năng chính (Core Features)

#### 5.1 HTKK Business Logic Analysis

**Cấu trúc File System HTKK:**
```
HTKK/
├── Project/                    # Core business logic và configuration
│   ├── Menu.xml               # Form definitions và navigation (1914 lines)
│   ├── MapMCT.xml            # Business rules mapping (2585 lines)
│   ├── ValidCombobox.xml     # Dropdown validation logic
│   ├── Button.xml            # UI behavior configuration (241 lines)
│   ├── ConvertDataCommon.xml # Data conversion rules (111 lines)
│   └── Config.xml            # System configuration
├── InterfaceTemplates/        # Form templates và validation
│   ├── xml/                  # Form structure definitions (90+ files)
│   ├── Validate/             # XSD validation schemas (100+ files)
│   └── excel/                # Excel layout templates
├── DataFiles/                 # User data storage
└── ReportTemplates/          # Output formatting
```

**Form Processing Flow:**
1. Menu.xml → Form Selection & Navigation
2. XML Templates → Dynamic Form Structure  
3. XSD Validation → Business Rules Enforcement
4. MapMCT.xml → Tax Calculation Logic
5. ConvertDataCommon.xml → Data Transformation
6. Button.xml → UI Behavior Control

**Control Types Mapping:**
```javascript
const CONTROL_TYPES = {
  0: 'text',           // Text input
  2: 'checkbox',       // Boolean checkbox
  6: 'dropdown',       // Dependent dropdown
  14: 'date',          // Date picker
  16: 'number',        // Numeric input
  26: 'hidden',        // Hidden field
  100: 'dropdown',     // Province dropdown
  101: 'dropdown'      // Ward dropdown (dependent)
};
```

**Critical Business Rules:**
- **Tax Rate Calculations:** VAT (5%, 10%, 0%), Corporate tax (20%, 15%, 17%)
- **Field Dependencies:** Auto-calculation between related fields
- **Geographic Hierarchies:** Province → District → Ward dependencies
- **Dynamic Tables:** Add/remove rows với MaxRows constraints
- **Data Conversion:** Header to subline data transfer (Type 1-6)

#### 5.2 Phase 1: Form Recreation System
- **XML Template Parser:** Parse 90+ XML templates thành React components
- **Dynamic Form Engine:** Handle repeating sections và field dependencies
- **Validation System:** XSD schema + business rule validation
- **Tax Calculation Engine:** Implement MapMCT.xml logic
- **Data Export:** Generate HTKK-compatible XML output

#### 5.3 Phase 2: AI Integration
- **Form Agent:** Parse templates, render forms, handle updates
- **OCR Agent:** Extract PDF/XML data, map to form fields
- **Tax Validator Agent:** Apply calculations, validate rules, check compliance
- **Coordinator Agent:** Orchestrate workflow between agents
- **Multi-Agent Chat:** Tái sử dụng giao diện từ agent_front

#### 5.4 Phase 3: Advanced Features
- **Batch Processing:** Xử lý nhiều form cùng lúc
- **Digital Signature:** XML signing integration
- **Integration APIs:** Kết nối với hệ thống kế toán
- **Mobile Optimization:** Responsive design cho mobile
- **Analytics Dashboard:** Báo cáo và phân tích

### 6. Phân chia Phase Development

#### Phase 1: Foundation & Form Recreation (8-10 tuần)
**Mục tiêu:** Tái tạo hoàn toàn business logic và form system từ HTKK

**Backend Tasks:**
- Setup Google ADK Multi-Agent system
- Implement XML template parser (90+ templates)
- Build tax calculation engine (MapMCT.xml logic)
- Create validation system (100+ XSD schemas)
- Setup minimal PostgreSQL database

**Frontend Tasks:**
- Setup React với TypeScript
- Build dynamic form rendering engine
- Implement control type mapping (text, dropdown, number, etc.)
- Create geographic dropdown hierarchies
- Build XML export functionality

**Business Logic Implementation:**
- Parse Menu.xml for form definitions (1914 lines)
- Implement MapMCT.xml tax calculations (2585 lines)
- Handle ValidCombobox.xml dropdown logic
- Process ConvertDataCommon.xml data transformations
- Apply Button.xml UI behavior rules

**Deliverables:**
- Hoàn chỉnh 10+ form thuế chính (01/GTGT, 02/TNCN, 03/TNDN, etc.)
- 100% business rule compatibility với HTKK gốc
- Dynamic table management với add/remove rows
- Real-time field dependencies và auto-calculations
- HTKK-compatible XML export

#### Phase 2: AI Integration (6-8 tuần)
**Mục tiêu:** Tích hợp Google ADK Multi-Agent AI system

**Multi-Agent System:**
- **Form Agent:** Parse XML templates, render dynamic forms, handle field updates
- **OCR Agent:** Extract PDF/XML invoice data, map to form fields
- **Tax Validator Agent:** Apply calculation rules, validate business logic
- **Coordinator Agent:** Orchestrate workflow between agents

**Frontend Integration:**
- Tái sử dụng multi-agent chat từ agent_front
- Real-time AI suggestions trong form fields
- Document upload với OCR processing
- Auto-completion based on extracted data

**Advanced Features:**
- Natural language form filling
- Smart error detection và correction
- Context-aware field suggestions
- Batch document processing

**Deliverables:**
- Fully functional multi-agent system
- AI-powered form assistance
- Document processing pipeline
- Intelligent validation và error handling

#### Phase 3: Advanced Features & Optimization (4-6 tuần)
**Mục tiêu:** Production-ready features và performance optimization

**Advanced Features:**
- Digital signature integration cho XML export
- Batch processing multiple forms
- Integration APIs với accounting software
- Advanced analytics dashboard
- Mobile responsive optimization

**Performance & Security:**
- Form loading optimization (<2s load time)
- Validation optimization (debounced, cached)
- Memory management cho large forms
- Security audit và compliance
- Load testing (1000+ concurrent users)

**Production Readiness:**
- Docker containerization
- CI/CD pipeline setup
- Monitoring với Prometheus/Grafana
- Backup và disaster recovery
- Documentation và user training

### 7. Technical Stack

#### Frontend
- **Framework:** React 18+ với TypeScript
- **UI Library:** Tailwind CSS + Shadcn/ui (tái sử dụng từ agent_front)
- **State Management:** Zustand hoặc Redux Toolkit
- **Form Handling:** React Hook Form + Zod validation
- **Build Tool:** Vite

#### Backend  
- **Framework:** Google ADK (Agent Development Kit) v1.5.0+
- **Model:** Gemini 2.5 Flash via Google ADK
- **Server:** Google ADK built-in server with web UI
- **Database:** PostgreSQL 15+ (minimal schema) 
- **ORM:** SQLAlchemy 2.0 (chỉ cho user/session data)
- **Authentication:** Google Cloud Authentication (ADC)
- **File Processing:** PyPDF2, lxml (wrapped as ADK tools)

#### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx
- **Process Manager:** Gunicorn/Uvicorn
- **Monitoring:** Prometheus + Grafana
- **Logging:** Structured logging với ELK stack

### 8. Yêu cầu phi chức năng

#### Performance
- Form load time < 2 seconds
- AI response time < 5 seconds
- Support 1000+ concurrent users
- 99.9% uptime

#### Security
- End-to-end encryption cho sensitive data
- Role-based access control
- Audit logging cho compliance
- Regular security updates

#### Scalability
- Horizontal scaling capability
- Microservices architecture ready
- CDN integration
- Database sharding support

### 9. Rủi ro và giảm thiểu

#### Technical Risks
- **XML parsing complexity:** Mitigate bằng comprehensive testing
- **AI accuracy:** Implement human review workflow
- **Performance issues:** Load testing và optimization

#### Business Risks  
- **Compliance requirements:** Regular legal review
- **Data privacy:** GDPR/local privacy law compliance
- **User adoption:** Extensive user testing và feedback

### 10. Timeline và Milestones

**Total Duration:** 16-20 tuần (giảm nhờ Google ADK)

**Phase 1 Milestones:**
- Week 2: Google ADK setup và minimal database
- Week 4: Multi-agent system hoàn thành
- Week 6: Frontend integration với agent_front
- Week 8: Core tax forms implementation

**Phase 2 Milestones:**
- Week 10: Advanced multi-agent features
- Week 12: Document processing pipeline
- Week 14: Advanced tax calculations

**Phase 3 Milestones:**
- Week 16: Performance optimization
- Week 18: Security và compliance
- Week 20: Production deployment

### 11. Success Metrics

- **Functional:** 100% form compatibility với HTKK gốc
- **Business Logic:** 100% accuracy trong tax calculations
- **Performance:** <2s form load, <5s AI response
- **User Experience:** >90% user satisfaction score
- **Accuracy:** >95% AI suggestion accuracy
- **Adoption:** 80% user retention sau 1 tháng

### 12. Implementation Requirements Summary

#### 12.1 Core Frontend Components
```typescript
// Form Rendering Engine
interface FormCell {
  cellId: string;
  path: string;
  controlType: number;
  validation: ValidationRules;
  helpContextId?: string;
}

// Tax Calculation Engine
class TaxCalculationEngine {
  calculateTax(formData: any, formType: string): TaxResult;
  validateForm(formData: any, formType: string): ValidationResult;
  convertData(formData: any, rules: ConversionRule[]): any;
}

// Multi-Agent Integration
class FormAgent {
  parseTemplate(templatePath: string): FormTemplate;
  renderForm(template: FormTemplate): ReactElement;
  updateField(path: string, value: any): void;
}
```

#### 12.2 Critical Business Logic
- **XML Template Parser:** Handle 90+ form templates
- **Tax Calculation Rules:** Implement 2585 lines of MapMCT.xml logic
- **Validation System:** Process 100+ XSD schemas
- **Dynamic Forms:** Support add/remove rows, field dependencies
- **Geographic Dropdowns:** Province → District → Ward hierarchies
- **Data Export:** Generate HTKK-compatible XML với digital signature

#### 12.3 Multi-Agent Architecture
- **Form Agent:** Template parsing, form rendering, field management
- **OCR Agent:** PDF/XML extraction, data mapping
- **Tax Validator Agent:** Business rule validation, tax calculations
- **Coordinator Agent:** Workflow orchestration, error handling

#### 12.4 Performance Requirements
- **Form Loading:** <2 seconds for complex forms
- **Validation:** Real-time với debouncing
- **Memory Management:** Efficient handling of large dynamic tables
- **Scalability:** Support 1000+ concurrent users
- **Offline Capability:** Local form caching và sync 