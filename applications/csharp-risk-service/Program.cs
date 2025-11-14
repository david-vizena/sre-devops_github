using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Threading.Tasks;
using System.Text;
using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;
using OpenTelemetry.Exporter;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry tracing
var jaegerHost = Environment.GetEnvironmentVariable("JAEGER_COLLECTOR_HOST") ?? "jaeger-query.monitoring.svc.cluster.local";
var jaegerUrl = $"http://{jaegerHost}:4318/v1/traces";

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: "csharp-risk-service", serviceVersion: "1.0.0"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri(jaegerUrl);
        }));

// Configure services
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseRouting();

// Health check endpoint
app.MapGet("/health", async context =>
{
    var response = new
    {
        status = "healthy",
        service = "csharp-risk-service",
        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    };
    
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(response));
});

// Risk calculation endpoint
app.MapPost("/api/v1/calculate", async context =>
{
    try
    {
        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();
        
        var request = JsonSerializer.Deserialize<RiskCalculationRequest>(body);
        
        if (request == null)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "Invalid request" }));
            return;
        }
        
        // Start timing for performance measurement
        var stopwatch = Stopwatch.StartNew();
        
        // High-performance risk calculation algorithm
        // Risk factors:
        // 1. Amount-based risk (logarithmic scale)
        var amountRisk = Math.Log10(Math.Max(request.Amount, 1.0)) / 6.0; // Normalize to 0-1
        amountRisk = Math.Max(0.0, Math.Min(1.0, amountRisk));
        
        // 2. Customer score risk (inverse relationship)
        var scoreRisk = 1.0 - (request.CustomerScore / 1000.0);
        scoreRisk = Math.Max(0.0, Math.Min(1.0, scoreRisk));
        
        // 3. Transaction frequency risk
        var frequencyRisk = 1.0 - Math.Exp(-request.TransactionCount / 10.0);
        frequencyRisk = Math.Max(0.0, Math.Min(1.0, frequencyRisk));
        
        // Weighted risk calculation
        var totalRisk = (amountRisk * 0.4) + (scoreRisk * 0.4) + (frequencyRisk * 0.2);
        totalRisk = Math.Max(0.0, Math.Min(1.0, totalRisk));
        
        // Risk level categorization
        var riskLevel = totalRisk < 0.3 ? "low" : totalRisk < 0.7 ? "medium" : "high";
        
        stopwatch.Stop();
        
        var response = new RiskCalculationResponse
        {
            RiskScore = totalRisk,
            RiskLevel = riskLevel,
            AmountRisk = amountRisk,
            ScoreRisk = scoreRisk,
            FrequencyRisk = frequencyRisk,
            ProcessingTimeUs = stopwatch.Elapsed.TotalMicroseconds,
            Recommendation = totalRisk > 0.7 ? "review_required" : "approve"
        };
        
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true }));
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = ex.Message }));
    }
});

// Prometheus metrics endpoint
app.MapGet("/metrics", async context =>
{
    var metrics = $@"# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{{service=""csharp-risk-service"",method=""total""}} 0

# HELP http_request_duration_seconds Request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds{{service=""csharp-risk-service"",quantile=""0.5""}} 0.05
http_request_duration_seconds{{service=""csharp-risk-service"",quantile=""0.95""}} 0.1
http_request_duration_seconds{{service=""csharp-risk-service"",quantile=""0.99""}} 0.2

# HELP service_risk_calculations_total Total risk calculations performed
# TYPE service_risk_calculations_total counter
service_risk_calculations_total{{service=""csharp-risk-service""}} 0

# HELP service_up Service availability
# TYPE service_up gauge
service_up{{service=""csharp-risk-service""}} 1
";
    
    context.Response.ContentType = "text/plain";
    await context.Response.WriteAsync(metrics);
});

// Service stats endpoint
app.MapGet("/api/v1/stats", async context =>
{
    var stats = new
    {
        service = "csharp-risk-service",
        version = "1.0.0",
        status = "operational",
        calculations_performed = 0
    };
    
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(stats));
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "8083";
app.Urls.Add($"http://0.0.0.0:{port}");

app.Run();

// Data models
public class RiskCalculationRequest
{
    public double Amount { get; set; }
    public double CustomerScore { get; set; }
    public int TransactionCount { get; set; }
}

public class RiskCalculationResponse
{
    public double RiskScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public double AmountRisk { get; set; }
    public double ScoreRisk { get; set; }
    public double FrequencyRisk { get; set; }
    public double ProcessingTimeUs { get; set; }
    public string Recommendation { get; set; } = string.Empty;
}

