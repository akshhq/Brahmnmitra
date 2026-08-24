#!/bin/sh
set -e

# Render passes PORT dynamically (default to 80 if not set)
PORT="${PORT:-80}"

# Configure Apache port binding dynamically
sed -i "s/Listen [0-9]*/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Ensure logs directory and archive exist and have www-data ownership
mkdir -p /var/www/html/logs/archive
chown -R www-data:www-data /var/www/html/logs
chmod -R 755 /var/www/html/logs

# Start Apache in the foreground
exec apache2-foreground
