"""
OCR agent for handling document processing and data extraction.
"""

from google.adk.agents import Agent

from ..constants import MODEL_GEMINI_2_5_FLASH_LITE
from ..tools.ocr_tools import (
    process_pdf_document,
    process_xml_document,
    extract_text_from_pdf,
    map_extracted_data_to_form,
    process_invoice_batch,
    get_cached_document_data,
    process_r2_document,
    analyze_document_structure
)
from ..tools.form_tools import (
    export_form_to_xml,
)
from .ocr_prompts import OCR_AGENT_INSTRUCTION, OCR_AGENT_DESCRIPTION

# Initialize the OCR Agent
ocr_agent = Agent(
    name="ocr_agent",
    model=MODEL_GEMINI_2_5_FLASH_LITE,
    description=OCR_AGENT_DESCRIPTION,
    instruction=OCR_AGENT_INSTRUCTION,
    tools=[
        # Document analysis and structure detection
        analyze_document_structure,
        
        # Document processing tools
        process_pdf_document,
        process_xml_document,
        process_r2_document,
        
        # Text extraction and processing
        extract_text_from_pdf,
        
        # Data mapping and form generation
        map_extracted_data_to_form,
        export_form_to_xml,
        
        # Batch processing and caching
        process_invoice_batch,
        get_cached_document_data,
    ],
    output_key="last_ocr_response"
) 