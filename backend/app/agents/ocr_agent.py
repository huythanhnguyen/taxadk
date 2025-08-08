"""
OCR Agent - Handles document processing, OCR, and data extraction
"""
from typing import Dict, Any, List, Optional
import logging
from app.agents.base_agent import BaseAgent
from app.services.ocr_service import OCRService

logger = logging.getLogger(__name__)


class OCRAgent(BaseAgent):
    """
    OCR Agent for processing PDF/XML documents and extracting structured data
    """
    
    def __init__(self):
        super().__init__(
            agent_id="ocr_agent",
            name="OCR Agent",
            description="Handles document processing, OCR, and data extraction"
        )
        self.ocr_service = OCRService()
        self.processed_documents = {}
    
    async def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Validate input data for OCR operations
        """
        required_fields = ["action"]
        
        if not all(field in input_data for field in required_fields):
            logger.error(f"Missing required fields: {required_fields}")
            return False
        
        valid_actions = ["process_document", "extract_pdf", "extract_xml", "map_to_form", "get_cached_data"]
        if input_data["action"] not in valid_actions:
            logger.error(f"Invalid action: {input_data['action']}")
            return False
        
        return True
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process OCR-related requests
        """
        if not await self.validate_input(input_data):
            return {"error": "Invalid input data", "success": False}
        
        action = input_data["action"]
        
        try:
            if action == "process_document":
                return await self._process_document(input_data)
            elif action == "extract_pdf":
                return await self._extract_pdf(input_data)
            elif action == "extract_xml":
                return await self._extract_xml(input_data)
            elif action == "map_to_form":
                return await self._map_to_form(input_data)
            elif action == "get_cached_data":
                return await self._get_cached_data(input_data)
            else:
                return {"error": f"Unknown action: {action}", "success": False}
                
        except Exception as e:
            logger.error(f"Error processing OCR action {action}: {str(e)}")
            return {"error": str(e), "success": False}
    
    async def _process_document(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a document (PDF or XML) and extract structured data
        """
        file_content = input_data.get("file_content")
        file_type = input_data.get("file_type")
        file_name = input_data.get("file_name", "unknown")
        
        if not file_content or not file_type:
            return {"error": "file_content and file_type are required", "success": False}
        
        if file_type not in ["pdf", "xml"]:
            return {"error": "file_type must be 'pdf' or 'xml'", "success": False}
        
        # Process document
        result = self.ocr_service.process_document(file_content, file_type)
        
        if result:
            # Cache the result
            file_hash = result.get("file_hash")
            if file_hash:
                self.processed_documents[file_hash] = result
                self.update_memory(f"document_{file_hash}", result)
            
            return {
                "success": True,
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "file_type": file_type,
                "file_name": file_name,
                "message": f"Document processed successfully: {file_name}"
            }
        else:
            return {"error": "Failed to process document", "success": False}
    
    async def _extract_pdf(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract text from PDF document
        """
        file_content = input_data.get("file_content")
        
        if not file_content:
            return {"error": "file_content is required", "success": False}
        
        # Extract text from PDF
        extracted_text = self.ocr_service.extract_text_from_pdf(file_content)
        
        if extracted_text:
            return {
                "success": True,
                "extracted_text": extracted_text,
                "message": "PDF text extracted successfully"
            }
        else:
            return {"error": "Failed to extract text from PDF", "success": False}
    
    async def _extract_xml(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured data from XML document
        """
        xml_content = input_data.get("xml_content")
        
        if not xml_content:
            return {"error": "xml_content is required", "success": False}
        
        # Extract data from XML
        extracted_data = self.ocr_service.extract_data_from_xml(xml_content)
        
        if extracted_data:
            return {
                "success": True,
                "extracted_data": extracted_data,
                "message": "XML data extracted successfully"
            }
        else:
            return {"error": "Failed to extract data from XML", "success": False}
    
    async def _map_to_form(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map extracted data to form fields
        """
        extracted_data = input_data.get("extracted_data")
        form_type = input_data.get("form_type")
        
        if not extracted_data or not form_type:
            return {"error": "extracted_data and form_type are required", "success": False}
        
        # Map data to form fields
        mapped_data = self.ocr_service.map_to_form_fields(extracted_data, form_type)
        
        return {
            "success": True,
            "mapped_data": mapped_data,
            "form_type": form_type,
            "original_data": extracted_data,
            "message": f"Data mapped successfully to {form_type} form"
        }
    
    async def _get_cached_data(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get cached document data by file hash
        """
        file_hash = input_data.get("file_hash")
        
        if not file_hash:
            return {"error": "file_hash is required", "success": False}
        
        # Get cached data
        cached_data = self.processed_documents.get(file_hash) or self.get_memory(f"document_{file_hash}")
        
        if cached_data:
            return {
                "success": True,
                "cached_data": cached_data,
                "file_hash": file_hash,
                "message": "Cached data retrieved successfully"
            }
        else:
            return {"error": "No cached data found for the given file hash", "success": False}
    
    async def process_invoice_batch(self, invoices: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process multiple invoices in batch
        """
        results = []
        errors = []
        
        for i, invoice in enumerate(invoices):
            try:
                result = await self._process_document(invoice)
                if result["success"]:
                    results.append({
                        "index": i,
                        "file_name": invoice.get("file_name", f"invoice_{i}"),
                        "result": result
                    })
                else:
                    errors.append({
                        "index": i,
                        "file_name": invoice.get("file_name", f"invoice_{i}"),
                        "error": result["error"]
                    })
            except Exception as e:
                errors.append({
                    "index": i,
                    "file_name": invoice.get("file_name", f"invoice_{i}"),
                    "error": str(e)
                })
        
        return {
            "success": True,
            "processed_count": len(results),
            "error_count": len(errors),
            "results": results,
            "errors": errors,
            "message": f"Batch processing completed: {len(results)} successful, {len(errors)} errors"
        }
    
    async def get_processing_statistics(self) -> Dict[str, Any]:
        """
        Get OCR processing statistics
        """
        total_documents = len(self.processed_documents)
        memory_usage = len(self.memory)
        
        # Count by file type
        pdf_count = sum(1 for doc in self.processed_documents.values() 
                       if doc.get("file_type") == "pdf")
        xml_count = sum(1 for doc in self.processed_documents.values() 
                       if doc.get("file_type") == "xml")
        
        return {
            "total_documents_processed": total_documents,
            "pdf_documents": pdf_count,
            "xml_documents": xml_count,
            "memory_usage": memory_usage,
            "cache_size": len(self.processed_documents)
        }
    
    async def clear_cache(self) -> Dict[str, Any]:
        """
        Clear document processing cache
        """
        cache_size = len(self.processed_documents)
        self.processed_documents.clear()
        
        # Clear memory entries for documents
        memory_keys_to_remove = [key for key in self.memory.keys() if key.startswith("document_")]
        for key in memory_keys_to_remove:
            del self.memory[key]
        
        return {
            "success": True,
            "cleared_documents": cache_size,
            "message": f"Cache cleared: {cache_size} documents removed"
        }
    
    async def initialize(self) -> None:
        """
        Initialize OCR Agent
        """
        await super().initialize()
        logger.info("OCR Agent initialized and ready for document processing") 