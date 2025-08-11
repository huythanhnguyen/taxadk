#!/bin/bash

# HTKK AI - R2 Storage Setup Script
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

# Create buckets
echo ""
echo "2. Creating R2 buckets..."

echo "Creating htkk-ai-basic bucket..."
wrangler r2 bucket create htkk-ai-basic || echo "⚠️  Bucket may already exist"

echo "Creating htkk-ai-premium bucket..."
wrangler r2 bucket create htkk-ai-premium || echo "⚠️  Bucket may already exist"

echo "Creating htkk-ai-enterprise bucket..."
wrangler r2 bucket create htkk-ai-enterprise || echo "⚠️  Bucket may already exist"

echo "Creating htkk-ai-temp bucket..."
wrangler r2 bucket create htkk-ai-temp || echo "⚠️  Bucket may already exist"

# List buckets
echo ""
echo "3. Listing all buckets..."
wrangler r2 bucket list

echo ""
echo "🎉 R2 Storage setup completed!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with R2 bindings"
echo "2. Deploy updated Worker: wrangler deploy"
echo "3. Test file upload APIs"
