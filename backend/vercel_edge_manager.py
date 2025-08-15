"""
Vercel Edge Config Manager for Ghost Job Detector
Replaces SQLite database with Vercel Edge Config storage
"""

import os
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

class VercelEdgeManager:
    """Manager for Vercel Edge Config storage"""
    
    def __init__(self):
        self.edge_config_url = os.environ.get('EDGE_CONFIG')
        if not self.edge_config_url:
            raise ValueError("EDGE_CONFIG environment variable not found")
        
        # Parse the Edge Config URL to get the base URL
        self.base_url = self.edge_config_url.rstrip('/')
        
    def _make_request(self, method: str, endpoint: str, data: Any = None) -> Dict[str, Any]:
        """Make HTTP request to Edge Config"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        headers = {
            'Authorization': f'Bearer {self._get_token()}',
            'Content-Type': 'application/json'
        }
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, data=json.dumps(data))
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, data=json.dumps(data))
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            print(f"Edge Config request failed: {e}")
            raise
    
    def _get_token(self) -> str:
        """Get Edge Config token from environment"""
        # The token should be embedded in the EDGE_CONFIG URL
        # or available as a separate environment variable
        token = os.environ.get('EDGE_CONFIG_TOKEN')
        if token:
            return token
        
        # Extract token from EDGE_CONFIG URL if present
        if '?' in self.edge_config_url:
            params = self.edge_config_url.split('?')[1]
            for param in params.split('&'):
                if param.startswith('token='):
                    return param.split('=', 1)[1]
        
        raise ValueError("Edge Config token not found")
    
    def get_all_data(self) -> Dict[str, Any]:
        """Get all data from Edge Config"""
        try:
            return self._make_request('GET', '/')
        except:
            # Return empty structure if no data exists yet
            return {
                'job_searches': {},
                'companies': {},
                'key_factors': {},
                'parsing_metadata': {},
                'stats': {
                    'total_analyses': 0,
                    'last_updated': datetime.now().isoformat()
                }
            }
    
    def save_job_analysis(self, job_url: str, job_data: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Save complete job analysis to Edge Config"""
        
        # Get current data
        all_data = self.get_all_data()
        
        # Generate unique ID
        analysis_id = str(int(time.time() * 1000))  # Timestamp-based ID
        
        # Prepare job search record
        job_search = {
            'id': analysis_id,
            'url': job_url,
            'platform': job_data.get('platform', 'unknown'),
            'job_title': job_data.get('job_title', 'Unknown Position'),
            'company': job_data.get('company', 'Unknown Company'),
            'location': job_data.get('location'),
            'ghost_probability': analysis['ghost_probability'],
            'confidence': analysis['confidence'],
            'parser_used': 'MockParser',
            'extraction_method': 'simulation',
            'processing_time_ms': analysis.get('processing_time_ms', 0),
            'analysis_date': datetime.now().isoformat(),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        # Add to job searches
        all_data['job_searches'][analysis_id] = job_search
        
        # Save key factors
        factors_data = {}
        for i, factor in enumerate(analysis.get('factors', [])):
            factor_id = f"{analysis_id}_{i}"
            factors_data[factor_id] = {
                'id': factor_id,
                'search_id': analysis_id,
                'factor_type': factor.get('factor_type', 'warning'),
                'description': factor.get('description', ''),
                'severity': factor.get('severity', 0.5),
                'weight': factor.get('weight', 0.1),
                'created_at': datetime.now().isoformat()
            }
        
        all_data['key_factors'].update(factors_data)
        
        # Save parsing metadata
        if 'parsing_metadata' in job_data:
            metadata = job_data['parsing_metadata']
            all_data['parsing_metadata'][analysis_id] = {
                'id': analysis_id,
                'search_id': analysis_id,
                'raw_title': metadata.get('raw_title'),
                'structured_data_found': metadata.get('structured_data_found', False),
                'meta_tags_count': metadata.get('meta_tags_count', 0),
                'confidence_scores': metadata.get('confidence_scores', {}),
                'extraction_timestamp': datetime.now().isoformat()
            }
        
        # Update company statistics
        company_name = job_data.get('company', 'Unknown Company')
        if company_name not in all_data['companies']:
            all_data['companies'][company_name] = {
                'company_name': company_name,
                'total_posts': 0,
                'ghost_posts': 0,
                'avg_ghost_probability': 0.0,
                'min_ghost_probability': 1.0,
                'max_ghost_probability': 0.0,
                'first_seen': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat(),
                'platforms_seen': set(),
                'risk_level': 'unknown'
            }
        
        company = all_data['companies'][company_name]
        company['total_posts'] += 1
        company['platforms_seen'] = list(set(list(company.get('platforms_seen', [])) + [job_data.get('platform', 'unknown')]))
        
        if analysis['ghost_probability'] >= 0.67:
            company['ghost_posts'] += 1
        
        # Recalculate company statistics
        company_searches = [s for s in all_data['job_searches'].values() if s['company'] == company_name]
        if company_searches:
            ghost_probs = [s['ghost_probability'] for s in company_searches]
            company['avg_ghost_probability'] = sum(ghost_probs) / len(ghost_probs)
            company['min_ghost_probability'] = min(ghost_probs)
            company['max_ghost_probability'] = max(ghost_probs)
            
            # Determine risk level
            if company['avg_ghost_probability'] >= 0.67:
                company['risk_level'] = 'high'
            elif company['avg_ghost_probability'] >= 0.34:
                company['risk_level'] = 'medium'
            else:
                company['risk_level'] = 'low'
        
        company['last_updated'] = datetime.now().isoformat()
        
        # Update global stats
        all_data['stats']['total_analyses'] = len(all_data['job_searches'])
        all_data['stats']['last_updated'] = datetime.now().isoformat()
        
        # Save all data back to Edge Config
        self._save_all_data(all_data)
        
        return analysis_id
    
    def _save_all_data(self, data: Dict[str, Any]) -> None:
        """Save all data to Edge Config"""
        
        # Edge Config has item limits, so we need to be strategic about storage
        # Store each major section as separate keys
        
        updates = {}
        
        # Store job searches (limit to recent 100)
        recent_searches = dict(sorted(
            data['job_searches'].items(),
            key=lambda x: x[1]['analysis_date'],
            reverse=True
        )[:100])
        updates['job_searches'] = recent_searches
        
        # Store companies
        updates['companies'] = data['companies']
        
        # Store key factors for recent searches only
        recent_search_ids = set(recent_searches.keys())
        recent_factors = {
            k: v for k, v in data['key_factors'].items()
            if v['search_id'] in recent_search_ids
        }
        updates['key_factors'] = recent_factors
        
        # Store parsing metadata for recent searches only
        recent_metadata = {
            k: v for k, v in data['parsing_metadata'].items()
            if k in recent_search_ids
        }
        updates['parsing_metadata'] = recent_metadata
        
        # Store stats
        updates['stats'] = data['stats']
        
        # Update Edge Config with batch operation
        try:
            self._make_request('PATCH', '/items', updates)
        except Exception as e:
            print(f"Failed to save to Edge Config: {e}")
            # Fallback: try to save each section individually
            for key, value in updates.items():
                try:
                    self._make_request('PUT', f'/items/{key}', value)
                except Exception as section_error:
                    print(f"Failed to save {key}: {section_error}")
    
    def get_analysis_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get analysis history"""
        all_data = self.get_all_data()
        
        # Get recent job searches
        job_searches = list(all_data.get('job_searches', {}).values())
        job_searches.sort(key=lambda x: x.get('analysis_date', ''), reverse=True)
        
        # Limit results
        job_searches = job_searches[:limit]
        
        # Add factors to each analysis
        analyses = []
        for job_search in job_searches:
            search_id = job_search['id']
            
            # Get factors for this search
            factors = [
                factor for factor in all_data.get('key_factors', {}).values()
                if factor.get('search_id') == search_id
            ]
            
            factor_descriptions = [f"{factor['description']} (weight: {factor['weight']})" for factor in factors]
            
            analysis = {
                'id': search_id,
                'jobUrl': job_search['url'],
                'title': job_search['job_title'],
                'company': job_search['company'],
                'ghostProbability': job_search['ghost_probability'],
                'confidence': job_search['confidence'],
                'analyzedAt': job_search['analysis_date'],
                'status': job_search.get('status', 'completed'),
                'factors': factor_descriptions
            }
            analyses.append(analysis)
        
        return analyses
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get analysis statistics"""
        all_data = self.get_all_data()
        
        job_searches = list(all_data.get('job_searches', {}).values())
        companies = list(all_data.get('companies', {}).values())
        
        if not job_searches:
            return {
                'total_analyses': 0,
                'avg_ghost_probability': 0.0,
                'high_risk_count': 0,
                'medium_risk_count': 0,
                'low_risk_count': 0,
                'top_ghost_companies': []
            }
        
        # Calculate statistics
        ghost_probs = [job['ghost_probability'] for job in job_searches]
        
        high_risk = sum(1 for prob in ghost_probs if prob >= 0.67)
        medium_risk = sum(1 for prob in ghost_probs if 0.34 <= prob < 0.67)
        low_risk = sum(1 for prob in ghost_probs if prob < 0.34)
        
        # Top ghost companies
        top_companies = sorted(
            companies,
            key=lambda x: (x.get('avg_ghost_probability', 0), x.get('total_posts', 0)),
            reverse=True
        )[:5]
        
        top_ghost_companies = [
            {
                'company': company['company_name'],
                'avg_ghost_probability': company.get('avg_ghost_probability', 0),
                'total_posts': company.get('total_posts', 0)
            }
            for company in top_companies
        ]
        
        return {
            'total_analyses': len(job_searches),
            'avg_ghost_probability': round(sum(ghost_probs) / len(ghost_probs), 3),
            'high_risk_count': high_risk,
            'medium_risk_count': medium_risk,
            'low_risk_count': low_risk,
            'top_ghost_companies': top_ghost_companies
        }
    
    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete an analysis"""
        all_data = self.get_all_data()
        
        if analysis_id not in all_data.get('job_searches', {}):
            return False
        
        # Remove from job searches
        del all_data['job_searches'][analysis_id]
        
        # Remove associated factors
        all_data['key_factors'] = {
            k: v for k, v in all_data.get('key_factors', {}).items()
            if v.get('search_id') != analysis_id
        }
        
        # Remove associated metadata
        if analysis_id in all_data.get('parsing_metadata', {}):
            del all_data['parsing_metadata'][analysis_id]
        
        # Update stats
        all_data['stats']['total_analyses'] = len(all_data['job_searches'])
        all_data['stats']['last_updated'] = datetime.now().isoformat()
        
        # Save changes
        self._save_all_data(all_data)
        
        return True
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            all_data = self.get_all_data()
            job_count = len(all_data.get('job_searches', {}))
            company_count = len(all_data.get('companies', {}))
            
            return {
                'status': 'healthy',
                'database_file': 'vercel-edge-config',
                'job_searches': job_count,
                'companies': company_count,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }

def main():
    """CLI interface for testing Edge Config"""
    import sys
    
    try:
        manager = VercelEdgeManager()
        
        if len(sys.argv) < 2:
            print("Usage: python3 vercel_edge_manager.py <command> [args]")
            print("Commands:")
            print("  health    - Check Edge Config connection")
            print("  history   - Show analysis history")
            print("  stats     - Show analysis statistics")
            print("  test      - Test saving an analysis")
            return
        
        command = sys.argv[1]
        
        if command == "health":
            health = manager.health_check()
            print(f"🏥 Edge Config Health Check:")
            print(f"   Status: {health['status']}")
            print(f"   Job Searches: {health.get('job_searches', 0)}")
            print(f"   Companies: {health.get('companies', 0)}")
            
        elif command == "history":
            history = manager.get_analysis_history(10)
            print(f"📚 Analysis History ({len(history)} entries):")
            for analysis in history:
                risk = "🔴" if analysis['ghostProbability'] >= 0.67 else "🟡" if analysis['ghostProbability'] >= 0.34 else "🟢"
                print(f"   {risk} {analysis['company']} - {analysis['title']} ({analysis['ghostProbability']:.1%})")
            
        elif command == "stats":
            stats = manager.get_analysis_stats()
            print(f"📈 Analysis Statistics:")
            print(f"   Total: {stats['total_analyses']}")
            print(f"   Average Ghost Probability: {stats['avg_ghost_probability']:.1%}")
            print(f"   🔴 High Risk: {stats['high_risk_count']}")
            print(f"   🟡 Medium Risk: {stats['medium_risk_count']}")
            print(f"   🟢 Low Risk: {stats['low_risk_count']}")
            
        elif command == "test":
            print("🧪 Testing Edge Config with sample analysis...")
            
            job_data = {
                'platform': 'linkedin',
                'job_title': 'Edge Config Test Engineer',
                'company': 'Vercel Test Corp',
                'location': 'Remote',
                'parsing_metadata': {
                    'raw_title': 'Edge Config Test Engineer - Vercel Test Corp | LinkedIn',
                    'structured_data_found': True,
                    'meta_tags_count': 15,
                    'confidence_scores': {'title': 0.9, 'company': 0.85, 'overall': 0.88}
                }
            }
            
            analysis = {
                'ghost_probability': 0.45,
                'confidence': 0.87,
                'processing_time_ms': 150,
                'factors': [
                    {
                        'factor_type': 'warning',
                        'description': 'Test factor for Edge Config integration',
                        'severity': 0.4,
                        'weight': 0.15
                    }
                ]
            }
            
            analysis_id = manager.save_job_analysis(
                'https://test.com/edge-config-test',
                job_data,
                analysis
            )
            
            print(f"   ✅ Saved test analysis with ID: {analysis_id}")
            
            # Verify by getting stats
            stats = manager.get_analysis_stats()
            print(f"   📊 Total analyses after test: {stats['total_analyses']}")
        
        else:
            print(f"❌ Unknown command: {command}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()