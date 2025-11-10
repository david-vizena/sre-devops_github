# Single-stage build (no dependencies needed currently)
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY worker.py .

# Make the script executable
RUN chmod +x main.py
RUN chmod +x worker.py

# Expose the port
EXPOSE 8081

# Run the application
CMD ["python", "main.py"]

