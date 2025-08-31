# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all application files
COPY . .

# Install Nginx for reverse proxy
RUN apk add --no-cache nginx

# Copy custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create data directory for cart.json
RUN mkdir -p /app/data

# Expose port 80 (Nginx will listen here)
EXPOSE 80

# Start Nginx and Node.js
CMD ["sh", "-c", "node server.js & nginx -g 'daemon off;'"]
