"""
Ghost Job Detector Database Module
Provides database models, manager, and initialization utilities
"""

from .manager import DatabaseManager
from .models import (
    # Enums
    Platform, Status, FactorType, RiskLevel,
    
    # Request models
    JobSearchCreate, KeyFactorCreate, ParsingMetadataCreate,
    AnalysisFilters,
    
    # Response models  
    JobSearchResponse, KeyFactorResponse, CompanyResponse, ParsingMetadataResponse,
    JobAnalysisDetail, AnalysisHistoryResponse, AnalysisStats,
    CompanyInsight
)

__all__ = [
    "DatabaseManager",
    "Platform", "Status", "FactorType", "RiskLevel",
    "JobSearchCreate", "KeyFactorCreate", "ParsingMetadataCreate", "AnalysisFilters",
    "JobSearchResponse", "KeyFactorResponse", "CompanyResponse", "ParsingMetadataResponse",
    "JobAnalysisDetail", "AnalysisHistoryResponse", "AnalysisStats", "CompanyInsight"
]