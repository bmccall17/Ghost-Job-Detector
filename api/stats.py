"""
Vercel API Function for Analysis Statistics
Endpoint: /api/stats
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
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle statistics requests"""
        try:
            # CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Parse query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            days_back = int(query_params.get('days_back', [30])[0])

            # Initialize service
            if VercelAnalysisService:
                service = VercelAnalysisService()
                stats = service.get_analysis_stats()
                
                # Add additional metadata for Vercel
                stats["platform_breakdown"] = {}  # Could be enhanced
                stats["recent_trend"] = []  # Could be enhanced
                stats["last_updated"] = "now"  # Could be enhanced
                stats["data_source"] = "vercel-edge-config" if service.use_edge_config else "mock"
                
            else:
                # Fallback mock response
                stats = {
                    "total_analyses": 0,
                    "avg_ghost_probability": 0.0,
                    "high_risk_count": 0,
                    "medium_risk_count": 0,
                    "low_risk_count": 0,
                    "top_ghost_companies": [],
                    "platform_breakdown": {},
                    "recent_trend": [],
                    "data_source": "fallback-mock",
                    "error": "Vercel Edge Config not available"
                }

            # Return statistics
            self.wfile.write(json.dumps(stats, default=str).encode())

        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                "error": f"Failed to retrieve statistics: {str(e)}",
                "type": "internal_error"
            })
            self.wfile.write(error_response.encode())