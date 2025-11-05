#!/usr/bin/env python3
"""
Python Microservice - Data Processing Service
Handles data processing and transformation tasks
"""

import os
import json
import time
import signal
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from typing import Dict, Any


class DataProcessingHandler(BaseHTTPRequestHandler):
    """HTTP request handler for data processing endpoints"""
    
    def __init__(self, config: Dict[str, str], *args, **kwargs):
        self.config = config
        super().__init__(*args, **kwargs)
    
    def log_message(self, format, *args):
        """Override to use custom logging format"""
        print(f"[{datetime.now().isoformat()}] {format % args}")
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.health_check()
        elif self.path == '/api/v1/transform':
            self.transform_data()
        elif self.path == '/api/v1/metrics':
            self.get_metrics()
        else:
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/v1/transform':
            self.transform_data()
        else:
            self.send_error(404, "Not Found")
    
    def health_check(self):
        """Health check endpoint for Kubernetes probes"""
        response = {
            "status": "healthy",
            "service": self.config.get("service_name", "python-service"),
            "timestamp": datetime.now().isoformat()
        }
        self.send_json_response(200, response)
    
    def transform_data(self):
        """Transform and process data"""
        start_time = time.time()
        
        # Read request body if present
        content_length = int(self.headers.get('Content-Length', 0))
        request_data = {}
        if content_length > 0:
            body = self.rfile.read(content_length)
            try:
                request_data = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
        
        # Simulate data processing
        # In a real service, this might involve:
        # - Data validation
        # - Transformation logic
        # - Database operations
        # - External API calls
        time.sleep(0.05)  # Simulate processing time
        
        processing_time = (time.time() - start_time) * 1000
        
        response = {
            "message": "Data transformed successfully",
            "input_size": len(json.dumps(request_data)),
            "processed_items": len(request_data) if isinstance(request_data, dict) else 1,
            "processing_time_ms": round(processing_time, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        self.send_json_response(200, response)
    
    def get_metrics(self):
        """Get service metrics"""
        metrics = {
            "service": self.config.get("service_name", "python-service"),
            "version": "1.0.0",
            "environment": self.config.get("environment", "development"),
            "uptime": "N/A",  # Could implement actual uptime tracking
            "status": "operational"
        }
        self.send_json_response(200, metrics)
    
    def send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))


def create_handler(config: Dict[str, str]):
    """Factory function to create handler with config"""
    def handler(*args, **kwargs):
        return DataProcessingHandler(config, *args, **kwargs)
    return handler


def load_config() -> Dict[str, str]:
    """Load configuration from environment variables"""
    return {
        "port": os.getenv("PORT", "8081"),
        "service_name": os.getenv("SERVICE_NAME", "python-service"),
        "environment": os.getenv("ENVIRONMENT", "development")
    }


def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    print("\nReceived shutdown signal, shutting down gracefully...")
    sys.exit(0)


def main():
    """Main application entry point"""
    config = load_config()
    port = int(config["port"])
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create HTTP server
    handler = create_handler(config)
    server = HTTPServer(('0.0.0.0', port), handler)
    
    print(f"Starting {config['service_name']} on port {port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()


if __name__ == "__main__":
    main()

