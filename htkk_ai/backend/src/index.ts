import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database
  R2_BASIC: R2Bucket
  R2_PREMIUM: R2Bucket
  R2_ENTERPRISE: R2Bucket
  R2_TEMP: R2Bucket
  KV: KVNamespace
}

// Create Hono app with bindings
const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors({
  origin: ['https://htkk-ai.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HTKK AI Backend',
    version: '1.0.0'
  })
})

// Database test endpoint
app.get('/api/test/db', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM form_drafts').first()
    return c.json({
      status: 'ok',
      database: 'connected',
      tables: result
    })
  } catch (error) {
    return c.json({
      status: 'error',
      database: 'failed',
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Form drafts API
app.post('/api/forms/drafts', async (c) => {
  try {
    const body = await c.req.json()
    const { sessionId, formCode, formData, privacyTier = 'basic' } = body
    
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    await c.env.DB.prepare(`
      INSERT INTO form_drafts (
        id, session_id, form_code, template_version, form_data, 
        privacy_tier, created_at, updated_at, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      draftId,
      sessionId,
      formCode,
      '1.0',
      JSON.stringify(formData),
      privacyTier,
      now,
      now,
      'draft',
      JSON.stringify({ progress: 0 })
    ).run()
    
    return c.json({
      success: true,
      draftId,
      message: 'Draft saved successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Get form draft
app.get('/api/forms/drafts/:id', async (c) => {
  try {
    const draftId = c.req.param('id')
    
    const draft = await c.env.DB.prepare(`
      SELECT * FROM form_drafts WHERE id = ?
    `).bind(draftId).first()
    
    if (!draft) {
      return c.json({
        success: false,
        error: 'Draft not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      draft: {
        ...draft,
        formData: JSON.parse(draft.form_data as string),
        metadata: JSON.parse(draft.metadata as string)
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// List drafts for session
app.get('/api/forms/drafts', async (c) => {
  try {
    const sessionId = c.req.query('sessionId')
    
    if (!sessionId) {
      return c.json({
        success: false,
        error: 'sessionId is required'
      }, 400)
    }
    
    const drafts = await c.env.DB.prepare(`
      SELECT id, form_code, template_version, privacy_tier, 
             created_at, updated_at, status, metadata
      FROM form_drafts 
      WHERE session_id = ?
      ORDER BY updated_at DESC
      LIMIT 50
    `).bind(sessionId).all()
    
    return c.json({
      success: true,
      drafts: drafts.results.map(draft => ({
        ...draft,
        metadata: JSON.parse(draft.metadata as string)
      }))
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Session management
app.post('/api/sessions', async (c) => {
  try {
    const body = await c.req.json()
    const { sessionId, privacyTier = 'basic', metadata = {} } = body
    
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
    
    await c.env.DB.prepare(`
      INSERT INTO user_sessions (
        session_id, privacy_tier, created_at, last_activity, expires_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        last_activity = excluded.last_activity,
        metadata = excluded.metadata
    `).bind(
      sessionId,
      privacyTier,
      now,
      now,
      expiresAt,
      JSON.stringify(metadata)
    ).run()
    
    return c.json({
      success: true,
      sessionId,
      expiresAt
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Audit logging
app.post('/api/audit', async (c) => {
  try {
    const body = await c.req.json()
    const { sessionId, action, dataType, metadata = {}, severity = 'info' } = body
    
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, session_id, action, privacy_tier, 
        data_type, metadata, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId,
      now,
      sessionId,
      action,
      'basic',
      dataType,
      JSON.stringify(metadata),
      severity
    ).run()
    
    return c.json({
      success: true,
      auditId
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// File upload endpoint
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const privacyTier = (formData.get('privacyTier') as string) || 'basic'
    
    if (!file) {
      return c.json({
        success: false,
        error: 'No file provided'
      }, 400)
    }
    
    if (!sessionId) {
      return c.json({
        success: false,
        error: 'Session ID required'
      }, 400)
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({
        success: false,
        error: 'File size exceeds 10MB limit'
      }, 400)
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: 'File type not allowed'
      }, 400)
    }
    
    // Generate unique file key
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fileExtension = file.name.split('.').pop()
    const fileKey = `${sessionId}/${fileId}.${fileExtension}`
    
    // Select bucket based on privacy tier
    let bucket: R2Bucket
    switch (privacyTier) {
      case 'premium':
        bucket = c.env.R2_PREMIUM
        break
      case 'enterprise':
        bucket = c.env.R2_ENTERPRISE
        break
      default:
        bucket = c.env.R2_BASIC
    }
    
    // Upload file to R2
    const arrayBuffer = await file.arrayBuffer()
    await bucket.put(fileKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`
      },
      customMetadata: {
        originalName: file.name,
        sessionId: sessionId,
        privacyTier: privacyTier,
        uploadedAt: new Date().toISOString()
      }
    })
    
    // Log upload to audit
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, session_id, action, privacy_tier, 
        data_type, metadata, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      new Date().toISOString(),
      sessionId,
      'file_upload',
      privacyTier,
      'file',
      JSON.stringify({
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileKey
      }),
      'info'
    ).run()
    
    return c.json({
      success: true,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// File download endpoint
app.get('/api/files/:sessionId/:fileId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const fileId = c.req.param('fileId')
    const privacyTier = c.req.query('privacyTier') || 'basic'
    
    // Select bucket based on privacy tier
    let bucket: R2Bucket
    switch (privacyTier) {
      case 'premium':
        bucket = c.env.R2_PREMIUM
        break
      case 'enterprise':
        bucket = c.env.R2_ENTERPRISE
        break
      default:
        bucket = c.env.R2_BASIC
    }
    
    // Find file in bucket
    const objects = await bucket.list({ prefix: `${sessionId}/` })
    const fileObject = objects.objects.find(obj => obj.key.includes(fileId))
    
    if (!fileObject) {
      return c.json({
        success: false,
        error: 'File not found'
      }, 404)
    }
    
    const file = await bucket.get(fileObject.key)
    if (!file) {
      return c.json({
        success: false,
        error: 'File not found'
      }, 404)
    }
    
    // Return file with proper headers
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': file.httpMetadata?.contentDisposition || 'attachment',
        'Content-Length': file.size.toString()
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// List files endpoint
app.get('/api/files/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const privacyTier = c.req.query('privacyTier') || 'basic'
    
    // Select bucket based on privacy tier
    let bucket: R2Bucket
    switch (privacyTier) {
      case 'premium':
        bucket = c.env.R2_PREMIUM
        break
      case 'enterprise':
        bucket = c.env.R2_ENTERPRISE
        break
      default:
        bucket = c.env.R2_BASIC
    }
    
    // List files for session
    const objects = await bucket.list({ prefix: `${sessionId}/` })
    
    const files = objects.objects.map(obj => ({
      fileId: obj.key.split('/')[1]?.split('.')[0],
      fileName: obj.customMetadata?.originalName || obj.key.split('/')[1],
      fileSize: obj.size,
      uploadedAt: obj.customMetadata?.uploadedAt || obj.uploaded.toISOString(),
      fileKey: obj.key
    }))
    
    return c.json({
      success: true,
      files
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// R2 storage test endpoint
app.get('/api/test/storage', async (c) => {
  try {
    // Test basic bucket access
    const testKey = `test_${Date.now()}.txt`
    const testContent = 'R2 storage test'
    
    await c.env.R2_BASIC.put(testKey, testContent)
    const retrieved = await c.env.R2_BASIC.get(testKey)
    
    if (retrieved) {
      await c.env.R2_BASIC.delete(testKey)
      return c.json({
        status: 'ok',
        storage: 'connected',
        buckets: {
          basic: 'accessible',
          premium: 'accessible',
          enterprise: 'accessible',
          temp: 'accessible'
        }
      })
    } else {
      return c.json({
        status: 'error',
        storage: 'failed',
        error: 'Could not retrieve test file'
      }, 500)
    }
  } catch (error) {
    return c.json({
      status: 'error',
      storage: 'failed',
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Not found',
    path: c.req.path,
    method: c.req.method
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ 
    error: 'Internal server error',
    message: err.message
  }, 500)
})

export default app
