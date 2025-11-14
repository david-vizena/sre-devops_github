FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 8085

# Start application
CMD ["node", "server.js"]

