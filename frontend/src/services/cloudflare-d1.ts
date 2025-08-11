/**
 * Cloudflare D1 Database Service
 * 
 * Handles form drafts, audit logs, metadata, and user sessions
 * Integrates with privacy-aware policies and HTKK form system
 */

import { 
  HTKKFormData, 
  PrivacyTier,
  HTKKTemplate,
  BusinessAssessment,
  ConsultationResult
} from '../types/htkk-schema'
import { privacyManager } from './privacy-manager'

/**
 * D1 Database configuration
 */
interface D1Config {
  databaseId: string
  apiToken: string
  accountId: string
  endpoint: string
}

/**
 * Form draft stored in D1
 */
interface FormDraft {
  id: string
  userId?: string
  sessionId: string
  formCode: string
  templateVersion: string
  formData: HTKKFormData
  privacyTier: PrivacyTier
  createdAt: string
  updatedAt: string
  expiresAt?: string
  status: 'draft' | 'completed' | 'submitted' | 'expired'
  metadata: {
    progress: number // 0-100
    lastSection?: string
    validationErrors?: string[]
    autoSaveCount: number
  }
}

/**
 * User session data
 */
interface UserSession {
  sessionId: string
  userId?: string
  privacyTier: PrivacyTier
  createdAt: string
  lastActivity: string
  expiresAt: string
  metadata: {
    ipAddress?: string
    userAgent?: string
    formsAccessed: string[]
    documentsUploaded: number
    consultationsCompleted: number
  }
}

/**
 * Audit log entry for D1 storage
 */
interface D1AuditLog {
  id: string
  timestamp: string
  userId?: string
  sessionId: string
  action: string
  privacyTier: PrivacyTier
  dataType: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

/**
 * Template cache entry
 */
interface TemplateCacheEntry {
  formCode: string
  version: string
  template: HTKKTemplate
  cachedAt: string
  expiresAt: string
  downloadCount: number
  lastAccessed: string
}

/**
 * Business assessment cache
 */
interface AssessmentCache {
  id: string
  userId?: string
  sessionId: string
  assessment: BusinessAssessment
  consultation: ConsultationResult
  createdAt: string
  expiresAt: string
  usageCount: number
}

/**
 * Processing job tracking
 */
interface ProcessingJob {
  id: string
  sessionId: string
  userId?: string
  jobType: 'ocr' | 'mapping' | 'validation' | 'export'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  privacyTier: PrivacyTier
  inputFiles: string[]
  outputData?: any
  createdAt: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  metadata: Record<string, any>
}

/**
 * Query result interface
 */
interface D1QueryResult<T = any> {
  success: boolean
  results: T[]
  meta: {
    duration: number
    rows_read: number
    rows_written: number
  }
  error?: string
}

/**
 * Cloudflare D1 Database Service
 */
export class CloudflareD1Service {
  private config: D1Config
  private initialized: boolean = false

  constructor() {
    this.config = this.initializeConfig()
  }

  /**
   * Initialize database and create tables if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.createTables()
      this.initialized = true
      console.log('D1 Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize D1 database:', error)
      throw error
    }
  }

  /**
   * Save form draft
   */
  async saveDraft(
    formData: HTKKFormData,
    sessionId: string,
    userId?: string,
    privacyTier: PrivacyTier = PrivacyTier.BASIC
  ): Promise<string> {
    await this.ensureInitialized()

    const draftId = this.generateId('draft')
    const now = new Date().toISOString()
    
    // Calculate expiration based on privacy tier
    const privacyConfig = privacyManager.getPrivacyConfig(privacyTier)
    const expiresAt = privacyConfig.deleteAfterSeconds > 0 
      ? new Date(Date.now() + (privacyConfig.deleteAfterSeconds * 1000)).toISOString()
      : undefined

    // Encrypt form data if required
    let encryptedFormData: any = formData
    if (privacyTier !== PrivacyTier.BASIC) {
      const encrypted = await privacyManager.encryptData(
        JSON.stringify(formData),
        privacyTier
      )
      encryptedFormData = { ...formData, _encrypted: encrypted }
    }

    const draft: FormDraft = {
      id: draftId,
      userId,
      sessionId,
      formCode: formData.formCode,
      templateVersion: formData.templateVersion,
      formData: encryptedFormData,
      privacyTier,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      status: 'draft',
      metadata: {
        progress: this.calculateProgress(formData),
        autoSaveCount: 1
      }
    }

    const query = `
      INSERT INTO form_drafts (
        id, user_id, session_id, form_code, template_version, 
        form_data, privacy_tier, created_at, updated_at, expires_at, 
        status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        form_data = excluded.form_data,
        updated_at = excluded.updated_at,
        metadata = json_patch(metadata, excluded.metadata)
    `

    const params = [
      draft.id,
      draft.userId || null,
      draft.sessionId,
      draft.formCode,
      draft.templateVersion,
      JSON.stringify(draft.formData),
      draft.privacyTier,
      draft.createdAt,
      draft.updatedAt,
      draft.expiresAt || null,
      draft.status,
      JSON.stringify(draft.metadata)
    ]

    await this.executeQuery(query, params)

    // Log draft save
    await this.logAudit({
      action: 'draft_saved',
      sessionId,
      userId,
      privacyTier,
      dataType: 'form_draft',
      metadata: {
        draftId,
        formCode: formData.formCode,
        progress: draft.metadata.progress
      }
    })

    return draftId
  }

  /**
   * Load form draft
   */
  async loadDraft(draftId: string): Promise<FormDraft | null> {
    await this.ensureInitialized()

    const query = `
      SELECT * FROM form_drafts 
      WHERE id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `

    const result = await this.executeQuery<FormDraft>(query, [draftId])
    
    if (result.results.length === 0) {
      return null
    }

    const draft = result.results[0]

    // Decrypt form data if needed
    if ((draft.formData as any)._encrypted) {
      try {
        const decrypted = await privacyManager.decryptData(
          (draft.formData as any)._encrypted,
          draft.privacyTier
        )
        draft.formData = JSON.parse(decrypted)
      } catch (error) {
        console.error('Failed to decrypt form data:', error)
        return null
      }
    }

    // Update last accessed
    await this.executeQuery(
      'UPDATE form_drafts SET updated_at = datetime("now") WHERE id = ?',
      [draftId]
    )

    return draft
  }

  /**
   * List drafts for user/session
   */
  async listDrafts(
    sessionId: string,
    userId?: string,
    limit: number = 50
  ): Promise<FormDraft[]> {
    await this.ensureInitialized()

    const query = `
      SELECT id, form_code, template_version, privacy_tier, created_at, 
             updated_at, status, metadata
      FROM form_drafts 
      WHERE session_id = ? AND (user_id = ? OR user_id IS NULL)
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY updated_at DESC
      LIMIT ?
    `

    const result = await this.executeQuery<Partial<FormDraft>>(
      query, 
      [sessionId, userId || null, limit]
    )

    return result.results as FormDraft[]
  }

  /**
   * Delete draft
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    await this.ensureInitialized()

    const query = 'DELETE FROM form_drafts WHERE id = ?'
    const result = await this.executeQuery(query, [draftId])

    return result.meta.rows_written > 0
  }

  /**
   * Create or update user session
   */
  async createSession(
    sessionId: string,
    privacyTier: PrivacyTier,
    userId?: string,
    metadata: Partial<UserSession['metadata']> = {}
  ): Promise<void> {
    await this.ensureInitialized()

    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours

    const session: UserSession = {
      sessionId,
      userId,
      privacyTier,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      metadata: {
        formsAccessed: [],
        documentsUploaded: 0,
        consultationsCompleted: 0,
        ...metadata
      }
    }

    const query = `
      INSERT INTO user_sessions (
        session_id, user_id, privacy_tier, created_at, 
        last_activity, expires_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        last_activity = excluded.last_activity,
        metadata = json_patch(metadata, excluded.metadata)
    `

    const params = [
      session.sessionId,
      session.userId || null,
      session.privacyTier,
      session.createdAt,
      session.lastActivity,
      session.expiresAt,
      JSON.stringify(session.metadata)
    ]

    await this.executeQuery(query, params)
  }

  /**
   * Get user session
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    await this.ensureInitialized()

    const query = `
      SELECT * FROM user_sessions 
      WHERE session_id = ? AND expires_at > datetime('now')
    `

    const result = await this.executeQuery<UserSession>(query, [sessionId])
    
    return result.results.length > 0 ? result.results[0] : null
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(
    sessionId: string,
    activity: Partial<UserSession['metadata']>
  ): Promise<void> {
    await this.ensureInitialized()

    const query = `
      UPDATE user_sessions 
      SET last_activity = datetime('now'),
          metadata = json_patch(metadata, ?)
      WHERE session_id = ?
    `

    await this.executeQuery(query, [JSON.stringify(activity), sessionId])
  }

  /**
   * Log audit entry
   */
  async logAudit(entry: Partial<D1AuditLog>): Promise<void> {
    await this.ensureInitialized()

    const auditEntry: D1AuditLog = {
      id: this.generateId('audit'),
      timestamp: new Date().toISOString(),
      sessionId: entry.sessionId || 'unknown',
      action: entry.action || 'unknown',
      privacyTier: entry.privacyTier || PrivacyTier.BASIC,
      dataType: entry.dataType || 'unknown',
      metadata: entry.metadata || {},
      severity: entry.severity || 'info',
      ...entry
    }

    const query = `
      INSERT INTO audit_logs (
        id, timestamp, user_id, session_id, action, 
        privacy_tier, data_type, metadata, ip_address, 
        user_agent, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      auditEntry.id,
      auditEntry.timestamp,
      auditEntry.userId || null,
      auditEntry.sessionId,
      auditEntry.action,
      auditEntry.privacyTier,
      auditEntry.dataType,
      JSON.stringify(auditEntry.metadata),
      auditEntry.ipAddress || null,
      auditEntry.userAgent || null,
      auditEntry.severity
    ]

    await this.executeQuery(query, params)
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    sessionId?: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<D1AuditLog[]> {
    await this.ensureInitialized()

    let query = 'SELECT * FROM audit_logs WHERE 1=1'
    const params: any[] = []

    if (sessionId) {
      query += ' AND session_id = ?'
      params.push(sessionId)
    }

    if (userId) {
      query += ' AND user_id = ?'
      params.push(userId)
    }

    if (startDate) {
      query += ' AND timestamp >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND timestamp <= ?'
      params.push(endDate)
    }

    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const result = await this.executeQuery<D1AuditLog>(query, params)
    return result.results
  }

  /**
   * Cache template
   */
  async cacheTemplate(template: HTKKTemplate): Promise<void> {
    await this.ensureInitialized()

    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days

    const cacheEntry: TemplateCacheEntry = {
      formCode: template.formCode,
      version: template.version,
      template,
      cachedAt: now,
      expiresAt,
      downloadCount: 1,
      lastAccessed: now
    }

    const query = `
      INSERT INTO template_cache (
        form_code, version, template, cached_at, expires_at, 
        download_count, last_accessed
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(form_code, version) DO UPDATE SET
        template = excluded.template,
        last_accessed = excluded.last_accessed,
        download_count = download_count + 1
    `

    const params = [
      cacheEntry.formCode,
      cacheEntry.version,
      JSON.stringify(cacheEntry.template),
      cacheEntry.cachedAt,
      cacheEntry.expiresAt,
      cacheEntry.downloadCount,
      cacheEntry.lastAccessed
    ]

    await this.executeQuery(query, params)
  }

  /**
   * Get cached template
   */
  async getCachedTemplate(formCode: string, version?: string): Promise<HTKKTemplate | null> {
    await this.ensureInitialized()

    let query = `
      SELECT template FROM template_cache 
      WHERE form_code = ? AND expires_at > datetime('now')
    `
    const params = [formCode]

    if (version) {
      query += ' AND version = ?'
      params.push(version)
    }

    query += ' ORDER BY cached_at DESC LIMIT 1'

    const result = await this.executeQuery<{ template: string }>(query, params)
    
    if (result.results.length === 0) {
      return null
    }

    // Update access count
    await this.executeQuery(
      'UPDATE template_cache SET last_accessed = datetime("now"), download_count = download_count + 1 WHERE form_code = ?',
      [formCode]
    )

    return JSON.parse(result.results[0].template)
  }

  /**
   * Save business assessment
   */
  async saveAssessment(
    assessment: BusinessAssessment,
    consultation: ConsultationResult,
    sessionId: string,
    userId?: string
  ): Promise<string> {
    await this.ensureInitialized()

    const assessmentId = this.generateId('assessment')
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 days

    const cache: AssessmentCache = {
      id: assessmentId,
      userId,
      sessionId,
      assessment,
      consultation,
      createdAt: now,
      expiresAt,
      usageCount: 1
    }

    const query = `
      INSERT INTO assessment_cache (
        id, user_id, session_id, assessment, consultation,
        created_at, expires_at, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      cache.id,
      cache.userId || null,
      cache.sessionId,
      JSON.stringify(cache.assessment),
      JSON.stringify(cache.consultation),
      cache.createdAt,
      cache.expiresAt,
      cache.usageCount
    ]

    await this.executeQuery(query, params)
    return assessmentId
  }

  /**
   * Track processing job
   */
  async createProcessingJob(
    jobType: ProcessingJob['jobType'],
    sessionId: string,
    privacyTier: PrivacyTier,
    inputFiles: string[],
    userId?: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    await this.ensureInitialized()

    const jobId = this.generateId('job')
    const now = new Date().toISOString()

    const job: ProcessingJob = {
      id: jobId,
      sessionId,
      userId,
      jobType,
      status: 'pending',
      privacyTier,
      inputFiles,
      createdAt: now,
      metadata
    }

    const query = `
      INSERT INTO processing_jobs (
        id, session_id, user_id, job_type, status, privacy_tier,
        input_files, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      job.id,
      job.sessionId,
      job.userId || null,
      job.jobType,
      job.status,
      job.privacyTier,
      JSON.stringify(job.inputFiles),
      job.createdAt,
      JSON.stringify(job.metadata)
    ]

    await this.executeQuery(query, params)
    return jobId
  }

  /**
   * Update processing job status
   */
  async updateProcessingJob(
    jobId: string,
    status: ProcessingJob['status'],
    outputData?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.ensureInitialized()

    const now = new Date().toISOString()
    let query = 'UPDATE processing_jobs SET status = ?, updated_at = ?'
    const params = [status, now]

    if (status === 'processing' && !outputData) {
      query += ', started_at = ?'
      params.push(now)
    }

    if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?'
      params.push(now)
    }

    if (outputData) {
      query += ', output_data = ?'
      params.push(JSON.stringify(outputData))
    }

    if (errorMessage) {
      query += ', error_message = ?'
      params.push(errorMessage)
    }

    query += ' WHERE id = ?'
    params.push(jobId)

    await this.executeQuery(query, params)
  }

  /**
   * Get processing job
   */
  async getProcessingJob(jobId: string): Promise<ProcessingJob | null> {
    await this.ensureInitialized()

    const query = 'SELECT * FROM processing_jobs WHERE id = ?'
    const result = await this.executeQuery<ProcessingJob>(query, [jobId])
    
    return result.results.length > 0 ? result.results[0] : null
  }

  /**
   * Clean up expired data
   */
  async cleanupExpiredData(): Promise<{
    draftsDeleted: number
    sessionsDeleted: number
    templatesDeleted: number
    assessmentsDeleted: number
  }> {
    await this.ensureInitialized()

    const results = {
      draftsDeleted: 0,
      sessionsDeleted: 0,
      templatesDeleted: 0,
      assessmentsDeleted: 0
    }

    // Clean up expired drafts
    const draftResult = await this.executeQuery(
      'DELETE FROM form_drafts WHERE expires_at IS NOT NULL AND expires_at <= datetime("now")'
    )
    results.draftsDeleted = draftResult.meta.rows_written

    // Clean up expired sessions
    const sessionResult = await this.executeQuery(
      'DELETE FROM user_sessions WHERE expires_at <= datetime("now")'
    )
    results.sessionsDeleted = sessionResult.meta.rows_written

    // Clean up expired templates
    const templateResult = await this.executeQuery(
      'DELETE FROM template_cache WHERE expires_at <= datetime("now")'
    )
    results.templatesDeleted = templateResult.meta.rows_written

    // Clean up expired assessments
    const assessmentResult = await this.executeQuery(
      'DELETE FROM assessment_cache WHERE expires_at <= datetime("now")'
    )
    results.assessmentsDeleted = assessmentResult.meta.rows_written

    return results
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalDrafts: number
    activeSessions: number
    cachedTemplates: number
    auditLogs: number
    processingJobs: number
  }> {
    await this.ensureInitialized()

    const stats = {
      totalDrafts: 0,
      activeSessions: 0,
      cachedTemplates: 0,
      auditLogs: 0,
      processingJobs: 0
    }

    // Count drafts
    const draftResult = await this.executeQuery('SELECT COUNT(*) as count FROM form_drafts')
    stats.totalDrafts = draftResult.results[0]?.count || 0

    // Count active sessions
    const sessionResult = await this.executeQuery(
      'SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > datetime("now")'
    )
    stats.activeSessions = sessionResult.results[0]?.count || 0

    // Count cached templates
    const templateResult = await this.executeQuery('SELECT COUNT(*) as count FROM template_cache')
    stats.cachedTemplates = templateResult.results[0]?.count || 0

    // Count audit logs
    const auditResult = await this.executeQuery('SELECT COUNT(*) as count FROM audit_logs')
    stats.auditLogs = auditResult.results[0]?.count || 0

    // Count processing jobs
    const jobResult = await this.executeQuery('SELECT COUNT(*) as count FROM processing_jobs')
    stats.processingJobs = jobResult.results[0]?.count || 0

    return stats
  }

  /**
   * Execute D1 query
   */
  private async executeQuery<T = any>(
    query: string, 
    params: any[] = []
  ): Promise<D1QueryResult<T>> {
    try {
      // In a real implementation, this would use the Cloudflare D1 API
      // For now, we'll simulate the query execution
      
      console.log('D1 Query:', query, params)
      
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return {
        success: true,
        results: [] as T[],
        meta: {
          duration: 10,
          rows_read: 0,
          rows_written: params.length > 0 ? 1 : 0
        }
      }
    } catch (error) {
      return {
        success: false,
        results: [],
        meta: {
          duration: 0,
          rows_read: 0,
          rows_written: 0
        },
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Form drafts table
      `CREATE TABLE IF NOT EXISTS form_drafts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT NOT NULL,
        form_code TEXT NOT NULL,
        template_version TEXT NOT NULL,
        form_data TEXT NOT NULL,
        privacy_tier TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        metadata TEXT NOT NULL DEFAULT '{}'
      )`,

      // User sessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        privacy_tier TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_activity TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}'
      )`,

      // Audit logs table
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT NOT NULL,
        action TEXT NOT NULL,
        privacy_tier TEXT NOT NULL,
        data_type TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        severity TEXT NOT NULL DEFAULT 'info'
      )`,

      // Template cache table
      `CREATE TABLE IF NOT EXISTS template_cache (
        form_code TEXT NOT NULL,
        version TEXT NOT NULL,
        template TEXT NOT NULL,
        cached_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        download_count INTEGER NOT NULL DEFAULT 0,
        last_accessed TEXT NOT NULL,
        PRIMARY KEY (form_code, version)
      )`,

      // Assessment cache table
      `CREATE TABLE IF NOT EXISTS assessment_cache (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT NOT NULL,
        assessment TEXT NOT NULL,
        consultation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0
      )`,

      // Processing jobs table
      `CREATE TABLE IF NOT EXISTS processing_jobs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        privacy_tier TEXT NOT NULL,
        input_files TEXT NOT NULL,
        output_data TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        metadata TEXT NOT NULL DEFAULT '{}'
      )`
    ]

    for (const table of tables) {
      await this.executeQuery(table)
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_form_drafts_session ON form_drafts(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON form_drafts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_form_drafts_expires ON form_drafts(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_template_expires ON template_cache(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_session ON processing_jobs(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status)'
    ]

    for (const index of indexes) {
      await this.executeQuery(index)
    }
  }

  /**
   * Initialize D1 configuration
   */
  private initializeConfig(): D1Config {
    return {
      databaseId: process.env.REACT_APP_D1_DATABASE_ID || '',
      apiToken: process.env.REACT_APP_D1_API_TOKEN || '',
      accountId: process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID || '',
      endpoint: process.env.REACT_APP_D1_ENDPOINT || 'https://api.cloudflare.com/client/v4'
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * Calculate form progress percentage
   */
  private calculateProgress(formData: HTKKFormData): number {
    // Simple progress calculation based on filled fields
    const totalFields = Object.keys(formData.data).length
    const filledFields = Object.values(formData.data).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
  }
}

/**
 * Default D1 service instance
 */
export const cloudflareD1Service = new CloudflareD1Service()
