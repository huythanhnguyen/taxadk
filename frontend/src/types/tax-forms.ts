export interface TaxForm {
  id: string
  formType: string
  formCode: string
  title: string
  description: string
  version: string
  status: 'draft' | 'completed' | 'submitted'
  data: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  validation?: ValidationRule[]
  options?: SelectOption[]
  defaultValue?: any
  helpText?: string
  dependsOn?: string[]
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  repeatable?: boolean
  maxRows?: number
}

export interface FormTemplate {
  id: string
  formCode: string
  title: string
  description: string
  version: string
  sections: FormSection[]
  businessRules: BusinessRule[]
}

export interface BusinessRule {
  id: string
  type: 'calculation' | 'validation' | 'dependency'
  condition: string
  action: string
  fields: string[]
  formula?: string
}

export interface TaxCalculation {
  fieldId: string
  value: number
  formula: string
  dependencies: string[]
}

export interface DocumentUpload {
  id: string
  fileName: string
  fileType: 'pdf' | 'xml' | 'image'
  fileSize: number
  uploadedAt: string
  extractedData?: Record<string, any>
  status: 'uploading' | 'processing' | 'completed' | 'error'
  errorMessage?: string
}
