#!/usr/bin/env python3
"""
Database initialization script for Ghost Job Detector
Creates the SQLite database and tables, and optionally seeds with sample data
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
from pathlib import Path

class DatabaseInitializer:
    def __init__(self, db_path: str = "ghost_job_detector.db"):
        self.db_path = db_path
        self.schema_path = Path(__file__).parent / "schema.sql"
        
    def create_database(self) -> None:
        """Create the database and execute schema"""
        print(f"🗄️  Creating database: {self.db_path}")
        
        # Remove existing database if it exists
        if os.path.exists(self.db_path):
            print(f"⚠️  Removing existing database: {self.db_path}")
            os.remove(self.db_path)
        
        # Connect to database (creates file)
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Read and execute schema
            with open(self.schema_path, 'r') as f:
                schema_sql = f.read()
            
            print("📋 Executing schema...")
            conn.executescript(schema_sql)
            conn.commit()
            print("✅ Database schema created successfully")
            
        except Exception as e:
            print(f"❌ Error creating database: {e}")
            raise
        finally:
            conn.close()
    
    def seed_sample_data(self) -> None:
        """Insert sample data for testing"""
        print("🌱 Seeding sample data...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Sample job searches
            sample_jobs = [
                {
                    'url': 'https://www.linkedin.com/jobs/view/4277736994/',
                    'platform': 'linkedin',
                    'job_title': 'Customer Success Manager',
                    'company': 'Mural',
                    'location': 'NAMER',
                    'ghost_probability': 0.32,
                    'confidence': 0.87,
                    'parser_used': 'LinkedInParser',
                    'extraction_method': 'text_patterns',
                    'processing_time_ms': 1250,
                    'analysis_date': datetime.now() - timedelta(days=1)
                },
                {
                    'url': 'https://www.linkedin.com/jobs/view/4263764275/',
                    'platform': 'linkedin',
                    'job_title': 'Software Engineer',
                    'company': 'TechCorp',
                    'location': 'San Francisco, CA',
                    'ghost_probability': 0.78,
                    'confidence': 0.92,
                    'parser_used': 'LinkedInParser',
                    'extraction_method': 'structured_data',
                    'processing_time_ms': 890,
                    'analysis_date': datetime.now() - timedelta(days=3)
                },
                {
                    'url': 'https://jobs.google.com/view/123456',
                    'platform': 'company',
                    'job_title': 'Product Manager',
                    'company': 'Google',
                    'location': 'Mountain View, CA',
                    'ghost_probability': 0.15,
                    'confidence': 0.95,
                    'parser_used': 'CompanyCareerParser',
                    'extraction_method': 'structured_data',
                    'processing_time_ms': 650,
                    'analysis_date': datetime.now() - timedelta(days=5)
                },
                {
                    'url': 'https://www.indeed.com/viewjob?jk=abc123',
                    'platform': 'indeed',
                    'job_title': 'Data Scientist',
                    'company': 'DataFlow Inc',
                    'location': 'Remote',
                    'ghost_probability': 0.55,
                    'confidence': 0.73,
                    'parser_used': 'IndeedParser',
                    'extraction_method': 'css_selectors',
                    'processing_time_ms': 1100,
                    'analysis_date': datetime.now() - timedelta(days=7)
                },
                {
                    'url': 'https://www.linkedin.com/jobs/view/4283562303/',
                    'platform': 'linkedin',
                    'job_title': 'Marketing Manager',
                    'company': 'TechCorp',
                    'location': 'New York, NY',
                    'ghost_probability': 0.82,
                    'confidence': 0.89,
                    'parser_used': 'LinkedInParser',
                    'extraction_method': 'text_patterns',
                    'processing_time_ms': 1350,
                    'analysis_date': datetime.now() - timedelta(days=10)
                }
            ]
            
            # Insert job searches
            for job in sample_jobs:
                cursor.execute("""
                    INSERT INTO job_searches (
                        url, platform, job_title, company, location, 
                        ghost_probability, confidence, parser_used, 
                        extraction_method, processing_time_ms, analysis_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job['url'], job['platform'], job['job_title'], 
                    job['company'], job['location'], job['ghost_probability'],
                    job['confidence'], job['parser_used'], job['extraction_method'],
                    job['processing_time_ms'], job['analysis_date']
                ))
                
                search_id = cursor.lastrowid
                
                # Add sample key factors for each job
                sample_factors = self._get_sample_factors(job['ghost_probability'])
                for factor in sample_factors:
                    cursor.execute("""
                        INSERT INTO key_factors (search_id, factor_type, description, severity, weight)
                        VALUES (?, ?, ?, ?, ?)
                    """, (search_id, factor['type'], factor['description'], 
                          factor['severity'], factor['weight']))
                
                # Add sample parsing metadata
                cursor.execute("""
                    INSERT INTO parsing_metadata (
                        search_id, raw_title, structured_data_found, 
                        meta_tags_count, validation_results, confidence_scores
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    search_id, 
                    f"{job['company']} hiring {job['job_title']} | LinkedIn",
                    job['extraction_method'] == 'structured_data',
                    15,
                    json.dumps([
                        {"field": "title", "passed": True, "rule": "length_check", "score": 0.9},
                        {"field": "company", "passed": True, "rule": "content_quality", "score": 0.85}
                    ]),
                    json.dumps({
                        "overall": job['confidence'],
                        "title": min(job['confidence'] + 0.05, 1.0),
                        "company": max(job['confidence'] - 0.05, 0.0)
                    })
                ))
            
            conn.commit()
            print(f"✅ Inserted {len(sample_jobs)} sample job analyses")
            
            # Verify company statistics were updated by triggers
            cursor.execute("SELECT company_name, total_posts, avg_ghost_probability FROM companies")
            companies = cursor.fetchall()
            print(f"✅ Company statistics updated for {len(companies)} companies")
            
        except Exception as e:
            print(f"❌ Error seeding sample data: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def _get_sample_factors(self, ghost_probability: float) -> list:
        """Generate realistic key factors based on ghost probability"""
        if ghost_probability >= 0.67:
            return [
                {'type': 'red_flag', 'description': 'Job posting has been active for 45+ days', 'severity': 0.9, 'weight': 0.3},
                {'type': 'red_flag', 'description': 'Generic job description with minimal requirements', 'severity': 0.8, 'weight': 0.25},
                {'type': 'warning', 'description': 'Company has unusual posting frequency patterns', 'severity': 0.6, 'weight': 0.2}
            ]
        elif ghost_probability >= 0.34:
            return [
                {'type': 'warning', 'description': 'Job posting age is above average', 'severity': 0.5, 'weight': 0.15},
                {'type': 'warning', 'description': 'Limited company information available', 'severity': 0.4, 'weight': 0.1},
                {'type': 'positive', 'description': 'Detailed job requirements provided', 'severity': 0.2, 'weight': -0.1}
            ]
        else:
            return [
                {'type': 'positive', 'description': 'Recent job posting with specific requirements', 'severity': 0.1, 'weight': -0.2},
                {'type': 'positive', 'description': 'Company has consistent hiring patterns', 'severity': 0.1, 'weight': -0.15},
                {'type': 'positive', 'description': 'Clear role expectations and responsibilities', 'severity': 0.1, 'weight': -0.1}
            ]
    
    def verify_database(self) -> None:
        """Verify database was created correctly"""
        print("🔍 Verifying database structure...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            expected_tables = ['job_searches', 'key_factors', 'companies', 'parsing_metadata']
            
            for table in expected_tables:
                if table in tables:
                    print(f"✅ Table '{table}' exists")
                else:
                    print(f"❌ Table '{table}' missing")
            
            # Check views exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='view'")
            views = [row[0] for row in cursor.fetchall()]
            expected_views = ['company_insights', 'recent_analyses']
            
            for view in expected_views:
                if view in views:
                    print(f"✅ View '{view}' exists")
                else:
                    print(f"❌ View '{view}' missing")
            
            # Check sample data
            cursor.execute("SELECT COUNT(*) FROM job_searches")
            job_count = cursor.fetchone()[0]
            print(f"✅ Database contains {job_count} job analyses")
            
            cursor.execute("SELECT COUNT(*) FROM companies")
            company_count = cursor.fetchone()[0]
            print(f"✅ Database contains {company_count} companies")
            
        except Exception as e:
            print(f"❌ Error verifying database: {e}")
            raise
        finally:
            conn.close()

def main():
    """Main initialization function"""
    print("🚀 Ghost Job Detector Database Initialization")
    print("=" * 50)
    
    db_init = DatabaseInitializer()
    
    try:
        # Create database and schema
        db_init.create_database()
        
        # Seed with sample data
        db_init.seed_sample_data()
        
        # Verify everything worked
        db_init.verify_database()
        
        print("\n🎉 Database initialization completed successfully!")
        print(f"📂 Database file: {db_init.db_path}")
        print("🔧 Ready for use with Ghost Job Detector API")
        
    except Exception as e:
        print(f"\n💥 Database initialization failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())