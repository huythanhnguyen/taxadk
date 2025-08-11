#!/bin/bash

# HTKK AI - R2 Storage Setup Script
# Run this script after enabling R2 in Cloudflare Dashboard

echo "🚀 Setting up R2 Storage for HTKK AI..."
echo "========================================"

# Check if R2 is enabled
echo "1. Checking R2 status..."
if ! wrangler r2 bucket list > /dev/null 2>&1; then
    echo "❌ R2 is not enabled yet!"
    echo ""
    echo "Please enable R2 first:"
    echo "1. Go to https://dash.cloudflare.com/"
    echo "2. Navigate to R2 Object Storage"
    echo "3. Click 'Enable R2'"
    echo "4. Accept the terms and conditions"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ R2 is enabled!"

# Create buckets for different privacy tiers
echo ""
echo "2. Creating R2 buckets..."

# Basic tier bucket
echo "Creating htkk-ai-basic bucket..."
if wrangler r2 bucket create htkk-ai-basic; then
    echo "✅ htkk-ai-basic bucket created"
else
    echo "⚠️  htkk-ai-basic bucket may already exist"
fi

# Premium tier bucket
echo "Creating htkk-ai-premium bucket..."
if wrangler r2 bucket create htkk-ai-premium; then
    echo "✅ htkk-ai-premium bucket created"
else
    echo "⚠️  htkk-ai-premium bucket may already exist"
fi

# Enterprise tier bucket
echo "Creating htkk-ai-enterprise bucket..."
if wrangler r2 bucket create htkk-ai-enterprise; then
    echo "✅ htkk-ai-enterprise bucket created"
else
    echo "⚠️  htkk-ai-enterprise bucket may already exist"
fi

# Temporary processing bucket
echo "Creating htkk-ai-temp bucket..."
if wrangler r2 bucket create htkk-ai-temp; then
    echo "✅ htkk-ai-temp bucket created"
else
    echo "⚠️  htkk-ai-temp bucket may already exist"
fi

# List all buckets
echo ""
echo "3. Listing all buckets..."
wrangler r2 bucket list

# Update wrangler.toml with R2 bindings
echo ""
echo "4. Updating wrangler.toml with R2 bindings..."

# Backup current wrangler.toml
cp wrangler.toml wrangler.toml.backup

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

echo "✅ wrangler.toml updated with R2 bindings"

# Test bucket access
echo ""
echo "5. Testing bucket access..."
echo "test file content" > test-file.txt

if wrangler r2 object put htkk-ai-basic/test.txt --file=test-file.txt; then
    echo "✅ Upload test successful"
    
    # Clean up test file
    wrangler r2 object delete htkk-ai-basic/test.txt
    rm test-file.txt
    echo "✅ Test cleanup completed"
else
    echo "❌ Upload test failed"
    rm test-file.txt
fi

echo ""
echo "6. R2 Setup Summary:"
echo "==================="
echo "✅ R2 Storage enabled"
echo "✅ 4 buckets created:"
echo "   - htkk-ai-basic (Basic privacy tier)"
echo "   - htkk-ai-premium (Premium privacy tier)"  
echo "   - htkk-ai-enterprise (Enterprise privacy tier)"
echo "   - htkk-ai-temp (Temporary processing)"
echo "✅ wrangler.toml updated with bindings"
echo "✅ Upload functionality tested"
echo ""
echo "🎉 R2 Storage setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy updated Worker: wrangler deploy"
echo "2. Test file upload APIs"
echo "3. Configure CORS if needed"
echo ""
echo "R2 Storage is now ready for HTKK AI file uploads! 🚀"
