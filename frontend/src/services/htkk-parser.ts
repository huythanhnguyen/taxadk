/**
 * HTKK XML Template Parser
 * 
 * Parses official HTKK XML templates into structured TypeScript objects
 * Handles both static and dynamic sections with full compliance
 */

import { 
  HTKKTemplate, 
  HTKKSection, 
  HTKKField, 
  HTKKControlType,
  HTKKSectionLocation,
  HTKKValidationResult 
} from '../types/htkk-schema'

/**
 * Parser configuration options
 */
interface ParserConfig {
  validateOnParse: boolean          // Whether to validate during parsing
  strictMode: boolean               // Whether to use strict parsing mode
  preserveComments: boolean         // Whether to preserve XML comments
  cacheTemplates: boolean           // Whether to cache parsed templates
}

/**
 * Parse result with metadata
 */
interface ParseResult {
  success: boolean                  // Whether parsing succeeded
  template?: HTKKTemplate           // Parsed template (if successful)
  errors: string[]                  // Parse errors
  warnings: string[]                // Parse warnings
  parseTime: number                 // Parse time in milliseconds
}

/**
 * HTKK XML Template Parser
 */
export class HTKKXMLParser {
  private config: ParserConfig
  private templateCache: Map<string, HTKKTemplate> = new Map()

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      validateOnParse: true,
      strictMode: false,
      preserveComments: false,
      cacheTemplates: true,
      ...config
    }
  }

  /**
   * Parse HTKK XML template from string content
   */
  async parseTemplate(xmlContent: string, formCode: string): Promise<ParseResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(xmlContent, formCode)
      if (this.config.cacheTemplates && this.templateCache.has(cacheKey)) {
        return {
          success: true,
          template: this.templateCache.get(cacheKey)!,
          errors: [],
          warnings: ['Template loaded from cache'],
          parseTime: Date.now() - startTime
        }
      }

      // Parse XML
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

      // Check for XML parsing errors
      const parseError = xmlDoc.querySelector('parsererror')
      if (parseError) {
        errors.push(`XML parsing error: ${parseError.textContent}`)
        return { success: false, errors, warnings, parseTime: Date.now() - startTime }
      }

      // Extract root element
      const sectionsElement = xmlDoc.documentElement
      if (sectionsElement.tagName !== 'Sections') {
        errors.push('Root element must be <Sections>')
        return { success: false, errors, warnings, parseTime: Date.now() - startTime }
      }

      // Extract version
      const version = sectionsElement.getAttribute('Version') || 'unknown'

      // Parse sections
      const sections = await this.parseSections(sectionsElement, errors, warnings)

      // Create template
      const template: HTKKTemplate = {
        version,
        formCode,
        sections,
        metadata: {
          title: this.getFormTitle(formCode),
          description: this.getFormDescription(formCode),
          lastUpdated: new Date().toISOString(),
          dtdPath: this.extractDTDPath(xmlContent)
        }
      }

      // Validate if requested
      if (this.config.validateOnParse) {
        const validation = this.validateTemplate(template)
        if (!validation.isValid) {
          errors.push(...validation.businessRuleErrors)
          warnings.push(...validation.fieldWarnings.flat ? Object.values(validation.fieldWarnings).flat() : [])
        }
      }

      // Cache template
      if (this.config.cacheTemplates) {
        this.templateCache.set(cacheKey, template)
      }

      return {
        success: errors.length === 0,
        template: errors.length === 0 ? template : undefined,
        errors,
        warnings,
        parseTime: Date.now() - startTime
      }

    } catch (error) {
      errors.push(`Unexpected parsing error: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, errors, warnings, parseTime: Date.now() - startTime }
    }
  }

  /**
   * Load template from URL or local storage
   */
  async loadTemplate(formCode: string, templateUrl?: string): Promise<ParseResult> {
    try {
      // Try to load from cache first
      const cachedTemplate = this.getCachedTemplate(formCode)
      if (cachedTemplate) {
        return {
          success: true,
          template: cachedTemplate,
          errors: [],
          warnings: ['Template loaded from cache'],
          parseTime: 0
        }
      }

      // Determine template URL
      const url = templateUrl || this.getDefaultTemplateUrl(formCode)
      
      // Fetch template content
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
      }

      const xmlContent = await response.text()
      return await this.parseTemplate(xmlContent, formCode)

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to load template: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        parseTime: 0
      }
    }
  }

  /**
   * Parse all sections from XML
   */
  private async parseSections(sectionsElement: Element, errors: string[], warnings: string[]): Promise<HTKKSection[]> {
    const sections: HTKKSection[] = []
    const sectionElements = sectionsElement.querySelectorAll('Section')

    for (const sectionElement of sectionElements) {
      try {
        const section = await this.parseSection(sectionElement, errors, warnings)
        sections.push(section)
      } catch (error) {
        errors.push(`Error parsing section: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return sections
  }

  /**
   * Parse individual section
   */
  private async parseSection(sectionElement: Element, errors: string[], warnings: string[]): Promise<HTKKSection> {
    // Extract section attributes
    const dynamic = sectionElement.getAttribute('Dynamic') === '1'
    const maxRows = parseInt(sectionElement.getAttribute('MaxRows') || '0')
    const tableName = sectionElement.getAttribute('TableName') || undefined
    const tablePath = sectionElement.getAttribute('TablePath') || undefined
    const id = sectionElement.getAttribute('id') || undefined
    const iColumnSTT = this.parseOptionalInt(sectionElement.getAttribute('iColumnSTT'))
    const iColumnSTTReport = this.parseOptionalInt(sectionElement.getAttribute('iColumnSTTReport'))

    // Parse location information for dynamic sections
    let location: HTKKSectionLocation | undefined
    const locationElement = sectionElement.querySelector('Location')
    if (locationElement) {
      location = this.parseLocation(locationElement)
    }

    // Parse cells (for static sections)
    const cells: HTKKField[] = []
    const cellsElement = sectionElement.querySelector('Cells')
    if (cellsElement) {
      const cellElements = cellsElement.querySelectorAll('Cell')
      for (const cellElement of cellElements) {
        try {
          const field = this.parseField(cellElement)
          cells.push(field)
        } catch (error) {
          errors.push(`Error parsing cell: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    // Parse row info (for dynamic sections)
    let rowInfo: HTKKField[] | undefined
    let rowData: string | undefined
    const rowInfoElement = sectionElement.querySelector('RowInfo')
    if (rowInfoElement) {
      rowInfo = []
      const cellElements = rowInfoElement.querySelectorAll('Cell')
      for (const cellElement of cellElements) {
        try {
          const field = this.parseField(cellElement)
          rowInfo.push(field)
        } catch (error) {
          errors.push(`Error parsing row info cell: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    // Parse row data template
    const rowDataElement = sectionElement.querySelector('RowData')
    if (rowDataElement) {
      rowData = rowDataElement.textContent || undefined
    }

    return {
      dynamic,
      maxRows,
      tableName,
      tablePath,
      id,
      iColumnSTT,
      iColumnSTTReport,
      location,
      cells,
      rowInfo,
      rowData
    }
  }

  /**
   * Parse location information
   */
  private parseLocation(locationElement: Element): HTKKSectionLocation {
    return {
      tableTemplateRowStart: this.parseRequiredInt(locationElement.querySelector('TableTemplateRowStart')?.textContent),
      tableReportRowStart: this.parseRequiredInt(locationElement.querySelector('TableReportRowStart')?.textContent),
      dataLocationTemplateRowStart: this.parseRequiredInt(locationElement.querySelector('DataLocationTemplateRowStart')?.textContent),
      dataLocationReportRowStart: this.parseRequiredInt(locationElement.querySelector('DataLocationReportRowStart')?.textContent),
      dataLocationTaiBangKeRowStart: this.parseRequiredInt(locationElement.querySelector('DataLocationTaiBangKeRowStart')?.textContent)
    }
  }

  /**
   * Parse individual field/cell
   */
  private parseField(cellElement: Element): HTKKField {
    // Required attributes
    const cellId = cellElement.getAttribute('CellID')
    const path = cellElement.getAttribute('Path')
    const controlTypeStr = cellElement.getAttribute('Controltype') || cellElement.getAttribute('ControlType')
    const encodeStr = cellElement.getAttribute('Encode')

    if (!cellId) throw new Error('CellID is required')
    if (!path) throw new Error('Path is required')
    if (!controlTypeStr) throw new Error('Controltype is required')

    // Parse control type
    const controlType = this.parseControlType(controlTypeStr)
    
    // Parse encode flag
    const encode = encodeStr === '1' || encodeStr === 'true'

    // Optional attributes
    const cellId2 = cellElement.getAttribute('CellID2') || undefined
    const value = cellElement.getAttribute('Value') || ''
    const defaultValue = cellElement.getAttribute('DefaultValue') || undefined
    const maxLen = this.parseOptionalInt(cellElement.getAttribute('MaxLen'))
    const minValue = this.parseOptionalValue(cellElement.getAttribute('MinValue'))
    const maxValue = this.parseOptionalValue(cellElement.getAttribute('MaxValue'))
    const helpContextId = cellElement.getAttribute('HelpContextID') || undefined
    const selectedValue = cellElement.getAttribute('SelectedValue') || undefined
    const parentCell = cellElement.getAttribute('ParentCell') || undefined
    const childCell = cellElement.getAttribute('ChildCell') || undefined
    const statusId = cellElement.getAttribute('StatusID') || undefined

    return {
      cellId,
      cellId2,
      path,
      controlType,
      encode,
      value,
      defaultValue,
      maxLen,
      minValue,
      maxValue,
      helpContextId,
      selectedValue,
      parentCell,
      childCell,
      statusId
    }
  }

  /**
   * Parse control type from string
   */
  private parseControlType(controlTypeStr: string): HTKKControlType {
    const controlTypeNum = parseInt(controlTypeStr)
    
    switch (controlTypeNum) {
      case 0: return HTKKControlType.TEXT
      case 2: return HTKKControlType.CHECKBOX
      case 6: return HTKKControlType.DEPENDENT_DROPDOWN
      case 14: return HTKKControlType.DATE
      case 16: return HTKKControlType.NUMBER
      case 26: return HTKKControlType.TAX_CODE
      case 56: return HTKKControlType.COUNTRY_DROPDOWN
      case 100: return HTKKControlType.PROVINCE_DROPDOWN
      case 101: return HTKKControlType.WARD_DROPDOWN
      default:
        console.warn(`Unknown control type: ${controlTypeNum}, defaulting to TEXT`)
        return HTKKControlType.TEXT
    }
  }

  /**
   * Parse optional integer value
   */
  private parseOptionalInt(value: string | null): number | undefined {
    if (!value || value.trim() === '') return undefined
    const parsed = parseInt(value)
    return isNaN(parsed) ? undefined : parsed
  }

  /**
   * Parse required integer value
   */
  private parseRequiredInt(value: string | null): number {
    if (!value || value.trim() === '') throw new Error('Required integer value is missing')
    const parsed = parseInt(value)
    if (isNaN(parsed)) throw new Error(`Invalid integer value: ${value}`)
    return parsed
  }

  /**
   * Parse optional value (string or number)
   */
  private parseOptionalValue(value: string | null): string | number | undefined {
    if (!value || value.trim() === '') return undefined
    
    // Try to parse as number first
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) return numValue
    
    // Return as string
    return value
  }

  /**
   * Validate parsed template
   */
  validateTemplate(template: HTKKTemplate): HTKKValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const fieldErrors: Record<string, string[]> = {}
    const fieldWarnings: Record<string, string[]> = {}

    // Validate template structure
    if (!template.version) {
      errors.push('Template version is required')
    }

    if (!template.formCode) {
      errors.push('Form code is required')
    }

    if (!template.sections || template.sections.length === 0) {
      errors.push('Template must have at least one section')
    }

    // Validate sections
    for (const section of template.sections) {
      this.validateSection(section, errors, warnings, fieldErrors, fieldWarnings)
    }

    return {
      isValid: errors.length === 0,
      fieldErrors,
      fieldWarnings,
      businessRuleErrors: errors,
      crossFieldErrors: [],
      complianceErrors: [],
      missingRequiredFields: [],
      calculationErrors: [],
      errorCount: errors.length,
      warningCount: warnings.length,
      validationScore: Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2))
    }
  }

  /**
   * Validate individual section
   */
  private validateSection(
    section: HTKKSection, 
    errors: string[], 
    warnings: string[], 
    fieldErrors: Record<string, string[]>, 
    fieldWarnings: Record<string, string[]>
  ): void {
    // Validate dynamic section requirements
    if (section.dynamic) {
      if (!section.tableName) {
        errors.push('Dynamic section must have tableName')
      }
      if (!section.tablePath) {
        errors.push('Dynamic section must have tablePath')
      }
      if (!section.rowInfo || section.rowInfo.length === 0) {
        errors.push('Dynamic section must have rowInfo')
      }
    }

    // Validate fields
    const fields = section.dynamic ? (section.rowInfo || []) : section.cells
    for (const field of fields) {
      this.validateField(field, fieldErrors, fieldWarnings)
    }
  }

  /**
   * Validate individual field
   */
  private validateField(
    field: HTKKField, 
    fieldErrors: Record<string, string[]>, 
    fieldWarnings: Record<string, string[]>
  ): void {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!field.cellId) {
      errors.push('CellID is required')
    }

    if (!field.path) {
      errors.push('Path is required')
    }

    // Control type specific validation
    switch (field.controlType) {
      case HTKKControlType.NUMBER:
        if (field.minValue !== undefined && field.maxValue !== undefined) {
          if (Number(field.minValue) > Number(field.maxValue)) {
            errors.push('MinValue cannot be greater than MaxValue')
          }
        }
        break

      case HTKKControlType.TAX_CODE:
        if (field.maxLen && field.maxLen !== 14) {
          warnings.push('Tax code fields typically have maxLen of 14')
        }
        break

      case HTKKControlType.DEPENDENT_DROPDOWN:
        if (!field.parentCell) {
          errors.push('Dependent dropdown must have parentCell')
        }
        break
    }

    // Store validation results
    if (errors.length > 0) {
      fieldErrors[field.path] = errors
    }
    if (warnings.length > 0) {
      fieldWarnings[field.path] = warnings
    }
  }

  /**
   * Get cached template
   */
  private getCachedTemplate(formCode: string): HTKKTemplate | undefined {
    for (const [key, template] of this.templateCache) {
      if (template.formCode === formCode) {
        return template
      }
    }
    return undefined
  }

  /**
   * Generate cache key
   */
  private getCacheKey(xmlContent: string, formCode: string): string {
    // Simple hash of content + form code
    let hash = 0
    const str = xmlContent + formCode
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `${formCode}_${hash}`
  }

  /**
   * Get default template URL for form code
   */
  private getDefaultTemplateUrl(formCode: string): string {
    // This would typically point to Cloudflare R2 or CDN
    const baseUrl = process.env.REACT_APP_TEMPLATE_BASE_URL || '/templates'
    return `${baseUrl}/${formCode.replace('/', '_')}.xml`
  }

  /**
   * Extract DTD path from XML content
   */
  private extractDTDPath(xmlContent: string): string | undefined {
    const dtdMatch = xmlContent.match(/<!DOCTYPE\s+\w+\s+SYSTEM\s+"([^"]+)"/i)
    return dtdMatch ? dtdMatch[1] : undefined
  }

  /**
   * Get human-readable form title
   */
  private getFormTitle(formCode: string): string {
    const titles: Record<string, string> = {
      '01/GTGT': 'Tờ khai thuế giá trị gia tăng',
      '03/TNDN': 'Tờ khai thuế thu nhập doanh nghiệp',
      '02/TNCN': 'Tờ khai thuế thu nhập cá nhân',
      '01/BVMT': 'Tờ khai thuế bảo vệ môi trường',
      '05/TTDB': 'Tờ khai thuế tiêu thụ đặc biệt'
    }
    return titles[formCode] || `Tờ khai ${formCode}`
  }

  /**
   * Get form description
   */
  private getFormDescription(formCode: string): string {
    const descriptions: Record<string, string> = {
      '01/GTGT': 'Tờ khai thuế giá trị gia tăng theo Thông tư 80/2021/TT-BTC',
      '03/TNDN': 'Tờ khai thuế thu nhập doanh nghiệp theo Nghị định 132/2020/NĐ-CP',
      '02/TNCN': 'Tờ khai thuế thu nhập cá nhân theo Thông tư 80/2021/TT-BTC',
      '01/BVMT': 'Tờ khai thuế bảo vệ môi trường',
      '05/TTDB': 'Tờ khai thuế tiêu thụ đặc biệt'
    }
    return descriptions[formCode] || `Tờ khai thuế ${formCode}`
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.templateCache.size,
      keys: Array.from(this.templateCache.keys())
    }
  }
}

/**
 * Default parser instance
 */
export const htkkParser = new HTKKXMLParser({
  validateOnParse: true,
  strictMode: false,
  cacheTemplates: true
})
