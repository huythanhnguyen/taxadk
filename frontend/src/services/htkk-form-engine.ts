/**
 * HTKK Form Engine
 * 
 * Renders dynamic forms from HTKK XML templates
 * Handles field dependencies, validation, and auto-fill
 */

import { 
  HTKKTemplate, 
  HTKKSection, 
  HTKKField, 
  HTKKFormData,
  HTKKControlType,
  HTKKFieldMapping,
  HTKKMappingResult,
  HTKKValidationResult,
  HTKKXMLExportResult
} from '../types/htkk-schema'
import { htkkParser } from './htkk-parser'
import { cloudflareD1Service } from './cloudflare-d1'

/**
 * Rendered form structure
 */
export interface FormStructure {
  template: HTKKTemplate
  sections: RenderedSection[]
  metadata: {
    totalFields: number
    requiredFields: number
    dynamicSections: number
    estimatedTime: number // minutes
  }
}

/**
 * Rendered section
 */
export interface RenderedSection {
  id: string
  title: string
  description?: string
  dynamic: boolean
  maxRows: number
  fields: RenderedField[]
  dependencies: FieldDependency[]
  validation: SectionValidation
}

/**
 * Rendered field
 */
export interface RenderedField {
  id: string
  cellId: string
  path: string
  label: string
  type: HTKKControlType
  required: boolean
  value: any
  defaultValue?: any
  placeholder?: string
  helpText?: string
  validation: FieldValidation
  dependencies: FieldDependency[]
  options?: FieldOption[] // For dropdown fields
  formatting?: FieldFormatting
  aiMapping?: {
    confidence: number
    source: string
    explanation: string
    alternatives: string[]
  }
}

/**
 * Field option for dropdowns
 */
export interface FieldOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/**
 * Field dependency
 */
export interface FieldDependency {
  parentField: string
  childField: string
  condition: DependencyCondition
  action: DependencyAction
}

/**
 * Dependency condition
 */
export interface DependencyCondition {
  type: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

/**
 * Dependency action
 */
export interface DependencyAction {
  type: 'show' | 'hide' | 'enable' | 'disable' | 'set_value' | 'clear_value'
  value?: any
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  required: boolean
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  pattern?: string
  customRules: ValidationRule[]
}

/**
 * Section validation
 */
export interface SectionValidation {
  required: boolean
  minRows?: number
  maxRows?: number
  customRules: ValidationRule[]
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  id: string
  type: 'business' | 'format' | 'cross_field' | 'calculation'
  message: string
  validator: (value: any, formData: HTKKFormData) => boolean
}

/**
 * Field formatting options
 */
export interface FieldFormatting {
  type: 'currency' | 'percentage' | 'date' | 'number' | 'tax_code'
  locale?: string
  currency?: string
  decimals?: number
  separator?: string
}

/**
 * Form rendering options
 */
export interface FormRenderOptions {
  showHelpText: boolean
  showValidationErrors: boolean
  enableAutoSave: boolean
  autoSaveInterval: number // seconds
  showProgress: boolean
  enableKeyboardShortcuts: boolean
  theme: 'light' | 'dark' | 'auto'
  language: 'vi' | 'en'
}

/**
 * Auto-fill result
 */
export interface AutoFillResult {
  success: boolean
  fieldsUpdated: number
  errors: string[]
  warnings: string[]
  confidence: number
  mappingDetails: HTKKFieldMapping[]
}

/**
 * HTKK Form Engine
 */
export class HTKKFormEngine {
  private templates: Map<string, HTKKTemplate> = new Map()
  private validationRules: Map<string, ValidationRule[]> = new Map()
  private fieldLabels: Map<string, string> = new Map()

  constructor() {
    this.initializeValidationRules()
    this.initializeFieldLabels()
  }

  /**
   * Render form from HTKK template
   */
  async renderForm(
    formCode: string, 
    templateVersion?: string,
    options: Partial<FormRenderOptions> = {}
  ): Promise<FormStructure> {
    try {
      // Load template
      const template = await this.loadTemplate(formCode, templateVersion)
      
      // Render sections
      const sections = await this.renderSections(template.sections, options)
      
      // Calculate metadata
      const metadata = this.calculateMetadata(template, sections)
      
      return {
        template,
        sections,
        metadata
      }
    } catch (error) {
      throw new Error(`Failed to render form: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Apply AI field mapping to form
   */
  async applyFieldMapping(
    formStructure: FormStructure,
    mappingResult: HTKKMappingResult
  ): Promise<AutoFillResult> {
    const result: AutoFillResult = {
      success: true,
      fieldsUpdated: 0,
      errors: [],
      warnings: [],
      confidence: mappingResult.overallConfidence,
      mappingDetails: mappingResult.fieldMappings
    }

    try {
      // Apply field mappings
      for (const mapping of mappingResult.fieldMappings) {
        const field = this.findFieldByPath(formStructure, mapping.targetPath)
        
        if (!field) {
          result.warnings.push(`Field not found: ${mapping.targetPath}`)
          continue
        }

        // Validate mapping
        if (!mapping.isValid) {
          result.errors.push(`Invalid mapping for ${mapping.targetPath}: ${mapping.validationErrors.join(', ')}`)
          continue
        }

        // Apply value
        field.value = mapping.value
        field.aiMapping = {
          confidence: mapping.confidence,
          source: mapping.sourcePath,
          explanation: mapping.mappingReason,
          alternatives: mapping.alternativeMappings?.map(m => m.value) || []
        }

        result.fieldsUpdated++
      }

      // Apply dynamic section mappings
      for (const [tablePath, mappings] of Object.entries(mappingResult.dynamicMappings)) {
        // Handle dynamic section mappings
        // This would involve creating/updating rows in dynamic sections
        result.fieldsUpdated += mappings.length
      }

      result.success = result.errors.length === 0

    } catch (error) {
      result.success = false
      result.errors.push(`Mapping application failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    return result
  }

  /**
   * Validate form data
   */
  async validateForm(
    formStructure: FormStructure,
    formData: HTKKFormData
  ): Promise<HTKKValidationResult> {
    const result: HTKKValidationResult = {
      isValid: true,
      fieldErrors: {},
      fieldWarnings: {},
      businessRuleErrors: [],
      crossFieldErrors: [],
      complianceErrors: [],
      missingRequiredFields: [],
      calculationErrors: [],
      errorCount: 0,
      warningCount: 0,
      validationScore: 100
    }

    try {
      // Validate individual fields
      for (const section of formStructure.sections) {
        for (const field of section.fields) {
          const fieldValue = formData.data[field.path]
          const fieldValidation = this.validateField(field, fieldValue, formData)
          
          if (fieldValidation.errors.length > 0) {
            result.fieldErrors[field.path] = fieldValidation.errors
            result.errorCount += fieldValidation.errors.length
          }
          
          if (fieldValidation.warnings.length > 0) {
            result.fieldWarnings[field.path] = fieldValidation.warnings
            result.warningCount += fieldValidation.warnings.length
          }
        }
      }

      // Validate business rules
      const businessRuleErrors = await this.validateBusinessRules(formStructure.template.formCode, formData)
      result.businessRuleErrors = businessRuleErrors
      result.errorCount += businessRuleErrors.length

      // Validate cross-field dependencies
      const crossFieldErrors = this.validateCrossFields(formStructure, formData)
      result.crossFieldErrors = crossFieldErrors
      result.errorCount += crossFieldErrors.length

      // Check required fields
      const missingRequired = this.checkRequiredFields(formStructure, formData)
      result.missingRequiredFields = missingRequired
      result.errorCount += missingRequired.length

      // Calculate validation score
      result.validationScore = Math.max(0, 100 - (result.errorCount * 5) - (result.warningCount * 2))
      result.isValid = result.errorCount === 0

    } catch (error) {
      result.businessRuleErrors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
      result.errorCount++
      result.isValid = false
    }

    return result
  }

  /**
   * Export form to HTKK XML
   */
  async exportToXML(
    formStructure: FormStructure,
    formData: HTKKFormData
  ): Promise<HTKKXMLExportResult> {
    const result: HTKKXMLExportResult = {
      success: false,
      xmlContent: '',
      xmlSize: 0,
      isValidXML: false,
      htkkCompliant: false,
      exportedAt: new Date().toISOString(),
      formCode: formStructure.template.formCode,
      templateVersion: formStructure.template.version,
      errors: [],
      warnings: []
    }

    try {
      // Validate form before export
      const validation = await this.validateForm(formStructure, formData)
      if (!validation.isValid) {
        result.errors.push('Form validation failed')
        result.warnings.push(`${validation.errorCount} validation errors found`)
      }

      // Generate XML content
      const xmlContent = await this.generateHTKKXML(formStructure.template, formData)
      
      // Validate XML structure
      const xmlValidation = this.validateXMLStructure(xmlContent)
      
      result.xmlContent = xmlContent
      result.xmlSize = new Blob([xmlContent]).size
      result.isValidXML = xmlValidation.isValid
      result.htkkCompliant = xmlValidation.htkkCompliant
      result.success = xmlValidation.isValid && xmlValidation.htkkCompliant
      
      if (!xmlValidation.isValid) {
        result.errors.push(...xmlValidation.errors)
      }
      
      if (!xmlValidation.htkkCompliant) {
        result.warnings.push(...xmlValidation.warnings)
      }

    } catch (error) {
      result.errors.push(`Export failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    return result
  }

  /**
   * Auto-save form data
   */
  async autoSave(
    formData: HTKKFormData,
    sessionId: string,
    userId?: string
  ): Promise<string> {
    try {
      return await cloudflareD1Service.saveDraft(formData, sessionId, userId)
    } catch (error) {
      throw new Error(`Auto-save failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Load template from cache or parser
   */
  private async loadTemplate(formCode: string, version?: string): Promise<HTKKTemplate> {
    const cacheKey = `${formCode}_${version || 'latest'}`
    
    // Check memory cache
    if (this.templates.has(cacheKey)) {
      return this.templates.get(cacheKey)!
    }

    // Check D1 cache
    const cachedTemplate = await cloudflareD1Service.getCachedTemplate(formCode, version)
    if (cachedTemplate) {
      this.templates.set(cacheKey, cachedTemplate)
      return cachedTemplate
    }

    // Load from parser
    const parseResult = await htkkParser.loadTemplate(formCode)
    if (!parseResult.success || !parseResult.template) {
      throw new Error(`Failed to load template: ${parseResult.errors.join(', ')}`)
    }

    // Cache template
    this.templates.set(cacheKey, parseResult.template)
    await cloudflareD1Service.cacheTemplate(parseResult.template)

    return parseResult.template
  }

  /**
   * Render sections from template
   */
  private async renderSections(
    sections: HTKKSection[],
    options: Partial<FormRenderOptions>
  ): Promise<RenderedSection[]> {
    const renderedSections: RenderedSection[] = []

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const renderedSection = await this.renderSection(section, i, options)
      renderedSections.push(renderedSection)
    }

    return renderedSections
  }

  /**
   * Render individual section
   */
  private async renderSection(
    section: HTKKSection,
    index: number,
    options: Partial<FormRenderOptions>
  ): Promise<RenderedSection> {
    const fields = section.dynamic ? (section.rowInfo || []) : section.cells
    const renderedFields = fields.map(field => this.renderField(field, options))
    
    return {
      id: section.id || `section_${index}`,
      title: this.getSectionTitle(section, index),
      description: this.getSectionDescription(section),
      dynamic: section.dynamic,
      maxRows: section.maxRows,
      fields: renderedFields,
      dependencies: this.extractSectionDependencies(fields),
      validation: this.getSectionValidation(section)
    }
  }

  /**
   * Render individual field
   */
  private renderField(
    field: HTKKField,
    options: Partial<FormRenderOptions>
  ): RenderedField {
    return {
      id: field.cellId,
      cellId: field.cellId,
      path: field.path,
      label: this.getFieldLabel(field),
      type: field.controlType,
      required: this.isFieldRequired(field),
      value: field.value,
      defaultValue: field.defaultValue,
      placeholder: this.getFieldPlaceholder(field),
      helpText: options.showHelpText ? this.getFieldHelpText(field) : undefined,
      validation: this.getFieldValidation(field),
      dependencies: this.extractFieldDependencies(field),
      options: this.getFieldOptions(field),
      formatting: this.getFieldFormatting(field)
    }
  }

  /**
   * Validate individual field
   */
  private validateField(
    field: RenderedField,
    value: any,
    formData: HTKKFormData
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Required validation
    if (field.required && (value === null || value === undefined || value === '')) {
      errors.push(`${field.label} is required`)
    }

    // Type-specific validation
    switch (field.type) {
      case HTKKControlType.NUMBER:
        if (value !== null && value !== undefined && value !== '') {
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors.push(`${field.label} must be a valid number`)
          } else {
            if (field.validation.minValue !== undefined && numValue < field.validation.minValue) {
              errors.push(`${field.label} must be at least ${field.validation.minValue}`)
            }
            if (field.validation.maxValue !== undefined && numValue > field.validation.maxValue) {
              errors.push(`${field.label} must be at most ${field.validation.maxValue}`)
            }
          }
        }
        break

      case HTKKControlType.TAX_CODE:
        if (value && typeof value === 'string') {
          if (!/^\d{10}(-\d{3})?$/.test(value)) {
            errors.push(`${field.label} must be a valid tax code format`)
          }
        }
        break

      case HTKKControlType.DATE:
        if (value && !this.isValidDate(value)) {
          errors.push(`${field.label} must be a valid date`)
        }
        break
    }

    // Length validation
    if (value && typeof value === 'string') {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errors.push(`${field.label} must be at least ${field.validation.minLength} characters`)
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errors.push(`${field.label} must be at most ${field.validation.maxLength} characters`)
      }
    }

    // Pattern validation
    if (value && field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(String(value))) {
        errors.push(`${field.label} format is invalid`)
      }
    }

    // Custom validation rules
    for (const rule of field.validation.customRules) {
      if (!rule.validator(value, formData)) {
        if (rule.type === 'business') {
          errors.push(rule.message)
        } else {
          warnings.push(rule.message)
        }
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(formCode: string, formData: HTKKFormData): Promise<string[]> {
    const errors: string[] = []
    const rules = this.validationRules.get(formCode) || []

    for (const rule of rules) {
      if (rule.type === 'business') {
        try {
          if (!rule.validator(formData.data, formData)) {
            errors.push(rule.message)
          }
        } catch (error) {
          errors.push(`Business rule validation failed: ${rule.id}`)
        }
      }
    }

    return errors
  }

  /**
   * Validate cross-field dependencies
   */
  private validateCrossFields(formStructure: FormStructure, formData: HTKKFormData): string[] {
    const errors: string[] = []

    // Implementation would check field dependencies and cross-validations
    // For now, return empty array
    
    return errors
  }

  /**
   * Check required fields
   */
  private checkRequiredFields(formStructure: FormStructure, formData: HTKKFormData): string[] {
    const missing: string[] = []

    for (const section of formStructure.sections) {
      for (const field of section.fields) {
        if (field.required) {
          const value = formData.data[field.path]
          if (value === null || value === undefined || value === '') {
            missing.push(field.path)
          }
        }
      }
    }

    return missing
  }

  /**
   * Generate HTKK XML from form data
   */
  private async generateHTKKXML(template: HTKKTemplate, formData: HTKKFormData): Promise<string> {
    // This would generate proper HTKK XML format
    // For now, return a basic XML structure
    
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
    const xmlContent = `
      <HSoThueDTu>
        <HSoKhaiThue>
          <CTieuTKhaiChinh>
            <!-- Form data would be inserted here -->
          </CTieuTKhaiChinh>
        </HSoKhaiThue>
      </HSoThueDTu>
    `
    
    return xmlHeader + xmlContent
  }

  /**
   * Validate XML structure
   */
  private validateXMLStructure(xmlContent: string): {
    isValid: boolean
    htkkCompliant: boolean
    errors: string[]
    warnings: string[]
  } {
    const result = {
      isValid: true,
      htkkCompliant: true,
      errors: [] as string[],
      warnings: [] as string[]
    }

    try {
      // Parse XML to check validity
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlContent, 'text/xml')
      
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        result.isValid = false
        result.errors.push('Invalid XML structure')
      }

      // Check HTKK compliance
      if (!xmlContent.includes('HSoThueDTu')) {
        result.htkkCompliant = false
        result.warnings.push('Missing HTKK root element')
      }

    } catch (error) {
      result.isValid = false
      result.errors.push('XML parsing failed')
    }

    return result
  }

  /**
   * Calculate form metadata
   */
  private calculateMetadata(template: HTKKTemplate, sections: RenderedSection[]): FormStructure['metadata'] {
    const totalFields = sections.reduce((sum, section) => sum + section.fields.length, 0)
    const requiredFields = sections.reduce((sum, section) => 
      sum + section.fields.filter(field => field.required).length, 0
    )
    const dynamicSections = sections.filter(section => section.dynamic).length
    const estimatedTime = Math.max(5, Math.ceil(totalFields / 10)) // Rough estimate

    return {
      totalFields,
      requiredFields,
      dynamicSections,
      estimatedTime
    }
  }

  /**
   * Find field by path in form structure
   */
  private findFieldByPath(formStructure: FormStructure, path: string): RenderedField | null {
    for (const section of formStructure.sections) {
      for (const field of section.fields) {
        if (field.path === path) {
          return field
        }
      }
    }
    return null
  }

  /**
   * Helper methods for field rendering
   */
  private getFieldLabel(field: HTKKField): string {
    return this.fieldLabels.get(field.path) || field.cellId
  }

  private isFieldRequired(field: HTKKField): boolean {
    // Determine if field is required based on HTKK rules
    return field.path.includes('required') || field.cellId.startsWith('R_')
  }

  private getFieldPlaceholder(field: HTKKField): string {
    switch (field.controlType) {
      case HTKKControlType.TAX_CODE:
        return 'e.g., 0123456789'
      case HTKKControlType.DATE:
        return 'dd/mm/yyyy'
      case HTKKControlType.NUMBER:
        return 'Enter number'
      default:
        return ''
    }
  }

  private getFieldHelpText(field: HTKKField): string {
    return field.helpContextId ? `Help: ${field.helpContextId}` : ''
  }

  private getFieldValidation(field: HTKKField): FieldValidation {
    return {
      required: this.isFieldRequired(field),
      minLength: field.controlType === HTKKControlType.TAX_CODE ? 10 : undefined,
      maxLength: field.maxLen,
      minValue: typeof field.minValue === 'number' ? field.minValue : undefined,
      maxValue: typeof field.maxValue === 'number' ? field.maxValue : undefined,
      customRules: []
    }
  }

  private extractFieldDependencies(field: HTKKField): FieldDependency[] {
    const dependencies: FieldDependency[] = []
    
    if (field.parentCell) {
      dependencies.push({
        parentField: field.parentCell,
        childField: field.cellId,
        condition: { type: 'equals', value: field.selectedValue },
        action: { type: 'show' }
      })
    }

    return dependencies
  }

  private extractSectionDependencies(fields: HTKKField[]): FieldDependency[] {
    const dependencies: FieldDependency[] = []
    
    for (const field of fields) {
      dependencies.push(...this.extractFieldDependencies(field))
    }

    return dependencies
  }

  private getFieldOptions(field: HTKKField): FieldOption[] | undefined {
    // Return options for dropdown fields
    // This would typically be loaded from a data source
    return undefined
  }

  private getFieldFormatting(field: HTKKField): FieldFormatting | undefined {
    switch (field.controlType) {
      case HTKKControlType.NUMBER:
        return { type: 'number', decimals: 0 }
      case HTKKControlType.DATE:
        return { type: 'date', locale: 'vi-VN' }
      case HTKKControlType.TAX_CODE:
        return { type: 'tax_code' }
      default:
        return undefined
    }
  }

  private getSectionTitle(section: HTKKSection, index: number): string {
    return section.tableName || `Section ${index + 1}`
  }

  private getSectionDescription(section: HTKKSection): string | undefined {
    return section.tablePath ? `Table: ${section.tablePath}` : undefined
  }

  private getSectionValidation(section: HTKKSection): SectionValidation {
    return {
      required: !section.dynamic,
      maxRows: section.dynamic ? section.maxRows : undefined,
      customRules: []
    }
  }

  private isValidDate(value: any): boolean {
    const date = new Date(value)
    return !isNaN(date.getTime())
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Initialize form-specific validation rules
    // This would typically be loaded from a configuration file
  }

  /**
   * Initialize field labels
   */
  private initializeFieldLabels(): void {
    // Initialize field label mappings
    // This would typically be loaded from a localization file
  }
}

/**
 * Default form engine instance
 */
export const htkkFormEngine = new HTKKFormEngine()
