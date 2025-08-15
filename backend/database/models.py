"""
Pydantic models for Ghost Job Detector database entities
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class Platform(str, Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed" 
    GLASSDOOR = "glassdoor"
    COMPANY = "company"
    OTHER = "other"

class Status(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class FactorType(str, Enum):
    RED_FLAG = "red_flag"
    WARNING = "warning"
    POSITIVE = "positive"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"

# Request/Response Models
class JobSearchCreate(BaseModel):
    url: str = Field(..., description="Job posting URL")
    platform: Platform = Field(..., description="Job board platform")
    job_title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    ghost_probability: float = Field(..., ge=0.0, le=1.0, description="Ghost job probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score")
    parser_used: Optional[str] = Field(None, description="Parser name used for extraction")
    extraction_method: Optional[str] = Field(None, description="Extraction method used")
    processing_time_ms: Optional[int] = Field(None, description="Processing time in milliseconds")

class KeyFactorCreate(BaseModel):
    factor_type: FactorType = Field(..., description="Type of factor")
    description: str = Field(..., description="Factor description")
    severity: Optional[float] = Field(None, ge=0.0, le=1.0, description="Factor severity score")
    weight: Optional[float] = Field(None, description="Factor weight in ML model")

class ParsingMetadataCreate(BaseModel):
    raw_title: Optional[str] = Field(None, description="Original HTML title")
    structured_data_found: bool = Field(False, description="Whether structured data was found")
    meta_tags_count: int = Field(0, description="Number of meta tags found")
    validation_results: Optional[List[Dict[str, Any]]] = Field(None, description="Validation results")
    confidence_scores: Optional[Dict[str, float]] = Field(None, description="Field-specific confidence scores")

class JobSearchResponse(BaseModel):
    id: int = Field(..., description="Job search ID")
    url: str = Field(..., description="Job posting URL")
    platform: Platform = Field(..., description="Job board platform")
    job_title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    analysis_date: datetime = Field(..., description="Analysis timestamp")
    ghost_probability: float = Field(..., description="Ghost job probability")
    confidence: float = Field(..., description="Model confidence score")
    status: Status = Field(..., description="Analysis status")
    parser_used: Optional[str] = Field(None, description="Parser used")
    extraction_method: Optional[str] = Field(None, description="Extraction method")
    processing_time_ms: Optional[int] = Field(None, description="Processing time")
    created_at: datetime = Field(..., description="Record creation time")
    updated_at: datetime = Field(..., description="Record update time")

class KeyFactorResponse(BaseModel):
    id: int = Field(..., description="Factor ID")
    search_id: int = Field(..., description="Associated job search ID")
    factor_type: FactorType = Field(..., description="Factor type")
    description: str = Field(..., description="Factor description")
    severity: Optional[float] = Field(None, description="Severity score")
    weight: Optional[float] = Field(None, description="ML model weight")
    created_at: datetime = Field(..., description="Creation timestamp")

class CompanyResponse(BaseModel):
    id: int = Field(..., description="Company ID")
    company_name: str = Field(..., description="Company name")
    total_posts: int = Field(..., description="Total job posts analyzed")
    ghost_posts: int = Field(..., description="Number of ghost job posts")
    avg_ghost_probability: float = Field(..., description="Average ghost job probability")
    min_ghost_probability: float = Field(..., description="Minimum ghost job probability")
    max_ghost_probability: float = Field(..., description="Maximum ghost job probability")
    first_seen: datetime = Field(..., description="First analysis date")
    last_updated: datetime = Field(..., description="Last update time")
    platforms_seen: Optional[str] = Field(None, description="Platforms where company was found")
    risk_level: RiskLevel = Field(..., description="Company risk assessment")
    notes: Optional[str] = Field(None, description="Admin notes")

class ParsingMetadataResponse(BaseModel):
    id: int = Field(..., description="Metadata ID")
    search_id: int = Field(..., description="Associated job search ID")
    raw_title: Optional[str] = Field(None, description="Original HTML title")
    structured_data_found: bool = Field(..., description="Structured data found")
    meta_tags_count: int = Field(..., description="Meta tags count")
    validation_results: Optional[List[Dict[str, Any]]] = Field(None, description="Validation results")
    confidence_scores: Optional[Dict[str, float]] = Field(None, description="Confidence scores")
    extraction_timestamp: datetime = Field(..., description="Extraction time")

# Combined models for API responses
class JobAnalysisDetail(BaseModel):
    job_search: JobSearchResponse
    key_factors: List[KeyFactorResponse]
    parsing_metadata: Optional[ParsingMetadataResponse] = None
    company_info: Optional[CompanyResponse] = None

class AnalysisHistoryResponse(BaseModel):
    total_count: int = Field(..., description="Total number of analyses")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    analyses: List[JobAnalysisDetail] = Field(..., description="List of job analyses")

class AnalysisStats(BaseModel):
    total_analyses: int = Field(..., description="Total analyses performed")
    avg_ghost_probability: float = Field(..., description="Average ghost probability")
    high_risk_count: int = Field(..., description="Number of high-risk jobs")
    medium_risk_count: int = Field(..., description="Number of medium-risk jobs")
    low_risk_count: int = Field(..., description="Number of low-risk jobs")
    top_ghost_companies: List[Dict[str, Any]] = Field(..., description="Companies with highest ghost rates")
    platform_breakdown: Dict[str, int] = Field(..., description="Analyses by platform")
    recent_trend: List[Dict[str, Any]] = Field(..., description="Recent analysis trend data")

# Filter models
class AnalysisFilters(BaseModel):
    platform: Optional[Platform] = Field(None, description="Filter by platform")
    company: Optional[str] = Field(None, description="Filter by company name")
    min_ghost_probability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum ghost probability")
    max_ghost_probability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Maximum ghost probability")
    start_date: Optional[datetime] = Field(None, description="Filter from date")
    end_date: Optional[datetime] = Field(None, description="Filter to date")
    risk_level: Optional[RiskLevel] = Field(None, description="Filter by company risk level")

    @validator('max_ghost_probability')
    def validate_probability_range(cls, v, values):
        if v is not None and 'min_ghost_probability' in values and values['min_ghost_probability'] is not None:
            if v < values['min_ghost_probability']:
                raise ValueError('max_ghost_probability must be greater than min_ghost_probability')
        return v

class CompanyInsight(BaseModel):
    company_name: str = Field(..., description="Company name")
    total_posts: int = Field(..., description="Total posts analyzed")
    ghost_posts: int = Field(..., description="Ghost job posts")
    avg_ghost_percentage: float = Field(..., description="Average ghost job percentage")
    ghost_job_rate: float = Field(..., description="Ghost job rate percentage")
    reliability_assessment: str = Field(..., description="Reliability assessment")
    risk_level: RiskLevel = Field(..., description="Risk level")
    first_seen: datetime = Field(..., description="First seen date")
    last_updated: datetime = Field(..., description="Last updated date")