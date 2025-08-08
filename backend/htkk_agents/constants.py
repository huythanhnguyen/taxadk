"""
Constants for the HTKK AI multi-agent system.
"""

# Define model constants for Google ADK
MODEL_GEMINI_2_5_FLASH = "gemini-2.5-flash"
MODEL_GEMINI_2_0_FLASH = "gemini-2.0-flash"
MODEL_GEMINI_PRO = "gemini-2.0-pro"

# HTKK specific constants
HTKK_FORM_TYPES = {
    "01/GTGT": "VAT Declaration",
    "02/TNCN": "Personal Income Tax", 
    "03/TNDN": "Corporate Tax",
    "04/TTDB": "Special Consumption Tax",
    "05/TNMT": "Environmental Tax"
}

# Tax rates
TAX_RATES = {
    "vat": {"standard": 10, "reduced": 5, "zero": 0},
    "corporate": {"standard": 20, "small_business": 17, "high_tech": 15},
    "personal": {
        "rates": [5, 10, 15, 20, 25, 30, 35],
        "thresholds": [5000000, 10000000, 18000000, 32000000, 52000000, 80000000]
    }
}

# Control types mapping from HTKK
CONTROL_TYPES = {
    0: 'text',           # Text input
    2: 'checkbox',       # Boolean checkbox
    6: 'dropdown',       # Dependent dropdown
    14: 'date',          # Date picker
    16: 'number',        # Numeric input
    26: 'hidden',        # Hidden field
    100: 'dropdown',     # Province dropdown
    101: 'dropdown'      # Ward dropdown (dependent)
} 