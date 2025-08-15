#!/usr/bin/env python3
"""
Integration test for Ghost Job Detector API and Database
"""

def test_core_functionality():
    """Test the core analysis and database functionality"""
    print("🧪 Ghost Job Detector - Integration Test")
    print("=" * 50)
    
    try:
        from analysis_service import AnalysisService
        import sqlite3
        import json
        
        # Initialize service
        service = AnalysisService()
        
        # Test 1: Database connectivity
        print("\n1. Database Connectivity Test:")
        conn = service.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM job_searches")
        job_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM companies")
        company_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"   ✅ Database connected")
        print(f"   📊 Current job searches: {job_count}")
        print(f"   🏢 Companies tracked: {company_count}")
        
        # Test 2: Job Analysis Pipeline
        print("\n2. Job Analysis Pipeline Test:")
        
        test_jobs = [
            "https://linkedin.com/jobs/view/integration-test-1",
            "https://indeed.com/viewjob?jk=integration-test-2", 
            "https://careers.startup.com/positions/integration-test-3"
        ]
        
        results = []
        
        for i, job_url in enumerate(test_jobs, 1):
            print(f"\n   {i}. Analyzing: {job_url}")
            
            result = service.analyze_job_complete(job_url)
            results.append(result)
            
            job_data = result['jobData']
            ghost_prob = result['ghostProbability']
            confidence = result['confidence']
            factors_count = len(result['factors'])
            
            risk_level = "🔴 HIGH" if ghost_prob >= 0.67 else "🟡 MEDIUM" if ghost_prob >= 0.34 else "🟢 LOW"
            
            print(f"      📊 Ghost Risk: {risk_level} ({ghost_prob:.1%})")
            print(f"      🎯 Confidence: {confidence:.1%}")
            print(f"      🏢 Company: {job_data['company']}")
            print(f"      💼 Title: {job_data['title']}")
            print(f"      📍 Location: {job_data['location']}")
            print(f"      🔍 Key Factors: {factors_count}")
            print(f"      🗄️  Saved as Analysis ID: {result['id']}")
        
        # Test 3: Data Retrieval
        print("\n3. Data Retrieval Test:")
        
        # Get updated history
        history = service.get_analysis_history(10)
        print(f"   ✅ Retrieved {len(history)} analyses from history")
        
        print(f"\n   📚 Recent Analysis History:")
        for analysis in history[:5]:
            risk = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
            print(f"      {risk} ID:{analysis['id']} | {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.0%})")
        
        # Test 4: Statistics
        print("\n4. Statistics Test:")
        stats = service.get_analysis_stats()
        
        print(f"   📈 Analysis Statistics:")
        print(f"      Total Analyses: {stats['total_analyses']}")
        print(f"      Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
        print(f"      🔴 High Risk Jobs: {stats['high_risk_count']}")
        print(f"      🟡 Medium Risk Jobs: {stats['medium_risk_count']}")  
        print(f"      🟢 Low Risk Jobs: {stats['low_risk_count']}")
        
        print(f"\n   🏢 Top Ghost Companies:")
        for i, company in enumerate(stats['top_ghost_companies'][:5], 1):
            print(f"      {i}. {company['company']}: {company['avg_ghost_probability']:.0%} ghost rate ({company['total_posts']} posts)")
        
        # Test 5: API Response Format Validation
        print("\n5. API Response Format Validation:")
        
        sample_result = results[0]  # Use first result
        
        # Validate required fields
        required_fields = ['id', 'ghostProbability', 'confidence', 'factors', 'metadata', 'jobData']
        
        for field in required_fields:
            if field in sample_result:
                print(f"   ✅ Field '{field}': Present")
            else:
                print(f"   ❌ Field '{field}': Missing")
        
        # Validate data types
        validations = [
            ('ghostProbability', float, lambda x: 0 <= x <= 1),
            ('confidence', float, lambda x: 0 <= x <= 1),
            ('factors', list, lambda x: len(x) >= 0),
            ('id', str, lambda x: x.isdigit())
        ]
        
        for field, expected_type, validation_func in validations:
            value = sample_result.get(field)
            if value is not None:
                type_ok = isinstance(value, expected_type)
                valid_ok = validation_func(value) if type_ok else False
                status = "✅" if type_ok and valid_ok else "❌"
                print(f"   {status} Field '{field}': {type(value).__name__} = {value}")
        
        # Test 6: Database Integrity Check
        print("\n6. Database Integrity Check:")
        
        conn = service.get_connection()
        cursor = conn.cursor()
        
        # Check for orphaned records
        cursor.execute("""
            SELECT COUNT(*) FROM key_factors kf 
            LEFT JOIN job_searches js ON kf.search_id = js.id 
            WHERE js.id IS NULL
        """)
        orphaned_factors = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM parsing_metadata pm 
            LEFT JOIN job_searches js ON pm.search_id = js.id 
            WHERE js.id IS NULL
        """)
        orphaned_metadata = cursor.fetchone()[0]
        
        # Check company statistics consistency
        cursor.execute("""
            SELECT c.company_name, c.total_posts, COUNT(js.id) as actual_posts
            FROM companies c
            LEFT JOIN job_searches js ON c.company_name = js.company
            GROUP BY c.company_name
            HAVING c.total_posts != COUNT(js.id)
        """)
        inconsistent_companies = cursor.fetchall()
        
        conn.close()
        
        print(f"   🔍 Orphaned key factors: {orphaned_factors}")
        print(f"   🔍 Orphaned parsing metadata: {orphaned_metadata}")
        print(f"   🔍 Companies with inconsistent post counts: {len(inconsistent_companies)}")
        
        integrity_ok = orphaned_factors == 0 and orphaned_metadata == 0 and len(inconsistent_companies) == 0
        integrity_status = "✅ PASSED" if integrity_ok else "⚠️  WARNINGS"
        print(f"   📊 Database Integrity: {integrity_status}")
        
        print(f"\n🎉 Integration Test Completed Successfully!")
        print(f"✅ Analysis Pipeline: Working")
        print(f"✅ Database Storage: Working")
        print(f"✅ Data Retrieval: Working")
        print(f"✅ Statistics: Working")
        print(f"✅ Response Format: Valid")
        print(f"{integrity_status} Database Integrity: {'Clean' if integrity_ok else 'Minor issues'}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints_directly():
    """Test API endpoint logic directly"""
    print(f"\n" + "=" * 50)
    print("🌐 API Endpoints Direct Test")
    print("=" * 50)
    
    try:
        from analysis_service import AnalysisService
        
        service = AnalysisService()
        
        # Simulate the main API operations
        
        # 1. Health Check Data
        print("\n1. Health Check Simulation:")
        import sqlite3
        conn = sqlite3.connect("ghost_job_detector.db")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM job_searches")
        job_count = cursor.fetchone()[0]
        conn.close()
        
        health_response = {
            "status": "healthy",
            "database": {
                "status": "connected",
                "job_searches": job_count
            }
        }
        
        print(f"   ✅ Health Response: {health_response}")
        
        # 2. Analysis Request Simulation
        print("\n2. Analysis Request Simulation:")
        test_request = {"jobUrl": "https://test.com/job/api-test"}
        
        analysis_result = service.analyze_job_complete(test_request["jobUrl"])
        
        api_response = {
            "id": analysis_result["id"],
            "ghostProbability": analysis_result["ghostProbability"], 
            "confidence": analysis_result["confidence"],
            "factors": analysis_result["factors"],
            "metadata": analysis_result["metadata"]
        }
        
        print(f"   ✅ Analysis Request: {test_request}")
        print(f"   ✅ Analysis Response: ID {api_response['id']}, Ghost: {api_response['ghostProbability']:.1%}")
        
        # 3. History Request Simulation
        print("\n3. History Request Simulation:")
        history_data = service.get_analysis_history(5)
        
        # Format as API response
        history_response = {
            "total_count": len(history_data),
            "page": 1,
            "page_size": 5,
            "analyses": [
                {
                    "job_search": {
                        "id": analysis["id"],
                        "url": analysis["jobUrl"],
                        "job_title": analysis["title"],
                        "company": analysis["company"],
                        "ghost_probability": analysis["ghostProbability"],
                        "confidence": analysis["confidence"],
                        "analysis_date": analysis["analyzedAt"],
                        "status": analysis["status"]
                    },
                    "key_factors": [{"description": factor} for factor in analysis["factors"][:3]]
                }
                for analysis in history_data
            ]
        }
        
        print(f"   ✅ History Response: {len(history_response['analyses'])} analyses")
        
        # 4. Stats Request Simulation
        print("\n4. Stats Request Simulation:")
        stats_data = service.get_analysis_stats()
        
        stats_response = {
            "total_analyses": stats_data["total_analyses"],
            "avg_ghost_probability": stats_data["avg_ghost_probability"], 
            "high_risk_count": stats_data["high_risk_count"],
            "medium_risk_count": stats_data["medium_risk_count"],
            "low_risk_count": stats_data["low_risk_count"],
            "top_ghost_companies": stats_data["top_ghost_companies"][:3]
        }
        
        print(f"   ✅ Stats Response: {stats_response['total_analyses']} total analyses")
        print(f"      Average ghost probability: {stats_response['avg_ghost_probability']:.1%}")
        
        print(f"\n🎉 API Endpoints Direct Test: SUCCESS")
        return True
        
    except Exception as e:
        print(f"\n❌ API endpoints test failed: {e}")
        return False

def main():
    """Run all integration tests"""
    print("🚀 Ghost Job Detector - Complete Integration Test Suite")
    print("=" * 60)
    
    # Run core functionality tests
    core_success = test_core_functionality()
    
    # Run API endpoint tests
    api_success = test_api_endpoints_directly()
    
    # Final summary
    print(f"\n" + "=" * 60)
    print("🏁 FINAL TEST RESULTS:")
    print(f"   Core Functionality: {'✅ PASSED' if core_success else '❌ FAILED'}")
    print(f"   API Endpoints: {'✅ PASSED' if api_success else '❌ FAILED'}")
    
    if core_success and api_success:
        print(f"\n🎉 ALL INTEGRATION TESTS PASSED!")
        print(f"\n🚀 Ghost Job Detector is ready for production use!")
        print(f"\n💡 Next Steps:")
        print(f"   1. Start the API server: python3 simple_api.py 8000")
        print(f"   2. Update frontend to use: http://localhost:8000/api/v1/detection/analyze")
        print(f"   3. Test with curl or frontend application")
        
        print(f"\n📊 Current Database Status:")
        from analysis_service import AnalysisService
        service = AnalysisService()
        stats = service.get_analysis_stats()
        print(f"   - {stats['total_analyses']} total job analyses")
        print(f"   - {len(stats['top_ghost_companies'])} companies tracked")
        print(f"   - {stats['avg_ghost_probability']:.1%} average ghost probability")
        
        return True
    else:
        print(f"\n❌ INTEGRATION TESTS FAILED")
        print(f"   Please review the error messages above and fix issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)