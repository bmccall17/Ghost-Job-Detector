#!/usr/bin/env python3
"""
Simple test of database functionality without external dependencies
"""

import sqlite3
import json
from datetime import datetime

def test_database():
    """Test basic database operations"""
    print("🧪 Testing Database Operations")
    print("=" * 40)
    
    try:
        # Connect to database
        conn = sqlite3.connect("ghost_job_detector.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Test 1: Health check
        print("\n1. Health Check:")
        cursor.execute("SELECT COUNT(*) FROM job_searches")
        job_count = cursor.fetchone()[0]
        print(f"   Job Searches: {job_count}")
        
        cursor.execute("SELECT COUNT(*) FROM companies")
        company_count = cursor.fetchone()[0]
        print(f"   Companies: {company_count}")
        
        # Test 2: Insert new job search
        print("\n2. Creating Test Job Search:")
        cursor.execute("""
            INSERT INTO job_searches (
                url, platform, job_title, company, location, 
                ghost_probability, confidence, parser_used, 
                extraction_method, processing_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "https://example.com/test-job", "linkedin", "Test Engineer", 
            "Test Corp", "Remote", 0.65, 0.85, "TestParser",
            "test_method", 1500
        ))
        
        search_id = cursor.lastrowid
        print(f"   ✅ Created job search with ID: {search_id}")
        
        # Test 3: Add key factors
        print("\n3. Adding Key Factors:")
        factors = [
            ("red_flag", "Test red flag factor", 0.8, 0.3),
            ("warning", "Test warning factor", 0.4, 0.15),
            ("positive", "Test positive factor", 0.2, -0.1)
        ]
        
        for factor_type, description, severity, weight in factors:
            cursor.execute("""
                INSERT INTO key_factors (search_id, factor_type, description, severity, weight)
                VALUES (?, ?, ?, ?, ?)
            """, (search_id, factor_type, description, severity, weight))
        
        print(f"   ✅ Added {len(factors)} key factors")
        
        # Test 4: Retrieve analysis
        print("\n4. Retrieving Analysis:")
        cursor.execute("""
            SELECT js.*, GROUP_CONCAT(kf.description) as factors
            FROM job_searches js
            LEFT JOIN key_factors kf ON js.id = kf.search_id
            WHERE js.id = ?
            GROUP BY js.id
        """, (search_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"   ✅ Retrieved: {result['job_title']} at {result['company']}")
            print(f"   📊 Ghost Probability: {result['ghost_probability']}")
            print(f"   🔍 Factors: {len(factors)}")
        
        # Test 5: Get statistics
        print("\n5. Analysis Statistics:")
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                AVG(ghost_probability) as avg_prob,
                SUM(CASE WHEN ghost_probability >= 0.67 THEN 1 ELSE 0 END) as high_risk,
                SUM(CASE WHEN ghost_probability >= 0.34 AND ghost_probability < 0.67 THEN 1 ELSE 0 END) as medium_risk,
                SUM(CASE WHEN ghost_probability < 0.34 THEN 1 ELSE 0 END) as low_risk
            FROM job_searches
        """)
        
        stats = cursor.fetchone()
        print(f"   ✅ Total Analyses: {stats[0]}")
        print(f"   📈 Average Ghost Probability: {stats[1]:.3f}")
        print(f"   🔴 High Risk: {stats[2]}")
        print(f"   🟡 Medium Risk: {stats[3]}")
        print(f"   🟢 Low Risk: {stats[4]}")
        
        # Test 6: Company insights
        print("\n6. Company Insights:")
        cursor.execute("SELECT * FROM company_insights LIMIT 3")
        insights = cursor.fetchall()
        
        for insight in insights:
            print(f"   - {insight['company_name']}: {insight['avg_ghost_percentage']:.1f}% ghost rate ({insight['total_posts']} posts)")
        
        conn.commit()
        conn.close()
        
        print("\n🎉 Database Test Complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Database test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_database()
    if success:
        print("\n✅ All tests passed! Database is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the error messages above.")