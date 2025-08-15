#!/usr/bin/env python3
"""
Simple HTTP API for Ghost Job Detector
Provides endpoints for job analysis and database integration
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
            
            if path == '/':
                self._send_json_response({
                    "message": "Ghost Job Detector API",
                    "version": "1.0.0",
                    "endpoints": {
                        "/health": "Health check",
                        "/api/v1/detection/analyze": "Analyze job (POST)",
                        "/api/v1/history": "Get analysis history",
                        "/api/v1/stats": "Get analysis statistics"
                    }
                })
            
            elif path == '/health':
                # Database health check
                conn = sqlite3.connect("ghost_job_detector.db")
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM job_searches")
                job_count = cursor.fetchone()[0]
                conn.close()
                
                self._send_json_response({
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "database": {
                        "status": "connected",
                        "job_searches": job_count
                    }
                })
            
            elif path == '/api/v1/history':
                # Get analysis history with pagination
                page = int(query_params.get('page', [1])[0])
                page_size = int(query_params.get('page_size', [20])[0])
                
                # Calculate offset
                offset = (page - 1) * page_size
                
                conn = sqlite3.connect("ghost_job_detector.db")
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Get total count
                cursor.execute("SELECT COUNT(*) FROM job_searches")
                total_count = cursor.fetchone()[0]
                
                # Get paginated results
                cursor.execute("""
                    SELECT js.*, 
                           GROUP_CONCAT(kf.description) as factor_descriptions,
                           GROUP_CONCAT(kf.factor_type || ':' || kf.weight) as factor_weights
                    FROM job_searches js
                    LEFT JOIN key_factors kf ON js.id = kf.search_id
                    GROUP BY js.id
                    ORDER BY js.analysis_date DESC
                    LIMIT ? OFFSET ?
                """, (page_size, offset))
                
                analyses = []
                for row in cursor.fetchall():
                    # Parse factors
                    factors = []
                    if row["factor_descriptions"]:
                        descriptions = row["factor_descriptions"].split(",")
                        weights_info = row["factor_weights"].split(",") if row["factor_weights"] else []
                        
                        for i, desc in enumerate(descriptions):
                            weight = 0.1  # default
                            if i < len(weights_info) and ':' in weights_info[i]:
                                try:
                                    weight = float(weights_info[i].split(':')[1])
                                except:
                                    pass
                            
                            factors.append({
                                "factor": desc,
                                "weight": weight,
                                "description": desc
                            })
                    
                    analysis = {
                        "job_search": {
                            "id": row["id"],
                            "url": row["url"],
                            "platform": row["platform"],
                            "job_title": row["job_title"],
                            "company": row["company"],
                            "location": row["location"],
                            "analysis_date": row["analysis_date"],
                            "ghost_probability": row["ghost_probability"],
                            "confidence": row["confidence"],
                            "status": "completed",
                            "parser_used": row["parser_used"],
                            "extraction_method": row["extraction_method"],
                            "processing_time_ms": row["processing_time_ms"],
                            "created_at": row["created_at"],
                            "updated_at": row["updated_at"]
                        },
                        "key_factors": [
                            {
                                "id": i + 1,
                                "search_id": row["id"],
                                "factor_type": "warning",  # simplified
                                "description": factor["description"],
                                "severity": 0.5,  # default
                                "weight": factor["weight"],
                                "created_at": row["created_at"]
                            }
                            for i, factor in enumerate(factors)
                        ]
                    }
                    analyses.append(analysis)
                
                conn.close()
                
                response = {
                    "total_count": total_count,
                    "page": page,
                    "page_size": page_size,
                    "analyses": analyses
                }
                
                self._send_json_response(response)
            
            elif path == '/api/v1/stats':
                # Get analysis statistics
                stats = self.analysis_service.get_analysis_stats()
                
                # Add platform breakdown
                conn = sqlite3.connect("ghost_job_detector.db")
                cursor = conn.cursor()
                cursor.execute("SELECT platform, COUNT(*) FROM job_searches GROUP BY platform")
                platform_breakdown = dict(cursor.fetchall())
                conn.close()
                
                stats["platform_breakdown"] = platform_breakdown
                stats["recent_trend"] = []  # Simplified for now
                
                self._send_json_response(stats)
            
            elif path.startswith('/api/v1/history/') and len(path.split('/')) == 5:
                # Get specific analysis detail
                try:
                    analysis_id = int(path.split('/')[-1])
                    
                    conn = sqlite3.connect("ghost_job_detector.db")
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    # Get job search
                    cursor.execute("SELECT * FROM job_searches WHERE id = ?", (analysis_id,))
                    job_row = cursor.fetchone()
                    
                    if not job_row:
                        self._send_error_response("Analysis not found", 404)
                        return
                    
                    # Get key factors
                    cursor.execute("SELECT * FROM key_factors WHERE search_id = ?", (analysis_id,))
                    factor_rows = cursor.fetchall()
                    
                    # Get parsing metadata
                    cursor.execute("SELECT * FROM parsing_metadata WHERE search_id = ?", (analysis_id,))
                    metadata_row = cursor.fetchone()
                    
                    conn.close()
                    
                    # Build response
                    response = {
                        "job_search": dict(job_row),
                        "key_factors": [dict(row) for row in factor_rows],
                        "parsing_metadata": dict(metadata_row) if metadata_row else None,
                        "company_info": None  # Simplified
                    }
                    
                    self._send_json_response(response)
                    
                except ValueError:
                    self._send_error_response("Invalid analysis ID", 400)
            
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
            
            if path == '/api/v1/detection/analyze':
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
                
                # Perform analysis
                try:
                    result = self.analysis_service.analyze_job_complete(job_url)
                    self._send_json_response(result)
                
                except Exception as e:
                    print(f"Analysis error: {e}")
                    self._send_error_response(f"Analysis failed: {str(e)}", 500)
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"POST error: {e}")
            self._send_error_response(str(e), 500)
    
    def do_DELETE(self):
        """Handle DELETE requests"""
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            if path.startswith('/api/v1/history/') and len(path.split('/')) == 5:
                try:
                    analysis_id = int(path.split('/')[-1])
                    
                    conn = sqlite3.connect("ghost_job_detector.db")
                    cursor = conn.cursor()
                    cursor.execute("DELETE FROM job_searches WHERE id = ?", (analysis_id,))
                    
                    if cursor.rowcount > 0:
                        conn.commit()
                        self._send_json_response({"message": f"Analysis {analysis_id} deleted successfully"})
                    else:
                        self._send_error_response("Analysis not found", 404)
                    
                    conn.close()
                    
                except ValueError:
                    self._send_error_response("Invalid analysis ID", 400)
            
            else:
                self._send_error_response("Endpoint not found", 404)
        
        except Exception as e:
            print(f"DELETE error: {e}")
            self._send_error_response(str(e), 500)
    
    def log_message(self, format, *args):
        """Override to provide custom logging"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")

def run_server(port=8000):
    """Run the HTTP server"""
    print(f"🚀 Starting Ghost Job Detector API Server")
    print(f"📍 Server running on http://localhost:{port}")
    print(f"🔍 Available endpoints:")
    print(f"   GET  /health - Health check")
    print(f"   POST /api/v1/detection/analyze - Analyze job posting")
    print(f"   GET  /api/v1/history - Get analysis history") 
    print(f"   GET  /api/v1/history/{{id}} - Get specific analysis")
    print(f"   DELETE /api/v1/history/{{id}} - Delete analysis")
    print(f"   GET  /api/v1/stats - Get analysis statistics")
    print(f"\n💡 Test with:")
    print(f"   curl -X POST http://localhost:{port}/api/v1/detection/analyze \\")
    print(f"        -H 'Content-Type: application/json' \\")
    print(f"        -d '{{\"jobUrl\": \"https://example.com/job/123\"}}'")
    print(f"\n🛑 Press Ctrl+C to stop the server\n")
    
    server = HTTPServer(('localhost', port), GhostJobAPIHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped")
        server.shutdown()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)