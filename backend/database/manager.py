"""
Database manager class for Ghost Job Detector
Handles all database operations including CRUD, transactions, and business logic
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
import logging

from .models import (
    JobSearchCreate, KeyFactorCreate, ParsingMetadataCreate,
    JobSearchResponse, KeyFactorResponse, CompanyResponse, ParsingMetadataResponse,
    JobAnalysisDetail, AnalysisHistoryResponse, AnalysisStats,
    AnalysisFilters, CompanyInsight, Platform, Status, FactorType, RiskLevel
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Centralized database manager for all Ghost Job Detector data operations"""
    
    def __init__(self, db_path: str = "ghost_job_detector.db"):
        self.db_path = db_path
        self._ensure_database_exists()
    
    def _ensure_database_exists(self) -> None:
        """Ensure database file exists, create if it doesn't"""
        if not Path(self.db_path).exists():
            logger.warning(f"Database {self.db_path} not found, initializing...")
            # Could auto-initialize here, but for now just warn
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a database connection with proper configuration"""
        conn = sqlite3.connect(self.db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
        return conn
    
    # Job Search Operations
    
    def create_job_search(
        self, 
        job_data: JobSearchCreate, 
        factors: Optional[List[KeyFactorCreate]] = None,
        parsing_metadata: Optional[ParsingMetadataCreate] = None
    ) -> int:
        """Create a new job search analysis with associated data"""
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
                job_data.url, job_data.platform.value, job_data.job_title,
                job_data.company, job_data.location, job_data.ghost_probability,
                job_data.confidence, job_data.parser_used, 
                job_data.extraction_method, job_data.processing_time_ms
            ))
            
            search_id = cursor.lastrowid
            logger.info(f"Created job search {search_id} for {job_data.company}")
            
            # Insert key factors if provided
            if factors:
                for factor in factors:
                    cursor.execute("""
                        INSERT INTO key_factors (search_id, factor_type, description, severity, weight)
                        VALUES (?, ?, ?, ?, ?)
                    """, (search_id, factor.factor_type.value, factor.description, 
                          factor.severity, factor.weight))
                
                logger.info(f"Added {len(factors)} key factors for search {search_id}")
            
            # Insert parsing metadata if provided
            if parsing_metadata:
                cursor.execute("""
                    INSERT INTO parsing_metadata (
                        search_id, raw_title, structured_data_found, meta_tags_count,
                        validation_results, confidence_scores
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    search_id, parsing_metadata.raw_title, parsing_metadata.structured_data_found,
                    parsing_metadata.meta_tags_count, 
                    json.dumps(parsing_metadata.validation_results) if parsing_metadata.validation_results else None,
                    json.dumps(parsing_metadata.confidence_scores) if parsing_metadata.confidence_scores else None
                ))
                
                logger.info(f"Added parsing metadata for search {search_id}")
            
            conn.commit()
            return search_id
            
        except sqlite3.IntegrityError as e:
            conn.rollback()
            if "UNIQUE constraint failed" in str(e):
                logger.warning(f"Job search already exists for URL: {job_data.url}")
                # Return existing ID
                cursor.execute("SELECT id FROM job_searches WHERE url = ?", (job_data.url,))
                existing = cursor.fetchone()
                return existing['id'] if existing else None
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error creating job search: {e}")
            raise
        finally:
            conn.close()
    
    def get_job_search(self, search_id: int) -> Optional[JobAnalysisDetail]:
        """Get a complete job analysis by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get job search
            cursor.execute("SELECT * FROM job_searches WHERE id = ?", (search_id,))
            job_row = cursor.fetchone()
            if not job_row:
                return None
            
            job_search = JobSearchResponse(**dict(job_row))
            
            # Get key factors
            cursor.execute("SELECT * FROM key_factors WHERE search_id = ?", (search_id,))
            factor_rows = cursor.fetchall()
            key_factors = [KeyFactorResponse(**dict(row)) for row in factor_rows]
            
            # Get parsing metadata
            cursor.execute("SELECT * FROM parsing_metadata WHERE search_id = ?", (search_id,))
            metadata_row = cursor.fetchone()
            parsing_metadata = None
            if metadata_row:
                metadata_dict = dict(metadata_row)
                # Parse JSON fields
                if metadata_dict['validation_results']:
                    metadata_dict['validation_results'] = json.loads(metadata_dict['validation_results'])
                if metadata_dict['confidence_scores']:
                    metadata_dict['confidence_scores'] = json.loads(metadata_dict['confidence_scores'])
                parsing_metadata = ParsingMetadataResponse(**metadata_dict)
            
            # Get company info
            cursor.execute("SELECT * FROM companies WHERE company_name = ?", (job_search.company,))
            company_row = cursor.fetchone()
            company_info = CompanyResponse(**dict(company_row)) if company_row else None
            
            return JobAnalysisDetail(
                job_search=job_search,
                key_factors=key_factors,
                parsing_metadata=parsing_metadata,
                company_info=company_info
            )
            
        except Exception as e:
            logger.error(f"Error retrieving job search {search_id}: {e}")
            raise
        finally:
            conn.close()
    
    def get_job_searches(
        self, 
        filters: Optional[AnalysisFilters] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "analysis_date",
        order_desc: bool = True
    ) -> AnalysisHistoryResponse:
        """Get paginated list of job searches with filters"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Build WHERE clause
            where_clauses = []
            params = []
            
            if filters:
                if filters.platform:
                    where_clauses.append("js.platform = ?")
                    params.append(filters.platform.value)
                
                if filters.company:
                    where_clauses.append("js.company LIKE ?")
                    params.append(f"%{filters.company}%")
                
                if filters.min_ghost_probability is not None:
                    where_clauses.append("js.ghost_probability >= ?")
                    params.append(filters.min_ghost_probability)
                
                if filters.max_ghost_probability is not None:
                    where_clauses.append("js.ghost_probability <= ?")
                    params.append(filters.max_ghost_probability)
                
                if filters.start_date:
                    where_clauses.append("js.analysis_date >= ?")
                    params.append(filters.start_date)
                
                if filters.end_date:
                    where_clauses.append("js.analysis_date <= ?")
                    params.append(filters.end_date)
                
                if filters.risk_level:
                    where_clauses.append("c.risk_level = ?")
                    params.append(filters.risk_level.value)
            
            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # Get total count
            count_query = f"""
                SELECT COUNT(DISTINCT js.id) 
                FROM job_searches js 
                LEFT JOIN companies c ON js.company = c.company_name 
                {where_sql}
            """
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]
            
            # Build ORDER BY clause
            valid_order_columns = ['analysis_date', 'ghost_probability', 'company', 'job_title']
            if order_by not in valid_order_columns:
                order_by = 'analysis_date'
            
            order_direction = "DESC" if order_desc else "ASC"
            order_sql = f"ORDER BY js.{order_by} {order_direction}"
            
            # Get paginated results
            offset = (page - 1) * page_size
            results_query = f"""
                SELECT js.* 
                FROM job_searches js 
                LEFT JOIN companies c ON js.company = c.company_name 
                {where_sql} 
                {order_sql} 
                LIMIT ? OFFSET ?
            """
            cursor.execute(results_query, params + [page_size, offset])
            job_rows = cursor.fetchall()
            
            # Convert to detailed analyses
            analyses = []
            for job_row in job_rows:
                job_search = JobSearchResponse(**dict(job_row))
                
                # Get factors for this job
                cursor.execute("SELECT * FROM key_factors WHERE search_id = ?", (job_search.id,))
                factor_rows = cursor.fetchall()
                key_factors = [KeyFactorResponse(**dict(row)) for row in factor_rows]
                
                analyses.append(JobAnalysisDetail(
                    job_search=job_search,
                    key_factors=key_factors
                ))
            
            return AnalysisHistoryResponse(
                total_count=total_count,
                page=page,
                page_size=page_size,
                analyses=analyses
            )
            
        except Exception as e:
            logger.error(f"Error retrieving job searches: {e}")
            raise
        finally:
            conn.close()
    
    def delete_job_search(self, search_id: int) -> bool:
        """Delete a job search and all associated data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM job_searches WHERE id = ?", (search_id,))
            deleted = cursor.rowcount > 0
            
            if deleted:
                conn.commit()
                logger.info(f"Deleted job search {search_id}")
            else:
                logger.warning(f"Job search {search_id} not found for deletion")
            
            return deleted
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error deleting job search {search_id}: {e}")
            raise
        finally:
            conn.close()
    
    # Statistics and Analytics
    
    def get_analysis_stats(self, days_back: int = 30) -> AnalysisStats:
        """Get comprehensive analysis statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            # Basic stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    AVG(ghost_probability) as avg_prob,
                    SUM(CASE WHEN ghost_probability >= 0.67 THEN 1 ELSE 0 END) as high_risk,
                    SUM(CASE WHEN ghost_probability >= 0.34 AND ghost_probability < 0.67 THEN 1 ELSE 0 END) as medium_risk,
                    SUM(CASE WHEN ghost_probability < 0.34 THEN 1 ELSE 0 END) as low_risk
                FROM job_searches 
                WHERE analysis_date >= ?
            """, (cutoff_date,))
            
            stats = cursor.fetchone()
            
            # Top ghost companies
            cursor.execute("""
                SELECT company_name, avg_ghost_probability, total_posts, ghost_posts
                FROM companies 
                WHERE total_posts >= 2
                ORDER BY avg_ghost_probability DESC, total_posts DESC
                LIMIT 10
            """)
            
            top_companies = [
                {
                    "company": row[0],
                    "avg_ghost_probability": round(row[1], 3),
                    "total_posts": row[2],
                    "ghost_posts": row[3]
                }
                for row in cursor.fetchall()
            ]
            
            # Platform breakdown
            cursor.execute("""
                SELECT platform, COUNT(*) 
                FROM job_searches 
                WHERE analysis_date >= ?
                GROUP BY platform
            """, (cutoff_date,))
            
            platform_breakdown = dict(cursor.fetchall())
            
            # Recent trend (daily for past week)
            cursor.execute("""
                SELECT 
                    DATE(analysis_date) as date,
                    COUNT(*) as count,
                    AVG(ghost_probability) as avg_prob
                FROM job_searches 
                WHERE analysis_date >= ?
                GROUP BY DATE(analysis_date)
                ORDER BY date DESC
                LIMIT 7
            """, (datetime.now() - timedelta(days=7),))
            
            recent_trend = [
                {
                    "date": row[0],
                    "count": row[1],
                    "avg_ghost_probability": round(row[2], 3)
                }
                for row in cursor.fetchall()
            ]
            
            return AnalysisStats(
                total_analyses=stats[0] or 0,
                avg_ghost_probability=round(stats[1] or 0, 3),
                high_risk_count=stats[2] or 0,
                medium_risk_count=stats[3] or 0,
                low_risk_count=stats[4] or 0,
                top_ghost_companies=top_companies,
                platform_breakdown=platform_breakdown,
                recent_trend=recent_trend
            )
            
        except Exception as e:
            logger.error(f"Error retrieving analysis stats: {e}")
            raise
        finally:
            conn.close()
    
    # Company Operations
    
    def get_company_insights(self, min_posts: int = 1) -> List[CompanyInsight]:
        """Get company insights with ghost job statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT * FROM company_insights 
                WHERE total_posts >= ?
                ORDER BY avg_ghost_percentage DESC, total_posts DESC
            """, (min_posts,))
            
            insights = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                insights.append(CompanyInsight(**row_dict))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error retrieving company insights: {e}")
            raise
        finally:
            conn.close()
    
    def get_company_detail(self, company_name: str) -> Optional[CompanyResponse]:
        """Get detailed information about a specific company"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT * FROM companies WHERE company_name = ?", (company_name,))
            row = cursor.fetchone()
            
            if row:
                return CompanyResponse(**dict(row))
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving company {company_name}: {e}")
            raise
        finally:
            conn.close()
    
    # Utility Methods
    
    def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check database connectivity
            cursor.execute("SELECT 1")
            
            # Get basic counts
            cursor.execute("SELECT COUNT(*) FROM job_searches")
            job_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM companies")
            company_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM key_factors")
            factor_count = cursor.fetchone()[0]
            
            # Check recent activity
            cursor.execute("""
                SELECT COUNT(*) FROM job_searches 
                WHERE analysis_date >= datetime('now', '-24 hours')
            """)
            recent_count = cursor.fetchone()[0]
            
            return {
                "status": "healthy",
                "database_file": self.db_path,
                "job_searches": job_count,
                "companies": company_count,
                "key_factors": factor_count,
                "recent_analyses_24h": recent_count,
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
        finally:
            conn.close()
    
    def cleanup_old_analyses(self, days_to_keep: int = 365) -> int:
        """Clean up old job analyses beyond retention period"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            cursor.execute("""
                DELETE FROM job_searches 
                WHERE analysis_date < ?
            """, (cutoff_date,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old analyses")
            
            return deleted_count
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error during cleanup: {e}")
            raise
        finally:
            conn.close()