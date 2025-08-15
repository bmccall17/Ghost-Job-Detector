#!/usr/bin/env python3
"""
Test different Edge Config URL formats and authentication methods
"""

import os
import urllib.request
import urllib.error
import json

# Load environment
def load_env():
    if os.path.exists('.env.local'):
        with open('.env.local', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

def test_edge_config_access():
    """Test different ways to access Edge Config"""
    load_env()
    
    edge_config = os.environ.get('EDGE_CONFIG')
    if not edge_config:
        print("❌ EDGE_CONFIG not found")
        return
    
    print("🔍 Testing Edge Config Access Methods")
    print("=" * 50)
    print(f"🔗 URL: {edge_config[:60]}...")
    
    # Parse the URL
    if '?' in edge_config:
        base_url, params = edge_config.split('?', 1)
        token = None
        for param in params.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break
    else:
        base_url = edge_config
        token = None
    
    print(f"📋 Base URL: {base_url}")
    print(f"🔑 Token: {'Present' if token else 'Missing'}")
    
    # Test methods
    test_methods = [
        ("Direct URL access", edge_config),
        ("Base URL only", base_url),
    ]
    
    if token:
        test_methods.extend([
            ("With Authorization header", base_url, f"Bearer {token}"),
            ("With token as auth", base_url, token)
        ])
    
    for test_name, url, *auth in test_methods:
        print(f"\n🧪 Testing: {test_name}")
        
        try:
            req = urllib.request.Request(url)
            
            # Add authorization header if provided
            if auth:
                req.add_header('Authorization', auth[0])
            
            with urllib.request.urlopen(req, timeout=10) as response:
                status_code = response.getcode()
                content = response.read().decode('utf-8')
                
                print(f"   ✅ Success! Status: {status_code}")
                
                try:
                    data = json.loads(content)
                    print(f"   📄 JSON Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"   📄 Raw Response: {content[:200]}...")
                
                return True  # Success!
                
        except urllib.error.HTTPError as e:
            print(f"   ❌ HTTP {e.code}: {e.reason}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Test with @vercel/edge-config format
    print(f"\n🧪 Testing with Node.js @vercel/edge-config approach:")
    
    # Create a simple Node.js test script
    node_test = f"""
const {{ get, getAll }} = require('@vercel/edge-config');

async function testEdgeConfig() {{
    try {{
        console.log('🔍 Testing Edge Config with @vercel/edge-config...');
        
        // Test getting all data
        const allData = await getAll();
        console.log('✅ getAll() succeeded:');
        console.log(JSON.stringify(allData, null, 2));
        
    }} catch (error) {{
        console.log('❌ Edge Config test failed:', error.message);
    }}
}}

testEdgeConfig();
"""
    
    # Write Node.js test file
    with open('test_edge_config.js', 'w') as f:
        f.write(node_test)
    
    print(f"   📝 Created test_edge_config.js")
    print(f"   💡 Run: node test_edge_config.js")
    
    return False

if __name__ == "__main__":
    test_edge_config_access()