"""
Vercel API Function for Ghost Job Analysis
Endpoint: /api/analyze
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from vercel_analysis_service import VercelAnalysisService
except ImportError:
    # Fallback for local development
    VercelAnalysisService = None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle job analysis requests"""
        try:
            # CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            # Get request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.wfile.write(json.dumps({"error": "Request body required"}).encode())
                return

            post_data = self.rfile.read(content_length)
            try:
                request_data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
                return

            job_url = request_data.get('jobUrl')
            if not job_url:
                self.wfile.write(json.dumps({"error": "jobUrl is required"}).encode())
                return

            # Initialize service
            if VercelAnalysisService:
                service = VercelAnalysisService()
                result = service.analyze_job_complete(job_url)
            else:
                # Fallback mock response
                result = {
                    "id": "mock-123",
                    "ghostProbability": 0.45,
                    "confidence": 0.87,
                    "factors": [
                        {
                            "factor": "Mock analysis - Vercel Edge Config not available",
                            "weight": 0.1,
                            "description": "Mock analysis - Vercel Edge Config not available"
                        }
                    ],
                    "metadata": {
                        "processingTime": 50,
                        "modelVersion": "v1.0.0-fallback"
                    },
                    "jobData": {
                        "title": "Test Position",
                        "company": "Test Company",
                        "location": "Remote",
                        "platform": "unknown"
                    }
                }

            # Return analysis result
            response = json.dumps(result)
            self.wfile.write(response.encode())

        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                "error": f"Analysis failed: {str(e)}",
                "type": "internal_error"
            })
            self.wfile.write(error_response.encode())

    def do_GET(self):
        """Handle GET requests with endpoint info"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        info = {
            "endpoint": "/api/analyze",
            "method": "POST",
            "description": "Analyze a job posting for ghost job probability",
            "required_fields": ["jobUrl"],
            "example": {
                "jobUrl": "https://linkedin.com/jobs/view/12345"
            }
        }
        
        self.wfile.write(json.dumps(info).encode())