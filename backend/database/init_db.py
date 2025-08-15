#!/usr/bin/env python3
"""
Initialize Ghost Job Detector SQLite Database
Creates tables and initial data
"""

import sqlite3
import os
from datetime import datetime

def create_database():
    """Create the SQLite database with full schema"""
    
    # Database path
    db_path = "ghost_job_detector.db"
    
    print("🗄️  Creating database:", db_path)
    
    # Remove existing database
    if os.path.exists(db_path):
        print("⚠️  Removing existing database:", db_path)
        os.remove(db_path)
    
    # Create connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("📋 Creating schema...")
    
    # Job searches table
    cursor.execute("""
        CREATE TABLE job_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE NOT NULL,
            platform TEXT NOT NULL DEFAULT 'unknown',
            job_title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ghost_probability REAL NOT NULL,
            confidence REAL NOT NULL,
            status TEXT DEFAULT 'completed',
            parser_used TEXT,
            extraction_method TEXT,
            processing_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Key factors table
    cursor.execute("""
        CREATE TABLE key_factors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id INTEGER NOT NULL,
            factor_type TEXT NOT NULL,
            description TEXT NOT NULL,
            severity REAL,
            weight REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (search_id) REFERENCES job_searches (id) ON DELETE CASCADE
        )
    """)
    
    # Companies table
    cursor.execute("""
        CREATE TABLE companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT UNIQUE NOT NULL,
            total_posts INTEGER DEFAULT 0,
            ghost_posts INTEGER DEFAULT 0,
            avg_ghost_probability REAL DEFAULT 0.0,
            min_ghost_probability REAL DEFAULT 1.0,
            max_ghost_probability REAL DEFAULT 0.0,
            first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            platforms_seen TEXT,
            risk_level TEXT DEFAULT 'unknown',
            notes TEXT
        )
    """)
    
    # Parsing metadata table
    cursor.execute("""
        CREATE TABLE parsing_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id INTEGER NOT NULL,
            raw_title TEXT,
            structured_data_found BOOLEAN DEFAULT FALSE,
            meta_tags_count INTEGER DEFAULT 0,
            validation_results TEXT,
            confidence_scores TEXT,
            extraction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (search_id) REFERENCES job_searches (id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX idx_job_searches_company ON job_searches(company)")
    cursor.execute("CREATE INDEX idx_job_searches_date ON job_searches(analysis_date)")
    cursor.execute("CREATE INDEX idx_job_searches_platform ON job_searches(platform)")
    cursor.execute("CREATE INDEX idx_key_factors_search_id ON key_factors(search_id)")
    
    # Create triggers for automatic company statistics
    cursor.execute("""
        CREATE TRIGGER update_company_stats_insert
        AFTER INSERT ON job_searches
        FOR EACH ROW
        BEGIN
            INSERT OR REPLACE INTO companies (
                company_name, total_posts, ghost_posts, avg_ghost_probability,
                min_ghost_probability, max_ghost_probability, first_seen, last_updated
            )
            SELECT 
                NEW.company,
                COUNT(*),
                SUM(CASE WHEN ghost_probability >= 0.67 THEN 1 ELSE 0 END),
                AVG(ghost_probability),
                MIN(ghost_probability),
                MAX(ghost_probability),
                MIN(analysis_date),
                datetime('now')
            FROM job_searches 
            WHERE company = NEW.company;
        END
    """)
    
    cursor.execute("""
        CREATE TRIGGER update_company_stats_update
        AFTER UPDATE ON job_searches
        FOR EACH ROW
        BEGIN
            INSERT OR REPLACE INTO companies (
                company_name, total_posts, ghost_posts, avg_ghost_probability,
                min_ghost_probability, max_ghost_probability, first_seen, last_updated
            )
            SELECT 
                NEW.company,
                COUNT(*),
                SUM(CASE WHEN ghost_probability >= 0.67 THEN 1 ELSE 0 END),
                AVG(ghost_probability),
                MIN(ghost_probability),
                MAX(ghost_probability),
                MIN(analysis_date),
                datetime('now')
            FROM job_searches 
            WHERE company = NEW.company;
        END
    """)
    
    print("✅ Database schema created successfully")
    
    # Insert sample data
    print("🌱 Seeding sample data...")
    
    sample_jobs = [
        ("https://linkedin.com/jobs/view/sample1", "linkedin", "Software Engineer", "TechCorp", "San Francisco, CA", 0.78),
        ("https://indeed.com/viewjob?jk=sample2", "indeed", "Product Manager", "Google", "Remote", 0.15),
        ("https://careers.startup.com/jobs/sample3", "company", "Data Scientist", "DataFlow Inc", "New York, NY", 0.55),
        ("https://linkedin.com/jobs/view/sample4", "linkedin", "Marketing Manager", "TechCorp", "Austin, TX", 0.82),
        ("https://glassdoor.com/job/sample5", "glassdoor", "Customer Success Manager", "Mural", "Chicago, IL", 0.32)
    ]
    
    for i, (url, platform, title, company, location, ghost_prob) in enumerate(sample_jobs, 1):
        confidence = 0.75 + (i * 0.05)
        
        cursor.execute("""
            INSERT INTO job_searches (
                url, platform, job_title, company, location, 
                ghost_probability, confidence, parser_used, extraction_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (url, platform, title, company, location, ghost_prob, confidence, "SampleParser", "manual"))
        
        search_id = cursor.lastrowid
        
        # Add sample factors
        factors = [
            ("warning", f"Sample factor for {title}", 0.4, 0.15),
            ("red_flag" if ghost_prob > 0.6 else "positive", f"Risk indicator for {company}", 0.6, 0.2)
        ]
        
        for factor_type, description, severity, weight in factors:
            cursor.execute("""
                INSERT INTO key_factors (search_id, factor_type, description, severity, weight)
                VALUES (?, ?, ?, ?, ?)
            """, (search_id, factor_type, description, severity, weight))
    
    conn.commit()
    print(f"✅ Inserted {len(sample_jobs)} sample job analyses")
    
    # Verify data
    cursor.execute("SELECT COUNT(*) FROM job_searches")
    job_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM companies") 
    company_count = cursor.fetchone()[0]
    
    print(f"✅ Database contains {job_count} job analyses")
    print(f"✅ Database contains {company_count} companies")
    
    conn.close()
    
    print(f"\n🎉 Database initialization completed successfully!")
    print(f"📂 Database file: {db_path}")
    print(f"🔧 Ready for use with Ghost Job Detector API")

def main():
    """Main function"""
    print("🚀 Ghost Job Detector Database Initialization")
    print("=" * 50)
    create_database()

if __name__ == "__main__":
    main()