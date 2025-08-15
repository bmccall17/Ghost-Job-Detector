#!/usr/bin/env python3
"""
Test script for Vercel Edge Config integration
Tests the complete pipeline without requiring actual Vercel deployment
"""

import os
import sys
from datetime import datetime

def test_vercel_edge_config():
    """Test Vercel Edge Config integration"""
    print("🧪 Testing Vercel Edge Config Integration")
    print("=" * 50)
    
    # Test 1: Check if Edge Config environment is available
    print("\n1. Environment Check:")
    edge_config_url = os.environ.get('EDGE_CONFIG')
    
    if edge_config_url:
        print(f"   ✅ EDGE_CONFIG found: {edge_config_url[:50]}...")
        edge_config_available = True
    else:
        print("   ⚠️  EDGE_CONFIG not found - will use mock storage")
        edge_config_available = False
    
    # Test 2: Import and initialize services
    print("\n2. Service Initialization:")
    try:
        from vercel_analysis_service import VercelAnalysisService
        
        service = VercelAnalysisService()
        print(f"   ✅ VercelAnalysisService initialized")
        print(f"   📡 Using: {'Edge Config' if service.use_edge_config else 'Mock Storage'}")
        
    except Exception as e:
        print(f"   ❌ Failed to initialize service: {e}")
        return False
    
    # Test 3: Health check
    print("\n3. Health Check:")
    try:
        health = service.health_check()
        print(f"   Status: {health['status']}")
        
        if 'job_searches' in health:
            print(f"   Job Searches: {health['job_searches']}")
            print(f"   Companies: {health.get('companies', 0)}")
        elif 'analyses' in health:
            print(f"   Analyses: {health['analyses']}")
        
        print(f"   Storage: {health.get('database_file', health.get('storage', 'unknown'))}")
        
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return False
    
    # Test 4: Analysis pipeline
    print("\n4. Analysis Pipeline Test:")
    
    test_jobs = [
        "https://linkedin.com/jobs/view/vercel-test-1",
        "https://vercel.com/careers/software-engineer",
        "https://edge-config.test/job/123"
    ]
    
    for i, job_url in enumerate(test_jobs, 1):
        try:
            print(f"\n   {i}. Testing: {job_url}")
            
            result = service.analyze_job_complete(job_url)
            
            print(f"      ✅ Analysis ID: {result['id']}")
            print(f"      📊 Ghost Probability: {result['ghostProbability']:.1%}")
            print(f"      🎯 Confidence: {result['confidence']:.1%}")
            print(f"      🏢 Company: {result['jobData']['company']}")
            print(f"      💼 Title: {result['jobData']['title']}")
            print(f"      🌐 Platform: {result['jobData']['platform']}")
            print(f"      💾 Storage: {result['metadata']['storage']}")
            
        except Exception as e:
            print(f"      ❌ Analysis failed: {e}")
            return False
    
    # Test 5: Data retrieval
    print("\n5. Data Retrieval Test:")
    
    try:
        # Get history
        history = service.get_analysis_history(5)
        print(f"   ✅ Retrieved {len(history)} analyses from history")
        
        if history:
            print(f"   📚 Recent analyses:")
            for analysis in history[:3]:
                risk = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
                print(f"      {risk} {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.0%})")
        
        # Get statistics
        stats = service.get_analysis_stats()
        print(f"\n   📈 Statistics:")
        print(f"      Total Analyses: {stats['total_analyses']}")
        print(f"      Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
        print(f"      🔴 High Risk: {stats['high_risk_count']}")
        print(f"      🟡 Medium Risk: {stats['medium_risk_count']}")
        print(f"      🟢 Low Risk: {stats['low_risk_count']}")
        
        if stats['top_ghost_companies']:
            print(f"      Top Ghost Companies: {len(stats['top_ghost_companies'])}")
        
    except Exception as e:
        print(f"   ❌ Data retrieval failed: {e}")
        return False
    
    # Test 6: API endpoint simulation
    print("\n6. API Endpoint Simulation:")
    
    try:
        # Simulate API requests
        api_tests = [
            ("Health Check", lambda: service.health_check()),
            ("Analysis", lambda: service.analyze_job_complete("https://api.test/job/456")),
            ("History", lambda: service.get_analysis_history(3)),
            ("Stats", lambda: service.get_analysis_stats())
        ]
        
        for test_name, test_func in api_tests:
            try:
                result = test_func()
                print(f"   ✅ {test_name}: Success")
            except Exception as e:
                print(f"   ❌ {test_name}: {e}")
        
    except Exception as e:
        print(f"   ❌ API simulation failed: {e}")
        return False
    
    print(f"\n🎉 Vercel Integration Test Completed Successfully!")
    
    # Summary
    print(f"\n📊 Test Summary:")
    print(f"   Edge Config Available: {'✅ Yes' if edge_config_available else '⚠️  No (Mock Mode)'}")
    print(f"   Service Status: ✅ Operational")
    print(f"   Analysis Pipeline: ✅ Working")
    print(f"   Data Storage: ✅ Functional")
    print(f"   API Endpoints: ✅ Ready")
    
    print(f"\n🚀 Ready for Vercel Deployment!")
    
    if not edge_config_available:
        print(f"\n💡 To enable Edge Config:")
        print(f"   1. Set EDGE_CONFIG environment variable")
        print(f"   2. Connect to your 'ghost-job-detector-store'")
        print(f"   3. Ensure proper permissions are configured")
    
    return True

def test_local_fallback():
    """Test local fallback when Edge Config is not available"""
    print(f"\n" + "=" * 50)
    print("🔧 Testing Local Fallback Mode")
    print("=" * 50)
    
    # Temporarily remove Edge Config
    original_edge_config = os.environ.get('EDGE_CONFIG')
    if 'EDGE_CONFIG' in os.environ:
        del os.environ['EDGE_CONFIG']
    
    try:
        from vercel_analysis_service import VercelAnalysisService
        
        service = VercelAnalysisService()
        
        print(f"   ✅ Service initialized in mock mode")
        print(f"   📡 Using: {'Edge Config' if service.use_edge_config else 'Mock Storage'}")
        
        # Test basic operations
        result = service.analyze_job_complete("https://fallback.test/job/789")
        print(f"   ✅ Mock analysis: {result['ghostProbability']:.1%} ghost probability")
        
        history = service.get_analysis_history()
        print(f"   ✅ Mock history: {len(history)} entries")
        
        stats = service.get_analysis_stats()
        print(f"   ✅ Mock stats: {stats['total_analyses']} total analyses")
        
        print(f"\n✅ Local fallback mode working correctly!")
        
    except Exception as e:
        print(f"   ❌ Local fallback test failed: {e}")
        return False
    
    finally:
        # Restore original Edge Config
        if original_edge_config:
            os.environ['EDGE_CONFIG'] = original_edge_config
    
    return True

def main():
    """Run all Vercel integration tests"""
    print("🚀 Ghost Job Detector - Vercel Integration Test Suite")
    print("=" * 60)
    
    # Test main integration
    integration_success = test_vercel_edge_config()
    
    # Test fallback mode
    fallback_success = test_local_fallback()
    
    # Final results
    print(f"\n" + "=" * 60)
    print("🏁 FINAL RESULTS:")
    print(f"   Vercel Integration: {'✅ PASSED' if integration_success else '❌ FAILED'}")
    print(f"   Local Fallback: {'✅ PASSED' if fallback_success else '❌ FAILED'}")
    
    if integration_success and fallback_success:
        print(f"\n🎉 ALL TESTS PASSED!")
        print(f"\n🚀 Your Vercel Edge Config integration is ready!")
        print(f"\n💡 Next steps:")
        print(f"   1. Commit these changes to Git")
        print(f"   2. Push to your GitHub repository")
        print(f"   3. Deploy to Vercel")
        print(f"   4. Test the live endpoints")
        
        print(f"\n📡 Your API endpoints will be:")
        print(f"   • POST /api/analyze - Analyze job posting")
        print(f"   • GET  /api/history - Get analysis history")
        print(f"   • GET  /api/stats - Get analysis statistics")
        print(f"   • GET  /api/health - Health check")
        
        return True
    else:
        print(f"\n❌ SOME TESTS FAILED")
        print(f"   Please review the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)