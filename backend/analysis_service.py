#!/usr/bin/env python3
"""
Analysis Service for Ghost Job Detector
Integrates job analysis with database storage
"""

import sqlite3
import json
import random
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

class AnalysisService:
    """Service for analyzing jobs and storing results in database"""
    
    def __init__(self, db_path: str = "ghost_job_detector.db"):
        self.db_path = db_path
    
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    
    def detect_platform(self, url: str) -> str:
        """Detect job platform from URL"""
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname.lower() if parsed.hostname else ""
            
            if "linkedin" in hostname:
                return "linkedin"
            elif "indeed" in hostname:
                return "indeed"
            elif "glassdoor" in hostname:
                return "glassdoor"
            elif "careers." in hostname or "/careers" in parsed.path or "/jobs" in parsed.path:
                return "company"
            else:
                return "other"
        except:
            return "other"
    
    def extract_job_data(self, job_url: str) -> Dict[str, Any]:
        """Extract job data from URL - mock implementation"""
        platform = self.detect_platform(job_url)
        
        # Mock job titles and companies for demonstration
        mock_titles = [
            "Senior Software Engineer", "Product Manager", "Data Scientist",
            "Frontend Developer", "DevOps Engineer", "UX Designer",
            "Customer Success Manager", "Sales Development Representative",
            "Marketing Coordinator", "Business Analyst"
        ]
        
        mock_companies = [
            "TechCorp", "InnovateCo", "DataDynamics", "CloudFirst",
            "StartupXYZ", "Enterprise Solutions", "Digital Ventures",
            "AI Technologies", "Growth Company", "Innovation Labs"
        ]
        
        mock_locations = [
            "San Francisco, CA", "New York, NY", "Remote", "Seattle, WA",
            "Austin, TX", "Boston, MA", "Los Angeles, CA", "Chicago, IL"
        ]
        
        # Simulate parsing with some variation based on URL
        url_hash = hash(job_url) % len(mock_titles)
        
        return {
            "job_title": mock_titles[url_hash],
            "company": mock_companies[url_hash % len(mock_companies)],
            "location": mock_locations[url_hash % len(mock_locations)],
            "platform": platform,
            "parsing_metadata": {
                "raw_title": f"{mock_titles[url_hash]} - {mock_companies[url_hash % len(mock_companies)]} | {platform.title()}",
                "structured_data_found": random.choice([True, False]),
                "meta_tags_count": random.randint(8, 25),
                "confidence_scores": {
                    "title": 0.80 + random.uniform(0, 0.15),
                    "company": 0.85 + random.uniform(0, 0.10),
                    "overall": 0.75 + random.uniform(0, 0.20)
                }
            }
        }
    
    def analyze_job_for_ghost_probability(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze job for ghost job probability - mock ML model"""
        processing_start = time.time()
        
        # Mock ghost probability with some logic based on job data
        base_prob = random.uniform(0.2, 0.8)
        
        # Adjust based on "company" patterns (for demo)
        if "startup" in job_data["company"].lower():
            base_prob += 0.1
        elif "google" in job_data["company"].lower() or "microsoft" in job_data["company"].lower():
            base_prob -= 0.2
        
        # Ensure probability is within bounds
        ghost_prob = max(0.05, min(0.95, base_prob))
        confidence = 0.75 + random.uniform(0, 0.20)
        
        # Generate realistic factors
        factors = self._generate_analysis_factors(ghost_prob)
        
        processing_time = int((time.time() - processing_start) * 1000)
        
        return {
            "ghost_probability": ghost_prob,
            "confidence": confidence,
            "factors": factors,
            "processing_time_ms": processing_time
        }
    
    def _generate_analysis_factors(self, ghost_prob: float) -> List[Dict[str, Any]]:
        """Generate realistic analysis factors based on ghost probability"""
        factors = []
        
        # High ghost probability factors
        if ghost_prob > 0.6:
            factors.extend([
                {
                    "factor_type": "red_flag",
                    "description": "Job posting has been active for 60+ days without updates",
                    "severity": 0.7 + random.uniform(0, 0.2),
                    "weight": 0.25 + random.uniform(0, 0.15)
                },
                {
                    "factor_type": "red_flag", 
                    "description": "Generic job description with minimal specific requirements",
                    "severity": 0.6 + random.uniform(0, 0.25),
                    "weight": 0.20 + random.uniform(0, 0.10)
                }
            ])
        
        # Medium probability factors
        if 0.3 < ghost_prob <= 0.6:
            factors.extend([
                {
                    "factor_type": "warning",
                    "description": "Limited company information available",
                    "severity": 0.4 + random.uniform(0, 0.3),
                    "weight": 0.15 + random.uniform(0, 0.10)
                },
                {
                    "factor_type": "warning",
                    "description": "Vague salary range or compensation details missing",
                    "severity": 0.3 + random.uniform(0, 0.4),
                    "weight": 0.10 + random.uniform(0, 0.15)
                }
            ])
        
        # Low probability (positive factors)
        if ghost_prob < 0.4:
            factors.extend([
                {
                    "factor_type": "positive",
                    "description": "Clear role requirements and specific technical skills mentioned",
                    "severity": 0.2 + random.uniform(0, 0.2),
                    "weight": -0.15 + random.uniform(-0.05, 0.05)
                },
                {
                    "factor_type": "positive",
                    "description": "Recent posting with realistic application timeline",
                    "severity": 0.1 + random.uniform(0, 0.2),
                    "weight": -0.10 + random.uniform(-0.05, 0.05)
                }
            ])
        
        # Always add at least one factor
        if not factors:
            factors.append({
                "factor_type": "warning",
                "description": "Standard analysis completed with no significant risk factors",
                "severity": 0.2,
                "weight": 0.05
            })
        
        return factors
    
    def save_analysis_to_database(self, job_url: str, job_data: Dict[str, Any], analysis: Dict[str, Any]) -> int:
        """Save complete analysis to database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Insert job search
            cursor.execute("""
                INSERT INTO job_searches (
                    url, platform, job_title, company, location, 
                    ghost_probability, confidence, parser_used, 
                    extraction_method, processing_time_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_url,
                job_data["platform"],
                job_data["job_title"],
                job_data["company"],
                job_data.get("location"),
                analysis["ghost_probability"],
                analysis["confidence"],
                "MockParser",
                "simulation",
                analysis["processing_time_ms"]
            ))
            
            search_id = cursor.lastrowid
            
            # Insert key factors
            for factor in analysis["factors"]:
                cursor.execute("""
                    INSERT INTO key_factors (search_id, factor_type, description, severity, weight)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    search_id,
                    factor["factor_type"],
                    factor["description"],
                    factor["severity"],
                    factor["weight"]
                ))
            
            # Insert parsing metadata
            parsing_meta = job_data.get("parsing_metadata", {})
            cursor.execute("""
                INSERT INTO parsing_metadata (
                    search_id, raw_title, structured_data_found, meta_tags_count, confidence_scores
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                search_id,
                parsing_meta.get("raw_title"),
                parsing_meta.get("structured_data_found", False),
                parsing_meta.get("meta_tags_count", 0),
                json.dumps(parsing_meta.get("confidence_scores", {}))
            ))
            
            conn.commit()
            return search_id
            
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e):
                # URL already exists, get existing ID
                cursor.execute("SELECT id FROM job_searches WHERE url = ?", (job_url,))
                existing = cursor.fetchone()
                return existing[0] if existing else None
            raise
        finally:
            conn.close()
    
    def analyze_job_complete(self, job_url: str) -> Dict[str, Any]:
        """Complete job analysis pipeline: extract -> analyze -> store"""
        try:
            # Step 1: Extract job data
            job_data = self.extract_job_data(job_url)
            
            # Step 2: Analyze for ghost probability
            analysis = self.analyze_job_for_ghost_probability(job_data)
            
            # Step 3: Save to database
            search_id = self.save_analysis_to_database(job_url, job_data, analysis)
            
            # Step 4: Return frontend-compatible response
            factors_response = []
            for factor in analysis["factors"]:
                factors_response.append({
                    "factor": factor["description"],
                    "weight": factor["weight"],
                    "description": factor["description"]
                })
            
            return {
                "id": str(search_id),
                "ghostProbability": analysis["ghost_probability"],
                "confidence": analysis["confidence"],
                "factors": factors_response,
                "metadata": {
                    "processingTime": analysis["processing_time_ms"],
                    "modelVersion": "v1.0.0-mock"
                },
                "jobData": {
                    "title": job_data["job_title"],
                    "company": job_data["company"],
                    "location": job_data.get("location"),
                    "platform": job_data["platform"]
                },
                "parsingMetadata": job_data["parsing_metadata"]
            }
            
        except Exception as e:
            print(f"Error in complete analysis: {e}")
            raise
    
    def get_analysis_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent analysis history from database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT js.*, 
                       GROUP_CONCAT(kf.description || ' (weight: ' || kf.weight || ')') as factors
                FROM job_searches js
                LEFT JOIN key_factors kf ON js.id = kf.search_id
                GROUP BY js.id
                ORDER BY js.analysis_date DESC
                LIMIT ?
            """, (limit,))
            
            analyses = []
            for row in cursor.fetchall():
                analysis = {
                    "id": str(row["id"]),
                    "jobUrl": row["url"],
                    "title": row["job_title"],
                    "company": row["company"],
                    "ghostProbability": row["ghost_probability"],
                    "confidence": row["confidence"],
                    "analyzedAt": row["analysis_date"],
                    "status": "completed",
                    "factors": row["factors"].split(",") if row["factors"] else []
                }
                analyses.append(analysis)
            
            return analyses
            
        finally:
            conn.close()
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get analysis statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Basic stats
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
            
            # Top companies
            cursor.execute("""
                SELECT company_name, avg_ghost_probability, total_posts
                FROM companies 
                ORDER BY avg_ghost_probability DESC
                LIMIT 5
            """)
            
            top_companies = [
                {
                    "company": row["company_name"],
                    "avg_ghost_probability": row["avg_ghost_probability"],
                    "total_posts": row["total_posts"]
                }
                for row in cursor.fetchall()
            ]
            
            return {
                "total_analyses": stats["total"],
                "avg_ghost_probability": round(stats["avg_prob"] or 0, 3),
                "high_risk_count": stats["high_risk"],
                "medium_risk_count": stats["medium_risk"],
                "low_risk_count": stats["low_risk"],
                "top_ghost_companies": top_companies
            }
            
        finally:
            conn.close()

def main():
    """CLI interface for testing the analysis service"""
    import sys
    
    service = AnalysisService()
    
    if len(sys.argv) < 2:
        print("Usage: python3 analysis_service.py <command> [args]")
        print("Commands:")
        print("  analyze <job_url>     - Analyze a job posting")
        print("  history               - Show analysis history")
        print("  stats                 - Show analysis statistics")
        return
    
    command = sys.argv[1]
    
    try:
        if command == "analyze" and len(sys.argv) > 2:
            job_url = sys.argv[2]
            print(f"🔍 Analyzing job: {job_url}")
            result = service.analyze_job_complete(job_url)
            
            print(f"\n✅ Analysis Complete!")
            print(f"   📊 Ghost Probability: {result['ghostProbability']:.2%}")
            print(f"   🎯 Confidence: {result['confidence']:.2%}")
            print(f"   🏢 Company: {result['jobData']['company']}")
            print(f"   💼 Title: {result['jobData']['title']}")
            print(f"   📍 Location: {result['jobData']['location']}")
            print(f"   ⚙️  Processing Time: {result['metadata']['processingTime']}ms")
            print(f"   🔍 Key Factors: {len(result['factors'])}")
            
            for i, factor in enumerate(result['factors'][:3], 1):
                print(f"      {i}. {factor['description']}")
        
        elif command == "history":
            print("📚 Analysis History:")
            history = service.get_analysis_history(10)
            
            for analysis in history:
                risk_emoji = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
                print(f"   {risk_emoji} {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.1%})")
        
        elif command == "stats":
            print("📈 Analysis Statistics:")
            stats = service.get_analysis_stats()
            
            print(f"   Total Analyses: {stats['total_analyses']}")
            print(f"   Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
            print(f"   🔴 High Risk: {stats['high_risk_count']}")
            print(f"   🟡 Medium Risk: {stats['medium_risk_count']}")
            print(f"   🟢 Low Risk: {stats['low_risk_count']}")
            print(f"\n   Top Ghost Companies:")
            for company in stats['top_ghost_companies']:
                print(f"      - {company['company']}: {company['avg_ghost_probability']:.1%} ({company['total_posts']} posts)")
        
        else:
            print("❌ Invalid command or missing arguments")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()