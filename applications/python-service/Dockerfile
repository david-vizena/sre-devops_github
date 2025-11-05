# Multi-stage build for optimized Python Docker image
# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements
COPY requirements.txt .
# Install dependencies (if any)
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime image
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY main.py .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Make the script executable
RUN chmod +x main.py

# Expose the port
EXPOSE 8081

# Run the application
CMD ["python", "main.py"]

