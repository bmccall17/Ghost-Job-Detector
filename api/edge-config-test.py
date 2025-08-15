"""
Vercel Edge Config Sanity Check Test
Tests connection to ghost-job-detector-store
"""

import json
import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Test Edge Config connection"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Environment check
        edge_config_url = os.environ.get('EDGE_CONFIG')
        vercel_env = os.environ.get('VERCEL_ENV', 'development')
        
        # Basic connectivity test
        test_result = {
            "edge_config_present": edge_config_url is not None,
            "edge_config_url_preview": edge_config_url[:50] + "..." if edge_config_url else None,
            "vercel_env": vercel_env,
            "runtime": "vercel-python",
            "environment_variables": {
                "EDGE_CONFIG": "present" if edge_config_url else "missing",
                "VERCEL_ENV": vercel_env,
                "VERCEL_URL": os.environ.get('VERCEL_URL', 'not-set')
            }
        }
        
        # Try to test Edge Config if available
        if edge_config_url:
            try:
                import requests
                
                # Test basic read access
                headers = {
                    'Authorization': f'Bearer {edge_config_url.split("?")[1] if "?" in edge_config_url else ""}',
                    'Content-Type': 'application/json'
                }
                
                # Attempt to read test data
                base_url = edge_config_url.split('?')[0] if '?' in edge_config_url else edge_config_url
                
                try:
                    response = requests.get(f"{base_url}/test_message", headers=headers, timeout=5)
                    test_result["edge_config_read_test"] = {
                        "status_code": response.status_code,
                        "success": response.status_code == 200,
                        "response": response.text[:100] if response.text else None
                    }
                except Exception as e:
                    test_result["edge_config_read_test"] = {
                        "error": str(e),
                        "success": False
                    }
                
            except ImportError:
                test_result["edge_config_read_test"] = {
                    "error": "requests module not available",
                    "success": False
                }
        else:
            test_result["edge_config_read_test"] = {
                "error": "EDGE_CONFIG environment variable not set",
                "success": False
            }
        
        # Overall status
        test_result["overall_status"] = "healthy" if edge_config_url else "configuration_missing"
        
        # Next steps based on results
        if not edge_config_url:
            test_result["next_steps"] = [
                "1. Run 'vercel link' in your project directory",
                "2. Run 'vercel env pull' to get EDGE_CONFIG variable",
                "3. Ensure ghost-job-detector-store is connected to your Vercel project",
                "4. Add test_message key to Edge Config store in Vercel dashboard"
            ]
        elif not test_result["edge_config_read_test"]["success"]:
            test_result["next_steps"] = [
                "1. Check that ghost-job-detector-store exists in Vercel dashboard",
                "2. Verify store is connected to correct project",
                "3. Add test_message key with value 'hello-from-edge-config'",
                "4. Redeploy to refresh environment variables"
            ]
        else:
            test_result["next_steps"] = [
                "Edge Config appears to be working correctly!"
            ]
        
        self.wfile.write(json.dumps(test_result, indent=2).encode())