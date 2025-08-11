/**
 * Privacy Manager
 * 
 * Manages multi-tier privacy system for HTKK AI
 * Handles encryption, retention policies, and compliance
 */

import { 
  PrivacyTier, 
  PrivacyConfig, 
  DocumentUploadConfig,
  AIProcessingConfig 
} from '../types/htkk-schema'

/**
 * Privacy tier configurations
 */
const PRIVACY_TIER_CONFIGS: Record<PrivacyTier, PrivacyConfig> = {
  [PrivacyTier.BASIC]: {
    tier: PrivacyTier.BASIC,
    encryption: 'standard',
    retention: '24h',
    processing: 'cloud',
    auditLevel: 'basic',
    costPerForm: 0.50,
    autoDelete: true,
    deleteAfterSeconds: 24 * 60 * 60 // 24 hours
  },
  [PrivacyTier.PREMIUM]: {
    tier: PrivacyTier.PREMIUM,
    encryption: 'advanced',
    retention: '1h',
    processing: 'enhanced',
    auditLevel: 'detailed',
    costPerForm: 0.80,
    autoDelete: true,
    deleteAfterSeconds: 60 * 60 // 1 hour
  },
  [PrivacyTier.ENTERPRISE]: {
    tier: PrivacyTier.ENTERPRISE,
    encryption: 'enterprise',
    retention: 'immediate',
    processing: 'on-premises',
    auditLevel: 'full',
    costPerForm: 0, // Custom pricing
    autoDelete: true,
    deleteAfterSeconds: 0 // Immediate deletion
  }
}

/**
 * Encryption key management
 */
interface EncryptionKeys {
  standard: string
  advanced: string
  enterprise: string
}

/**
 * Audit log entry
 */
interface AuditLogEntry {
  timestamp: string
  userId?: string
  sessionId: string
  action: string
  privacyTier: PrivacyTier
  dataType: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Data retention policy
 */
interface RetentionPolicy {
  tier: PrivacyTier
  retentionPeriod: number // seconds
  autoDelete: boolean
  encryptionRequired: boolean
  auditRequired: boolean
  backupAllowed: boolean
}

/**
 * Privacy compliance result
 */
interface ComplianceResult {
  compliant: boolean
  violations: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
  lastChecked: string
}

/**
 * Privacy Manager Service
 */
export class PrivacyManager {
  private encryptionKeys: EncryptionKeys
  private auditLogs: AuditLogEntry[] = []
  private retentionPolicies: Map<string, RetentionPolicy> = new Map()

  constructor() {
    this.encryptionKeys = this.initializeEncryptionKeys()
    this.setupRetentionPolicies()
  }

  /**
   * Get privacy configuration for tier
   */
  getPrivacyConfig(tier: PrivacyTier): PrivacyConfig {
    return { ...PRIVACY_TIER_CONFIGS[tier] }
  }

  /**
   * Get document upload configuration for privacy tier
   */
  getDocumentUploadConfig(tier: PrivacyTier): DocumentUploadConfig {
    const privacyConfig = this.getPrivacyConfig(tier)
    
    return {
      maxFileSize: this.getMaxFileSize(tier),
      allowedTypes: this.getAllowedFileTypes(),
      encryptionKey: this.getEncryptionKey(privacyConfig.encryption),
      autoDeleteAfter: privacyConfig.deleteAfterSeconds,
      processingPriority: this.getProcessingPriority(tier),
      privacyTier: tier
    }
  }

  /**
   * Get AI processing configuration for privacy tier
   */
  getAIProcessingConfig(tier: PrivacyTier): AIProcessingConfig {
    return {
      useOCRAgent: true,
      useParserAgent: true,
      useValidationAgent: true,
      useMappingAgent: true,
      enhancedAccuracy: tier !== PrivacyTier.BASIC,
      multiLanguageOCR: true,
      confidenceThreshold: tier === PrivacyTier.ENTERPRISE ? 0.95 : 0.85,
      isolatedProcessing: tier !== PrivacyTier.BASIC,
      memoryClearing: true,
      auditLogging: tier !== PrivacyTier.BASIC,
      costOptimized: tier === PrivacyTier.BASIC,
      maxProcessingTime: tier === PrivacyTier.ENTERPRISE ? 300 : 180 // seconds
    }
  }

  /**
   * Encrypt data based on privacy tier
   */
  async encryptData(data: string, tier: PrivacyTier): Promise<string> {
    const config = this.getPrivacyConfig(tier)
    const key = this.getEncryptionKey(config.encryption)
    
    try {
      // In a real implementation, use proper encryption libraries
      // This is a simplified example
      const encrypted = await this.performEncryption(data, key, config.encryption)
      
      // Log encryption activity
      await this.logAudit({
        action: 'data_encrypted',
        privacyTier: tier,
        dataType: 'document',
        metadata: {
          encryptionLevel: config.encryption,
          dataSize: data.length
        }
      })
      
      return encrypted
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedData: string, tier: PrivacyTier): Promise<string> {
    const config = this.getPrivacyConfig(tier)
    const key = this.getEncryptionKey(config.encryption)
    
    try {
      const decrypted = await this.performDecryption(encryptedData, key, config.encryption)
      
      // Log decryption activity
      await this.logAudit({
        action: 'data_decrypted',
        privacyTier: tier,
        dataType: 'document',
        metadata: {
          encryptionLevel: config.encryption
        }
      })
      
      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Schedule data deletion based on retention policy
   */
  async scheduleDataDeletion(
    dataId: string, 
    tier: PrivacyTier, 
    dataType: string = 'document'
  ): Promise<void> {
    const config = this.getPrivacyConfig(tier)
    
    if (!config.autoDelete) {
      return
    }

    const deleteAt = new Date(Date.now() + (config.deleteAfterSeconds * 1000))
    
    // In a real implementation, this would integrate with a job scheduler
    // For now, we'll use setTimeout for demonstration
    if (config.deleteAfterSeconds > 0) {
      setTimeout(async () => {
        await this.deleteData(dataId, tier, dataType)
      }, config.deleteAfterSeconds * 1000)
    } else {
      // Immediate deletion for enterprise tier
      await this.deleteData(dataId, tier, dataType)
    }

    // Log deletion scheduling
    await this.logAudit({
      action: 'deletion_scheduled',
      privacyTier: tier,
      dataType,
      metadata: {
        dataId,
        deleteAt: deleteAt.toISOString(),
        retentionPeriod: config.deleteAfterSeconds
      }
    })
  }

  /**
   * Delete data and clean up
   */
  async deleteData(dataId: string, tier: PrivacyTier, dataType: string): Promise<void> {
    try {
      // In a real implementation, this would delete from storage
      // and clear any caches or temporary files
      
      // Log deletion
      await this.logAudit({
        action: 'data_deleted',
        privacyTier: tier,
        dataType,
        metadata: {
          dataId,
          deletedAt: new Date().toISOString()
        }
      })
      
      console.log(`Data ${dataId} deleted according to ${tier} privacy policy`)
    } catch (error) {
      console.error(`Failed to delete data ${dataId}:`, error)
      
      // Log deletion failure
      await this.logAudit({
        action: 'deletion_failed',
        privacyTier: tier,
        dataType,
        metadata: {
          dataId,
          error: error instanceof Error ? error.message : String(error)
        }
      })
    }
  }

  /**
   * Check privacy compliance
   */
  async checkCompliance(tier: PrivacyTier): Promise<ComplianceResult> {
    const violations: string[] = []
    const recommendations: string[] = []
    
    const config = this.getPrivacyConfig(tier)
    
    // Check encryption compliance
    if (config.encryption === 'standard' && tier === PrivacyTier.ENTERPRISE) {
      violations.push('Enterprise tier requires enterprise-level encryption')
    }
    
    // Check retention compliance
    if (config.retention === '24h' && tier === PrivacyTier.PREMIUM) {
      violations.push('Premium tier should have shorter retention period')
    }
    
    // Check audit compliance
    if (config.auditLevel === 'basic' && tier !== PrivacyTier.BASIC) {
      violations.push('Higher tiers require detailed audit logging')
    }
    
    // Generate recommendations
    if (tier === PrivacyTier.BASIC) {
      recommendations.push('Consider upgrading to Premium for enhanced privacy')
    }
    
    if (tier === PrivacyTier.PREMIUM) {
      recommendations.push('Enterprise tier offers on-premises processing for maximum privacy')
    }
    
    const riskLevel = violations.length > 2 ? 'high' : violations.length > 0 ? 'medium' : 'low'
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      riskLevel,
      lastChecked: new Date().toISOString()
    }
  }

  /**
   * Log audit entry
   */
  async logAudit(entry: Partial<AuditLogEntry>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      action: entry.action || 'unknown',
      privacyTier: entry.privacyTier || PrivacyTier.BASIC,
      dataType: entry.dataType || 'unknown',
      metadata: entry.metadata || {},
      ...entry
    }
    
    this.auditLogs.push(fullEntry)
    
    // In a real implementation, this would be sent to a secure audit service
    console.log('Audit log:', fullEntry)
  }

  /**
   * Get audit logs for compliance reporting
   */
  getAuditLogs(
    startDate?: Date, 
    endDate?: Date, 
    tier?: PrivacyTier
  ): AuditLogEntry[] {
    let logs = this.auditLogs
    
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate)
    }
    
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate)
    }
    
    if (tier) {
      logs = logs.filter(log => log.privacyTier === tier)
    }
    
    return logs
  }

  /**
   * Get privacy tier recommendations based on usage
   */
  getPrivacyTierRecommendations(
    monthlyFormCount: number,
    sensitivityLevel: 'low' | 'medium' | 'high',
    complianceRequirements: string[]
  ): { recommendedTier: PrivacyTier; reasoning: string; costEstimate: number } {
    
    // Calculate cost estimates
    const basicCost = monthlyFormCount * PRIVACY_TIER_CONFIGS[PrivacyTier.BASIC].costPerForm
    const premiumCost = monthlyFormCount * PRIVACY_TIER_CONFIGS[PrivacyTier.PREMIUM].costPerForm
    
    // Determine recommendation based on criteria
    if (complianceRequirements.includes('on-premises') || 
        complianceRequirements.includes('zero-retention') ||
        sensitivityLevel === 'high') {
      return {
        recommendedTier: PrivacyTier.ENTERPRISE,
        reasoning: 'High sensitivity data or strict compliance requirements require Enterprise tier',
        costEstimate: 0 // Custom pricing
      }
    }
    
    if (monthlyFormCount > 100 || 
        sensitivityLevel === 'medium' ||
        complianceRequirements.includes('enhanced-encryption')) {
      return {
        recommendedTier: PrivacyTier.PREMIUM,
        reasoning: 'Medium to high usage or enhanced privacy needs benefit from Premium tier',
        costEstimate: premiumCost
      }
    }
    
    return {
      recommendedTier: PrivacyTier.BASIC,
      reasoning: 'Basic tier provides good value for standard privacy needs',
      costEstimate: basicCost
    }
  }

  /**
   * Initialize encryption keys
   */
  private initializeEncryptionKeys(): EncryptionKeys {
    // In a real implementation, these would be loaded from secure key management
    return {
      standard: process.env.REACT_APP_ENCRYPTION_KEY_STANDARD || 'standard-key-placeholder',
      advanced: process.env.REACT_APP_ENCRYPTION_KEY_ADVANCED || 'advanced-key-placeholder',
      enterprise: process.env.REACT_APP_ENCRYPTION_KEY_ENTERPRISE || 'enterprise-key-placeholder'
    }
  }

  /**
   * Setup retention policies
   */
  private setupRetentionPolicies(): void {
    Object.values(PrivacyTier).forEach(tier => {
      const config = PRIVACY_TIER_CONFIGS[tier]
      this.retentionPolicies.set(tier, {
        tier,
        retentionPeriod: config.deleteAfterSeconds,
        autoDelete: config.autoDelete,
        encryptionRequired: true,
        auditRequired: config.auditLevel !== 'basic',
        backupAllowed: tier === PrivacyTier.BASIC
      })
    })
  }

  /**
   * Get encryption key for level
   */
  private getEncryptionKey(level: string): string {
    switch (level) {
      case 'standard': return this.encryptionKeys.standard
      case 'advanced': return this.encryptionKeys.advanced
      case 'enterprise': return this.encryptionKeys.enterprise
      default: return this.encryptionKeys.standard
    }
  }

  /**
   * Get max file size for tier
   */
  private getMaxFileSize(tier: PrivacyTier): number {
    switch (tier) {
      case PrivacyTier.BASIC: return 10 * 1024 * 1024 // 10MB
      case PrivacyTier.PREMIUM: return 50 * 1024 * 1024 // 50MB
      case PrivacyTier.ENTERPRISE: return 100 * 1024 * 1024 // 100MB
      default: return 10 * 1024 * 1024
    }
  }

  /**
   * Get allowed file types
   */
  private getAllowedFileTypes(): string[] {
    return [
      'application/pdf',
      'application/xml',
      'text/xml',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }

  /**
   * Get processing priority for tier
   */
  private getProcessingPriority(tier: PrivacyTier): 'normal' | 'high' | 'immediate' {
    switch (tier) {
      case PrivacyTier.BASIC: return 'normal'
      case PrivacyTier.PREMIUM: return 'high'
      case PrivacyTier.ENTERPRISE: return 'immediate'
      default: return 'normal'
    }
  }

  /**
   * Perform encryption (simplified implementation)
   */
  private async performEncryption(data: string, key: string, level: string): Promise<string> {
    // This is a simplified implementation
    // In production, use proper encryption libraries like crypto-js or Web Crypto API
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    
    // Simple XOR encryption for demonstration
    const keyBytes = encoder.encode(key)
    const encrypted = new Uint8Array(dataBytes.length)
    
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    
    return btoa(String.fromCharCode(...encrypted))
  }

  /**
   * Perform decryption (simplified implementation)
   */
  private async performDecryption(encryptedData: string, key: string, level: string): Promise<string> {
    // This is a simplified implementation
    const encrypted = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
    const encoder = new TextEncoder()
    const keyBytes = encoder.encode(key)
    const decrypted = new Uint8Array(encrypted.length)
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Default privacy manager instance
 */
export const privacyManager = new PrivacyManager()
