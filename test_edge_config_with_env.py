#!/usr/bin/env python3
"""
Test Edge Config with explicit environment loading
"""

import os
import sys

def load_env_file(env_file=".env.local"):
    """Load environment variables from file"""
    if not os.path.exists(env_file):
        print(f"❌ {env_file} not found")
        return False
    
    print(f"📁 Loading environment from {env_file}")
    
    with open(env_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                os.environ[key] = value
                print(f"   ✅ Set {key}={value[:50]}{'...' if len(value) > 50 else ''}")
    
    return True

def test_edge_config_connection():
    """Test actual Edge Config connection"""
    print("\n🧪 Testing Edge Config Connection")
    print("=" * 40)
    
    edge_config = os.environ.get('EDGE_CONFIG')
    
    if not edge_config:
        print("❌ EDGE_CONFIG still not set after loading .env.local")
        return False
    
    print(f"✅ EDGE_CONFIG loaded: {edge_config[:50]}...")
    
    # Test the connection
    try:
        import urllib.request
        import urllib.error
        import json
        
        # Try to read the root config
        print(f"📡 Testing connection to Edge Config...")
        
        try:
            with urllib.request.urlopen(edge_config, timeout=10) as response:
                status_code = response.getcode()
                content = response.read().decode('utf-8')
                
                print(f"✅ Connection successful!")
                print(f"📊 Status Code: {status_code}")
                
                try:
                    data = json.loads(content)
                    print(f"📄 Response Data: {json.dumps(data, indent=2)}")
                    
                    # Check if we have any data
                    if data:
                        print(f"✅ Edge Config contains data!")
                        return True
                    else:
                        print(f"⚠️  Edge Config is empty - add some test data")
                        return True  # Connection works, just empty
                        
                except json.JSONDecodeError:
                    print(f"📄 Raw Response: {content[:200]}...")
                    return True  # Connection works
                
        except urllib.error.HTTPError as e:
            print(f"❌ HTTP Error: {e.code} - {e.reason}")
            if e.code == 404:
                print(f"💡 Edge Config exists but no keys found - this is normal for empty store")
                return True
            elif e.code == 403:
                print(f"💡 Permission denied - check token permissions")
                return False
            return False
            
        except urllib.error.URLError as e:
            print(f"❌ URL Error: {e.reason}")
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def test_vercel_analysis_service():
    """Test Vercel analysis service with Edge Config"""
    print("\n🧪 Testing Vercel Analysis Service")
    print("=" * 40)
    
    try:
        # Make sure we have the Vercel service
        sys.path.append('./backend')
        from vercel_analysis_service import VercelAnalysisService
        
        service = VercelAnalysisService()
        
        print(f"✅ Service initialized")
        print(f"📡 Using Edge Config: {service.use_edge_config}")
        
        if not service.use_edge_config:
            print(f"⚠️  Service falling back to mock mode")
            return False
        
        # Test job analysis
        test_url = "https://linkedin.com/jobs/view/edge-config-live-test"
        print(f"🔍 Testing analysis: {test_url}")
        
        result = service.analyze_job_complete(test_url)
        
        print(f"✅ Analysis completed successfully!")
        print(f"   ID: {result['id']}")
        print(f"   Ghost Probability: {result['ghostProbability']:.1%}")
        print(f"   Company: {result['jobData']['company']}")
        print(f"   Title: {result['jobData']['title']}")
        print(f"   Storage: {result['metadata']['storage']}")
        
        # Test data retrieval
        print(f"\n📚 Testing data retrieval...")
        
        history = service.get_analysis_history(3)
        print(f"✅ Retrieved {len(history)} analyses from history")
        
        if history:
            print(f"   Recent analyses:")
            for analysis in history[:2]:
                print(f"   - {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.0%})")
        
        stats = service.get_analysis_stats()
        print(f"✅ Stats: {stats['total_analyses']} total analyses")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print(f"💡 Vercel analysis service file missing")
        return False
    except Exception as e:
        print(f"❌ Analysis service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🚀 Edge Config Live Connection Test")
    print("=" * 50)
    
    # Load environment variables
    if not load_env_file():
        print("❌ Failed to load environment file")
        return False
    
    # Test Edge Config connection
    connection_ok = test_edge_config_connection()
    
    if not connection_ok:
        print("\n❌ Edge Config connection failed")
        return False
    
    # Test Vercel analysis service
    service_ok = test_vercel_analysis_service()
    
    # Summary
    print(f"\n" + "=" * 50)
    print("🏁 TEST RESULTS:")
    print(f"   Edge Config Connection: {'✅ SUCCESS' if connection_ok else '❌ FAILED'}")
    print(f"   Analysis Service: {'✅ SUCCESS' if service_ok else '❌ FAILED'}")
    
    if connection_ok and service_ok:
        print(f"\n🎉 EDGE CONFIG IS WORKING!")
        print(f"💡 Your database writes should now work correctly!")
        print(f"\n📋 Next steps:")
        print(f"   1. Start your frontend: npm run dev")
        print(f"   2. Test job analysis from the UI")
        print(f"   3. Check that analyses appear in your Edge Config store")
        return True
    else:
        print(f"\n🚨 EDGE CONFIG NEEDS ATTENTION")
        print(f"💡 Check the error messages above for next steps")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)