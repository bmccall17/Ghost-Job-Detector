#!/usr/bin/env python3
"""
Comprehensive Edge Config Debug Script
Run this locally and on Vercel to diagnose connection issues
"""

import os
import json
import sys
from datetime import datetime

def debug_edge_config():
    """Debug Vercel Edge Config connection"""
    print("🔍 Vercel Edge Config Debug Report")
    print("=" * 50)
    print(f"⏰ Report generated: {datetime.now()}")
    print()
    
    # 1. Environment Check
    print("1. ENVIRONMENT CHECK")
    print("-" * 30)
    
    edge_config = os.environ.get('EDGE_CONFIG')
    vercel_env = os.environ.get('VERCEL_ENV', 'local')
    vercel_url = os.environ.get('VERCEL_URL')
    
    env_check = {
        "EDGE_CONFIG": "✅ PRESENT" if edge_config else "❌ MISSING",
        "VERCEL_ENV": vercel_env,
        "VERCEL_URL": vercel_url or "not-set",
        "Running on": "Vercel" if vercel_url else "Local"
    }
    
    for key, value in env_check.items():
        print(f"   {key}: {value}")
    
    if edge_config:
        print(f"   EDGE_CONFIG preview: {edge_config[:50]}...")
    
    print()
    
    # 2. Edge Config URL Analysis
    print("2. EDGE CONFIG URL ANALYSIS")
    print("-" * 30)
    
    if edge_config:
        try:
            if edge_config.startswith('https://edge-config.vercel.com/'):
                config_id = edge_config.split('/')[-1].split('?')[0]
                print(f"   ✅ Valid Edge Config URL format")
                print(f"   📋 Config ID: {config_id}")
                
                # Check for authentication token
                if '?' in edge_config:
                    print(f"   ✅ Contains authentication parameters")
                else:
                    print(f"   ⚠️  No authentication parameters found")
            else:
                print(f"   ❌ Invalid Edge Config URL format")
                print(f"   Expected: https://edge-config.vercel.com/...")
                print(f"   Got: {edge_config[:100]}...")
        except Exception as e:
            print(f"   ❌ Error parsing Edge Config URL: {e}")
    else:
        print("   ❌ EDGE_CONFIG not set")
    
    print()
    
    # 3. Edge Config Connection Test
    print("3. EDGE CONFIG CONNECTION TEST")
    print("-" * 30)
    
    if edge_config:
        try:
            # Try to make a simple HTTP request
            import urllib.request
            import urllib.error
            
            # Test URL structure
            base_url = edge_config.split('?')[0]
            auth_params = edge_config.split('?')[1] if '?' in edge_config else ""
            
            test_url = f"{base_url}/test_message"
            if auth_params:
                test_url += f"?{auth_params}"
            
            print(f"   📡 Testing connection to: {base_url}/test_message")
            
            try:
                with urllib.request.urlopen(test_url, timeout=10) as response:
                    status_code = response.getcode()
                    content = response.read().decode('utf-8')
                    
                    print(f"   ✅ Connection successful!")
                    print(f"   📊 Status Code: {status_code}")
                    print(f"   📄 Response: {content[:100]}...")
                    
            except urllib.error.HTTPError as e:
                print(f"   ❌ HTTP Error: {e.code} - {e.reason}")
                if e.code == 404:
                    print(f"   💡 Suggestion: Add 'test_message' key to your Edge Config store")
                elif e.code == 403:
                    print(f"   💡 Suggestion: Check store permissions and project connection")
                
            except urllib.error.URLError as e:
                print(f"   ❌ URL Error: {e.reason}")
                
        except ImportError:
            print("   ⚠️  urllib not available, skipping connection test")
        except Exception as e:
            print(f"   ❌ Connection test failed: {e}")
    else:
        print("   ⏭️  Skipping - EDGE_CONFIG not set")
    
    print()
    
    # 4. File System Check
    print("4. PROJECT FILE CHECK")
    print("-" * 30)
    
    files_to_check = [
        ".env.local",
        ".env",
        "vercel.json",
        "package.json"
    ]
    
    for filename in files_to_check:
        if os.path.exists(filename):
            print(f"   ✅ {filename} exists")
            
            # Check for Edge Config references
            try:
                with open(filename, 'r') as f:
                    content = f.read()
                    if 'EDGE_CONFIG' in content:
                        print(f"      🔍 Contains EDGE_CONFIG reference")
                    if 'edge-config' in content:
                        print(f"      🔍 Contains edge-config reference")
            except:
                pass
        else:
            print(f"   ❌ {filename} missing")
    
    print()
    
    # 5. Package Dependencies Check
    print("5. DEPENDENCIES CHECK")
    print("-" * 30)
    
    if os.path.exists('package.json'):
        try:
            with open('package.json', 'r') as f:
                package_data = json.load(f)
                
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            
            edge_config_pkg = dependencies.get('@vercel/edge-config') or dev_dependencies.get('@vercel/edge-config')
            
            if edge_config_pkg:
                print(f"   ✅ @vercel/edge-config: {edge_config_pkg}")
            else:
                print(f"   ❌ @vercel/edge-config not installed")
                print(f"   💡 Run: npm install @vercel/edge-config")
            
        except Exception as e:
            print(f"   ❌ Error reading package.json: {e}")
    else:
        print("   ❌ package.json not found")
    
    print()
    
    # 6. Recommendations
    print("6. RECOMMENDATIONS")
    print("-" * 30)
    
    if not edge_config:
        print("   🚨 CRITICAL: EDGE_CONFIG not set")
        print("   📋 Steps to fix:")
        print("      1. Log in to Vercel: npx vercel login")
        print("      2. Link project: npx vercel link")
        print("      3. Pull env vars: npx vercel env pull")
        print("      4. Check .env.local for EDGE_CONFIG")
        
    elif not os.path.exists('.env.local'):
        print("   ⚠️  .env.local missing")
        print("   📋 Steps to fix:")
        print("      1. Run: npx vercel env pull")
        print("      2. Verify EDGE_CONFIG appears in .env.local")
        
    else:
        print("   ✅ Basic configuration looks good!")
        print("   📋 Next steps:")
        print("      1. Add test_message='hello-from-edge-config' to Edge Config store")
        print("      2. Test locally: npm run dev")
        print("      3. Visit: /api/edge-config-test")
        print("      4. Deploy to Vercel and test production")
    
    print()
    print("=" * 50)
    print("🔍 Debug Report Complete")
    
    # Return status for programmatic use
    return {
        "edge_config_present": bool(edge_config),
        "running_on_vercel": bool(vercel_url),
        "env": vercel_env,
        "status": "configured" if edge_config else "needs_setup"
    }

def main():
    """Main function"""
    try:
        result = debug_edge_config()
        
        print(f"\n📊 Summary Status: {result['status'].upper()}")
        
        if result['status'] == 'needs_setup':
            print("🚨 Action Required: Set up Edge Config connection")
            sys.exit(1)
        else:
            print("✅ Configuration appears ready for testing")
            sys.exit(0)
            
    except Exception as e:
        print(f"❌ Debug script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()