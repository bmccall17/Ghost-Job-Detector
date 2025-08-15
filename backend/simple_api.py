#!/usr/bin/env python3
"""
Simple HTTP API for Ghost Job Detector
Compatible with frontend /api/* endpoints
"""

import json
import sqlite3
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from analysis_service import AnalysisService

class GhostJobAPIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Ghost Job Detector API"""
    
    def __init__(self, *args, **kwargs):
        self.analysis_service = AnalysisService()
        super().__init__(*args, **kwargs)
    
    def _set_cors_headers(self):
        """Set CORS headers for cross-origin requests"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def _send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        
        if isinstance(data, dict) or isinstance(data, list):
            response = json.dumps(data, default=str)
        else:
            response = str(data)
        
        self.wfile.write(response.encode('utf-8'))
    
    def _send_error_response(self, message, status_code=500):
        """Send error response"""
        self._send_json_response({"error": message}, status_code)
    
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
            query_params = parse_qs(parsed_url.query)
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] GET {path}")
            
            if path == '/api' or path == '/api/':
                self._send_json_response({
                    "service": "ghost-job-detector-api",
                    "version": "1.0.0",
                    "endpoints": {
                        "/api/health": "Health check",
                        "/api/analyze": "Analyze job (POST)",
                        "/api/history": "Get analysis history",
                        "/api/stats": "Get analysis statistics"
                    }
                })
            
            elif path == '/api/health':
                # Database health check
                health = self.analysis_service.health_check()
                health["api_version"] = "1.0.0"
                health["timestamp"] = datetime.now().isoformat()
                self._send_json_response(health)
            
            elif path == '/api/history':
                # Get analysis history with pagination
                page = int(query_params.get('page', [1])[0])
                page_size = int(query_params.get('page_size', [20])[0])
                
                # Get analyses
                limit = page_size * page
                analyses = self.analysis_service.get_analysis_history(limit)
                
                # Apply pagination
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                paginated_analyses = analyses[start_idx:end_idx]
                
                # Format for frontend compatibility
                formatted_analyses = []
                for analysis in paginated_analyses:
                    # Parse factors
                    factors = []
                    for factor_desc in analysis.get("factors", []):
                        if isinstance(factor_desc, str):
                            factors.append({
                                "description": factor_desc.split(" (weight:")[0],
                                "factor_type": "warning",
                                "severity": 0.5,
                                "weight": 0.1
                            })
                    
                    formatted_analysis = {
                        "job_search": {
                            "id": analysis["id"],
                            "url": analysis["jobUrl"],
                            "platform": "unknown",
                            "job_title": analysis["title"],
                            "company": analysis["company"],
                            "ghost_probability": analysis["ghostProbability"],
                            "confidence": analysis["confidence"],
                            "analysis_date": analysis["analyzedAt"],
                            "status": analysis["status"]
                        },
                        "key_factors": factors
                    }
                    formatted_analyses.append(formatted_analysis)
                
                response = {
                    "total_count": len(analyses),
                    "page": page,
                    "page_size": page_size,
                    "analyses": formatted_analyses
                }
                
                self._send_json_response(response)
            
            elif path == '/api/stats':
                # Get analysis statistics
                stats = self.analysis_service.get_analysis_stats()
                stats["platform_breakdown"] = {}  # Could be enhanced
                stats["recent_trend"] = []  # Could be enhanced
                self._send_json_response(stats)
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"GET error: {e}")
            self._send_error_response(str(e), 500)
    
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
                    self._send_error_response("Invalid JSON in request body", 400)
                    return
                
                job_url = request_data.get('jobUrl')
                if not job_url:
                    self._send_error_response("jobUrl is required", 400)
                    return
                
                print(f"   🔍 Analyzing: {job_url}")
                
                # Perform analysis
                try:
                    result = self.analysis_service.analyze_job_complete(job_url)
                    
                    print(f"   ✅ Analysis complete: ID {result['id']}, Ghost: {result['ghostProbability']:.1%}")
                    print(f"   💾 Saved to database: {result['jobData']['company']} - {result['jobData']['title']}")
                    
                    self._send_json_response(result)
                
                except Exception as e:
                    print(f"   ❌ Analysis error: {e}")
                    self._send_error_response(f"Analysis failed: {str(e)}", 500)
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"POST error: {e}")
            self._send_error_response(str(e), 500)
    
    def log_message(self, format, *args):
        """Override to provide custom logging"""
        pass  # Suppress default request logs

def run_server(port=3001):
    """Run the HTTP server"""
    print(f"🚀 Starting Ghost Job Detector API Server")
    print(f"📍 Server running on http://localhost:{port}")
    print(f"🔗 Frontend should use: http://localhost:{port}/api")
    print(f"")
    print(f"🔍 Available endpoints:")
    print(f"   GET  /api/health - Health check")
    print(f"   POST /api/analyze - Analyze job posting")
    print(f"   GET  /api/history - Get analysis history") 
    print(f"   GET  /api/stats - Get analysis statistics")
    print(f"")
    print(f"💡 Test with:")
    print(f"   curl -X POST http://localhost:{port}/api/analyze \\")
    print(f"        -H 'Content-Type: application/json' \\")
    print(f"        -d '{{\"jobUrl\": \"https://example.com/job/123\"}}'")
    print(f"")
    print(f"🛑 Press Ctrl+C to stop the server")
    print(f"")
    
    server = HTTPServer(('localhost', port), GhostJobAPIHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped")
        server.shutdown()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    run_server(port)