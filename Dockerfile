# =========================
# File: Dockerfile
# Purpose: Build & run Node.js app with Nginx reverse proxy
# =========================

# Base image with Node.js
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Install Nginx for reverse proxy
RUN apk add --no-cache nginx

# Copy Nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Ensure data directory exists for cart.json
RUN mkdir -p /app/data \
    && chown -R node:node /app/data \
    && chmod -R 775 /app/data

# Expose HTTP
EXPOSE 80

# Healthcheck: ensures app is alive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Run Node.js + Nginx together
CMD ["sh", "-c", "node server.js & nginx -g 'daemon off;'"]
