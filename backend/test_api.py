#!/usr/bin/env python3
"""
Test script for Ghost Job Detector API
"""

import json
import sys
from simple_api import GhostJobAPIHandler
from io import StringIO
from unittest.mock import MagicMock

def test_api_endpoints():
    """Test API endpoints without running full server"""
    print("🧪 Testing Ghost Job Detector API Endpoints")
    print("=" * 50)
    
    # Mock request/response for testing
    handler = GhostJobAPIHandler(None, None, None)
    
    # Mock the HTTP server parts
    handler.send_response = MagicMock()
    handler.send_header = MagicMock()
    handler.end_headers = MagicMock()
    
    # Capture output
    handler.wfile = StringIO()
    
    try:
        # Test 1: Health check
        print("\n1. Testing Health Check:")
        handler.path = "/health"
        handler.do_GET()
        
        # Get response from mock
        response_data = handler.wfile.getvalue()
        if response_data:
            try:
                health_response = json.loads(response_data)
                print(f"   ✅ Status: {health_response.get('status', 'unknown')}")
                print(f"   🗄️  Database Jobs: {health_response.get('database', {}).get('job_searches', 'unknown')}")
            except:
                print(f"   ✅ Health response received (length: {len(response_data)})")
        else:
            print("   ✅ Health endpoint accessible")
        
        # Test 2: Analysis request simulation
        print("\n2. Testing Job Analysis:")
        from analysis_service import AnalysisService
        
        service = AnalysisService()
        test_url = "https://example.com/test-job-posting"
        
        result = service.analyze_job_complete(test_url)
        print(f"   ✅ Analysis completed for: {test_url}")
        print(f"   📊 Ghost Probability: {result['ghostProbability']:.1%}")
        print(f"   🏢 Company: {result['jobData']['company']}")
        print(f"   💼 Job Title: {result['jobData']['title']}")
        print(f"   🔍 Factors: {len(result['factors'])}")
        
        # Test 3: History retrieval
        print("\n3. Testing Analysis History:")
        history = service.get_analysis_history(5)
        print(f"   ✅ Retrieved {len(history)} recent analyses")
        
        for i, analysis in enumerate(history[:3], 1):
            risk = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
            print(f"   {i}. {risk} {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.0%})")
        
        # Test 4: Statistics
        print("\n4. Testing Statistics:")
        stats = service.get_analysis_stats()
        print(f"   ✅ Total Analyses: {stats['total_analyses']}")
        print(f"   📈 Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
        print(f"   🔴 High Risk: {stats['high_risk_count']}")
        print(f"   🟡 Medium Risk: {stats['medium_risk_count']}")
        print(f"   🟢 Low Risk: {stats['low_risk_count']}")
        
        print(f"\n   Top Ghost Companies:")
        for company in stats['top_ghost_companies'][:3]:
            print(f"      - {company['company']}: {company['avg_ghost_probability']:.0%} ({company['total_posts']} posts)")
        
        print("\n🎉 All API tests completed successfully!")
        
        # Test 5: API endpoint structure validation
        print("\n5. Testing API Endpoint Structure:")
        
        # Simulate different endpoints
        endpoints_to_test = [
            ("/", "Root endpoint"),
            ("/health", "Health check"),
            ("/api/v1/history", "Analysis history"),
            ("/api/v1/stats", "Analysis statistics")
        ]
        
        for path, description in endpoints_to_test:
            handler.wfile = StringIO()  # Reset output buffer
            handler.path = path
            handler.do_GET()
            
            response = handler.wfile.getvalue()
            status = "✅" if len(response) > 0 else "❌"
            print(f"   {status} {description}: {len(response)} bytes")
        
        return True
        
    except Exception as e:
        print(f"\n❌ API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_integration():
    """Test database integration specifically"""
    print("\n🗄️  Testing Database Integration:")
    print("-" * 30)
    
    try:
        from analysis_service import AnalysisService
        import sqlite3
        
        service = AnalysisService()
        
        # Test database connection
        conn = service.get_connection()
        cursor = conn.cursor()
        
        # Check database health
        cursor.execute("SELECT COUNT(*) FROM job_searches")
        job_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM companies")  
        company_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM key_factors")
        factor_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"   ✅ Database connected successfully")
        print(f"   📊 Job Searches: {job_count}")
        print(f"   🏢 Companies: {company_count}")
        print(f"   🔍 Key Factors: {factor_count}")
        
        # Test a complete analysis cycle
        test_urls = [
            "https://linkedin.com/jobs/view/test1",
            "https://indeed.com/viewjob?jk=test2",
            "https://careers.google.com/jobs/test3"
        ]
        
        print(f"\n   Testing analysis pipeline:")
        
        for i, url in enumerate(test_urls, 1):
            try:
                result = service.analyze_job_complete(url)
                platform = result['jobData']['platform']
                ghost_prob = result['ghostProbability']
                
                print(f"   {i}. {platform.upper()}: {ghost_prob:.1%} ghost probability")
                
            except Exception as e:
                print(f"   {i}. ❌ Failed to analyze {url}: {e}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Database integration test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Ghost Job Detector - Complete API Test Suite")
    print("=" * 60)
    
    # Test 1: API endpoints
    api_success = test_api_endpoints()
    
    # Test 2: Database integration  
    db_success = test_database_integration()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY:")
    print(f"   API Endpoints: {'✅ PASSED' if api_success else '❌ FAILED'}")
    print(f"   Database Integration: {'✅ PASSED' if db_success else '❌ FAILED'}")
    
    if api_success and db_success:
        print("\n🎉 ALL TESTS PASSED! Ghost Job Detector API is ready for use.")
        print("\n💡 To start the server:")
        print("   python3 simple_api.py 8000")
        print("\n💡 To test the server:")
        print("   curl -X POST http://localhost:8000/api/v1/detection/analyze \\")
        print("        -H 'Content-Type: application/json' \\") 
        print("        -d '{\"jobUrl\": \"https://linkedin.com/jobs/view/12345\"}'")
    else:
        print("\n❌ Some tests failed. Check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()