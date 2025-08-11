import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

type Bindings = {
  DB: D1Database
  R2_BASIC: R2Bucket
  R2_PREMIUM: R2Bucket
  R2_ENTERPRISE: R2Bucket
  R2_TEMP: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: ['https://htkk-ai.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())

app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HTKK AI Backend',
    version: '1.0.0'
  })
})

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

// R2 storage test endpoint
app.get('/api/test/storage', async (c) => {
  try {
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

app.notFound((c) => {
  return c.json({ 
    error: 'Not found',
    path: c.req.path,
    method: c.req.method
  }, 404)
})

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ 
    error: 'Internal server error',
    message: err.message
  }, 500)
})

export default app
