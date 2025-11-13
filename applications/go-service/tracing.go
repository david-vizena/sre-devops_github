package main

import (
	"context"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initTracing() (*trace.TracerProvider, error) {
	ctx := context.Background()

	// Get Jaeger collector URL from environment
	// Jaeger accepts OTLP HTTP on port 4318 (default) or 14268 (legacy HTTP)
	jaegerHost := os.Getenv("JAEGER_COLLECTOR_HOST")
	if jaegerHost == "" {
		jaegerHost = "jaeger-query.monitoring.svc.cluster.local"
	}

	// Create OTLP HTTP exporter pointing to Jaeger collector
	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint("http://"+jaegerHost+":4318/v1/traces"),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	// Create resource with service information
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName("go-service"),
			semconv.ServiceVersion("1.0.0"),
		),
	)
	if err != nil {
		return nil, err
	}

	// Create trace provider
	tp := trace.NewTracerProvider(
		trace.WithBatcher(exporter),
		trace.WithResource(res),
		trace.WithSampler(trace.AlwaysSample()),
	)

	// Set global tracer provider
	otel.SetTracerProvider(tp)

	// Set global propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp, nil
}

