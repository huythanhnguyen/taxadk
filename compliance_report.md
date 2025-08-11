# BÁO CÁO COMPLIANCE: HTKK_AI vs HTKK XML TEMPLATES

## Tổng quan
Báo cáo này so sánh 3 forms đã triển khai trong HTKK_AI với các XML templates chuẩn của phần mềm HTKK để đánh giá mức độ tuân thủ (compliance).

---

## 1. FORM 01/GTGT - THUẾ GIÁ TRỊ GIA TĂNG

### 📋 **XML Template Chuẩn HTKK**
**File**: `01_GTGT_TT80_283.xml`
- **Version**: 480
- **Cấu trúc**: 3 Sections chính
- **Tổng số fields**: ~50+ fields
- **Control types**: 0, 2, 6, 14, 16, 26, 100, 101

### 🔍 **Phân tích chi tiết**:

#### **Section 1: Header Information**
```xml
<Cell CellID="P_4" Path="HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/ma_NganhNghe" Controltype="0"/>
<Cell CellID="Q_4" Path="HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/ten_NganhNghe" Controltype="0"/>
```
- **Mã ngành nghề** (ma_NganhNghe)
- **Tên ngành nghề** (ten_NganhNghe)
- **Địa chỉ kinh doanh** với dropdown tỉnh/huyện/xã

#### **Section 2: Tax Calculations**
```xml
<Cell CellID="J_40" Path="HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/GiaTriVaThueGTGTHHDVMuaVao/ct23"/>
<Cell CellID="L_40" Path="HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/GiaTriVaThueGTGTHHDVMuaVao/ct24"/>
```
- **ct21-ct43**: Các chỉ tiêu thuế GTGT
- **Thuế đầu vào/đầu ra** theo từng mức thuế suất
- **Validation**: MinValue/MaxValue cho từng field

### ❌ **HTKK_AI Hiện tại - KHÔNG COMPLY**

#### **Vấn đề chính**:
1. **Thiếu XML Path Structure**: 
   - HTKK_AI chỉ có generic `TaxForm` interface
   - Không có path structure `HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/...`

2. **Thiếu Control Types**:
   - HTKK_AI: `'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'`
   - HTKK XML: 0, 2, 6, 14, 16, 26, 100, 101 (8 loại khác nhau)

3. **Thiếu Business Logic**:
   - Không có field dependencies (ParentCell/ChildCell)
   - Không có validation rules (MinValue/MaxValue)
   - Không có HelpContextID

4. **Mock Implementation**:
   - `HTKKParser.parse_form_template()` chỉ return mock data
   - `FormEngine` chỉ có placeholder functions

---

## 2. FORM 03/TNDN - THUẾ THU NHẬP DOANH NGHIỆP

### 📋 **XML Template Chuẩn HTKK**
**File**: `03_01_ND132_TNDN_TT80_283.xml`
- **Version**: 524
- **Cấu trúc**: Dynamic sections với tables
- **Tổng số fields**: 700+ fields (file 226KB)
- **Đặc điểm**: Có dynamic tables với MaxRows

### 🔍 **Phân tích chi tiết**:

#### **Dynamic Section Example**:
```xml
<Section Dynamic="1" MaxRows="0" TableName="03_01_ND20_1" TablePath="PL_GDLK2-01/Muc_I/CTiet">
  <RowInfo>
    <Cell Path="tenLKet" Controltype="0" MaxLen="200"/>
    <Cell Path="ten_quocGia" Controltype="56" SelectedValue="AQ"/>
    <Cell Path="mstLKet" Controltype="0" MaxLen="200"/>
  </RowInfo>
</Section>
```

#### **Complex Path Structure**:
- `PL_GDLK2-01/Muc_I/CTiet` - Phụ lục GDLK2-01, Mục I
- `PL_GDLK2-01/Muc_II/ct1` - Các chỉ tiêu cụ thể
- `PL_GDLK2-01/Muc_III/Dong_I/ct3` - Dòng I, chỉ tiêu 3

### ❌ **HTKK_AI Hiện tại - KHÔNG COMPLY**

#### **Vấn đề chính**:
1. **Thiếu Dynamic Sections**:
   - HTKK_AI không hỗ trợ `Dynamic="1"` sections
   - Không có `TableName` và `TablePath`
   - Không có `MaxRows` và repeatable rows

2. **Thiếu Complex Path Structure**:
   - Không có nested path như `PL_GDLK2-01/Muc_I/CTiet`
   - Không có table-based data structure

3. **Thiếu Advanced Control Types**:
   - Control type 56 (country selector) không được hỗ trợ
   - Thiếu `SelectedValue` mechanism

---

## 3. FORM 02/TNCN - THUẾ THU NHẬP CÁ NHÂN

### 📋 **XML Template Chuẩn HTKK**
**File**: `02_KK_TNCN_TT80_283.xml`
- **Version**: 539
- **Cấu trúc**: 2 Sections chính
- **Tổng số fields**: ~30 fields
- **Đặc điểm**: Có địa chỉ cascading dropdowns

### 🔍 **Phân tích chi tiết**:

#### **Cascading Address Fields**:
```xml
<Cell Path="HSoThueDTu/HSoKhaiThue/TTinChung/TTinTKhaiThue/NNT/tenTinhNNT" 
      Controltype="100" SelectedValue="AK_18" ChildCell="I_22"/>
<Cell Path="HSoThueDTu/HSoKhaiThue/TTinChung/TTinTKhaiThue/NNT/tenHuyenNNT" 
      Controltype="6" SelectedValue="AK_20" ParentCell="AK_18"/>
```

#### **Path Structure**:
- `HSoThueDTu/HSoKhaiThue/TTinChung/TTinTKhaiThue/NNT/` - Thông tin người nộp thuế
- `HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/Header/` - Header information

### ❌ **HTKK_AI Hiện tại - KHÔNG COMPLY**

#### **Vấn đề chính**:
1. **Thiếu Cascading Dropdowns**:
   - Không có `ParentCell`/`ChildCell` relationships
   - Không có `SelectedValue` mechanism

2. **Thiếu MST Validation**:
   - Control type 26 cho MST không được implement
   - Thiếu `MaxLen="14"` validation

---

## 4. TỔNG KẾT COMPLIANCE

### 📊 **Điểm Compliance**

| Aspect | HTKK XML Standard | HTKK_AI Current | Compliance % |
|--------|-------------------|-----------------|--------------|
| **XML Path Structure** | ✅ Full hierarchy | ❌ Generic fields | 0% |
| **Control Types** | ✅ 8 types | ❌ 6 basic types | 25% |
| **Dynamic Sections** | ✅ Full support | ❌ Not supported | 0% |
| **Field Dependencies** | ✅ Parent/Child | ❌ Not implemented | 0% |
| **Validation Rules** | ✅ Min/Max/Length | ❌ Basic validation | 20% |
| **Business Logic** | ✅ Complex rules | ❌ Mock functions | 0% |
| **XML Export** | ✅ HTKK compatible | ❌ Mock XML | 0% |

### 🎯 **Overall Compliance: 6.4%**

---

## 5. KHUYẾN NGHỊ CẢI THIỆN

### 🚨 **Priority 1 - Critical**
1. **Implement XML Path Structure**:
   ```typescript
   interface HTKKField {
     cellId: string
     path: string  // e.g., "HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/ct21"
     controlType: number  // 0, 2, 6, 14, 16, 26, 100, 101
     encode: boolean
     value: any
     defaultValue?: any
     maxLen?: number
     minValue?: number
     maxValue?: number
     helpContextId?: string
   }
   ```

2. **Implement Control Type Mapping**:
   ```typescript
   const HTKK_CONTROL_TYPES = {
     0: 'text',
     2: 'checkbox', 
     6: 'dependent_dropdown',
     14: 'date',
     16: 'number',
     26: 'tax_code',
     100: 'province_dropdown',
     101: 'ward_dropdown'
   }
   ```

### 🔧 **Priority 2 - Important**
3. **Implement Dynamic Sections**:
   ```typescript
   interface HTKKSection {
     dynamic: boolean
     maxRows: number
     tableName?: string
     tablePath?: string
     rowInfo: HTKKField[]
   }
   ```

4. **Implement Field Dependencies**:
   ```typescript
   interface HTKKFieldDependency {
     parentCell?: string
     childCell?: string
     selectedValue?: string
   }
   ```

### 📈 **Priority 3 - Enhancement**
5. **Real XML Parser**: Replace mock `HTKKParser` with actual XML parsing
6. **Business Rules Engine**: Implement tax calculation formulas
7. **Validation Engine**: Implement HTKK-compliant validation
8. **XML Export**: Generate HTKK-compatible XML output

---

## 6. ROADMAP IMPLEMENTATION

### **Phase 1 (2 weeks)**:
- ✅ Implement XML path structure
- ✅ Add HTKK control types
- ✅ Basic field dependencies

### **Phase 2 (3 weeks)**:
- ✅ Dynamic sections support
- ✅ Real XML parser
- ✅ Validation engine

### **Phase 3 (4 weeks)**:
- ✅ Business rules engine
- ✅ XML export functionality
- ✅ Full HTKK compliance testing

---

**📝 Kết luận**: HTKK_AI hiện tại chỉ đạt **6.4% compliance** với chuẩn HTKK. Cần refactor toàn bộ form system để đạt được compatibility với phần mềm HTKK chính thức.

*Cập nhật: 2025-01-09*
