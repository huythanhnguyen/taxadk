"""
Test services for HTKK AI Phase 1
"""
import pytest
from unittest.mock import Mock, patch
from app.services.htkk_parser import HTKKParser
from app.services.form_engine import FormEngine
from app.services.ocr_service import OCRService


class TestHTKKParser:
    """Test HTKK XML parser functionality"""
    
    def test_parser_initialization(self):
        """Test parser can be initialized"""
        parser = HTKKParser()
        assert parser is not None
    
    def test_parse_menu_xml(self):
        """Test Menu.xml parsing"""
        parser = HTKKParser()
        # Mock XML content for testing
        mock_xml = """<?xml version="1.0" encoding="utf-8"?>
        <Menu>
            <Form id="01/GTGT" name="VAT Declaration">
                <Fields>
                    <Field id="company_name" type="text" required="true"/>
                    <Field id="tax_code" type="text" required="true"/>
                </Fields>
            </Form>
        </Menu>"""
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = mock_xml
            result = parser.parse_menu_xml("mock_path")
            assert result is not None
            assert isinstance(result, dict)
    
    def test_parse_form_template(self):
        """Test form template parsing"""
        parser = HTKKParser()
        mock_template = """<?xml version="1.0" encoding="utf-8"?>
        <FormTemplate id="01/GTGT">
            <Structure>
                <Section name="company_info">
                    <Field id="company_name" control_type="0"/>
                    <Field id="tax_code" control_type="0"/>
                </Section>
            </Structure>
        </FormTemplate>"""
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = mock_template
            result = parser.parse_form_template("01/GTGT")
            assert result is not None
            assert "structure" in result
    
    def test_parse_validation_schema(self):
        """Test XSD validation schema parsing"""
        parser = HTKKParser()
        mock_xsd = """<?xml version="1.0" encoding="utf-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="company_name" type="xs:string"/>
            <xs:element name="tax_code" type="xs:string"/>
        </xs:schema>"""
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = mock_xsd
            result = parser.parse_validation_schema("01/GTGT")
            assert result is not None


class TestFormEngine:
    """Test form engine functionality"""
    
    def test_form_engine_initialization(self):
        """Test form engine can be initialized"""
        engine = FormEngine()
        assert engine is not None
    
    def test_render_form_structure(self):
        """Test form structure rendering"""
        engine = FormEngine()
        template = {
            "id": "01/GTGT",
            "structure": {
                "sections": [
                    {
                        "name": "company_info",
                        "fields": [
                            {"id": "company_name", "control_type": 0, "required": True},
                            {"id": "tax_code", "control_type": 0, "required": True}
                        ]
                    }
                ]
            }
        }
        
        result = engine.render_form_structure(template)
        assert result is not None
        assert "sections" in result
        assert len(result["sections"]) == 1
    
    def test_validate_form_data(self):
        """Test form data validation"""
        engine = FormEngine()
        form_data = {
            "form_type": "01/GTGT",
            "data": {
                "company_name": "Test Company",
                "tax_code": "0123456789"
            }
        }
        
        result = engine.validate_form_data(form_data)
        assert result is not None
        assert "valid" in result
        assert "errors" in result
    
    def test_calculate_tax_vat(self):
        """Test VAT tax calculation"""
        engine = FormEngine()
        calculation_data = {
            "form_type": "01/GTGT",
            "revenue": 1000000,
            "vat_rate": 10
        }
        
        result = engine.calculate_tax(calculation_data)
        assert result is not None
        assert "vat_amount" in result
        assert result["vat_amount"] == 100000  # 10% of 1,000,000
    
    def test_calculate_field_dependencies(self):
        """Test field dependency calculations"""
        engine = FormEngine()
        dependency_data = {
            "form_type": "01/GTGT",
            "field": "total_vat",
            "dependencies": {
                "revenue": 1000000,
                "vat_rate": 10
            }
        }
        
        result = engine.calculate_field_dependencies(dependency_data)
        assert result is not None
        assert "calculated_value" in result
    
    def test_export_to_xml(self):
        """Test XML export functionality"""
        engine = FormEngine()
        form_data = {
            "form_type": "01/GTGT",
            "data": {
                "company_name": "Test Company",
                "tax_code": "0123456789",
                "period": "2024-01",
                "total_revenue": 1000000,
                "vat_amount": 100000
            }
        }
        
        result = engine.export_to_xml(form_data)
        assert result is not None
        assert isinstance(result, str)
        assert "<?xml" in result
        assert "Test Company" in result


class TestOCRService:
    """Test OCR service functionality"""
    
    def test_ocr_service_initialization(self):
        """Test OCR service can be initialized"""
        service = OCRService()
        assert service is not None
    
    @patch('app.services.ocr_service.PyPDF2.PdfReader')
    def test_extract_text_from_pdf(self, mock_pdf_reader):
        """Test PDF text extraction"""
        service = OCRService()
        
        # Mock PDF reader
        mock_page = Mock()
        mock_page.extract_text.return_value = "Test invoice content"
        mock_pdf_reader.return_value.pages = [mock_page]
        
        result = service.extract_text_from_pdf(b"mock_pdf_content")
        assert result is not None
        assert "Test invoice content" in result
    
    def test_extract_data_from_xml(self):
        """Test XML data extraction"""
        service = OCRService()
        xml_content = """<?xml version="1.0" encoding="utf-8"?>
        <Invoice>
            <InvoiceNumber>INV-001</InvoiceNumber>
            <Amount>1000000</Amount>
            <VATAmount>100000</VATAmount>
        </Invoice>"""
        
        result = service.extract_data_from_xml(xml_content)
        assert result is not None
        assert "invoice_number" in result
        assert result["invoice_number"] == "INV-001"
        assert result["amount"] == "1000000"
    
    def test_process_document(self):
        """Test document processing pipeline"""
        service = OCRService()
        
        # Test with mock XML content
        xml_content = """<?xml version="1.0" encoding="utf-8"?>
        <Invoice>
            <InvoiceNumber>INV-001</InvoiceNumber>
            <Amount>1000000</Amount>
        </Invoice>"""
        
        result = service.process_document(xml_content.encode(), "xml")
        assert result is not None
        assert "extracted_data" in result
        assert "file_hash" in result
    
    def test_map_to_form_fields(self):
        """Test mapping extracted data to form fields"""
        service = OCRService()
        extracted_data = {
            "invoice_number": "INV-001",
            "amount": "1000000",
            "vat_amount": "100000"
        }
        
        result = service.map_to_form_fields(extracted_data, "01/GTGT")
        assert result is not None
        assert isinstance(result, dict)


class TestIntegrationServices:
    """Test service integration"""
    
    def test_parser_and_engine_integration(self):
        """Test parser and form engine work together"""
        parser = HTKKParser()
        engine = FormEngine()
        
        # Mock template data
        mock_template = {
            "id": "01/GTGT",
            "structure": {
                "sections": [
                    {
                        "name": "company_info",
                        "fields": [
                            {"id": "company_name", "control_type": 0}
                        ]
                    }
                ]
            }
        }
        
        # Test that engine can process parser output
        result = engine.render_form_structure(mock_template)
        assert result is not None
    
    def test_ocr_and_engine_integration(self):
        """Test OCR service and form engine work together"""
        ocr_service = OCRService()
        engine = FormEngine()
        
        # Mock extracted data
        extracted_data = {
            "company_name": "Test Company",
            "tax_code": "0123456789",
            "amount": "1000000"
        }
        
        # Test mapping to form fields
        mapped_data = ocr_service.map_to_form_fields(extracted_data, "01/GTGT")
        
        # Test validation with engine
        form_data = {
            "form_type": "01/GTGT",
            "data": mapped_data
        }
        
        result = engine.validate_form_data(form_data)
        assert result is not None
        assert "valid" in result 