# Multi-stage build for C++ application
# Stage 1: Build
FROM gcc:12-alpine AS builder

WORKDIR /app

# Copy source code
COPY main.cpp .

# Compile the application
# -std=c++17: Use C++17 standard
# -O3: Maximum optimization for performance
# -static: Static linking for smaller runtime image
RUN g++ -std=c++17 -O3 -static -o cpp-service main.cpp

# Stage 2: Runtime image
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/cpp-service .

# Expose port
EXPOSE 8083

# Run the application
CMD ["./cpp-service"]

