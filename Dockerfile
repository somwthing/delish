# Start from an Nginx base image
FROM nginx:alpine

# Set working directory
WORKDIR /var/www/html

# Copy your application files into the container
COPY . .

# Copy your custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
