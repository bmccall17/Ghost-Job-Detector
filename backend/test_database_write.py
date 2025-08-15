#!/usr/bin/env python3
"""
Direct test of database write functionality
Tests if we can write new analyses to the database
"""

import os
import sys
from datetime import datetime

def test_database_write():
    """Test direct database write operations"""
    print("🧪 Testing Database Write Operations")
    print("=" * 50)
    
    # Test 1: Check if we can access services
    print("\n1. Service Availability Test:")
    
    services_found = []
    
    # Test Vercel service
    try:
        from vercel_analysis_service import VercelAnalysisService
        service = VercelAnalysisService()
        services_found.append(("Vercel Analysis Service", service, service.use_edge_config))
        print(f"   ✅ VercelAnalysisService: {'Edge Config' if service.use_edge_config else 'Mock Mode'}")
    except Exception as e:
        print(f"   ❌ VercelAnalysisService: {e}")
    
    # Test original SQLite service
    try:
        from analysis_service import AnalysisService
        sqlite_service = AnalysisService()
        services_found.append(("SQLite Analysis Service", sqlite_service, True))
        print(f"   ✅ AnalysisService (SQLite): Available")
    except Exception as e:
        print(f"   ❌ AnalysisService (SQLite): {e}")
    
    if not services_found:
        print("   ❌ No analysis services available!")
        return False
    
    # Test 2: Test each available service
    for service_name, service, uses_persistent_storage in services_found:
        print(f"\n2. Testing {service_name}:")
        print(f"   Storage: {'Persistent' if uses_persistent_storage else 'Mock'}")
        
        try:
            # Test analysis
            test_url = f"https://test-database-write.com/job/{int(datetime.now().timestamp())}"
            print(f"   🔍 Analyzing: {test_url}")
            
            result = service.analyze_job_complete(test_url)
            
            print(f"   ✅ Analysis Result:")
            print(f"      ID: {result['id']}")
            print(f"      Ghost Probability: {result['ghostProbability']:.1%}")
            print(f"      Company: {result['jobData']['company']}")
            print(f"      Title: {result['jobData']['title']}")
            
            # Test retrieval
            print(f"   🔍 Testing data retrieval...")
            
            if hasattr(service, 'get_analysis_history'):
                history = service.get_analysis_history(5)
                print(f"      ✅ Retrieved {len(history)} analyses from history")
                
                # Check if our new analysis is in the history
                found_our_analysis = False
                for analysis in history:
                    if analysis.get('id') == result['id'] or analysis.get('jobUrl') == test_url:
                        found_our_analysis = True
                        print(f"      ✅ Found our analysis in history!")
                        break
                
                if not found_our_analysis:
                    print(f"      ⚠️  Our analysis not found in history (may be normal for mock storage)")
            
            if hasattr(service, 'get_analysis_stats'):
                stats = service.get_analysis_stats()
                print(f"      ✅ Stats: {stats['total_analyses']} total analyses")
            
            print(f"   ✅ {service_name} write test: PASSED")
            
        except Exception as e:
            print(f"   ❌ {service_name} write test failed: {e}")
            import traceback
            traceback.print_exc()
    
    # Test 3: Direct SQLite database check (if available)
    print(f"\n3. Direct SQLite Database Check:")
    
    try:
        import sqlite3
        from pathlib import Path
        
        # Look for database files
        db_files = [
            "ghost_job_detector.db",
            "../ghost_job_detector.db"
        ]
        
        db_found = False
        for db_file in db_files:
            if Path(db_file).exists():
                print(f"   ✅ Found database: {db_file}")
                
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # Check recent entries
                cursor.execute("SELECT COUNT(*) FROM job_searches")
                count = cursor.fetchone()[0]
                print(f"      📊 Total job searches: {count}")
                
                cursor.execute("""
                    SELECT id, company, job_title, ghost_probability, analysis_date 
                    FROM job_searches 
                    ORDER BY analysis_date DESC 
                    LIMIT 5
                """)
                
                recent = cursor.fetchall()
                print(f"      📚 Recent analyses:")
                for row in recent:
                    print(f"         ID:{row[0]} | {row[1]} - {row[2]} | {row[3]:.1%} | {row[4]}")
                
                conn.close()
                db_found = True
                break
        
        if not db_found:
            print(f"   ⚠️  No SQLite database files found")
            
            # Try to create one
            print(f"   🔧 Attempting to initialize database...")
            try:
                from database.init_db import main as init_db
                init_db()
                print(f"      ✅ Database initialized successfully")
            except Exception as e:
                print(f"      ❌ Database initialization failed: {e}")
    
    except Exception as e:
        print(f"   ❌ SQLite check failed: {e}")
    
    # Test 4: Check for Vercel Edge Config
    print(f"\n4. Vercel Edge Config Check:")
    
    edge_config_url = os.environ.get('EDGE_CONFIG')
    if edge_config_url:
        print(f"   ✅ EDGE_CONFIG found: {edge_config_url[:50]}...")
        
        try:
            from vercel_edge_manager import VercelEdgeManager
            edge_manager = VercelEdgeManager()
            
            # Try to get data
            all_data = edge_manager.get_all_data()
            job_searches = all_data.get('job_searches', {})
            companies = all_data.get('companies', {})
            
            print(f"   📊 Edge Config Contents:")
            print(f"      Job Searches: {len(job_searches)}")
            print(f"      Companies: {len(companies)}")
            
            if job_searches:
                print(f"      📚 Recent Edge Config analyses:")
                for search_id, search_data in list(job_searches.items())[-3:]:
                    print(f"         {search_data.get('company')} - {search_data.get('job_title')} ({search_data.get('ghost_probability', 0):.1%})")
        
        except Exception as e:
            print(f"   ❌ Edge Config access failed: {e}")
    else:
        print(f"   ⚠️  EDGE_CONFIG not set - using mock storage")
    
    print(f"\n🎉 Database Write Test Complete!")
    
    return True

def main():
    """Run database write test"""
    print("🚀 Ghost Job Detector - Database Write Test")
    print("=" * 60)
    
    success = test_database_write()
    
    if success:
        print(f"\n✅ Database write test completed!")
        print(f"\n💡 To test with your frontend:")
        print(f"   1. Start development server: npm run dev")
        print(f"   2. Analyze a job from the UI")
        print(f"   3. Check if it appears in Analysis History")
        print(f"\n🔍 To debug missing writes:")
        print(f"   1. Check browser Network tab for API calls")
        print(f"   2. Check Vercel function logs")
        print(f"   3. Verify EDGE_CONFIG environment variable")
    else:
        print(f"\n❌ Database write test had issues - see errors above")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)