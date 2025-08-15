#!/bin/bash
# Setup Vercel Environment for Ghost Job Detector

echo "🚀 Setting up Vercel Edge Config connection..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from your project root."
    exit 1
fi

echo "📋 Step 1: Installing Vercel CLI..."
npm install -g vercel

echo "📋 Step 2: Logging in to Vercel..."
echo "   (This will open your browser)"
npx vercel login

echo "📋 Step 3: Linking to your Vercel project..."
echo "   (Select your ghost-job-detector project)"
npx vercel link

echo "📋 Step 4: Pulling environment variables..."
npx vercel env pull

echo "📋 Step 5: Checking .env.local..."
if grep -q "EDGE_CONFIG" .env.local; then
    echo "✅ EDGE_CONFIG found in .env.local"
    echo "🔍 Preview:"
    grep "EDGE_CONFIG" .env.local | head -1
else
    echo "❌ EDGE_CONFIG not found in .env.local"
    echo "💡 You may need to:"
    echo "   1. Ensure ghost-job-detector-store is connected to your project"
    echo "   2. Run 'npx vercel env pull' again"
    echo "   3. Check your Vercel dashboard Storage settings"
fi

echo "📋 Step 6: Testing Edge Config connection..."
python3 debug_edge_config.py

echo "🎉 Setup complete! Check the debug output above."
echo "💡 If EDGE_CONFIG is still missing, manually add it to .env.local"