# Start from a PHP base image with Apache or Nginx
FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /var/www/html

# Copy your application files into the container
COPY . .

# Copy your custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Install composer dependencies
RUN composer install --no-interaction --no-plugins --no-scripts --prefer-dist --optimize-autoloader

# Give PHP-FPM the correct permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port 80
EXPOSE 80

# Start PHP-FPM and Nginx
CMD php-fpm & nginx -g "daemon off;"
