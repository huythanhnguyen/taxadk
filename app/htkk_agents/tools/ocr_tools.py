"""
OCR-related tools for HTKK AI agents.
These tools handle PDF/XML document processing and data extraction with LLM integration.
"""
import json
import base64
import hashlib
from typing import Dict, Any, List, Optional, Tuple

# Conditional import for PyMuPDF
try:
    import fitz  # PyMuPDF for PDF processing
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False
    print("Warning: PyMuPDF (fitz) not available. PDF processing will be limited.")

# Enhanced OCR service with LLM integration
class OCRService:
    def __init__(self):
        self.page_chunk_size = 2000  # Characters per chunk for LLM processing
        
    def process_document(self, file_content, file_type):
        """Process document and return structured data with LLM assistance"""
        try:
            if file_type.lower() == "pdf":
                if not FITZ_AVAILABLE:
                    return {
                        "extracted_data": {"error": "PyMuPDF not available for PDF processing"},
                        "file_hash": self._generate_hash(file_content)
                    }
                return self._process_pdf_with_llm(file_content)
            elif file_type.lower() == "xml":
                return self._process_xml_with_llm(file_content)
            else:
                return {
                    "extracted_data": {"error": "Unsupported file type"},
                    "file_hash": self._generate_hash(file_content)
                }
        except Exception as e:
            return {
                "extracted_data": {"error": str(e)},
                "file_hash": self._generate_hash(file_content)
            }
    
    def _process_pdf_with_llm(self, file_content):
        """Process PDF with intelligent page chunking for LLM"""
        if not FITZ_AVAILABLE:
            return {
                "extracted_data": {"error": "PyMuPDF not available for PDF processing"},
                "file_hash": self._generate_hash(file_content)
            }
            
        try:
            # Open PDF with PyMuPDF
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            total_pages = len(pdf_doc)
            
            # Extract text from each page
            page_texts = []
            for page_num in range(total_pages):
                page = pdf_doc[page_num]
                text = page.get_text()
                page_texts.append({
                    "page": page_num + 1,
                    "text": text,
                    "length": len(text)
                })
            
            pdf_doc.close()
            
            # Create chunks for LLM processing
            chunks = self._create_intelligent_chunks(page_texts)
            
            return {
                "extracted_data": {
                    "document_type": "pdf",
                    "total_pages": total_pages,
                    "page_chunks": chunks,
                    "total_text_length": sum(len(p["text"]) for p in page_texts),
                    "chunk_count": len(chunks)
                },
                "file_hash": self._generate_hash(file_content),
                "processing_metadata": {
                    "chunk_size": self.page_chunk_size,
                    "chunking_strategy": "intelligent_page_boundary"
                }
            }
            
        except Exception as e:
            return {
                "extracted_data": {"error": f"PDF processing failed: {str(e)}"},
                "file_hash": self._generate_hash(file_content)
            }
    
    def _process_xml_with_llm(self, file_content):
        """Process XML with LLM-friendly structure"""
        try:
            import xml.etree.ElementTree as ET
            
            # Parse XML
            if isinstance(file_content, bytes):
                xml_content = file_content.decode('utf-8')
            else:
                xml_content = str(file_content)
            
            # Basic XML parsing for structure
            root = ET.fromstring(xml_content)
            
            # Extract key elements for LLM processing
            xml_structure = self._extract_xml_structure(root)
            
            return {
                "extracted_data": {
                    "document_type": "xml",
                    "root_tag": root.tag,
                    "structure": xml_structure,
                    "content_preview": xml_content[:1000] + "..." if len(xml_content) > 1000 else xml_content
                },
                "file_hash": self._generate_hash(file_content)
            }
            
        except Exception as e:
            return {
                "extracted_data": {"error": f"XML processing failed: {str(e)}"},
                "file_hash": self._generate_hash(file_content)
            }
    
    def _create_intelligent_chunks(self, page_texts: List[Dict]) -> List[Dict]:
        """Create intelligent chunks for LLM processing"""
        chunks = []
        current_chunk = {"text": "", "pages": [], "length": 0}
        
        for page_info in page_texts:
            page_text = page_info["text"]
            page_num = page_info["page"]
            
            # If adding this page would exceed chunk size, start new chunk
            if current_chunk["length"] + len(page_text) > self.page_chunk_size and current_chunk["text"]:
                chunks.append(current_chunk)
                current_chunk = {"text": "", "pages": [], "length": 0}
            
            # Add page to current chunk
            if current_chunk["text"]:
                current_chunk["text"] += "\n\n--- Page Break ---\n\n"
            current_chunk["text"] += f"PAGE {page_num}:\n{page_text}"
            current_chunk["pages"].append(page_num)
            current_chunk["length"] = len(current_chunk["text"])
        
        # Add final chunk if it has content
        if current_chunk["text"]:
            chunks.append(current_chunk)
        
        return chunks
    
    def _extract_xml_structure(self, element, max_depth=3, current_depth=0):
        """Extract XML structure for LLM processing"""
        if current_depth >= max_depth:
            return {"type": "element", "tag": element.tag, "depth": current_depth}
        
        structure = {
            "type": "element",
            "tag": element.tag,
            "attributes": dict(element.attrib),
            "children": []
        }
        
        for child in element:
            child_structure = self._extract_xml_structure(child, max_depth, current_depth + 1)
            structure["children"].append(child_structure)
        
        return structure
    
    def _generate_hash(self, content):
        """Generate hash for content"""
        return hashlib.md5(content).hexdigest()
    
    def extract_text_from_pdf(self, file_content):
        """Extract raw text from PDF with page information"""
        if not FITZ_AVAILABLE:
            return {"error": "PyMuPDF not available for PDF text extraction"}
            
        try:
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            pages = []
            
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                text = page.get_text()
                pages.append({
                    "page": page_num + 1,
                    "text": text,
                    "length": len(text)
                })
            
            pdf_doc.close()
            
            return {
                "total_pages": len(pages),
                "pages": pages,
                "total_text": "\n\n".join([f"PAGE {p['page']}:\n{p['text']}" for p in pages])
            }
            
        except Exception as e:
            return {"error": f"Text extraction failed: {str(e)}"}
    
    def map_to_form_fields(self, data, form_type):
        """Map extracted data to form fields with LLM assistance"""
        # This will be enhanced with actual LLM calls
        return {"mapped_field": "mock_value", "form_type": form_type}


def analyze_document_structure(file_content_base64: str, file_name: str = "document.pdf") -> str:
    """Analyze document structure to determine form types and required fields.
    
    Args:
        file_content_base64 (str): Base64 encoded file content
        file_name (str): Name of the file being analyzed
        
    Returns:
        str: JSON string containing document analysis and form recommendations
    """
    print(f"--- Tool: analyze_document_structure called for file: {file_name} ---")
    
    try:
        file_content = base64.b64decode(file_content_base64)
        
        # Determine file type from extension
        file_type = file_name.lower().split('.')[-1] if '.' in file_name else "unknown"
        
        if file_type == "pdf":
            if not FITZ_AVAILABLE:
                return json.dumps({
                    "success": False,
                    "error": "PyMuPDF not available for PDF analysis",
                    "message": f"Cannot analyze PDF {file_name} - PyMuPDF dependency missing"
                }, ensure_ascii=False)
                
            # Analyze PDF structure
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            total_pages = len(pdf_doc)
            
            # Sample first few pages for content analysis
            sample_pages = min(3, total_pages)
            sample_texts = []
            
            for i in range(sample_pages):
                page = pdf_doc[i]
                text = page.get_text()
                sample_texts.append(text[:500])  # First 500 chars per page
            
            pdf_doc.close()
            
            # Analyze content patterns to suggest form types
            form_suggestions = _analyze_content_patterns(sample_texts)
            
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": "pdf",
                "total_pages": total_pages,
                "analysis": {
                    "content_patterns": form_suggestions,
                    "sample_texts": sample_texts,
                    "estimated_complexity": "high" if total_pages > 5 else "medium"
                },
                "form_recommendations": form_suggestions,
                "processing_strategy": {
                    "chunking": "intelligent_page_boundary",
                    "llm_processing": "multi_chunk_sequential",
                    "estimated_chunks": max(1, total_pages // 2)
                },
                "message": f"PDF analysis completed: {total_pages} pages, {len(form_suggestions)} form types suggested"
            }, ensure_ascii=False)
            
        elif file_type == "xml":
            # Analyze XML structure
            try:
                import xml.etree.ElementTree as ET
                xml_content = file_content.decode('utf-8')
                root = ET.fromstring(xml_content)
                
                xml_analysis = {
                    "root_tag": root.tag,
                    "total_elements": len(list(root.iter())),
                    "depth": _get_xml_depth(root),
                    "suggested_forms": _analyze_xml_patterns(root)
                }
                
                return json.dumps({
                    "success": True,
                    "file_name": file_name,
                    "file_type": "xml",
                    "analysis": xml_analysis,
                    "form_recommendations": xml_analysis["suggested_forms"],
                    "processing_strategy": {
                        "chunking": "xml_structure_based",
                        "llm_processing": "single_chunk_structured"
                    },
                    "message": f"XML analysis completed: {xml_analysis['total_elements']} elements"
                }, ensure_ascii=False)
                
            except Exception as e:
                return json.dumps({
                    "success": False,
                    "error": f"XML parsing failed: {str(e)}",
                    "message": f"Could not analyze XML structure for {file_name}"
                }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": "Unsupported file type",
                "message": f"File type '{file_type}' not supported for analysis"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error analyzing document structure: {file_name}"
        }, ensure_ascii=False)


def process_pdf_document(file_content_base64: str, file_name: str = "document.pdf") -> str:
    """Process PDF document and extract structured data with intelligent chunking.
    
    Args:
        file_content_base64 (str): Base64 encoded PDF file content
        file_name (str): Name of the file being processed
        
    Returns:
        str: JSON string containing extracted data and processing metadata
    """
    print(f"--- Tool: process_pdf_document called with file: {file_name} ---")
    
    try:
        # Decode base64 content
        file_content = base64.b64decode(file_content_base64)
        
        ocr_service = OCRService()
        result = ocr_service.process_document(file_content, "pdf")
        
        if result and "error" not in result["extracted_data"]:
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": "pdf",
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "processing_metadata": result.get("processing_metadata", {}),
                "message": f"PDF document processed successfully: {file_name}",
                "next_steps": [
                    "Use analyze_document_structure() to determine form types",
                    "Use map_extracted_data_to_form() to map data to specific forms",
                    "Consider using process_r2_document() for R2-stored files"
                ]
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": result.get("extracted_data", {}).get("error", "Failed to process PDF document"),
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
        
        if result and "error" not in result["extracted_data"]:
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": "xml",
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "message": f"XML document processed successfully: {file_name}",
                "next_steps": [
                    "Use analyze_document_structure() to determine form types",
                    "Use map_extracted_data_to_form() to map data to specific forms"
                ]
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": result.get("extracted_data", {}).get("error", "Failed to process XML document"),
                "message": f"Could not extract data from {file_name}"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error processing XML document: {file_name}"
        }, ensure_ascii=False)


def extract_text_from_pdf(file_content_base64: str) -> str:
    """Extract raw text from PDF document with page information.
    
    Args:
        file_content_base64 (str): Base64 encoded PDF file content
        
    Returns:
        str: JSON string containing extracted text and page structure
    """
    print("--- Tool: extract_text_from_pdf called ---")
    
    try:
        # Decode base64 content
        file_content = base64.b64decode(file_content_base64)
        
        ocr_service = OCRService()
        extracted_data = ocr_service.extract_text_from_pdf(file_content)
        
        if "error" not in extracted_data:
            return json.dumps({
                "success": True,
                "extracted_data": extracted_data,
                "message": "Text extracted successfully from PDF",
                "processing_info": {
                    "total_pages": extracted_data["total_pages"],
                    "total_text_length": len(extracted_data["total_text"]),
                    "chunking_recommended": extracted_data["total_pages"] > 3
                }
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": extracted_data["error"],
                "message": "No text could be extracted"
            }, ensure_ascii=False)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": "Error extracting text from PDF"
        }, ensure_ascii=False)


def map_extracted_data_to_form(extracted_data: str, form_type: str) -> str:
    """Map extracted document data to HTKK form fields with LLM assistance.
    
    Args:
        extracted_data (str): JSON string of extracted data
        form_type (str): Target HTKK form type
        
    Returns:
        str: JSON string containing mapped form data
    """
    print(f"--- Tool: map_extracted_data_to_form called for form: {form_type} ---")
    
    try:
        data = json.loads(extracted_data)
        
        # Enhanced mapping logic with form type detection
        mapped_data = _enhanced_form_mapping(data, form_type)
        
        return json.dumps({
            "success": True,
            "form_type": form_type,
            "original_data": data,
            "mapped_data": mapped_data,
            "mapping_quality": _assess_mapping_quality(mapped_data),
            "message": f"Data mapped successfully to {form_type} form",
            "next_steps": [
                "Use export_form_to_xml() to generate XML output",
                "Review mapped fields for accuracy",
                "Consider using form validation tools"
            ]
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
    """Process multiple invoices in batch with enhanced error handling.
    
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
        
        # Process batch with enhanced error handling
        results = []
        for invoice in invoice_list:
            try:
                result = ocr_service.process_document(
                    invoice["file_content"], 
                    invoice["file_type"]
                )
                if result and "error" not in result["extracted_data"]:
                    results.append({
                        "file_name": invoice["file_name"],
                        "success": True,
                        "extracted_data": result["extracted_data"],
                        "file_hash": result["file_hash"],
                        "processing_metadata": result.get("processing_metadata", {})
                    })
                else:
                    results.append({
                        "file_name": invoice["file_name"],
                        "success": False,
                        "error": result.get("extracted_data", {}).get("error", "Failed to process document")
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
            "batch_metadata": {
                "processing_strategy": "parallel_with_error_isolation",
                "quality_metrics": {
                    "success_rate": successful / len(results) if results else 0,
                    "average_pages_per_document": _calculate_avg_pages(results)
                }
            },
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
            "message": f"No cached data found for hash: {file_hash}",
            "cache_info": {
                "cache_status": "not_found",
                "suggested_actions": [
                    "Process document again with process_pdf_document() or process_xml_document()",
                    "Check if file_hash is correct",
                    "Consider using analyze_document_structure() for fresh analysis"
                ]
            }
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error retrieving cached data for hash: {file_hash}"
        }, ensure_ascii=False)


def process_r2_document(file_url: str, file_type: str = "pdf", file_name: str = "r2_document") -> str:
    """Process a document stored on Cloudflare R2 via its accessible URL.
    
    Args:
        file_url (str): Public or signed URL to the file in R2
        file_type (str): Detected/declared file type, e.g. "pdf" or "xml"
        file_name (str): Optional logical file name for logging
        
    Returns:
        str: JSON string with extracted_data and file_hash
    """
    print(f"--- Tool: process_r2_document called with url: {file_url} type: {file_type} ---")
    try:
        import requests
        resp = requests.get(file_url, timeout=15)
        resp.raise_for_status()
        file_content = resp.content

        ocr_service = OCRService()
        result = ocr_service.process_document(file_content, file_type.lower())

        if result and "error" not in result["extracted_data"]:
            return json.dumps({
                "success": True,
                "file_name": file_name,
                "file_type": file_type.lower(),
                "source": "r2",
                "file_url": file_url,
                "extracted_data": result["extracted_data"],
                "file_hash": result["file_hash"],
                "processing_metadata": result.get("processing_metadata", {}),
                "message": f"R2 document processed successfully: {file_name}",
                "next_steps": [
                    "Use analyze_document_structure() to determine form types",
                    "Use map_extracted_data_to_form() to map data to specific forms"
                ]
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": result.get("extracted_data", {}).get("error", "Failed to process R2 document"),
                "message": f"Could not extract data from {file_name}"
            }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "message": f"Error processing R2 document: {file_name}"
        }, ensure_ascii=False)


# Helper functions for enhanced functionality
def _analyze_content_patterns(texts: List[str]) -> List[Dict]:
    """Analyze text patterns to suggest form types"""
    suggestions = []
    
    # Simple pattern matching for common tax document types
    for text in texts:
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ["hóa đơn", "invoice", "vat", "gtgt"]):
            suggestions.append({
                "form_type": "01/GTGT",
                "confidence": "high",
                "reason": "Contains invoice/VAT keywords",
                "fields": ["invoice_number", "total_amount", "vat_amount", "tax_code"]
            })
        
        if any(keyword in text_lower for keyword in ["thu nhập", "income", "tncn"]):
            suggestions.append({
                "form_type": "02/TNCN", 
                "confidence": "medium",
                "reason": "Contains income-related keywords",
                "fields": ["total_income", "withheld_tax", "taxable_income"]
            })
        
        if any(keyword in text_lower for keyword in ["lợi nhuận", "profit", "tndn"]):
            suggestions.append({
                "form_type": "03/TNDN",
                "confidence": "medium", 
                "reason": "Contains profit/corporate tax keywords",
                "fields": ["taxable_profit", "corporate_tax", "revenue"]
            })
    
    # Remove duplicates and sort by confidence
    unique_suggestions = []
    seen_types = set()
    for suggestion in suggestions:
        if suggestion["form_type"] not in seen_types:
            unique_suggestions.append(suggestion)
            seen_types.add(suggestion["form_type"])
    
    return sorted(unique_suggestions, key=lambda x: x["confidence"], reverse=True)


def _analyze_xml_patterns(root) -> List[Dict]:
    """Analyze XML structure to suggest form types"""
    suggestions = []
    
    # Analyze XML tags and structure
    tag_counts = {}
    for elem in root.iter():
        tag = elem.tag
        tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Pattern matching based on XML structure
    if "invoice" in tag_counts or "hoaDon" in tag_counts:
        suggestions.append({
            "form_type": "01/GTGT",
            "confidence": "high",
            "reason": "XML contains invoice-related tags",
            "fields": ["invoice_number", "total_amount", "vat_amount"]
        })
    
    if "income" in tag_counts or "thuNhap" in tag_counts:
        suggestions.append({
            "form_type": "02/TNCN",
            "confidence": "medium", 
            "reason": "XML contains income-related tags",
            "fields": ["total_income", "withheld_tax"]
        })
    
    return suggestions


def _get_xml_depth(element, current_depth=0):
    """Calculate XML depth"""
    if not list(element):
        return current_depth
    return max(_get_xml_depth(child, current_depth + 1) for child in element)


def _enhanced_form_mapping(data: Dict, form_type: str) -> Dict:
    """Enhanced mapping with form type specific logic"""
    mapped_data = {
        "form_type": form_type,
        "mapped_fields": {},
        "unmapped_fields": [],
        "mapping_confidence": "medium"
    }
    
    # Extract text content for analysis
    text_content = ""
    if "extracted_data" in data:
        extracted = data["extracted_data"]
        if "page_chunks" in extracted:
            text_content = " ".join([chunk["text"] for chunk in extracted["page_chunks"]])
        elif "total_text" in extracted:
            text_content = extracted["total_text"]
        elif "content_preview" in extracted:
            text_content = extracted["content_preview"]
    
    # Form-specific mapping logic
    if "01/GTGT" in form_type:
        mapped_data["mapped_fields"] = _map_vat_form_fields(text_content)
    elif "02/TNCN" in form_type:
        mapped_data["mapped_fields"] = _map_income_form_fields(text_content)
    elif "03/TNDN" in form_type:
        mapped_data["mapped_fields"] = _map_corporate_form_fields(text_content)
    
    return mapped_data


def _map_vat_form_fields(text: str) -> Dict:
    """Map text to VAT form fields"""
    fields = {}
    text_lower = text.lower()
    
    # Simple pattern matching (would be enhanced with LLM)
    if "hóa đơn" in text_lower or "invoice" in text_lower:
        fields["document_type"] = "invoice"
    
    # Extract amounts (simplified)
    import re
    amount_patterns = [
        r"(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",
        r"(\d+(?:\.\d{2})?)"
    ]
    
    for pattern in amount_patterns:
        matches = re.findall(pattern, text)
        if matches:
            fields["total_amount"] = matches[0]
            break
    
    return fields


def _map_income_form_fields(text: str) -> Dict:
    """Map text to income tax form fields"""
    fields = {}
    text_lower = text.lower()
    
    if "thu nhập" in text_lower or "income" in text_lower:
        fields["document_type"] = "income_statement"
    
    return fields


def _map_corporate_form_fields(text: str) -> Dict:
    """Map text to corporate tax form fields"""
    fields = {}
    text_lower = text.lower()
    
    if "lợi nhuận" in text_lower or "profit" in text_lower:
        fields["document_type"] = "profit_statement"
    
    return fields


def _assess_mapping_quality(mapped_data: Dict) -> str:
    """Assess the quality of mapped data"""
    if not mapped_data.get("mapped_fields"):
        return "poor"
    
    field_count = len(mapped_data["mapped_fields"])
    if field_count > 5:
        return "excellent"
    elif field_count > 3:
        return "good"
    elif field_count > 1:
        return "fair"
    else:
        return "poor"


def _calculate_avg_pages(results: List[Dict]) -> float:
    """Calculate average pages per document in batch results"""
    total_pages = 0
    doc_count = 0
    
    for result in results:
        if result.get("success") and "extracted_data" in result:
            extracted = result["extracted_data"]
            if "total_pages" in extracted:
                total_pages += extracted["total_pages"]
                doc_count += 1
    
    return total_pages / doc_count if doc_count > 0 else 0