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

var builder = WebApplication.CreateBuilder(args);

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
        service = "dotnet-service",
        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    };
    
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(response));
});

// Inventory check endpoint
app.MapPost("/api/v1/inventory/check", async context =>
{
    try
    {
        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();
        
        var request = JsonSerializer.Deserialize<InventoryCheckRequest>(body);
        
        if (request == null || request.Items == null || request.Items.Count == 0)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "Invalid request" }));
            return;
        }
        
        // Simulate inventory database lookup
        var inventory = new Dictionary<string, InventoryItem>
        {
            { "1", new InventoryItem { Id = "1", Name = "Laptop", Stock = 50, Reserved = 5 } },
            { "2", new InventoryItem { Id = "2", Name = "Mouse", Stock = 200, Reserved = 20 } },
            { "3", new InventoryItem { Id = "3", Name = "Keyboard", Stock = 150, Reserved = 10 } },
            { "4", new InventoryItem { Id = "4", Name = "Monitor", Stock = 75, Reserved = 8 } }
        };
        
        var results = new List<InventoryCheckResult>();
        var allAvailable = true;
        
        foreach (var item in request.Items)
        {
            if (inventory.TryGetValue(item.Id, out var invItem))
            {
                var available = invItem.Stock - invItem.Reserved;
                var canFulfill = available >= item.Quantity;
                allAvailable = allAvailable && canFulfill;
                
                results.Add(new InventoryCheckResult
                {
                    ItemId = item.Id,
                    ItemName = invItem.Name,
                    RequestedQuantity = item.Quantity,
                    AvailableStock = available,
                    CanFulfill = canFulfill,
                    StockLevel = available > 20 ? "sufficient" : available > 10 ? "low" : "critical"
                });
            }
            else
            {
                results.Add(new InventoryCheckResult
                {
                    ItemId = item.Id,
                    ItemName = "Unknown",
                    RequestedQuantity = item.Quantity,
                    AvailableStock = 0,
                    CanFulfill = false,
                    StockLevel = "not_found"
                });
                allAvailable = false;
            }
        }
        
        var response = new InventoryCheckResponse
        {
            AllItemsAvailable = allAvailable,
            Results = results,
            Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
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

// Service stats endpoint
app.MapGet("/api/v1/stats", async context =>
{
    var stats = new
    {
        service = "dotnet-service",
        version = "1.0.0",
        status = "operational",
        environment = Environment.GetEnvironmentVariable("ENVIRONMENT") ?? "development",
        checks_performed = 0
    };
    
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(stats));
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "8084";
app.Urls.Add($"http://0.0.0.0:{port}");

app.Run();

// Data models
public class InventoryCheckRequest
{
    public List<InventoryItemRequest> Items { get; set; } = new();
}

public class InventoryItemRequest
{
    public string Id { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class InventoryItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int Reserved { get; set; }
}

public class InventoryCheckResult
{
    public string ItemId { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int RequestedQuantity { get; set; }
    public int AvailableStock { get; set; }
    public bool CanFulfill { get; set; }
    public string StockLevel { get; set; } = string.Empty;
}

public class InventoryCheckResponse
{
    public bool AllItemsAvailable { get; set; }
    public List<InventoryCheckResult> Results { get; set; } = new();
    public string Timestamp { get; set; } = string.Empty;
}

