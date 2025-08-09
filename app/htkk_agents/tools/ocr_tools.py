"""
OCR-related tools for HTKK AI agents.
These tools handle PDF/XML document processing and data extraction.
"""
import json
import base64
from typing import Dict, Any, List, Optional

# Mock OCR service for now - will be replaced with actual implementation
class OCRService:
    def process_document(self, file_content, file_type):
        return {
            "extracted_data": {"mock": "data"},
            "file_hash": "mock_hash_123"
        }
    
    def extract_text_from_pdf(self, file_content):
        return "Mock extracted text from PDF"
    
    def map_to_form_fields(self, data, form_type):
        return {"mapped_field": "mock_value"}


def process_pdf_document(file_content_base64: str, file_name: str = "document.pdf") -> str:
    """Process PDF document and extract structured data.
    
    Args:
        file_content_base64 (str): Base64 encoded PDF file content
        file_name (str): Name of the file being processed
        
    Returns:
        str: JSON string containing extracted data
    """
    print(f"--- Tool: process_pdf_document called with file: {file_name} ---")
    
    try:
        # Decode base64 content
        file_content = base64.b64decode(file_content_base64)
        
        ocr_service = OCRService()
        result = ocr_service.process_document(file_content, "pdf")
        
        if result:
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": "pdf",
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "message": f"PDF document processed successfully: {file_name}"
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": "Failed to process PDF document",
                "message": f"Could not extract data from {file_name}"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error processing PDF document: {file_name}"
        }, ensure_ascii=False)


def process_xml_document(xml_content: str, file_name: str = "document.xml") -> str:
    """Process XML document and extract structured data.
    
    Args:
        xml_content (str): XML content as string
        file_name (str): Name of the file being processed
        
    Returns:
        str: JSON string containing extracted data
    """
    print(f"--- Tool: process_xml_document called with file: {file_name} ---")
    
    try:
        ocr_service = OCRService()
        result = ocr_service.process_document(xml_content.encode(), "xml")
        
        if result:
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": "xml",
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "message": f"XML document processed successfully: {file_name}"
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": "Failed to process XML document",
                "message": f"Could not extract data from {file_name}"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error processing XML document: {file_name}"
        }, ensure_ascii=False)


def extract_text_from_pdf(file_content_base64: str) -> str:
    """Extract raw text from PDF document.
    
    Args:
        file_content_base64 (str): Base64 encoded PDF file content
        
    Returns:
        str: JSON string containing extracted text
    """
    print("--- Tool: extract_text_from_pdf called ---")
    
    try:
        # Decode base64 content
        file_content = base64.b64decode(file_content_base64)
        
        ocr_service = OCRService()
        extracted_text = ocr_service.extract_text_from_pdf(file_content)
        
        if extracted_text:
            return json.dumps({
                "success": True,
                "extracted_text": extracted_text,
                "message": "Text extracted successfully from PDF"
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": "Failed to extract text from PDF",
                "message": "No text could be extracted"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error extracting text from PDF"
        }, ensure_ascii=False)


def map_extracted_data_to_form(extracted_data: str, form_type: str) -> str:
    """Map extracted document data to HTKK form fields.
    
    Args:
        extracted_data (str): JSON string of extracted data
        form_type (str): Target HTKK form type
        
    Returns:
        str: JSON string containing mapped form data
    """
    print(f"--- Tool: map_extracted_data_to_form called for form: {form_type} ---")
    
    try:
        data = json.loads(extracted_data)
        
        ocr_service = OCRService()
        mapped_data = ocr_service.map_to_form_fields(data, form_type)
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "original_data": data,
            "mapped_data": mapped_data,
            "message": f"Data mapped successfully to {form_type} form"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format in extracted_data",
            "message": "Please provide valid JSON data"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error mapping data to {form_type} form"
        }, ensure_ascii=False)


def process_invoice_batch(invoices_data: str) -> str:
    """Process multiple invoices in batch.
    
    Args:
        invoices_data (str): JSON string containing array of invoice data
        
    Returns:
        str: JSON string containing batch processing results
    """
    print("--- Tool: process_invoice_batch called ---")
    
    try:
        invoices = json.loads(invoices_data)
        
        if not isinstance(invoices, list):
            return json.dumps({
                "success": False,
                "error": "Invalid input format",
                "message": "Expected array of invoice data"
            }, ensure_ascii=False)
        
        ocr_service = OCRService()
        
        # Convert to format expected by OCR service
        invoice_list = []
        for i, invoice in enumerate(invoices):
            if "file_content_base64" in invoice:
                file_content = base64.b64decode(invoice["file_content_base64"])
                invoice_list.append({
                    "file_content": file_content,
                    "file_type": invoice.get("file_type", "pdf"),
                    "file_name": invoice.get("file_name", f"invoice_{i}")
                })
        
        # Process batch
        results = []
        for invoice in invoice_list:
            try:
                result = ocr_service.process_document(
                    invoice["file_content"], 
                    invoice["file_type"]
                )
                if result:
                    results.append({
                        "file_name": invoice["file_name"],
                        "success": True,
                        "extracted_data": result["extracted_data"],
                        "file_hash": result["file_hash"]
                    })
                else:
                    results.append({
                        "file_name": invoice["file_name"],
                        "success": False,
                        "error": "Failed to process document"
                    })
            except Exception as e:
                results.append({
                    "file_name": invoice["file_name"],
                    "success": False,
                    "error": str(e)
                })
        
        successful = sum(1 for r in results if r["success"])
        failed = len(results) - successful
        
        return json.dumps({
            "success": True,
            "total_processed": len(results),
            "successful": successful,
            "failed": failed,
            "results": results,
            "message": f"Batch processing completed: {successful} successful, {failed} failed"
        }, ensure_ascii=False)
        
    except json.JSONDecodeError:
        return json.dumps({
            "success": False,
            "error": "Invalid JSON format in invoices_data",
            "message": "Please provide valid JSON array"
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error processing invoice batch"
        }, ensure_ascii=False)


def get_cached_document_data(file_hash: str) -> str:
    """Retrieve cached document processing results.
    
    Args:
        file_hash (str): Hash of the processed document
        
    Returns:
        str: JSON string containing cached data or error
    """
    print(f"--- Tool: get_cached_document_data called with hash: {file_hash} ---")
    
    try:
        # This would typically query the database for cached results
        # For now, return a placeholder response
        return json.dumps({
            "success": False,
            "error": "Document not found in cache",
            "message": f"No cached data found for hash: {file_hash}"
        }, ensure_ascii=False)
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error retrieving cached data for hash: {file_hash}"
        }, ensure_ascii=False) 