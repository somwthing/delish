# ================================
# File: Dockerfile
# Purpose: Build Node.js app with Nginx reverse proxy
# ================================

# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy all application files
COPY . .

# Install Nginx for reverse proxy
RUN apk add --no-cache nginx

# Copy custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create data directory for cart.json
RUN mkdir -p /app/data \
    && chown -R node:node /app/data \
    && chmod -R 775 /app/data

# Expose only port 80 (Nginx will listen here)
EXPOSE 80

# Start Node.js and Nginx
# Run Node in background, then replace shell with Nginx
CMD ["sh", "-c", "node server.js & exec nginx -g 'daemon off;'"]

# Add to end of Dockerfile (before CMD)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
