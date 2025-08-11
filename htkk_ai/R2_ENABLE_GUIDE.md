# 🗂️ Enable R2 Storage - Step by Step Guide

**HTKK AI requires R2 Object Storage for file upload functionality**

---

## 🚨 IMPORTANT: Enable R2 First

R2 Object Storage is **NOT enabled by default** in Cloudflare accounts. You must enable it manually before proceeding.

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### **Step 1: Enable R2 in Cloudflare Dashboard**

1. **Go to Cloudflare Dashboard**
   - Open: https://dash.cloudflare.com/
   - Login with your account

2. **Navigate to R2 Object Storage**
   - In the left sidebar, click **"R2 Object Storage"**
   - Or go directly to: https://dash.cloudflare.com/r2

3. **Enable R2**
   - Click the **"Enable R2"** button
   - Read and accept the **Terms of Service**
   - Confirm the pricing information (Free tier: 10GB storage, 1M Class A operations)

4. **Verify R2 is Enabled**
   - You should see the R2 dashboard
   - The page should show "Create bucket" options

---

### **Step 2: Run Setup Script**

Once R2 is enabled, run our automated setup script:

```bash
# Navigate to project directory
cd htkk_ai

# Run R2 setup script
./setup-r2.sh
```

**Expected Output:**
```
🚀 Setting up R2 Storage for HTKK AI...
========================================
1. Checking R2 status...
✅ R2 is enabled!

2. Creating R2 buckets...
Creating htkk-ai-basic bucket...
✅ Successfully created bucket 'htkk-ai-basic'

Creating htkk-ai-premium bucket...
✅ Successfully created bucket 'htkk-ai-premium'

Creating htkk-ai-enterprise bucket...
✅ Successfully created bucket 'htkk-ai-enterprise'

Creating htkk-ai-temp bucket...
✅ Successfully created bucket 'htkk-ai-temp'

3. Listing all buckets...
┌─────────────────────┬─────────────────────┬──────────────────────────┐
│ name                │ created             │ default-storage-class    │
├─────────────────────┼─────────────────────┼──────────────────────────┤
│ htkk-ai-basic       │ 2025-08-10 06:xx:xx │ Standard                 │
│ htkk-ai-premium     │ 2025-08-10 06:xx:xx │ Standard                 │
│ htkk-ai-enterprise  │ 2025-08-10 06:xx:xx │ Standard                 │
│ htkk-ai-temp        │ 2025-08-10 06:xx:xx │ Standard                 │
└─────────────────────┴─────────────────────┴──────────────────────────┘

🎉 R2 Storage setup completed!
```

---

### **Step 3: Update Worker Configuration**

Update `wrangler.toml` to include R2 bindings:

```bash
# Add R2 bindings to wrangler.toml
cat >> wrangler.toml << 'EOF'

# R2 Storage Bindings
[[r2_buckets]]
binding = "R2_BASIC"
bucket_name = "htkk-ai-basic"

[[r2_buckets]]
binding = "R2_PREMIUM"
bucket_name = "htkk-ai-premium"

[[r2_buckets]]
binding = "R2_ENTERPRISE"
bucket_name = "htkk-ai-enterprise"

[[r2_buckets]]
binding = "R2_TEMP"
bucket_name = "htkk-ai-temp"
EOF
```

---

### **Step 4: Deploy Updated Worker**

Deploy the Worker with R2 bindings:

```bash
# Deploy updated Worker
wrangler deploy

# Expected output:
# ✅ Uploaded htkk-ai
# ✅ Deployed htkk-ai triggers
# Binding                             Resource
# env.DB (htkk-ai-db)                 D1 Database
# env.R2_BASIC (htkk-ai-basic)        R2 Bucket
# env.R2_PREMIUM (htkk-ai-premium)    R2 Bucket
# env.R2_ENTERPRISE (htkk-ai-enterprise) R2 Bucket
# env.R2_TEMP (htkk-ai-temp)          R2 Bucket
```

---

### **Step 5: Test R2 Storage**

Test the R2 storage functionality:

```bash
# Test storage connection
curl https://htkk-ai.hi-huythanh.workers.dev/api/test/storage

# Expected response:
# {
#   "status": "ok",
#   "storage": "connected",
#   "buckets": {
#     "basic": "accessible",
#     "premium": "accessible", 
#     "enterprise": "accessible",
#     "temp": "accessible"
#   }
# }
```

---

## 🗂️ BUCKET STRUCTURE

### **Created Buckets:**

| Bucket Name | Purpose | Privacy Tier |
|-------------|---------|--------------|
| `htkk-ai-basic` | Basic tier file storage | Basic |
| `htkk-ai-premium` | Premium tier file storage | Premium |
| `htkk-ai-enterprise` | Enterprise tier file storage | Enterprise |
| `htkk-ai-temp` | Temporary processing files | All tiers |

### **File Organization:**
```
htkk-ai-basic/
├── session_123/
│   ├── file_1754807673816_abc123.pdf
│   └── file_1754807673817_def456.xlsx
└── session_456/
    └── file_1754807673818_ghi789.jpg
```

---

## 📡 API ENDPOINTS

### **File Upload**
```bash
POST /api/upload
Content-Type: multipart/form-data

# Form fields:
# - file: File to upload
# - sessionId: User session ID
# - privacyTier: basic|premium|enterprise
```

### **File Download**
```bash
GET /api/files/:sessionId/:fileId?privacyTier=basic
```

### **List Files**
```bash
GET /api/files/:sessionId?privacyTier=basic
```

### **Storage Test**
```bash
GET /api/test/storage
```

---

## 💰 R2 PRICING

### **Free Tier (Monthly):**
- **Storage**: 10 GB
- **Class A Operations**: 1,000,000 (PUT, COPY, POST, LIST)
- **Class B Operations**: 10,000,000 (GET, HEAD)
- **Data Transfer**: Unlimited

### **Paid Tier (After Free Tier):**
- **Storage**: $0.015 per GB
- **Class A Operations**: $4.50 per million
- **Class B Operations**: $0.36 per million

---

## 🔧 TROUBLESHOOTING

### **Error: "Please enable R2 through the Cloudflare Dashboard"**
- **Solution**: Follow Step 1 to enable R2 in dashboard
- **Verify**: Check that R2 section is accessible in dashboard

### **Error: "Bucket already exists"**
- **Solution**: This is normal, buckets may already exist
- **Action**: Continue with deployment

### **Error: "R2 binding not found"**
- **Solution**: Ensure wrangler.toml has R2 bindings
- **Action**: Re-run Step 3 and Step 4

### **Error: "Storage test failed"**
- **Solution**: Check Worker deployment and bindings
- **Debug**: Check Worker logs in Cloudflare dashboard

---

## ✅ SUCCESS CHECKLIST

- [ ] R2 enabled in Cloudflare Dashboard
- [ ] 4 buckets created successfully
- [ ] wrangler.toml updated with R2 bindings
- [ ] Worker deployed with R2 bindings
- [ ] Storage test endpoint returns "ok"
- [ ] File upload API ready for use

---

## 🎯 NEXT STEPS

After R2 is enabled and configured:

1. **Test File Upload**
   ```bash
   # Test file upload with curl
   curl -X POST https://htkk-ai.hi-huythanh.workers.dev/api/upload \
     -F "file=@test.pdf" \
     -F "sessionId=test_session" \
     -F "privacyTier=basic"
   ```

2. **Frontend Integration**
   - Update frontend to use file upload APIs
   - Add file upload components
   - Implement progress indicators

3. **CORS Configuration** (if needed)
   - Configure CORS for cross-origin uploads
   - Set proper headers for file access

---

**🚀 Ready to enable R2 storage for HTKK AI file uploads!**

*Guide Created: 2025-08-10*  
*Last Updated: 2025-08-10*
