#!/usr/bin/env python3
"""
Analysis Service for Ghost Job Detector using Vercel Edge Config
Replaces SQLite with Vercel Edge Config storage
"""

import random
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

try:
    from vercel_edge_manager import VercelEdgeManager
except ImportError:
    print("Warning: Could not import VercelEdgeManager, falling back to mock storage")
    VercelEdgeManager = None

class VercelAnalysisService:
    """Service for analyzing jobs and storing results in Vercel Edge Config"""
    
    def __init__(self):
        self.use_edge_config = VercelEdgeManager is not None
        if self.use_edge_config:
            try:
                self.edge_manager = VercelEdgeManager()
            except Exception as e:
                print(f"Failed to initialize Edge Config: {e}")
                self.use_edge_config = False
                self.mock_storage = {}
        else:
            self.mock_storage = {}
    
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
        """Extract job data from URL - enhanced mock implementation"""
        platform = self.detect_platform(job_url)
        
        # Enhanced mock data with more realistic variation
        mock_titles = [
            "Senior Software Engineer", "Product Manager", "Data Scientist",
            "Frontend Developer", "DevOps Engineer", "UX Designer", 
            "Customer Success Manager", "Sales Development Representative",
            "Marketing Coordinator", "Business Analyst", "QA Engineer",
            "Technical Writer", "Security Engineer", "ML Engineer"
        ]
        
        mock_companies = [
            "TechCorp", "InnovateCo", "DataDynamics", "CloudFirst",
            "StartupXYZ", "Enterprise Solutions", "Digital Ventures",
            "AI Technologies", "Growth Company", "Innovation Labs",
            "Vercel", "NextJS Inc", "Edge Computing Co", "Serverless Corp"
        ]
        
        mock_locations = [
            "San Francisco, CA", "New York, NY", "Remote", "Seattle, WA",
            "Austin, TX", "Boston, MA", "Los Angeles, CA", "Chicago, IL",
            "Denver, CO", "Portland, OR", "Miami, FL", "Atlanta, GA"
        ]
        
        # Use URL hash for consistent but varied results
        url_hash = hash(job_url) % len(mock_titles)
        
        # More realistic parsing confidence based on platform
        platform_confidence_base = {
            'linkedin': 0.85,
            'indeed': 0.75, 
            'glassdoor': 0.70,
            'company': 0.80,
            'other': 0.60
        }
        
        base_confidence = platform_confidence_base.get(platform, 0.60)
        
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
                    "title": base_confidence + random.uniform(-0.10, 0.10),
                    "company": base_confidence + random.uniform(-0.05, 0.10),
                    "overall": base_confidence + random.uniform(-0.15, 0.15)
                }
            }
        }
    
    def analyze_job_for_ghost_probability(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze job for ghost job probability - enhanced ML simulation"""
        processing_start = time.time()
        
        # More sophisticated ghost probability calculation
        base_prob = random.uniform(0.15, 0.85)
        
        # Platform-based adjustments
        platform_adjustments = {
            'linkedin': -0.05,  # LinkedIn tends to be more legitimate
            'indeed': 0.10,     # Indeed has more ghost jobs
            'glassdoor': 0.05,  # Glassdoor has some ghost jobs
            'company': -0.15,   # Company pages are usually more legitimate
            'other': 0.15       # Unknown platforms are riskier
        }
        
        platform = job_data.get('platform', 'other')
        base_prob += platform_adjustments.get(platform, 0)
        
        # Company-based adjustments (simulate ML learning from company patterns)
        company = job_data.get('company', '').lower()
        if 'startup' in company or 'xyz' in company:
            base_prob += 0.15  # Startups and generic names are riskier
        elif any(word in company for word in ['google', 'microsoft', 'apple', 'vercel']):
            base_prob -= 0.25  # Major tech companies are safer
        elif 'corp' in company or 'enterprise' in company:
            base_prob += 0.05  # Generic corporate names slightly riskier
        
        # Title-based adjustments
        title = job_data.get('job_title', '').lower()
        if 'senior' in title or 'lead' in title:
            base_prob -= 0.10  # Senior roles are often more legitimate
        elif 'representative' in title or 'coordinator' in title:
            base_prob += 0.05  # Entry-level roles sometimes have more ghost postings
        
        # Ensure probability is within bounds
        ghost_prob = max(0.05, min(0.95, base_prob))
        confidence = 0.70 + random.uniform(0, 0.25)
        
        # Generate realistic factors based on analysis
        factors = self._generate_analysis_factors(ghost_prob, job_data)
        
        processing_time = int((time.time() - processing_start) * 1000)
        
        return {
            "ghost_probability": ghost_prob,
            "confidence": confidence,
            "factors": factors,
            "processing_time_ms": processing_time
        }
    
    def _generate_analysis_factors(self, ghost_prob: float, job_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate realistic analysis factors based on ghost probability and job data"""
        factors = []
        platform = job_data.get('platform', 'other')
        company = job_data.get('company', 'Unknown')
        
        # High ghost probability factors
        if ghost_prob > 0.6:
            potential_factors = [
                {
                    "factor_type": "red_flag",
                    "description": f"Job posting on {platform} shows patterns consistent with ghost postings",
                    "severity": 0.7 + random.uniform(0, 0.2),
                    "weight": 0.25 + random.uniform(0, 0.15)
                },
                {
                    "factor_type": "red_flag", 
                    "description": "Generic job description with minimal company-specific requirements",
                    "severity": 0.6 + random.uniform(0, 0.25),
                    "weight": 0.20 + random.uniform(0, 0.10)
                },
                {
                    "factor_type": "warning",
                    "description": f"Company '{company}' has elevated ghost job probability patterns",
                    "severity": 0.5 + random.uniform(0, 0.3),
                    "weight": 0.15 + random.uniform(0, 0.10)
                }
            ]
            factors.extend(random.sample(potential_factors, min(2, len(potential_factors))))
        
        # Medium probability factors
        elif 0.3 < ghost_prob <= 0.6:
            potential_factors = [
                {
                    "factor_type": "warning",
                    "description": "Limited specific technical requirements or qualifications listed",
                    "severity": 0.4 + random.uniform(0, 0.3),
                    "weight": 0.15 + random.uniform(0, 0.10)
                },
                {
                    "factor_type": "warning",
                    "description": "Vague compensation details or salary range not specified",
                    "severity": 0.3 + random.uniform(0, 0.4),
                    "weight": 0.10 + random.uniform(0, 0.15)
                },
                {
                    "factor_type": "warning",
                    "description": f"Platform {platform} analysis indicates moderate risk factors",
                    "severity": 0.35 + random.uniform(0, 0.25),
                    "weight": 0.12 + random.uniform(0, 0.08)
                }
            ]
            factors.extend(random.sample(potential_factors, min(2, len(potential_factors))))
        
        # Low probability (positive factors)
        if ghost_prob < 0.4:
            potential_factors = [
                {
                    "factor_type": "positive",
                    "description": "Detailed role requirements and specific technical skills mentioned",
                    "severity": 0.2 + random.uniform(0, 0.2),
                    "weight": -0.15 + random.uniform(-0.05, 0.05)
                },
                {
                    "factor_type": "positive",
                    "description": f"Company '{company}' has strong legitimacy indicators",
                    "severity": 0.1 + random.uniform(0, 0.2),
                    "weight": -0.12 + random.uniform(-0.05, 0.03)
                },
                {
                    "factor_type": "positive",
                    "description": f"Platform {platform} posting shows high authenticity signals",
                    "severity": 0.15 + random.uniform(0, 0.15),
                    "weight": -0.08 + random.uniform(-0.04, 0.02)
                }
            ]
            factors.extend(random.sample(potential_factors, min(2, len(potential_factors))))
        
        # Always add at least one factor
        if not factors:
            factors.append({
                "factor_type": "warning",
                "description": "Standard analysis completed with baseline risk assessment",
                "severity": 0.3,
                "weight": 0.05
            })
        
        return factors
    
    def save_analysis_to_storage(self, job_url: str, job_data: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Save complete analysis to storage (Edge Config or mock)"""
        if self.use_edge_config:
            return self.edge_manager.save_job_analysis(job_url, job_data, analysis)
        else:
            # Mock storage fallback
            analysis_id = str(int(time.time() * 1000))
            
            if 'mock_analyses' not in self.mock_storage:
                self.mock_storage['mock_analyses'] = {}
            
            self.mock_storage['mock_analyses'][analysis_id] = {
                'id': analysis_id,
                'url': job_url,
                'job_data': job_data,
                'analysis': analysis,
                'timestamp': datetime.now().isoformat()
            }
            
            return analysis_id
    
    def analyze_job_complete(self, job_url: str) -> Dict[str, Any]:
        """Complete job analysis pipeline: extract -> analyze -> store"""
        try:
            # Step 1: Extract job data
            job_data = self.extract_job_data(job_url)
            
            # Step 2: Analyze for ghost probability
            analysis = self.analyze_job_for_ghost_probability(job_data)
            
            # Step 3: Save to storage
            analysis_id = self.save_analysis_to_storage(job_url, job_data, analysis)
            
            # Step 4: Return frontend-compatible response
            factors_response = []
            for factor in analysis["factors"]:
                factors_response.append({
                    "factor": factor["description"],
                    "weight": factor["weight"],
                    "description": factor["description"]
                })
            
            return {
                "id": str(analysis_id),
                "ghostProbability": analysis["ghost_probability"],
                "confidence": analysis["confidence"],
                "factors": factors_response,
                "metadata": {
                    "processingTime": analysis["processing_time_ms"],
                    "modelVersion": "v1.1.0-vercel",
                    "platform": job_data["platform"],
                    "storage": "vercel-edge-config" if self.use_edge_config else "mock"
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
        """Get recent analysis history"""
        if self.use_edge_config:
            return self.edge_manager.get_analysis_history(limit)
        else:
            # Mock storage fallback
            analyses = []
            mock_analyses = self.mock_storage.get('mock_analyses', {})
            
            for analysis_data in list(mock_analyses.values())[-limit:]:
                analyses.append({
                    "id": analysis_data['id'],
                    "jobUrl": analysis_data['url'],
                    "title": analysis_data['job_data']['job_title'],
                    "company": analysis_data['job_data']['company'],
                    "ghostProbability": analysis_data['analysis']['ghost_probability'],
                    "confidence": analysis_data['analysis']['confidence'],
                    "analyzedAt": analysis_data['timestamp'],
                    "status": "completed",
                    "factors": [f["description"] for f in analysis_data['analysis']['factors']]
                })
            
            return list(reversed(analyses))  # Most recent first
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get analysis statistics"""
        if self.use_edge_config:
            return self.edge_manager.get_analysis_stats()
        else:
            # Mock storage fallback
            mock_analyses = self.mock_storage.get('mock_analyses', {})
            
            if not mock_analyses:
                return {
                    "total_analyses": 0,
                    "avg_ghost_probability": 0.0,
                    "high_risk_count": 0,
                    "medium_risk_count": 0,
                    "low_risk_count": 0,
                    "top_ghost_companies": []
                }
            
            ghost_probs = [data['analysis']['ghost_probability'] for data in mock_analyses.values()]
            
            return {
                "total_analyses": len(mock_analyses),
                "avg_ghost_probability": round(sum(ghost_probs) / len(ghost_probs), 3),
                "high_risk_count": sum(1 for prob in ghost_probs if prob >= 0.67),
                "medium_risk_count": sum(1 for prob in ghost_probs if 0.34 <= prob < 0.67),
                "low_risk_count": sum(1 for prob in ghost_probs if prob < 0.34),
                "top_ghost_companies": []  # Simplified for mock
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        if self.use_edge_config:
            return self.edge_manager.health_check()
        else:
            return {
                "status": "healthy",
                "storage": "mock",
                "analyses": len(self.mock_storage.get('mock_analyses', {})),
                "last_check": datetime.now().isoformat()
            }

def main():
    """CLI interface for testing the Vercel analysis service"""
    import sys
    
    service = VercelAnalysisService()
    
    if len(sys.argv) < 2:
        print("Usage: python3 vercel_analysis_service.py <command> [args]")
        print("Commands:")
        print("  analyze <job_url>     - Analyze a job posting")
        print("  history               - Show analysis history")
        print("  stats                 - Show analysis statistics")
        print("  health                - Check service health")
        return
    
    command = sys.argv[1]
    
    try:
        if command == "analyze" and len(sys.argv) > 2:
            job_url = sys.argv[2]
            print(f"🔍 Analyzing job: {job_url}")
            print(f"📡 Using: {'Vercel Edge Config' if service.use_edge_config else 'Mock Storage'}")
            
            result = service.analyze_job_complete(job_url)
            
            print(f"\n✅ Analysis Complete!")
            print(f"   📊 Ghost Probability: {result['ghostProbability']:.2%}")
            print(f"   🎯 Confidence: {result['confidence']:.2%}")
            print(f"   🏢 Company: {result['jobData']['company']}")
            print(f"   💼 Title: {result['jobData']['title']}")
            print(f"   📍 Location: {result['jobData']['location']}")
            print(f"   🌐 Platform: {result['jobData']['platform']}")
            print(f"   ⚙️  Processing Time: {result['metadata']['processingTime']}ms")
            print(f"   💾 Storage: {result['metadata']['storage']}")
            print(f"   🔍 Key Factors: {len(result['factors'])}")
            
            for i, factor in enumerate(result['factors'][:3], 1):
                print(f"      {i}. {factor['description'][:60]}...")
        
        elif command == "history":
            print("📚 Analysis History:")
            print(f"📡 Using: {'Vercel Edge Config' if service.use_edge_config else 'Mock Storage'}")
            
            history = service.get_analysis_history(10)
            
            if not history:
                print("   No analyses found. Run 'analyze' command first.")
            else:
                for analysis in history:
                    risk_emoji = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
                    print(f"   {risk_emoji} {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.1%})")
        
        elif command == "stats":
            print("📈 Analysis Statistics:")
            print(f"📡 Using: {'Vercel Edge Config' if service.use_edge_config else 'Mock Storage'}")
            
            stats = service.get_analysis_stats()
            
            print(f"   Total Analyses: {stats['total_analyses']}")
            print(f"   Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
            print(f"   🔴 High Risk: {stats['high_risk_count']}")
            print(f"   🟡 Medium Risk: {stats['medium_risk_count']}")
            print(f"   🟢 Low Risk: {stats['low_risk_count']}")
            
            if stats['top_ghost_companies']:
                print(f"\n   Top Ghost Companies:")
                for company in stats['top_ghost_companies']:
                    print(f"      - {company['company']}: {company['avg_ghost_probability']:.1%} ({company['total_posts']} posts)")
        
        elif command == "health":
            print("🏥 Service Health Check:")
            
            health = service.health_check()
            
            print(f"   Status: {health['status']}")
            print(f"   Storage: {health.get('database_file', health.get('storage', 'unknown'))}")
            
            if 'job_searches' in health:
                print(f"   Job Searches: {health['job_searches']}")
                print(f"   Companies: {health.get('companies', 0)}")
            elif 'analyses' in health:
                print(f"   Analyses: {health['analyses']}")
        
        else:
            print("❌ Invalid command or missing arguments")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()