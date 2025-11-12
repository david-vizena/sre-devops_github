#!/usr/bin/env python3
"""
Python Microservice - Analytics & Reporting Service
Analyzes transaction data and generates insights
"""

import os
import json
import time
import signal
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from typing import Dict, Any, List
from collections import defaultdict
from statistics import mean, median


class AnalyticsHandler(BaseHTTPRequestHandler):
    """HTTP request handler for analytics endpoints"""
    
    def __init__(self, config: Dict[str, str], state: Dict[str, Any], *args, **kwargs):
        self.config = config
        self.state = state
        super().__init__(*args, **kwargs)
    
    @property
    def transactions(self) -> List[Dict]:
        return self.state["transactions"]

    @property
    def lock(self) -> threading.Lock:
        return self.state["lock"]
    
    def log_message(self, format, *args):
        """Override to use custom logging format"""
        print(f"[{datetime.now().isoformat()}] {format % args}")
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.health_check()
        elif self.path == '/metrics':
            self.prometheus_metrics()
        elif self.path == '/api/v1/analyze':
            self.analyze_transactions()
        elif self.path == '/api/v1/metrics':
            self.get_metrics()
        elif self.path.startswith('/api/v1/report'):
            self.generate_report()
        else:
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/v1/analyze':
            self.analyze_transactions()
        elif self.path == '/api/v1/store-transaction':
            self.store_transaction()
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
    
    def store_transaction(self):
        """Store a transaction for later analysis"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self.send_error(400, "Transaction data required")
            return
        
        body = self.rfile.read(content_length)
        try:
            transaction = json.loads(body.decode('utf-8'))
            with self.lock:
                self.transactions.append(transaction)
                total_transactions = len(self.transactions)
            response = {
                "message": "Transaction stored successfully",
                "transaction_id": transaction.get("transaction_id"),
                "total_transactions": total_transactions
            }
            self.send_json_response(200, response)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
    
    def analyze_transactions(self):
        """Analyze stored transactions and generate insights"""
        start_time = time.time()
        
        with self.lock:
            transactions_copy = list(self.transactions)
        
        if not transactions_copy:
            response = {
                "message": "No transactions to analyze",
                "total_transactions": 0
            }
            self.send_json_response(200, response)
            return
        
        # Data Analysis: Calculate statistics
        totals = [t.get("total", 0) for t in transactions_copy]
        subtotals = [t.get("subtotal", 0) for t in transactions_copy]
        taxes = [t.get("tax", 0) for t in transactions_copy]
        discounts = [t.get("discount", 0) for t in transactions_copy]
        
        # Revenue analysis
        total_revenue = sum(totals)
        average_order_value = mean(totals) if totals else 0
        median_order_value = median(totals) if totals else 0
        max_order = max(totals) if totals else 0
        min_order = min(totals) if totals else 0
        
        # Category analysis
        category_revenue = defaultdict(float)
        category_count = defaultdict(int)
        
        for transaction in transactions_copy:
            for item in transaction.get("items", []):
                category = item.get("category", "uncategorized")
                category_revenue[category] += item.get("price", 0) * item.get("quantity", 0)
                category_count[category] += item.get("quantity", 0)
        
        # Time-based analysis
        transactions_by_hour = defaultdict(int)
        for transaction in transactions_copy:
            try:
                timestamp = datetime.fromisoformat(transaction.get("timestamp", "").replace("Z", "+00:00"))
                hour = timestamp.hour
                transactions_by_hour[hour] += 1
            except:
                pass
        
        # Discount analysis
        transactions_with_discount = sum(1 for d in discounts if d > 0)
        total_discounts_given = sum(discounts)
        avg_discount = mean([d for d in discounts if d > 0]) if transactions_with_discount > 0 else 0
        
        processing_time = (time.time() - start_time) * 1000
        
        analysis = {
            "summary": {
                "total_transactions": len(transactions_copy),
                "total_revenue": round(total_revenue, 2),
                "average_order_value": round(average_order_value, 2),
                "median_order_value": round(median_order_value, 2),
                "max_order_value": round(max_order, 2),
                "min_order_value": round(min_order, 2),
                "total_tax_collected": round(sum(taxes), 2),
                "total_discounts_given": round(total_discounts_given, 2)
            },
            "category_breakdown": {
                category: {
                    "revenue": round(revenue, 2),
                    "items_sold": category_count[category]
                }
                for category, revenue in category_revenue.items()
            },
            "discount_analysis": {
                "transactions_with_discount": transactions_with_discount,
                "discount_rate": round(transactions_with_discount / len(transactions_copy) * 100, 2) if transactions_copy else 0,
                "average_discount": round(avg_discount, 2),
                "total_discount_value": round(total_discounts_given, 2)
            },
            "time_analysis": {
                "peak_hour": max(transactions_by_hour.items(), key=lambda x: x[1])[0] if transactions_by_hour else None,
                "transactions_by_hour": dict(transactions_by_hour)
            },
            "processing_time_ms": round(processing_time, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        self.send_json_response(200, analysis)
    
    def prometheus_metrics(self):
        """Prometheus-compatible metrics endpoint"""
        service_name = self.config.get("service_name", "python-service")
        with self.lock:
            total_transactions = len(self.transactions)
        metrics = f"""# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{{service=\"{service_name}\",method=\"total\"}} {total_transactions}

# HELP http_request_duration_seconds Request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds{{service=\"{service_name}\",quantile=\"0.5\"}} 0.05
http_request_duration_seconds{{service=\"{service_name}\",quantile=\"0.95\"}} 0.1
http_request_duration_seconds{{service=\"{service_name}\",quantile=\"0.99\"}} 0.2

# HELP service_transactions_stored Total transactions stored
# TYPE service_transactions_stored counter
service_transactions_stored{{service=\"{service_name}\"}} {total_transactions}

# HELP service_up Service availability
# TYPE service_up gauge
service_up{{service=\"{service_name}\"}} 1
"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(metrics.encode('utf-8'))
    
    def generate_report(self):
        """Generate a comprehensive report"""
        with self.lock:
            transactions_copy = list(self.transactions)
        if not transactions_copy:
            self.send_error(404, "No transactions available for reporting")
            return
        
        totals = [t.get("total", 0) for t in transactions_copy]
        total_revenue = sum(totals)
        
        report = {
            "report_type": "transaction_analytics",
            "generated_at": datetime.now().isoformat(),
            "period": {
                "start": min([t.get("timestamp") for t in transactions_copy if t.get("timestamp")]),
                "end": max([t.get("timestamp") for t in transactions_copy if t.get("timestamp")])
            },
            "key_metrics": {
                "total_transactions": len(transactions_copy),
                "total_revenue": round(total_revenue, 2),
                "average_order_value": round(mean(totals), 2) if totals else 0,
                "revenue_per_transaction": round(total_revenue / len(transactions_copy), 2) if transactions_copy else 0
            },
            "recommendations": self._generate_recommendations(transactions_copy)
        }
        
        self.send_json_response(200, report)
    
    def _generate_recommendations(self, transactions: List[Dict]) -> List[str]:
        """Generate business recommendations based on data"""
        recommendations = []
        
        if not transactions:
            return ["No data available for recommendations"]
        
        totals = [t.get("total", 0) for t in transactions]
        avg_order = mean(totals) if totals else 0
        
        if avg_order < 50:
            recommendations.append("Average order value is low. Consider bundle deals or upselling.")
        
        discounts = [t.get("discount", 0) for t in transactions]
        discount_rate = sum(1 for d in discounts if d > 0) / len(transactions)
        
        if discount_rate > 0.5:
            recommendations.append("High discount usage detected. Review discount strategy.")
        
        recommendations.append(f"Total of {len(transactions)} transactions processed. System is performing well.")
        
        return recommendations
    
    def get_metrics(self):
        """Get service metrics"""
        with self.lock:
            transaction_count = len(self.transactions)
        metrics = {
            "service": self.config.get("service_name", "python-service"),
            "version": "1.0.0",
            "environment": self.config.get("environment", "development"),
            "transactions_stored": transaction_count,
            "status": "operational"
        }
        self.send_json_response(200, metrics)
    
    def send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))


def create_handler(config: Dict[str, str], state: Dict[str, Any]):
    """Factory function to create handler with config and shared state"""
    def handler(*args, **kwargs):
        return AnalyticsHandler(config, state, *args, **kwargs)
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

    state = {
        "transactions": [],
        "lock": threading.Lock()
    }
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create HTTP server
    handler = create_handler(config, state)
    server = HTTPServer(('0.0.0.0', port), handler)
    
    print(f"Starting {config['service_name']} on port {port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()


if __name__ == "__main__":
    main()
