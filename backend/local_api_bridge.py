#!/usr/bin/env python3
"""
Local API Bridge for Ghost Job Detector
Provides /api/* endpoints locally for testing database writes
"""

import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

try:
    from vercel_analysis_service import VercelAnalysisService
except ImportError:
    try:
        from analysis_service import AnalysisService
        VercelAnalysisService = None
    except ImportError:
        AnalysisService = None
        VercelAnalysisService = None

class LocalAPIHandler(BaseHTTPRequestHandler):
    """Local API handler that mimics Vercel endpoints"""
    
    def __init__(self, *args, **kwargs):
        # Initialize services
        if VercelAnalysisService:
            self.service = VercelAnalysisService()
            self.service_type = "vercel"
        elif 'AnalysisService' in globals():
            self.service = AnalysisService()
            self.service_type = "local"
        else:
            self.service = None
            self.service_type = "none"
        super().__init__(*args, **kwargs)
    
    def _set_cors_headers(self):
        """Set CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def _send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        
        response = json.dumps(data, default=str)
        self.wfile.write(response.encode('utf-8'))
    
    def _send_error_response(self, message, status_code=500):
        """Send error response"""
        self._send_json_response({
            "error": message,
            "service_type": self.service_type,
            "timestamp": datetime.now().isoformat()
        }, status_code)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] GET {path}")
            
            if path == '/api' or path == '/api/':
                # API info
                self._send_json_response({
                    "service": "ghost-job-detector-local-api",
                    "version": "1.0.0",
                    "service_type": self.service_type,
                    "endpoints": {
                        "/api/analyze": "POST - Analyze job posting",
                        "/api/history": "GET - Get analysis history", 
                        "/api/stats": "GET - Get analysis statistics",
                        "/api/health": "GET - Health check"
                    }
                })
            
            elif path == '/api/health':
                # Health check
                if self.service:
                    health = self.service.health_check()
                    health["local_bridge"] = True
                    health["service_type"] = self.service_type
                    self._send_json_response(health)
                else:
                    self._send_json_response({
                        "status": "degraded",
                        "error": "No analysis service available",
                        "local_bridge": True,
                        "service_type": self.service_type
                    })
            
            elif path == '/api/history':
                # Get analysis history
                if self.service:
                    query_params = parse_qs(parsed_url.query)
                    page = int(query_params.get('page', [1])[0])
                    page_size = int(query_params.get('page_size', [20])[0])
                    
                    if hasattr(self.service, 'get_analysis_history'):
                        analyses = self.service.get_analysis_history(page_size * page)
                        
                        # Paginate
                        start_idx = (page - 1) * page_size
                        end_idx = start_idx + page_size
                        paginated = analyses[start_idx:end_idx]
                        
                        # Format for frontend compatibility
                        formatted_analyses = []
                        for analysis in paginated:
                            formatted_analyses.append({
                                "job_search": {
                                    "id": analysis.get("id"),
                                    "url": analysis.get("jobUrl"),
                                    "job_title": analysis.get("title"),
                                    "company": analysis.get("company"),
                                    "ghost_probability": analysis.get("ghostProbability"),
                                    "confidence": analysis.get("confidence"),
                                    "analysis_date": analysis.get("analyzedAt"),
                                    "status": analysis.get("status", "completed")
                                },
                                "key_factors": [
                                    {"description": factor} 
                                    for factor in analysis.get("factors", [])
                                ]
                            })
                        
                        response = {
                            "total_count": len(analyses),
                            "page": page,
                            "page_size": page_size,
                            "analyses": formatted_analyses
                        }
                        self._send_json_response(response)
                    else:
                        self._send_error_response("History not available")
                else:
                    self._send_error_response("Service not available")
            
            elif path == '/api/stats':
                # Get statistics
                if self.service and hasattr(self.service, 'get_analysis_stats'):
                    stats = self.service.get_analysis_stats()
                    self._send_json_response(stats)
                else:
                    self._send_json_response({
                        "total_analyses": 0,
                        "avg_ghost_probability": 0.0,
                        "high_risk_count": 0,
                        "medium_risk_count": 0,
                        "low_risk_count": 0,
                        "top_ghost_companies": [],
                        "error": "Stats not available"
                    })
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"GET error: {e}")
            self._send_error_response(str(e))
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] POST {path}")
            
            if path == '/api/analyze':
                # Get request body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    self._send_error_response("Request body required", 400)
                    return
                
                post_data = self.rfile.read(content_length)
                try:
                    request_data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self._send_error_response("Invalid JSON", 400)
                    return
                
                job_url = request_data.get('jobUrl')
                if not job_url:
                    self._send_error_response("jobUrl is required", 400)
                    return
                
                print(f"   Analyzing: {job_url}")
                print(f"   Service: {self.service_type}")
                
                # Perform analysis
                if self.service and hasattr(self.service, 'analyze_job_complete'):
                    try:
                        result = self.service.analyze_job_complete(job_url)
                        print(f"   ✅ Analysis complete: ID {result['id']}, Ghost: {result['ghostProbability']:.1%}")
                        self._send_json_response(result)
                    except Exception as e:
                        print(f"   ❌ Analysis failed: {e}")
                        self._send_error_response(f"Analysis failed: {str(e)}")
                else:
                    # Fallback mock response
                    result = {
                        "id": str(int(datetime.now().timestamp() * 1000)),
                        "ghostProbability": 0.45,
                        "confidence": 0.87,
                        "factors": [
                            {
                                "factor": "Local API bridge - service not available",
                                "weight": 0.1,
                                "description": "Local API bridge - service not available"
                            }
                        ],
                        "metadata": {
                            "processingTime": 50,
                            "modelVersion": "v1.0.0-local-bridge",
                            "service_type": self.service_type
                        }
                    }
                    print(f"   ⚠️  Using fallback mock response")
                    self._send_json_response(result)
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"POST error: {e}")
            self._send_error_response(str(e))
    
    def log_message(self, format, *args):
        """Custom logging"""
        return  # Suppress default logs

def run_local_api_bridge(port=3001):
    """Run the local API bridge server"""
    print(f"🌉 Starting Local API Bridge for Ghost Job Detector")
    print(f"📍 Server running on http://localhost:{port}")
    print(f"🔗 Frontend should use: http://localhost:{port}/api")
    print(f"")
    print(f"🔍 Available endpoints:")
    print(f"   GET  /api/health - Health check")
    print(f"   POST /api/analyze - Analyze job posting")
    print(f"   GET  /api/history - Get analysis history")
    print(f"   GET  /api/stats - Get analysis statistics")
    print(f"")
    print(f"💡 Update your frontend .env.local:")
    print(f"   VITE_API_BASE_URL=http://localhost:{port}/api")
    print(f"")
    print(f"🛑 Press Ctrl+C to stop the server")
    print(f"")
    
    server = HTTPServer(('localhost', port), LocalAPIHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Local API Bridge stopped")
        server.shutdown()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    run_local_api_bridge(port)