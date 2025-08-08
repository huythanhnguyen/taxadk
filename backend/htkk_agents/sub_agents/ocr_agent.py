"""
OCR agent for handling document processing and data extraction.
"""

from google.adk.agents import Agent

from backend.htkk_agents.constants import MODEL_GEMINI_2_5_FLASH
from backend.htkk_agents.tools.ocr_tools import (
    process_pdf_document,
    process_xml_document,
    extract_text_from_pdf,
    map_extracted_data_to_form,
    process_invoice_batch,
    get_cached_document_data
)
from backend.htkk_agents.sub_agents.ocr_prompts import OCR_AGENT_INSTRUCTION, OCR_AGENT_DESCRIPTION

# Initialize the OCR Agent
ocr_agent = Agent(
    name="ocr_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    description=OCR_AGENT_DESCRIPTION,
    instruction=OCR_AGENT_INSTRUCTION,
    tools=[
        process_pdf_document,
        process_xml_document,
        extract_text_from_pdf,
        map_extracted_data_to_form,
        process_invoice_batch,
        get_cached_document_data
    ],
    output_key="last_ocr_response"
) 