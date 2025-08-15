#!/usr/bin/env python3
"""
Simple Edge Config test - run this after connecting to Vercel project
"""

import os
import urllib.request
import urllib.error
import json

def load_env():
    """Load .env.local"""
    if os.path.exists('.env.local'):
        with open('.env.local', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

def test_edge_config():
    """Test Edge Config connection"""
    load_env()
    
    edge_config = os.environ.get('EDGE_CONFIG')
    if not edge_config:
        print("❌ EDGE_CONFIG not found in .env.local")
        return False
    
    print("🔍 Testing Edge Config Connection")
    print(f"🔗 URL: {edge_config[:60]}...")
    
    try:
        with urllib.request.urlopen(edge_config, timeout=10) as response:
            status_code = response.getcode()
            content = response.read().decode('utf-8')
            
            print(f"✅ SUCCESS! Status: {status_code}")
            
            try:
                data = json.loads(content)
                print(f"📄 Data: {json.dumps(data, indent=2)}")
            except:
                print(f"📄 Raw response: {content}")
            
            return True
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP {e.code}: {e.reason}")
        
        if e.code == 401:
            print("💡 SOLUTION: Connect Edge Config to your Vercel project:")
            print("   1. Go to Vercel Dashboard → Your Project")
            print("   2. Settings → Environment Variables")
            print("   3. Add EDGE_CONFIG variable")
            print("   OR")
            print("   1. Storage → Edge Config → ghost-job-detector-store")
            print("   2. Click 'Connect to Project'")
        
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_edge_config()
    
    if success:
        print("\n🎉 Edge Config is working!")
        print("💡 Next: Update your frontend to use Vercel Edge Config")
    else:
        print("\n🔧 Fix the connection issue above, then rerun this test")