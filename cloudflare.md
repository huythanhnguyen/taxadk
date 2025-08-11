# 🚀 Cloudflare Deployment Guide - HTKK AI

**Hướng dẫn triển khai HTKK AI lên Cloudflare với đầy đủ services**

---

## 📋 OVERVIEW

HTKK AI sử dụng **Cloudflare Edge Platform** với các services:
- **Cloudflare Pages** - Frontend hosting
- **Cloudflare Workers** - Backend API
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Object storage
- **Cloudflare KV** - Key-value cache
- **Cloudflare Analytics** - Performance monitoring

---

## 🛠️ PREREQUISITES

### 1. **Cloudflare Account Setup**
```bash
# Tạo Cloudflare account (nếu chưa có)
# https://dash.cloudflare.com/sign-up

# Verify domain (optional nhưng recommended)
# Add domain to Cloudflare DNS
```

### 2. **Development Tools**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Verify login
wrangler whoami
```

### 3. **Project Structure Check**
```
htkk_ai/
├── frontend/          # React app
├── backend/           # Workers API
├── database/          # D1 schemas
├── storage/           # R2 configurations
└── cloudflare.md      # This guide
```

---

## 🗄️ PHASE 1: DATABASE SETUP (D1)

### 1. **Create D1 Database**
```bash
# Navigate to project root
cd htkk_ai

# Create D1 database
wrangler d1 create htkk-ai-db

# Output example:
# ✅ Successfully created DB 'htkk-ai-db'
# Database ID: 12345678-1234-1234-1234-123456789abc
```

### 2. **Configure wrangler.toml**
```toml
# htkk_ai/wrangler.toml
name = "htkk-ai"
main = "backend/src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "htkk-ai-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "htkk-ai-db"
database_id = "12345678-1234-1234-1234-123456789abc"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "htkk-ai-staging"
database_id = "your-staging-db-id"

[vars]
ENVIRONMENT = "production"
```

### 3. **Create Database Schema**
```bash
# Create schema file
mkdir -p database/migrations

# Create initial migration
cat > database/migrations/001_initial.sql << 'EOF'
-- Form drafts table
CREATE TABLE IF NOT EXISTS form_drafts (
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
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  privacy_tier TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
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
);

-- Template cache table
CREATE TABLE IF NOT EXISTS template_cache (
  form_code TEXT NOT NULL,
  version TEXT NOT NULL,
  template TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TEXT NOT NULL,
  PRIMARY KEY (form_code, version)
);

-- Assessment cache table
CREATE TABLE IF NOT EXISTS assessment_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT NOT NULL,
  assessment TEXT NOT NULL,
  consultation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
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
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form_drafts_session ON form_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_expires ON form_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_template_expires ON template_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_session ON processing_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
EOF

# Apply migration
wrangler d1 execute htkk-ai-db --file=database/migrations/001_initial.sql

# For production
wrangler d1 execute htkk-ai-db --env=production --file=database/migrations/001_initial.sql
```

---

## 📦 PHASE 2: STORAGE SETUP (R2)

### 1. **Create R2 Buckets**
```bash
# Create buckets for different privacy tiers
wrangler r2 bucket create htkk-ai-basic
wrangler r2 bucket create htkk-ai-premium  
wrangler r2 bucket create htkk-ai-enterprise

# Create temp bucket for processing
wrangler r2 bucket create htkk-ai-temp

# List buckets to verify
wrangler r2 bucket list
```

### 2. **Configure R2 in wrangler.toml**
```toml
# Add to wrangler.toml
[[env.production.r2_buckets]]
binding = "R2_BASIC"
bucket_name = "htkk-ai-basic"

[[env.production.r2_buckets]]
binding = "R2_PREMIUM"
bucket_name = "htkk-ai-premium"

[[env.production.r2_buckets]]
binding = "R2_ENTERPRISE"
bucket_name = "htkk-ai-enterprise"

[[env.production.r2_buckets]]
binding = "R2_TEMP"
bucket_name = "htkk-ai-temp"
```

### 3. **Setup CORS for R2**
```bash
# Create CORS configuration
cat > storage/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://htkk-ai.pages.dev",
        "https://your-custom-domain.com"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS (requires API token)
# This needs to be done via Cloudflare Dashboard or API
```

---

## 🔧 PHASE 3: BACKEND DEPLOYMENT (Workers)

### 1. **Create Backend Structure**
```bash
# Create backend directory
mkdir -p backend/src

# Create main worker file
cat > backend/src/index.ts << 'EOF'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Import your services
import { cloudflareD1Service } from '../../frontend/src/services/cloudflare-d1'
import { cloudflareR2Service } from '../../frontend/src/services/cloudflare-r2'

type Bindings = {
  DB: D1Database
  R2_BASIC: R2Bucket
  R2_PREMIUM: R2Bucket
  R2_ENTERPRISE: R2Bucket
  R2_TEMP: R2Bucket
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors({
  origin: ['https://htkk-ai.pages.dev', 'https://your-domain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.route('/api/forms', formsRouter)
app.route('/api/templates', templatesRouter)
app.route('/api/upload', uploadRouter)
app.route('/api/ai', aiRouter)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
EOF
```

### 2. **Install Dependencies**
```bash
cd backend

# Initialize package.json
npm init -y

# Install dependencies
npm install hono
npm install -D @cloudflare/workers-types typescript

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
EOF
```

### 3. **Deploy Backend**
```bash
# Test locally first
wrangler dev

# Deploy to staging
wrangler deploy --env=staging

# Deploy to production
wrangler deploy --env=production
```

---

## 🌐 PHASE 4: FRONTEND DEPLOYMENT (Pages)

### 1. **Prepare Frontend Build**
```bash
cd frontend

# Install dependencies
npm install

# Create production environment file
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://htkk-ai.your-subdomain.workers.dev
REACT_APP_CLOUDFLARE_ACCOUNT_ID=your-account-id
REACT_APP_D1_DATABASE_ID=your-d1-database-id
REACT_APP_ENVIRONMENT=production
EOF

# Build for production
npm run build
```

### 2. **Deploy to Cloudflare Pages**

#### **Option A: Git Integration (Recommended)**
```bash
# Push to GitHub/GitLab
git add .
git commit -m "Deploy HTKK AI to Cloudflare"
git push origin main

# In Cloudflare Dashboard:
# 1. Go to Pages
# 2. Connect to Git
# 3. Select repository
# 4. Configure build settings:
#    - Build command: npm run build
#    - Build output directory: build
#    - Root directory: frontend
```

#### **Option B: Direct Upload**
```bash
# Install Pages CLI
npm install -g @cloudflare/pages-cli

# Deploy directly
npx wrangler pages deploy build --project-name=htkk-ai
```

### 3. **Configure Pages Environment Variables**
```bash
# Set environment variables for Pages
wrangler pages secret put REACT_APP_API_URL --project-name=htkk-ai
# Enter: https://htkk-ai.your-subdomain.workers.dev

wrangler pages secret put REACT_APP_CLOUDFLARE_ACCOUNT_ID --project-name=htkk-ai
# Enter: your-account-id

# Or via Dashboard:
# Pages > htkk-ai > Settings > Environment variables
```

---

## 🔐 PHASE 5: SECURITY & CONFIGURATION

### 1. **API Tokens & Secrets**
```bash
# Create API token with permissions:
# - Zone:Zone:Read
# - Zone:Zone Settings:Edit
# - Account:Cloudflare Workers:Edit
# - Account:D1:Edit
# - Account:R2:Edit

# Store secrets in Workers
wrangler secret put ENCRYPTION_KEY --env=production
wrangler secret put JWT_SECRET --env=production
wrangler secret put GOOGLE_ADK_API_KEY --env=production
```

### 2. **Custom Domain Setup**
```bash
# Add custom domain to Pages
# Dashboard > Pages > htkk-ai > Custom domains
# Add: htkk-ai.yourdomain.com

# Add custom domain to Workers
# Dashboard > Workers > htkk-ai > Settings > Triggers
# Add: api.htkk-ai.yourdomain.com
```

### 3. **SSL/TLS Configuration**
```bash
# Enable Full (strict) SSL/TLS
# Dashboard > SSL/TLS > Overview > Full (strict)

# Enable Always Use HTTPS
# Dashboard > SSL/TLS > Edge Certificates > Always Use HTTPS: On

# Enable HSTS
# Dashboard > SSL/TLS > Edge Certificates > HTTP Strict Transport Security (HSTS)
```

---

## 📊 PHASE 6: MONITORING & ANALYTICS

### 1. **Enable Analytics**
```bash
# Enable Web Analytics for Pages
# Dashboard > Pages > htkk-ai > Analytics > Web Analytics

# Enable Workers Analytics
# Dashboard > Workers > htkk-ai > Metrics
```

### 2. **Setup Alerts**
```bash
# Create notification policies
# Dashboard > Notifications > Add

# Alert conditions:
# - Worker error rate > 5%
# - D1 query errors > 10/minute
# - R2 upload failures > 5/minute
# - Pages deployment failures
```

### 3. **Performance Monitoring**
```typescript
// Add to worker for custom metrics
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const start = Date.now()
    
    try {
      const response = await app.fetch(request, env, ctx)
      
      // Log performance metrics
      const duration = Date.now() - start
      console.log(`Request completed in ${duration}ms`)
      
      return response
    } catch (error) {
      // Log errors
      console.error('Worker error:', error)
      throw error
    }
  }
}
```

---

## 🚀 PHASE 7: DEPLOYMENT AUTOMATION

### 1. **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy HTKK AI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build frontend
        run: |
          cd frontend
          npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: htkk-ai
          directory: frontend/build
      
      - name: Deploy Workers
        run: |
          cd backend
          npm ci
          npx wrangler deploy --env=production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 2. **Environment-specific Deployments**
```bash
# Create staging environment
wrangler pages project create htkk-ai-staging

# Deploy to staging
npm run build:staging
npx wrangler pages deploy build --project-name=htkk-ai-staging

# Promote staging to production
npx wrangler pages deployment promote <deployment-id> --project-name=htkk-ai
```

---

## 🧪 PHASE 8: TESTING & VALIDATION

### 1. **Health Checks**
```bash
# Test API endpoints
curl https://htkk-ai.your-subdomain.workers.dev/health

# Test frontend
curl https://htkk-ai.pages.dev

# Test database connection
curl -X POST https://htkk-ai.your-subdomain.workers.dev/api/test/db

# Test R2 storage
curl -X POST https://htkk-ai.your-subdomain.workers.dev/api/test/storage
```

### 2. **Performance Testing**
```bash
# Install testing tools
npm install -g lighthouse artillery

# Lighthouse audit
lighthouse https://htkk-ai.pages.dev --output=html --output-path=./lighthouse-report.html

# Load testing
artillery quick --count 10 --num 5 https://htkk-ai.your-subdomain.workers.dev/health
```

### 3. **Security Testing**
```bash
# Test HTTPS redirect
curl -I http://htkk-ai.pages.dev

# Test CORS headers
curl -H "Origin: https://malicious-site.com" https://htkk-ai.your-subdomain.workers.dev/api/health

# Test rate limiting
for i in {1..100}; do curl https://htkk-ai.your-subdomain.workers.dev/api/health; done
```

---

## 📋 DEPLOYMENT CHECKLIST

### **Pre-deployment**
- [ ] Cloudflare account setup
- [ ] Domain verification (optional)
- [ ] Wrangler CLI installed and authenticated
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] R2 buckets created
- [ ] CORS configuration applied

### **Deployment**
- [ ] Backend deployed to Workers
- [ ] Frontend deployed to Pages
- [ ] Custom domains configured
- [ ] SSL/TLS enabled
- [ ] Environment variables set
- [ ] Database migrations applied

### **Post-deployment**
- [ ] Health checks passing
- [ ] Analytics enabled
- [ ] Monitoring alerts configured
- [ ] Performance testing completed
- [ ] Security testing completed
- [ ] Documentation updated

---

## 🔧 TROUBLESHOOTING

### **Common Issues**

#### **1. Database Connection Errors**
```bash
# Check D1 binding
wrangler d1 list

# Test database connection
wrangler d1 execute htkk-ai-db --command="SELECT 1"

# Check wrangler.toml configuration
```

#### **2. R2 Upload Failures**
```bash
# Check bucket permissions
wrangler r2 bucket list

# Test bucket access
wrangler r2 object put htkk-ai-basic/test.txt --file=test.txt

# Verify CORS configuration
```

#### **3. Pages Build Failures**
```bash
# Check build logs
wrangler pages deployment list --project-name=htkk-ai

# Test local build
cd frontend && npm run build

# Check environment variables
```

#### **4. Worker Deployment Issues**
```bash
# Check worker status
wrangler status

# View worker logs
wrangler tail

# Test worker locally
wrangler dev
```

### **Debug Commands**
```bash
# View all deployments
wrangler pages deployment list --project-name=htkk-ai

# Check worker metrics
wrangler metrics --env=production

# View D1 database info
wrangler d1 info htkk-ai-db

# List R2 objects
wrangler r2 object list htkk-ai-basic
```

---

## 💰 COST ESTIMATION

### **Cloudflare Pricing (Monthly)**

| Service | Free Tier | Estimated Usage | Cost |
|---------|-----------|-----------------|------|
| **Pages** | 1 build/min, 500 builds/month | ~100 builds | $0 |
| **Workers** | 100k requests/day | ~50k requests | $0 |
| **D1** | 5M reads, 100k writes/day | ~1M reads, 10k writes | $0 |
| **R2** | 10GB storage, 1M Class A ops | ~5GB, 100k ops | $0 |
| **KV** | 10M reads, 1k writes/day | ~100k reads, 100 writes | $0 |
| **Analytics** | Included | Basic metrics | $0 |

**Total Estimated Cost: $0/month** (within free tiers)

### **Scaling Costs**
- **Workers**: $0.50 per 1M requests after free tier
- **D1**: $0.75 per 1M reads, $4.50 per 1M writes
- **R2**: $0.015 per GB storage, $4.50 per 1M Class A operations
- **Pages**: $20/month for advanced features

---

## 🎯 NEXT STEPS

### **Phase 2: AI Integration**
1. **Google ADK Setup**
   - Configure AI agents
   - Deploy OCR workers
   - Setup mapping intelligence

2. **Advanced Features**
   - Real-time collaboration
   - Advanced analytics
   - Custom integrations

3. **Performance Optimization**
   - Edge caching strategies
   - Database query optimization
   - Asset optimization

### **Production Readiness**
1. **Backup Strategy**
   - Database backups
   - R2 cross-region replication
   - Disaster recovery plan

2. **Compliance**
   - GDPR compliance
   - Vietnam data protection
   - Audit logging

3. **Scaling**
   - Load testing
   - Performance monitoring
   - Auto-scaling configuration

---

## 📞 SUPPORT

### **Cloudflare Resources**
- **Documentation**: https://developers.cloudflare.com/
- **Community**: https://community.cloudflare.com/
- **Support**: https://support.cloudflare.com/

### **HTKK AI Specific**
- **GitHub Issues**: Create issues for bugs/features
- **Documentation**: Check project README
- **Contact**: Your development team

---

*Deployment Guide Created: 2025-01-09*
*Last Updated: 2025-01-09*
*Version: 1.0*

**🚀 Ready to deploy HTKK AI to Cloudflare!**
