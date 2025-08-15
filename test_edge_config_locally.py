#!/usr/bin/env python3
"""
Test Edge Config functionality locally with mock data
This simulates what should happen when Edge Config is properly connected
"""

import os
import sys

def test_with_mock_edge_config():
    """Test the system with a mock Edge Config setup"""
    print("🧪 Testing Edge Config with Mock Data")
    print("=" * 50)
    
    # Set up mock Edge Config environment
    mock_edge_config = "https://edge-config.vercel.com/mock-config-id?token=mock-token"
    os.environ['EDGE_CONFIG'] = mock_edge_config
    os.environ['VERCEL_ENV'] = 'development'
    
    print(f"🔧 Set mock EDGE_CONFIG: {mock_edge_config}")
    
    # Run debug script with mock config
    print("\n1. Running debug script with mock config:")
    print("-" * 40)
    
    try:
        sys.path.append('.')
        from debug_edge_config import debug_edge_config
        
        result = debug_edge_config()
        
        print(f"\n✅ Mock test result: {result}")
        
    except Exception as e:
        print(f"❌ Mock test failed: {e}")
    
    # Test Vercel analysis service
    print(f"\n2. Testing Vercel Analysis Service:")
    print("-" * 40)
    
    try:
        sys.path.append('./backend')
        from vercel_analysis_service import VercelAnalysisService
        
        service = VercelAnalysisService()
        
        print(f"   ✅ Service initialized")
        print(f"   📡 Using Edge Config: {service.use_edge_config}")
        
        # Test analysis
        test_url = "https://mock-test.com/job/edge-config-test"
        print(f"   🔍 Testing analysis: {test_url}")
        
        result = service.analyze_job_complete(test_url)
        
        print(f"   ✅ Analysis completed:")
        print(f"      ID: {result['id']}")
        print(f"      Ghost Probability: {result['ghostProbability']:.1%}")
        print(f"      Company: {result['jobData']['company']}")
        print(f"      Storage: {result['metadata']['storage']}")
        
        # Test data retrieval
        history = service.get_analysis_history(3)
        print(f"   ✅ Retrieved {len(history)} analyses from history")
        
        stats = service.get_analysis_stats()
        print(f"   ✅ Stats: {stats['total_analyses']} total analyses")
        
    except ImportError as e:
        print(f"   ❌ Import error: {e}")
        print(f"   💡 Vercel analysis service not available")
    except Exception as e:
        print(f"   ❌ Analysis test failed: {e}")
    
    print(f"\n🎉 Mock Edge Config test complete!")

def main():
    """Main function"""
    print("🚀 Ghost Job Detector - Edge Config Local Test")
    print("=" * 60)
    
    # Save original environment
    original_edge_config = os.environ.get('EDGE_CONFIG')
    original_vercel_env = os.environ.get('VERCEL_ENV')
    
    try:
        test_with_mock_edge_config()
    finally:
        # Restore original environment
        if original_edge_config:
            os.environ['EDGE_CONFIG'] = original_edge_config
        elif 'EDGE_CONFIG' in os.environ:
            del os.environ['EDGE_CONFIG']
            
        if original_vercel_env:
            os.environ['VERCEL_ENV'] = original_vercel_env
        elif 'VERCEL_ENV' in os.environ:
            del os.environ['VERCEL_ENV']

if __name__ == "__main__":
    main()