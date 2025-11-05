# Single-stage build (no dependencies needed currently)
FROM python:3.11-slim

WORKDIR /app

# Copy application code
COPY main.py .

# Make the script executable
RUN chmod +x main.py

# Expose the port
EXPOSE 8081

# Run the application
CMD ["python", "main.py"]

