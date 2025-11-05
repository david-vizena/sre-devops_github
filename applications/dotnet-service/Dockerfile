# Multi-stage build for .NET application
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder

WORKDIR /app

# Copy project file
COPY *.csproj ./

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . ./

# Build the application
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine

WORKDIR /app

# Copy published application
COPY --from=builder /app/publish .

# Expose port
EXPOSE 8084

# Run the application
ENTRYPOINT ["dotnet", "dotnet-service.dll"]

