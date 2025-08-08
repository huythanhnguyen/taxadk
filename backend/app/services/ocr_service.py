"""
OCR Service
Process PDF and XML documents to extract structured data
"""
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path
import re
import json

try:
    import PyPDF2
    import pdfplumber
except ImportError:
    PyPDF2 = None
    pdfplumber = None

logger = logging.getLogger(__name__)


class OCRService:
    """Service for processing documents and extracting structured data"""
    
    def __init__(self):
        # Common tax-related patterns for extraction
        self.tax_patterns = {
            "tax_code": r"MST[:\s]*(\d{10,13})",
            "business_name": r"Tên[:\s]*([^\n]+)",
            "address": r"Địa chỉ[:\s]*([^\n]+)",
            "revenue": r"Doanh thu[:\s]*([0-9,\.]+)",
            "vat_amount": r"Thuế GTGT[:\s]*([0-9,\.]+)",
            "total_amount": r"Tổng cộng[:\s]*([0-9,\.]+)",
            "invoice_number": r"Số hóa đơn[:\s]*([A-Z0-9\-]+)",
            "invoice_date": r"Ngày[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})"
        }
        
        # XML invoice field mappings
        self.xml_field_mappings = {
            "MST": "tax_code",
            "Ten": "business_name", 
            "DChi": "address",
            "SHDon": "invoice_number",
            "NLap": "invoice_date",
            "TTCKTMai": "total_amount",
            "TgTCThue": "vat_amount"
        }
    
    async def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF document and extract tax-related data"""
        try:
            if not PyPDF2 or not pdfplumber:
                raise ImportError("PDF processing libraries not installed")
            
            extracted_data = {
                "file_type": "pdf",
                "extraction_method": "ocr",
                "fields": {},
                "confidence_score": 0.0,
                "raw_text": "",
                "processing_status": "completed"
            }
            
            # Extract text using pdfplumber (better for structured data)
            with pdfplumber.open(file_path) as pdf:
                full_text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
                
                extracted_data["raw_text"] = full_text
                
                # Extract structured data using patterns
                extracted_fields = await self._extract_fields_from_text(full_text)
                extracted_data["fields"] = extracted_fields
                
                # Calculate confidence score
                extracted_data["confidence_score"] = self._calculate_confidence_score(
                    extracted_fields, full_text
                )
                
                # Extract tables if present
                tables = await self._extract_tables_from_pdf(pdf)
                if tables:
                    extracted_data["tables"] = tables
            
            logger.info(f"PDF processing completed: {file_path}")
            return extracted_data
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            return {
                "file_type": "pdf",
                "processing_status": "failed",
                "error": str(e),
                "fields": {},
                "confidence_score": 0.0
            }
    
    async def process_xml(self, file_path: str) -> Dict[str, Any]:
        """Process XML invoice and extract structured data"""
        try:
            extracted_data = {
                "file_type": "xml",
                "extraction_method": "xml_parsing",
                "fields": {},
                "confidence_score": 1.0,  # XML parsing is deterministic
                "processing_status": "completed"
            }
            
            # Parse XML
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Extract fields based on XML structure
            extracted_fields = await self._extract_fields_from_xml(root)
            extracted_data["fields"] = extracted_fields
            
            # Extract invoice items if present
            items = await self._extract_invoice_items_from_xml(root)
            if items:
                extracted_data["invoice_items"] = items
            
            logger.info(f"XML processing completed: {file_path}")
            return extracted_data
            
        except Exception as e:
            logger.error(f"XML processing failed: {e}")
            return {
                "file_type": "xml",
                "processing_status": "failed",
                "error": str(e),
                "fields": {},
                "confidence_score": 0.0
            }
    
    async def _extract_fields_from_text(self, text: str) -> Dict[str, Any]:
        """Extract structured fields from text using regex patterns"""
        fields = {}
        
        for field_name, pattern in self.tax_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            if matches:
                # Take the first match and clean it
                value = matches[0].strip()
                
                # Clean numeric values
                if field_name in ["revenue", "vat_amount", "total_amount"]:
                    value = self._clean_numeric_value(value)
                
                fields[field_name] = value
        
        return fields
    
    async def _extract_fields_from_xml(self, root: ET.Element) -> Dict[str, Any]:
        """Extract fields from XML structure"""
        fields = {}
        
        # Common XML invoice structures
        for element in root.iter():
            tag = element.tag
            text = element.text
            
            if text and text.strip():
                # Map XML tags to standard field names
                if tag in self.xml_field_mappings:
                    field_name = self.xml_field_mappings[tag]
                    
                    # Clean numeric values
                    if field_name in ["total_amount", "vat_amount", "revenue"]:
                        text = self._clean_numeric_value(text)
                    
                    fields[field_name] = text.strip()
                
                # Also store original XML field names
                fields[f"xml_{tag}"] = text.strip()
        
        return fields
    
    async def _extract_tables_from_pdf(self, pdf) -> List[Dict[str, Any]]:
        """Extract table data from PDF"""
        tables = []
        
        try:
            for page_num, page in enumerate(pdf.pages):
                page_tables = page.extract_tables()
                
                for table_num, table in enumerate(page_tables):
                    if table and len(table) > 1:  # Has header and data
                        # Convert table to structured format
                        headers = table[0] if table[0] else []
                        rows = table[1:] if len(table) > 1 else []
                        
                        structured_table = {
                            "page": page_num + 1,
                            "table_index": table_num,
                            "headers": headers,
                            "rows": rows,
                            "row_count": len(rows)
                        }
                        
                        tables.append(structured_table)
        
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}")
        
        return tables
    
    async def _extract_invoice_items_from_xml(self, root: ET.Element) -> List[Dict[str, Any]]:
        """Extract invoice line items from XML"""
        items = []
        
        # Common XML structures for invoice items
        item_paths = [
            ".//HHDVu",  # Hàng hóa dịch vụ
            ".//CTiet",  # Chi tiết
            ".//Item",   # Generic item
            ".//Product" # Product
        ]
        
        for path in item_paths:
            elements = root.findall(path)
            
            for element in elements:
                item = {}
                
                # Extract common item fields
                for child in element:
                    tag = child.tag
                    text = child.text
                    
                    if text and text.strip():
                        # Map common item fields
                        field_mappings = {
                            "Ten": "name",
                            "DVTinh": "unit",
                            "SLuong": "quantity", 
                            "DGia": "unit_price",
                            "ThTien": "amount",
                            "TSuat": "tax_rate",
                            "TThue": "tax_amount"
                        }
                        
                        if tag in field_mappings:
                            field_name = field_mappings[tag]
                            
                            # Clean numeric values
                            if field_name in ["quantity", "unit_price", "amount", "tax_rate", "tax_amount"]:
                                text = self._clean_numeric_value(text)
                            
                            item[field_name] = text.strip()
                
                if item:  # Only add if we extracted some data
                    items.append(item)
        
        return items
    
    def _clean_numeric_value(self, value: str) -> str:
        """Clean numeric value by removing formatting"""
        if not value:
            return "0"
        
        # Remove common formatting
        cleaned = re.sub(r'[^\d\.,\-]', '', str(value))
        
        # Handle Vietnamese number formatting (comma as thousand separator)
        if ',' in cleaned and '.' in cleaned:
            # Assume comma is thousand separator, dot is decimal
            cleaned = cleaned.replace(',', '')
        elif ',' in cleaned:
            # Could be decimal separator in Vietnamese format
            parts = cleaned.split(',')
            if len(parts) == 2 and len(parts[1]) <= 2:
                # Likely decimal separator
                cleaned = cleaned.replace(',', '.')
            else:
                # Likely thousand separator
                cleaned = cleaned.replace(',', '')
        
        return cleaned
    
    def _calculate_confidence_score(self, fields: Dict[str, Any], text: str) -> float:
        """Calculate confidence score based on extracted fields"""
        if not fields:
            return 0.0
        
        # Base score
        score = 0.0
        max_score = 0.0
        
        # Score based on critical fields found
        critical_fields = ["tax_code", "business_name", "total_amount"]
        for field in critical_fields:
            max_score += 0.3
            if field in fields and fields[field]:
                score += 0.3
        
        # Score based on additional fields
        additional_fields = ["address", "invoice_number", "invoice_date", "vat_amount"]
        for field in additional_fields:
            max_score += 0.1
            if field in fields and fields[field]:
                score += 0.1
        
        # Normalize score
        if max_score > 0:
            score = min(score / max_score, 1.0)
        
        return round(score, 2)
    
    async def map_to_form_fields(
        self, 
        extracted_data: Dict[str, Any], 
        form_id: str
    ) -> Dict[str, Any]:
        """Map extracted data to specific form fields"""
        fields = extracted_data.get("fields", {})
        mapped_fields = {}
        
        # Form-specific mappings
        if form_id.startswith("01") or form_id.startswith("D1"):  # VAT forms
            mapped_fields.update(await self._map_to_vat_form(fields))
        elif form_id.startswith("03"):  # Corporate tax forms
            mapped_fields.update(await self._map_to_corporate_form(fields))
        
        # Common mappings
        if "tax_code" in fields:
            mapped_fields["P_4"] = fields["tax_code"]  # Common tax code field
        
        if "business_name" in fields:
            mapped_fields["P_1"] = fields["business_name"]  # Common business name field
        
        return {
            "form_id": form_id,
            "mapped_fields": mapped_fields,
            "original_fields": fields,
            "mapping_confidence": self._calculate_mapping_confidence(mapped_fields, fields)
        }
    
    async def _map_to_vat_form(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Map extracted data to VAT form fields"""
        mapped = {}
        
        # Map revenue to VAT form fields
        if "total_amount" in fields:
            try:
                amount = float(fields["total_amount"])
                # Assume 10% VAT rate for mapping
                mapped["ct32"] = amount  # Revenue subject to 10% VAT
                mapped["ct33"] = amount * 0.1  # VAT amount at 10%
            except (ValueError, TypeError):
                pass
        
        if "vat_amount" in fields:
            mapped["ct28"] = fields["vat_amount"]  # Total output VAT
        
        return mapped
    
    async def _map_to_corporate_form(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Map extracted data to corporate tax form fields"""
        mapped = {}
        
        if "total_amount" in fields:
            mapped["revenue"] = fields["total_amount"]
        
        return mapped
    
    def _calculate_mapping_confidence(
        self, 
        mapped_fields: Dict[str, Any], 
        original_fields: Dict[str, Any]
    ) -> float:
        """Calculate confidence score for field mapping"""
        if not original_fields:
            return 0.0
        
        mapped_count = len(mapped_fields)
        total_count = len(original_fields)
        
        return min(mapped_count / max(total_count, 1), 1.0) 