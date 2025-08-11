/**
 * HTKK XML Schema Types
 * 
 * Complete type definitions for HTKK XML template structure
 * Based on analysis of official HTKK XML templates
 */

/**
 * HTKK Control Types mapping from XML templates
 */
export enum HTKKControlType {
  TEXT = 0,                         // Text input field
  CHECKBOX = 2,                     // Boolean checkbox
  DEPENDENT_DROPDOWN = 6,           // Dependent dropdown (child of another dropdown)
  DATE = 14,                        // Date picker
  NUMBER = 16,                      // Numeric input with min/max validation
  TAX_CODE = 26,                    // Tax code input with special validation
  PROVINCE_DROPDOWN = 100,          // Province/city dropdown
  WARD_DROPDOWN = 101,              // Ward/commune dropdown (dependent on province)
  COUNTRY_DROPDOWN = 56,            // Country selection dropdown
  HIDDEN = 999                      // Hidden field (not in original spec)
}

/**
 * Individual field definition in HTKK XML template
 */
export interface HTKKField {
  // Core identifiers
  cellId: string                    // Primary cell ID (e.g., "P_4", "Q_4")
  cellId2?: string                  // Secondary cell reference for reports
  path: string                      // XML path (e.g., "HSoThueDTu/HSoKhaiThue/CTieuTKhaiChinh/ma_NganhNghe")
  
  // Control configuration
  controlType: HTKKControlType      // Control type enum
  encode: boolean                   // Whether field data should be encoded
  
  // Value and defaults
  value: any                        // Current field value
  defaultValue?: any                // Default value when form loads
  
  // Validation constraints
  maxLen?: number                   // Maximum length for text fields
  minValue?: number | string        // Minimum value for numeric fields
  maxValue?: number | string        // Maximum value for numeric fields
  
  // UI and help
  helpContextId?: string            // Help context ID for documentation
  
  // Dropdown and dependency configuration
  selectedValue?: string            // Selected value cell ID for dropdowns
  parentCell?: string               // Parent cell ID for dependent fields
  childCell?: string                // Child cell ID for parent fields
  
  // Additional metadata
  statusId?: string                 // Status identifier
  tableTemplateRowStart?: number    // For table-based fields
  dataLocationTemplateRowStart?: number // Template row start position
}

/**
 * Location information for dynamic sections
 */
export interface HTKKSectionLocation {
  tableTemplateRowStart: number     // Template row start position
  tableReportRowStart: number       // Report row start position
  dataLocationTemplateRowStart: number // Data location template start
  dataLocationReportRowStart: number   // Data location report start
  dataLocationTaiBangKeRowStart: number // Tai bang ke row start (-1 if not used)
}

/**
 * Section definition in HTKK XML template
 */
export interface HTKKSection {
  // Section type and configuration
  dynamic: boolean                  // Static (false) or Dynamic (true)
  maxRows: number                   // Maximum rows (0 = unlimited)
  
  // Dynamic section specific
  tableName?: string                // Table name for dynamic sections
  tablePath?: string                // XML path for table data
  id?: string                       // Section ID
  iColumnSTT?: number               // STT column index
  iColumnSTTReport?: number         // STT column index for reports
  
  // Location information for dynamic sections
  location?: HTKKSectionLocation    // Row positioning information
  
  // Fields
  cells: HTKKField[]                // Static section fields
  rowInfo?: HTKKField[]             // Row template for dynamic sections
  rowData?: string                  // Row display template
}

/**
 * Complete HTKK form template
 */
export interface HTKKTemplate {
  // Template identification
  version: string                   // Template version (e.g., "480", "524")
  formCode: string                  // Form code (e.g., "01/GTGT", "03/TNDN")
  
  // Template structure
  sections: HTKKSection[]           // All form sections
  
  // Metadata
  metadata: {
    title: string                   // Human-readable form title
    description: string             // Form description
    lastUpdated: string             // Last update timestamp
    dtdPath?: string                // DTD schema path reference
    xmlNamespace?: string           // XML namespace if applicable
  }
}

/**
 * Form data structure for HTKK forms
 */
export interface HTKKFormData {
  // Form identification
  formCode: string                  // Form code
  templateVersion: string           // Template version used
  
  // Form data organized by XML path
  data: Record<string, any>         // Key-value pairs where key is XML path
  
  // Dynamic section data
  dynamicData: Record<string, any[]> // Dynamic section data by table path
  
  // Metadata
  metadata: {
    createdAt: string
    updatedAt: string
    status: 'draft' | 'completed' | 'submitted'
    userId?: string
    sessionId?: string
  }
}

/**
 * Field mapping result from AI processing
 */
export interface HTKKFieldMapping {
  // Source and target
  sourcePath: string                // Source data path
  targetPath: string                // Target HTKK XML path
  
  // Mapping details
  value: any                        // Mapped value
  confidence: number                // AI confidence score (0-1)
  transformation?: string           // Transformation applied
  
  // Validation
  isValid: boolean                  // Whether mapping is valid
  validationErrors: string[]        // Validation error messages
  
  // Metadata
  mappingReason: string             // Explanation of why this mapping was chosen
  alternativeMappings?: HTKKFieldMapping[] // Alternative mapping options
}

/**
 * Complete field mapping result
 */
export interface HTKKMappingResult {
  // Overall mapping info
  formCode: string                  // Target form code
  templateVersion: string           // Template version
  
  // Mappings
  fieldMappings: HTKKFieldMapping[] // Individual field mappings
  dynamicMappings: Record<string, HTKKFieldMapping[]> // Dynamic section mappings
  
  // Quality metrics
  overallConfidence: number         // Overall confidence score
  mappingQuality: 'high' | 'medium' | 'low' // Quality assessment
  
  // Issues and recommendations
  warnings: string[]                // Mapping warnings
  recommendations: string[]         // Improvement recommendations
  
  // Processing metadata
  processedAt: string               // Processing timestamp
  processingTime: number            // Processing time in milliseconds
  aiAgentsUsed: string[]            // List of AI agents involved
}

/**
 * Validation result for HTKK forms
 */
export interface HTKKValidationResult {
  // Overall validation status
  isValid: boolean                  // Whether form is valid
  
  // Field-level validation
  fieldErrors: Record<string, string[]> // Errors by field path
  fieldWarnings: Record<string, string[]> // Warnings by field path
  
  // Business rule validation
  businessRuleErrors: string[]      // Business rule violations
  crossFieldErrors: string[]        // Cross-field validation errors
  
  // Compliance validation
  complianceErrors: string[]        // HTKK compliance errors
  missingRequiredFields: string[]   // Required fields that are empty
  
  // Calculation validation
  calculationErrors: string[]       // Tax calculation errors
  
  // Summary
  errorCount: number                // Total error count
  warningCount: number              // Total warning count
  validationScore: number           // Validation score (0-100)
}

/**
 * HTKK XML export result
 */
export interface HTKKXMLExportResult {
  // Export status
  success: boolean                  // Whether export succeeded
  
  // Generated XML
  xmlContent: string                // Generated HTKK XML content
  xmlSize: number                   // XML file size in bytes
  
  // Validation
  isValidXML: boolean               // Whether XML is well-formed
  htkkCompliant: boolean            // Whether XML is HTKK compliant
  
  // Metadata
  exportedAt: string                // Export timestamp
  formCode: string                  // Form code
  templateVersion: string           // Template version
  
  // Issues
  errors: string[]                  // Export errors
  warnings: string[]                // Export warnings
}

/**
 * Privacy tier configuration
 */
export enum PrivacyTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Privacy configuration for document processing
 */
export interface PrivacyConfig {
  tier: PrivacyTier                 // Privacy tier level
  encryption: 'standard' | 'advanced' | 'enterprise' // Encryption level
  retention: '24h' | '1h' | 'immediate' // Data retention policy
  processing: 'cloud' | 'enhanced' | 'on-premises' // Processing location
  auditLevel: 'basic' | 'detailed' | 'full' // Audit logging level
  costPerForm: number               // Cost per form processing
  autoDelete: boolean               // Whether to auto-delete after processing
  deleteAfterSeconds: number        // Seconds until auto-deletion
}

/**
 * Document upload configuration
 */
export interface DocumentUploadConfig {
  maxFileSize: number               // Maximum file size in bytes
  allowedTypes: string[]            // Allowed MIME types
  encryptionKey?: string            // Encryption key for sensitive data
  autoDeleteAfter: number           // Auto-delete after N seconds
  processingPriority: 'normal' | 'high' | 'immediate' // Processing priority
  privacyTier: PrivacyTier          // Privacy tier for this upload
}

/**
 * AI processing configuration
 */
export interface AIProcessingConfig {
  // AI agents to use
  useOCRAgent: boolean              // Whether to use OCR agent
  useParserAgent: boolean           // Whether to use parser agent
  useValidationAgent: boolean       // Whether to use validation agent
  useMappingAgent: boolean          // Whether to use mapping agent
  
  // Processing options
  enhancedAccuracy: boolean         // Use enhanced accuracy mode
  multiLanguageOCR: boolean         // Enable multi-language OCR
  confidenceThreshold: number       // Minimum confidence threshold
  
  // Privacy and security
  isolatedProcessing: boolean       // Process in isolated containers
  memoryClearing: boolean           // Clear memory after processing
  auditLogging: boolean             // Enable audit logging
  
  // Cost optimization
  costOptimized: boolean            // Use cost-optimized processing
  maxProcessingTime: number         // Maximum processing time in seconds
}

/**
 * Business assessment result from AI consultation
 */
export interface BusinessAssessment {
  // Business identification
  businessType: 'individual' | 'company' | 'partnership' | 'other'
  industryCode?: string             // Industry classification code
  businessSize: 'micro' | 'small' | 'medium' | 'large'
  
  // Financial information
  estimatedRevenue?: number         // Annual revenue estimate
  employeeCount?: number            // Number of employees
  hasInternationalTrade: boolean    // Whether business has international trade
  
  // Tax obligations
  vatObligations: string[]          // VAT obligations
  corporateTaxObligations: string[] // Corporate tax obligations
  personalTaxObligations: string[]  // Personal tax obligations
  otherTaxObligations: string[]     // Other tax obligations
  
  // Compliance requirements
  requiredForms: string[]           // Required tax forms
  filingFrequency: Record<string, string> // Filing frequency by form
  nextDeadlines: Record<string, string>   // Next deadlines by form
  
  // Risk assessment
  complianceRisk: 'low' | 'medium' | 'high' // Compliance risk level
  riskFactors: string[]             // Risk factors identified
  
  // Recommendations
  priorityForms: string[]           // Priority forms to complete
  recommendations: string[]         // Business recommendations
  
  // Assessment metadata
  assessedAt: string                // Assessment timestamp
  confidence: number                // Assessment confidence (0-1)
  aiAgentUsed: string               // AI agent that performed assessment
}

/**
 * Form recommendation from AI consultation
 */
export interface FormRecommendation {
  // Form information
  formCode: string                  // Form code (e.g., "01/GTGT")
  formTitle: string                 // Human-readable form title
  priority: 'high' | 'medium' | 'low' // Priority level
  
  // Deadline information
  nextDeadline?: string             // Next filing deadline
  filingFrequency: string           // Filing frequency
  daysUntilDeadline?: number        // Days until next deadline
  
  // Requirements
  isRequired: boolean               // Whether form is required
  requirementReason: string         // Why this form is required
  
  // Complexity and effort
  complexityLevel: 'simple' | 'moderate' | 'complex' // Form complexity
  estimatedTimeMinutes: number      // Estimated completion time
  requiredDocuments: string[]       // Required supporting documents
  
  // Cost and benefits
  estimatedCost: number             // Estimated processing cost
  potentialSavings?: number         // Potential tax savings
  penaltyRisk?: number              // Penalty risk if not filed
  
  // AI insights
  confidence: number                // Recommendation confidence (0-1)
  reasoning: string                 // AI reasoning for recommendation
  
  // User guidance
  preparationSteps: string[]        // Steps to prepare for this form
  commonMistakes: string[]          // Common mistakes to avoid
  helpResources: string[]           // Help resources and links
}

/**
 * Complete consultation result
 */
export interface ConsultationResult {
  // Assessment
  businessAssessment: BusinessAssessment // Business assessment results
  
  // Recommendations
  formRecommendations: FormRecommendation[] // Recommended forms
  priorityOrder: string[]           // Priority order of forms
  
  // Timeline
  suggestedTimeline: Record<string, string> // Suggested completion timeline
  criticalDeadlines: Record<string, string> // Critical deadlines to watch
  
  // Overall guidance
  overallStrategy: string           // Overall tax strategy recommendation
  nextSteps: string[]               // Immediate next steps
  longTermPlanning: string[]        // Long-term planning suggestions
  
  // Consultation metadata
  consultationId: string            // Unique consultation ID
  consultedAt: string               // Consultation timestamp
  aiAgentsUsed: string[]            // AI agents involved
  processingTime: number            // Processing time in milliseconds
  
  // Follow-up
  followUpRecommended: boolean      // Whether follow-up is recommended
  followUpReason?: string           // Reason for follow-up
  followUpDate?: string             // Suggested follow-up date
}
