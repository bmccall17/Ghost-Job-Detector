#!/usr/bin/env python3
"""
Test script for the database manager
"""

import sys
from datetime import datetime
from database import (
    DatabaseManager, Platform, FactorType,
    JobSearchCreate, KeyFactorCreate, ParsingMetadataCreate,
    AnalysisFilters
)

def test_database_manager():
    """Test basic database manager functionality"""
    print("🧪 Testing Database Manager")
    print("=" * 40)
    
    # Initialize manager
    db_manager = DatabaseManager("ghost_job_detector.db")
    
    # Test health check
    print("\n1. Health Check:")
    health = db_manager.health_check()
    print(f"   Status: {health['status']}")
    print(f"   Job Searches: {health['job_searches']}")
    print(f"   Companies: {health['companies']}")
    
    # Test creating a new job search
    print("\n2. Creating Job Search:")
    job_data = JobSearchCreate(
        url="https://example.com/job/test-123",
        platform=Platform.LINKEDIN,
        job_title="Test Software Engineer",
        company="Test Corp",
        location="San Francisco, CA",
        ghost_probability=0.45,
        confidence=0.88,
        parser_used="LinkedInParser",
        extraction_method="text_patterns",
        processing_time_ms=1200
    )
    
    factors = [
        KeyFactorCreate(
            factor_type=FactorType.WARNING,
            description="Moderate job posting age",
            severity=0.4,
            weight=0.15
        ),
        KeyFactorCreate(
            factor_type=FactorType.POSITIVE,
            description="Clear role requirements",
            severity=0.2,
            weight=-0.1
        )
    ]
    
    parsing_metadata = ParsingMetadataCreate(
        raw_title="Test Corp hiring Test Software Engineer | LinkedIn",
        structured_data_found=True,
        meta_tags_count=12,
        confidence_scores={"title": 0.9, "company": 0.85, "overall": 0.88}
    )
    
    try:
        search_id = db_manager.create_job_search(job_data, factors, parsing_metadata)
        print(f"   ✅ Created job search with ID: {search_id}")
    except Exception as e:
        print(f"   ❌ Error creating job search: {e}")
        # Might already exist, try to continue
        search_id = 1
    
    # Test retrieving job search
    print("\n3. Retrieving Job Search:")
    try:
        analysis = db_manager.get_job_search(search_id)
        if analysis:
            print(f"   ✅ Retrieved: {analysis.job_search.job_title} at {analysis.job_search.company}")
            print(f"   📊 Ghost Probability: {analysis.job_search.ghost_probability}")
            print(f"   🔍 Key Factors: {len(analysis.key_factors)}")
        else:
            print(f"   ❌ Job search {search_id} not found")
    except Exception as e:
        print(f"   ❌ Error retrieving job search: {e}")
    
    # Test getting analysis history
    print("\n4. Analysis History:")
    try:
        history = db_manager.get_job_searches(page=1, page_size=5)
        print(f"   ✅ Found {history.total_count} total analyses")
        print(f"   📄 Page {history.page} with {len(history.analyses)} items")
        for analysis in history.analyses[:3]:  # Show first 3
            print(f"      - {analysis.job_search.job_title} at {analysis.job_search.company} ({analysis.job_search.ghost_probability:.2f})")
    except Exception as e:
        print(f"   ❌ Error retrieving history: {e}")
    
    # Test analysis statistics
    print("\n5. Analysis Statistics:")
    try:
        stats = db_manager.get_analysis_stats()
        print(f"   ✅ Total Analyses: {stats.total_analyses}")
        print(f"   📈 Average Ghost Probability: {stats.avg_ghost_probability}")
        print(f"   🔴 High Risk: {stats.high_risk_count}")
        print(f"   🟡 Medium Risk: {stats.medium_risk_count}")
        print(f"   🟢 Low Risk: {stats.low_risk_count}")
        print(f"   🏢 Top Ghost Companies: {len(stats.top_ghost_companies)}")
    except Exception as e:
        print(f"   ❌ Error retrieving stats: {e}")
    
    # Test company insights
    print("\n6. Company Insights:")
    try:
        insights = db_manager.get_company_insights()
        print(f"   ✅ Found {len(insights)} companies with insights")
        for insight in insights[:3]:  # Show top 3
            print(f"      - {insight.company_name}: {insight.avg_ghost_percentage}% ghost rate ({insight.total_posts} posts)")
    except Exception as e:
        print(f"   ❌ Error retrieving company insights: {e}")
    
    # Test filtering
    print("\n7. Filtered Search:")
    try:
        filters = AnalysisFilters(
            platform=Platform.LINKEDIN,
            min_ghost_probability=0.3
        )
        filtered = db_manager.get_job_searches(filters=filters, page_size=3)
        print(f"   ✅ Found {filtered.total_count} LinkedIn jobs with ghost probability >= 0.3")
        for analysis in filtered.analyses:
            print(f"      - {analysis.job_search.job_title}: {analysis.job_search.ghost_probability:.2f}")
    except Exception as e:
        print(f"   ❌ Error with filtered search: {e}")
    
    print("\n🎉 Database Manager Test Complete!")

if __name__ == "__main__":
    test_database_manager()