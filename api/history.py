"""
Vercel API Function for Analysis History
Endpoint: /api/history
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from vercel_analysis_service import VercelAnalysisService
except ImportError:
    VercelAnalysisService = None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle history retrieval requests"""
        try:
            # CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Parse query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            page = int(query_params.get('page', [1])[0])
            page_size = int(query_params.get('page_size', [20])[0])
            platform = query_params.get('platform', [None])[0]
            company = query_params.get('company', [None])[0]
            min_ghost_prob = query_params.get('min_ghost_probability', [None])[0]
            max_ghost_prob = query_params.get('max_ghost_probability', [None])[0]

            # Initialize service
            if VercelAnalysisService:
                service = VercelAnalysisService()
                
                # Get analysis history
                limit = page_size
                analyses = service.get_analysis_history(limit * page)
                
                # Apply pagination
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                paginated_analyses = analyses[start_idx:end_idx]
                
                # Apply filters (basic implementation)
                if platform:
                    paginated_analyses = [a for a in paginated_analyses if a.get('platform') == platform]
                if company:
                    paginated_analyses = [a for a in paginated_analyses if company.lower() in a.get('company', '').lower()]
                if min_ghost_prob:
                    min_prob = float(min_ghost_prob)
                    paginated_analyses = [a for a in paginated_analyses if a.get('ghostProbability', 0) >= min_prob]
                if max_ghost_prob:
                    max_prob = float(max_ghost_prob)
                    paginated_analyses = [a for a in paginated_analyses if a.get('ghostProbability', 1) <= max_prob]
                
                # Format response
                response = {
                    "total_count": len(analyses),
                    "page": page,
                    "page_size": page_size,
                    "analyses": [
                        {
                            "job_search": {
                                "id": analysis["id"],
                                "url": analysis["jobUrl"],
                                "platform": analysis.get("platform", "unknown"),
                                "job_title": analysis["title"],
                                "company": analysis["company"],
                                "location": analysis.get("location"),
                                "analysis_date": analysis["analyzedAt"],
                                "ghost_probability": analysis["ghostProbability"],
                                "confidence": analysis["confidence"],
                                "status": analysis["status"]
                            },
                            "key_factors": [
                                {
                                    "id": i + 1,
                                    "search_id": analysis["id"],
                                    "factor_type": "warning",
                                    "description": factor,
                                    "severity": 0.5,
                                    "weight": 0.1
                                }
                                for i, factor in enumerate(analysis.get("factors", []))
                            ]
                        }
                        for analysis in paginated_analyses
                    ]
                }
            else:
                # Fallback mock response
                response = {
                    "total_count": 0,
                    "page": page,
                    "page_size": page_size,
                    "analyses": [],
                    "error": "Vercel Edge Config not available"
                }

            # Return response
            self.wfile.write(json.dumps(response, default=str).encode())

        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                "error": f"Failed to retrieve history: {str(e)}",
                "type": "internal_error"
            })
            self.wfile.write(error_response.encode())

    def do_DELETE(self):
        """Handle analysis deletion requests"""
        try:
            # Extract analysis ID from path
            path_parts = self.path.split('/')
            if len(path_parts) < 3:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Analysis ID required"}).encode())
                return

            analysis_id = path_parts[-1]
            
            # CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Initialize service and delete
            if VercelAnalysisService:
                service = VercelAnalysisService()
                
                if hasattr(service, 'edge_manager') and service.edge_manager:
                    deleted = service.edge_manager.delete_analysis(analysis_id)
                    if deleted:
                        response = {"message": f"Analysis {analysis_id} deleted successfully"}
                    else:
                        response = {"error": f"Analysis {analysis_id} not found"}
                else:
                    response = {"error": "Delete operation not supported in mock mode"}
            else:
                response = {"error": "Vercel Edge Config not available"}

            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                "error": f"Delete failed: {str(e)}",
                "type": "internal_error"
            })
            self.wfile.write(error_response.encode())