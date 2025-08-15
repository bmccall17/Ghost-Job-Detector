"""
FastAPI backend for Ghost Job Detector
Integrates database storage with job analysis pipeline
"""

import os
import time
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from database import (
    DatabaseManager, Platform, FactorType, RiskLevel,
    JobSearchCreate, KeyFactorCreate, ParsingMetadataCreate,
    AnalysisFilters, JobAnalysisDetail, AnalysisHistoryResponse, AnalysisStats
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Ghost Job Detector API",
    description="Backend API for Ghost Job Detection and Analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database manager
db_manager = DatabaseManager()

# Request/Response models for API
class JobAnalysisRequest(BaseModel):
    jobUrl: str = Field(..., description="URL of the job posting to analyze")

class JobAnalysisResponse(BaseModel):
    id: str = Field(..., description="Analysis ID")
    ghostProbability: float = Field(..., description="Probability that this is a ghost job")
    confidence: float = Field(..., description="Model confidence in the prediction")
    factors: List[Dict[str, Any]] = Field(..., description="Key factors influencing the prediction")
    metadata: Dict[str, Any] = Field(..., description="Analysis metadata")

class BulkAnalysisJob(BaseModel):
    id: str
    fileName: str
    totalJobs: int
    completedJobs: int
    failedJobs: int
    status: str
    createdAt: datetime
    completedAt: Optional[datetime] = None
    results: List[Dict[str, Any]] = []

# Utility functions
def detect_platform(url: str) -> Platform:
    """Detect job platform from URL"""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname.lower() if parsed.hostname else ""
        
        if "linkedin" in hostname:
            return Platform.LINKEDIN
        elif "indeed" in hostname:
            return Platform.INDEED
        elif "glassdoor" in hostname:
            return Platform.GLASSDOOR
        elif "careers." in hostname or "/careers" in parsed.path or "/jobs" in parsed.path:
            return Platform.COMPANY
        else:
            return Platform.OTHER
    except:
        return Platform.OTHER

def mock_analyze_job(job_url: str, job_title: str, company: str) -> Dict[str, Any]:
    """Mock job analysis - replace with actual ML model"""
    import random
    
    # Simulate processing time
    processing_start = time.time()
    
    # Mock ghost probability based on simple heuristics
    ghost_prob = random.uniform(0.1, 0.9)
    confidence = random.uniform(0.7, 0.95)
    
    # Mock factors
    factors = []
    factor_types = [FactorType.RED_FLAG, FactorType.WARNING, FactorType.POSITIVE]
    
    factor_descriptions = {
        FactorType.RED_FLAG: [
            "Job posting has been active for 60+ days",
            "Generic job description with minimal specific requirements",
            "Company has unusual posting patterns"
        ],
        FactorType.WARNING: [
            "Limited company information available",
            "Vague salary range or compensation details",
            "Job title is overly broad or generic"
        ],
        FactorType.POSITIVE: [
            "Clear role requirements and responsibilities",
            "Specific technical skills mentioned",
            "Recent posting with realistic timeline"
        ]
    ]
    
    # Generate 2-4 factors
    num_factors = random.randint(2, 4)
    for _ in range(num_factors):
        factor_type = random.choice(factor_types)
        description = random.choice(factor_descriptions[factor_type])
        severity = random.uniform(0.1, 0.8)
        weight = random.uniform(-0.2, 0.4) if factor_type == FactorType.POSITIVE else random.uniform(0.1, 0.5)
        
        factors.append(KeyFactorCreate(
            factor_type=factor_type,
            description=description,
            severity=severity,
            weight=weight
        ))
    
    processing_time = int((time.time() - processing_start) * 1000)
    
    return {
        "ghost_probability": ghost_prob,
        "confidence": confidence,
        "factors": factors,
        "processing_time_ms": processing_time
    }

def mock_extract_job_data(job_url: str) -> Dict[str, Any]:
    """Mock job data extraction - replace with actual parsing service"""
    import random
    
    # Simulate parsing different platforms
    platform = detect_platform(job_url)
    
    mock_titles = [
        "Senior Software Engineer", "Product Manager", "Data Scientist",
        "Frontend Developer", "DevOps Engineer", "UX Designer",
        "Customer Success Manager", "Sales Development Representative"
    ]
    
    mock_companies = [
        "TechCorp", "InnovateCo", "DataDynamics", "CloudFirst",
        "StartupXYZ", "Enterprise Solutions", "Digital Ventures"
    ]
    
    job_title = random.choice(mock_titles)
    company = random.choice(mock_companies)
    location = random.choice(["San Francisco, CA", "New York, NY", "Remote", "Seattle, WA"])
    
    # Mock parsing metadata
    parsing_metadata = ParsingMetadataCreate(
        raw_title=f"{job_title} - {company} | {platform.value.title()}",
        structured_data_found=random.choice([True, False]),
        meta_tags_count=random.randint(5, 20),
        confidence_scores={
            "title": random.uniform(0.7, 0.95),
            "company": random.uniform(0.8, 0.95),
            "overall": random.uniform(0.75, 0.9)
        }
    )
    
    return {
        "job_title": job_title,
        "company": company,
        "location": location,
        "platform": platform,
        "parsing_metadata": parsing_metadata
    }

# API Routes

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {"message": "Ghost Job Detector API", "version": "1.0.0"}

@app.get("/health", response_model=Dict[str, Any])
async def health_check():
    """Health check endpoint"""
    try:
        db_health = db_manager.health_check()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": db_health
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/api/v1/detection/analyze", response_model=JobAnalysisResponse)
async def analyze_job(request: JobAnalysisRequest):
    """Analyze a single job posting for ghost job probability"""
    try:
        logger.info(f"Analyzing job: {request.jobUrl}")
        
        # Step 1: Extract job data
        job_data = mock_extract_job_data(request.jobUrl)
        
        # Step 2: Analyze for ghost job probability
        analysis_result = mock_analyze_job(
            request.jobUrl, 
            job_data["job_title"], 
            job_data["company"]
        )
        
        # Step 3: Save to database
        job_search_data = JobSearchCreate(
            url=request.jobUrl,
            platform=job_data["platform"],
            job_title=job_data["job_title"],
            company=job_data["company"],
            location=job_data.get("location"),
            ghost_probability=analysis_result["ghost_probability"],
            confidence=analysis_result["confidence"],
            parser_used="MockParser",
            extraction_method="simulation",
            processing_time_ms=analysis_result["processing_time_ms"]
        )
        
        search_id = db_manager.create_job_search(
            job_search_data,
            analysis_result["factors"],
            job_data["parsing_metadata"]
        )
        
        logger.info(f"Saved analysis to database with ID: {search_id}")
        
        # Step 4: Return response in expected format
        factors_response = []
        for factor in analysis_result["factors"]:
            factors_response.append({
                "factor": factor.description,
                "weight": factor.weight,
                "description": factor.description
            })
        
        return JobAnalysisResponse(
            id=str(search_id),
            ghostProbability=analysis_result["ghost_probability"],
            confidence=analysis_result["confidence"],
            factors=factors_response,
            metadata={
                "processingTime": analysis_result["processing_time_ms"],
                "modelVersion": "v1.0.0-mock"
            }
        )
        
    except Exception as e:
        logger.error(f"Error analyzing job {request.jobUrl}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/v1/history", response_model=AnalysisHistoryResponse)
async def get_analysis_history(
    page: int = 1,
    page_size: int = 20,
    platform: Optional[str] = None,
    company: Optional[str] = None,
    min_ghost_probability: Optional[float] = None,
    max_ghost_probability: Optional[float] = None
):
    """Get paginated analysis history with optional filters"""
    try:
        # Build filters
        filters = AnalysisFilters()
        if platform:
            filters.platform = Platform(platform.lower())
        if company:
            filters.company = company
        if min_ghost_probability is not None:
            filters.min_ghost_probability = min_ghost_probability
        if max_ghost_probability is not None:
            filters.max_ghost_probability = max_ghost_probability
        
        history = db_manager.get_job_searches(
            filters=filters if any([platform, company, min_ghost_probability, max_ghost_probability]) else None,
            page=page,
            page_size=page_size
        )
        
        return history
        
    except Exception as e:
        logger.error(f"Error retrieving analysis history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

@app.get("/api/v1/history/{analysis_id}", response_model=JobAnalysisDetail)
async def get_analysis_detail(analysis_id: int):
    """Get detailed analysis by ID"""
    try:
        analysis = db_manager.get_job_search(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {str(e)}")

@app.delete("/api/v1/history/{analysis_id}")
async def delete_analysis(analysis_id: int):
    """Delete an analysis"""
    try:
        deleted = db_manager.delete_job_search(analysis_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
        
        return {"message": f"Analysis {analysis_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting analysis {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis: {str(e)}")

@app.get("/api/v1/stats", response_model=AnalysisStats)
async def get_analysis_stats(days_back: int = 30):
    """Get analysis statistics"""
    try:
        stats = db_manager.get_analysis_stats(days_back=days_back)
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving analysis stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {str(e)}")

@app.post("/api/v1/detection/bulk-analyze")
async def upload_bulk_analysis(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload a file for bulk job analysis"""
    try:
        # For now, return a mock response
        # In production, this would process the uploaded file
        
        import uuid
        job_id = str(uuid.uuid4())
        
        # Mock job response
        bulk_job = BulkAnalysisJob(
            id=job_id,
            fileName=file.filename or "unknown.csv",
            totalJobs=0,
            completedJobs=0,
            failedJobs=0,
            status="uploading",
            createdAt=datetime.now()
        )
        
        return bulk_job
        
    except Exception as e:
        logger.error(f"Error uploading bulk analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/v1/detection/bulk-analyze/{job_id}")
async def get_bulk_analysis_status(job_id: str):
    """Get status of bulk analysis job"""
    # Mock response for now
    return BulkAnalysisJob(
        id=job_id,
        fileName="sample.csv",
        totalJobs=100,
        completedJobs=95,
        failedJobs=5,
        status="processing",
        createdAt=datetime.now()
    )

@app.post("/api/v1/detection/export")
async def export_analysis_results(request: Dict[str, Any]):
    """Export analysis results"""
    # Mock implementation
    return {"message": "Export feature coming soon"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)