<?php
// BrahmnMitra — Backend Configuration

// Mail recipient & sender settings
define("TO_EMAIL", "info@brahmnmitra.com");
define("FROM_EMAIL", "enquiry@brahmnmitra.com");
define("FROM_NAME", "BrahmnMitra Website");

// Business details
define("BIZ_NAME", "BrahmnMitra");
define("BIZ_PHONE", "+91 92117 61885");
define("BIZ_WA", "919211761885");
define("BIZ_EMAIL", "info@brahmnmitra.com");
define("BIZ_CITY", "New Delhi, India");

// Log settings & log rotation
define("LOG_FILE", dirname(__DIR__) . "/logs/enquiries.log");
define("RATE_LIMIT_PER_HOUR", 12);
define("LOG_MAX_BYTES", 2 * 1024 * 1024); // 2MB limit
define("LOG_KEEP_DAYS", 180);

date_default_timezone_set("Asia/Kolkata");

// Optional SMTP settings (leave SMTP_HOST empty to use PHP mail())
define("SMTP_HOST", "");
define("SMTP_PORT", 587);
define("SMTP_SECURE", "tls");
define("SMTP_USERNAME", FROM_EMAIL);
define("SMTP_PASSWORD", "");
define("SMTP_DEBUG", 0);

