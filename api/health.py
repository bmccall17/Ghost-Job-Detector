"""
Vercel API Function for Health Check
Endpoint: /api/health
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from datetime import datetime

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
        """Handle health check requests"""
        try:
            # CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Check service health
            if VercelAnalysisService:
                service = VercelAnalysisService()
                health_data = service.health_check()
                
                # Add Vercel-specific metadata
                health_response = {
                    "status": health_data.get("status", "healthy"),
                    "timestamp": datetime.now().isoformat(),
                    "service": "ghost-job-detector-api",
                    "version": "1.1.0-vercel",
                    "environment": os.environ.get("VERCEL_ENV", "development"),
                    "storage": {
                        "type": "vercel-edge-config" if service.use_edge_config else "mock",
                        "status": "connected" if service.use_edge_config else "mock-mode",
                        "analyses": health_data.get("job_searches", health_data.get("analyses", 0)),
                        "companies": health_data.get("companies", 0)
                    },
                    "edge_config": {
                        "available": service.use_edge_config,
                        "store_name": "ghost-job-detector-store" if service.use_edge_config else None,
                        "connection": "active" if service.use_edge_config else "unavailable"
                    }
                }
            else:
                # Fallback health response
                health_response = {
                    "status": "degraded",
                    "timestamp": datetime.now().isoformat(),
                    "service": "ghost-job-detector-api",
                    "version": "1.1.0-vercel",
                    "environment": os.environ.get("VERCEL_ENV", "development"),
                    "storage": {
                        "type": "fallback",
                        "status": "unavailable",
                        "analyses": 0,
                        "companies": 0
                    },
                    "edge_config": {
                        "available": False,
                        "store_name": None,
                        "connection": "failed"
                    },
                    "error": "VercelAnalysisService not available"
                }

            # Return health status
            self.wfile.write(json.dumps(health_response).encode())

        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "service": "ghost-job-detector-api",
                "error": str(e),
                "type": "internal_error"
            })
            self.wfile.write(error_response.encode())