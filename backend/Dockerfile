# BrahmnMitra Backend Dockerfile (Optimized for Render & Cloud Hosting)
FROM php:8.2-apache

# Enable Apache mod_rewrite and mod_headers for routing, security, and CORS
RUN a2enmod rewrite headers

# Configure Apache Directory permissions to allow .htaccess overrides
RUN sed -ri -e 's!/var/www/html!/var/www/html!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!/var/www/html!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && echo '<Directory /var/www/html/>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/override.conf \
    && a2enconf override

# Set working directory
WORKDIR /var/www/html

# Copy backend files into container
COPY . /var/www/html/

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Ensure logs directory exists with appropriate permissions for PHP/Apache www-data user
RUN mkdir -p /var/www/html/logs/archive \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/logs

# Default port (Render overrides this with $PORT dynamically)
ENV PORT=80
EXPOSE 80

# Use dynamic entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
