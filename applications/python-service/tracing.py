#!/usr/bin/env python3
"""
OpenTelemetry tracing initialization for Python service
"""

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.semantic_conventions.resource import ResourceAttributes

def init_tracing():
    """Initialize OpenTelemetry tracing"""
    # Get Jaeger collector URL from environment
    jaeger_host = os.getenv("JAEGER_COLLECTOR_HOST", "jaeger-query.monitoring.svc.cluster.local")
    jaeger_url = f"http://{jaeger_host}:4318/v1/traces"
    
    # Create resource with service information
    resource = Resource.create({
        ResourceAttributes.SERVICE_NAME: "python-service",
        ResourceAttributes.SERVICE_VERSION: "1.0.0",
    })
    
    # Create tracer provider
    tracer_provider = TracerProvider(resource=resource)
    
    # Create OTLP HTTP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=jaeger_url,
        insecure=True,
    )
    
    # Add span processor
    span_processor = BatchSpanProcessor(otlp_exporter)
    tracer_provider.add_span_processor(span_processor)
    
    # Set global tracer provider
    trace.set_tracer_provider(tracer_provider)
    
    print(f"OpenTelemetry tracing initialized for python-service (Jaeger: {jaeger_url})")
    
    return tracer_provider

