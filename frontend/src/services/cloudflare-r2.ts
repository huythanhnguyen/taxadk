/**
 * Cloudflare R2 Storage Service
 * 
 * Handles document upload, storage, and management with privacy-aware policies
 * Integrates with multi-tier privacy system
 */

import { 
  PrivacyTier, 
  DocumentUploadConfig,
  PrivacyConfig 
} from '../types/htkk-schema'
import { privacyManager } from './privacy-manager'

/**
 * Upload result from R2
 */
interface R2UploadResult {
  success: boolean
  fileId: string
  url: string
  size: number
  contentType: string
  uploadedAt: string
  expiresAt?: string
  encryptionLevel: string
  privacyTier: PrivacyTier
  errors?: string[]
}

/**
 * File metadata stored with upload
 */
interface R2FileMetadata {
  originalName: string
  size: number
  contentType: string
  uploadedAt: string
  userId?: string
  sessionId: string
  privacyTier: PrivacyTier
  encryptionLevel: string
  autoDeleteAt?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  tags: string[]
}

/**
 * R2 bucket configuration
 */
interface R2BucketConfig {
  bucketName: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl?: string
}

/**
 * Download options
 */
interface DownloadOptions {
  decrypt?: boolean
  privacyTier?: PrivacyTier
  expiresIn?: number // seconds
  contentDisposition?: 'inline' | 'attachment'
}

/**
 * Cleanup job configuration
 */
interface CleanupJob {
  fileId: string
  deleteAt: Date
  privacyTier: PrivacyTier
  reason: string
}

/**
 * Cloudflare R2 Storage Service
 */
export class CloudflareR2Service {
  private bucketConfigs: Record<PrivacyTier, R2BucketConfig>
  private cleanupJobs: Map<string, CleanupJob> = new Map()
  private uploadInProgress: Set<string> = new Set()

  constructor() {
    this.bucketConfigs = this.initializeBucketConfigs()
    this.startCleanupScheduler()
  }

  /**
   * Upload document with privacy-aware configuration
   */
  async uploadDocument(
    file: File, 
    privacyTier: PrivacyTier,
    sessionId: string,
    userId?: string,
    tags: string[] = []
  ): Promise<R2UploadResult> {
    const fileId = this.generateFileId()
    
    try {
      // Check if upload is already in progress
      if (this.uploadInProgress.has(fileId)) {
        throw new Error('Upload already in progress for this file')
      }
      
      this.uploadInProgress.add(fileId)

      // Get upload configuration for privacy tier
      const uploadConfig = privacyManager.getDocumentUploadConfig(privacyTier)
      const privacyConfig = privacyManager.getPrivacyConfig(privacyTier)

      // Validate file
      await this.validateFile(file, uploadConfig)

      // Prepare file data
      const fileBuffer = await file.arrayBuffer()
      let fileData = new Uint8Array(fileBuffer)

      // Encrypt if required
      if (uploadConfig.encryptionKey) {
        const encrypted = await privacyManager.encryptData(
          this.arrayBufferToBase64(fileBuffer), 
          privacyTier
        )
        fileData = new TextEncoder().encode(encrypted)
      }

      // Prepare metadata
      const metadata: R2FileMetadata = {
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        userId,
        sessionId,
        privacyTier,
        encryptionLevel: privacyConfig.encryption,
        processingStatus: 'pending',
        tags: [...tags, `tier:${privacyTier}`, `session:${sessionId}`]
      }

      // Set auto-delete time
      if (privacyConfig.autoDelete && privacyConfig.deleteAfterSeconds > 0) {
        metadata.autoDeleteAt = new Date(
          Date.now() + (privacyConfig.deleteAfterSeconds * 1000)
        ).toISOString()
      }

      // Get bucket configuration
      const bucketConfig = this.bucketConfigs[privacyTier]

      // Upload to R2
      const uploadResult = await this.performR2Upload(
        fileId,
        fileData,
        metadata,
        bucketConfig
      )

      // Schedule cleanup if required
      if (metadata.autoDeleteAt) {
        await this.scheduleCleanup(fileId, new Date(metadata.autoDeleteAt), privacyTier)
      }

      // Log upload
      await privacyManager.logAudit({
        action: 'document_uploaded',
        privacyTier,
        dataType: 'document',
        metadata: {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          encryptionLevel: privacyConfig.encryption
        },
        userId,
        sessionId
      })

      return {
        success: true,
        fileId,
        url: uploadResult.url,
        size: file.size,
        contentType: file.type,
        uploadedAt: metadata.uploadedAt,
        expiresAt: metadata.autoDeleteAt,
        encryptionLevel: privacyConfig.encryption,
        privacyTier
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Log upload failure
      await privacyManager.logAudit({
        action: 'upload_failed',
        privacyTier,
        dataType: 'document',
        metadata: {
          fileId,
          fileName: file.name,
          error: errorMessage
        },
        userId,
        sessionId
      })

      return {
        success: false,
        fileId,
        url: '',
        size: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        encryptionLevel: privacyManager.getPrivacyConfig(privacyTier).encryption,
        privacyTier,
        errors: [errorMessage]
      }

    } finally {
      this.uploadInProgress.delete(fileId)
    }
  }

  /**
   * Download document with decryption
   */
  async downloadDocument(
    fileId: string, 
    options: DownloadOptions = {}
  ): Promise<Blob | null> {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(fileId)
      if (!metadata) {
        throw new Error('File not found')
      }

      // Check if file has expired
      if (metadata.autoDeleteAt && new Date() > new Date(metadata.autoDeleteAt)) {
        throw new Error('File has expired and been deleted')
      }

      // Get bucket configuration
      const bucketConfig = this.bucketConfigs[metadata.privacyTier]

      // Download from R2
      const fileData = await this.performR2Download(fileId, bucketConfig)

      // Decrypt if needed
      let finalData = fileData
      if (options.decrypt && metadata.encryptionLevel !== 'none') {
        const decrypted = await privacyManager.decryptData(
          this.arrayBufferToBase64(fileData),
          metadata.privacyTier
        )
        finalData = this.base64ToArrayBuffer(decrypted)
      }

      // Log download
      await privacyManager.logAudit({
        action: 'document_downloaded',
        privacyTier: metadata.privacyTier,
        dataType: 'document',
        metadata: {
          fileId,
          fileName: metadata.originalName,
          decrypted: options.decrypt || false
        }
      })

      return new Blob([finalData], { type: metadata.contentType })

    } catch (error) {
      console.error('Download failed:', error)
      return null
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<R2FileMetadata | null> {
    try {
      // In a real implementation, this would query R2 metadata
      // For now, we'll simulate metadata retrieval
      
      // This would typically be stored in Cloudflare D1 or as R2 object metadata
      const mockMetadata: R2FileMetadata = {
        originalName: 'document.pdf',
        size: 1024000,
        contentType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        sessionId: 'session_123',
        privacyTier: PrivacyTier.PREMIUM,
        encryptionLevel: 'advanced',
        processingStatus: 'completed',
        tags: ['tier:premium']
      }

      return mockMetadata
    } catch (error) {
      console.error('Failed to get file metadata:', error)
      return null
    }
  }

  /**
   * Delete document immediately
   */
  async deleteDocument(fileId: string, reason: string = 'manual'): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId)
      if (!metadata) {
        return false
      }

      // Get bucket configuration
      const bucketConfig = this.bucketConfigs[metadata.privacyTier]

      // Delete from R2
      await this.performR2Delete(fileId, bucketConfig)

      // Remove from cleanup jobs
      this.cleanupJobs.delete(fileId)

      // Log deletion
      await privacyManager.logAudit({
        action: 'document_deleted',
        privacyTier: metadata.privacyTier,
        dataType: 'document',
        metadata: {
          fileId,
          fileName: metadata.originalName,
          reason
        }
      })

      return true
    } catch (error) {
      console.error('Delete failed:', error)
      return false
    }
  }

  /**
   * List documents for session
   */
  async listDocuments(
    sessionId: string, 
    privacyTier?: PrivacyTier
  ): Promise<R2FileMetadata[]> {
    try {
      // In a real implementation, this would query R2 or D1
      // For now, return empty array
      return []
    } catch (error) {
      console.error('List documents failed:', error)
      return []
    }
  }

  /**
   * Get upload URL for direct upload
   */
  async getUploadUrl(
    fileId: string,
    privacyTier: PrivacyTier,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const bucketConfig = this.bucketConfigs[privacyTier]
      
      // Generate presigned URL for R2 upload
      // In a real implementation, this would use AWS SDK or R2 API
      const uploadUrl = `${bucketConfig.endpoint}/${bucketConfig.bucketName}/${fileId}`
      
      return uploadUrl
    } catch (error) {
      throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Schedule cleanup job
   */
  private async scheduleCleanup(
    fileId: string, 
    deleteAt: Date, 
    privacyTier: PrivacyTier
  ): Promise<void> {
    const job: CleanupJob = {
      fileId,
      deleteAt,
      privacyTier,
      reason: 'auto_cleanup'
    }

    this.cleanupJobs.set(fileId, job)

    // Schedule actual deletion
    const delay = deleteAt.getTime() - Date.now()
    if (delay > 0) {
      setTimeout(async () => {
        await this.deleteDocument(fileId, 'auto_cleanup')
      }, delay)
    }
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup check every hour
    setInterval(async () => {
      await this.runCleanupJobs()
    }, 60 * 60 * 1000)
  }

  /**
   * Run pending cleanup jobs
   */
  private async runCleanupJobs(): Promise<void> {
    const now = new Date()
    const jobsToRun: CleanupJob[] = []

    for (const [fileId, job] of this.cleanupJobs) {
      if (job.deleteAt <= now) {
        jobsToRun.push(job)
      }
    }

    for (const job of jobsToRun) {
      await this.deleteDocument(job.fileId, job.reason)
    }
  }

  /**
   * Validate file before upload
   */
  private async validateFile(file: File, config: DocumentUploadConfig): Promise<void> {
    // Check file size
    if (file.size > config.maxFileSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${config.maxFileSize}`)
    }

    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`)
    }

    // Additional validation can be added here
    // e.g., virus scanning, content validation, etc.
  }

  /**
   * Perform actual R2 upload
   */
  private async performR2Upload(
    fileId: string,
    fileData: Uint8Array,
    metadata: R2FileMetadata,
    bucketConfig: R2BucketConfig
  ): Promise<{ url: string }> {
    // In a real implementation, this would use the R2 API
    // For now, we'll simulate the upload
    
    const url = `${bucketConfig.endpoint}/${bucketConfig.bucketName}/${fileId}`
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { url }
  }

  /**
   * Perform actual R2 download
   */
  private async performR2Download(
    fileId: string,
    bucketConfig: R2BucketConfig
  ): Promise<ArrayBuffer> {
    // In a real implementation, this would fetch from R2
    // For now, return empty buffer
    return new ArrayBuffer(0)
  }

  /**
   * Perform actual R2 delete
   */
  private async performR2Delete(
    fileId: string,
    bucketConfig: R2BucketConfig
  ): Promise<void> {
    // In a real implementation, this would delete from R2
    // For now, just log the operation
    console.log(`Deleting ${fileId} from ${bucketConfig.bucketName}`)
  }

  /**
   * Initialize bucket configurations
   */
  private initializeBucketConfigs(): Record<PrivacyTier, R2BucketConfig> {
    return {
      [PrivacyTier.BASIC]: {
        bucketName: process.env.REACT_APP_R2_BUCKET_BASIC || 'htkk-basic',
        region: 'auto',
        endpoint: process.env.REACT_APP_R2_ENDPOINT || 'https://r2.cloudflarestorage.com',
        accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY || '',
        publicUrl: process.env.REACT_APP_R2_PUBLIC_URL_BASIC
      },
      [PrivacyTier.PREMIUM]: {
        bucketName: process.env.REACT_APP_R2_BUCKET_PREMIUM || 'htkk-premium',
        region: 'auto',
        endpoint: process.env.REACT_APP_R2_ENDPOINT || 'https://r2.cloudflarestorage.com',
        accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY || '',
        publicUrl: process.env.REACT_APP_R2_PUBLIC_URL_PREMIUM
      },
      [PrivacyTier.ENTERPRISE]: {
        bucketName: process.env.REACT_APP_R2_BUCKET_ENTERPRISE || 'htkk-enterprise',
        region: 'auto',
        endpoint: process.env.REACT_APP_R2_ENDPOINT_ENTERPRISE || 'https://r2.cloudflarestorage.com',
        accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID_ENTERPRISE || '',
        secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY_ENTERPRISE || '',
        publicUrl: process.env.REACT_APP_R2_PUBLIC_URL_ENTERPRISE
      }
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `file_${timestamp}_${random}`
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(privacyTier?: PrivacyTier): Promise<{
    totalFiles: number
    totalSize: number
    pendingCleanup: number
    byTier: Record<PrivacyTier, { files: number; size: number }>
  }> {
    // In a real implementation, this would query R2 and D1
    return {
      totalFiles: 0,
      totalSize: 0,
      pendingCleanup: this.cleanupJobs.size,
      byTier: {
        [PrivacyTier.BASIC]: { files: 0, size: 0 },
        [PrivacyTier.PREMIUM]: { files: 0, size: 0 },
        [PrivacyTier.ENTERPRISE]: { files: 0, size: 0 }
      }
    }
  }
}

/**
 * Default R2 service instance
 */
export const cloudflareR2Service = new CloudflareR2Service()
