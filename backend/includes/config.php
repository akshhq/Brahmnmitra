<?php
// BrahmnMitra — Backend Configuration

/**
 * Helper to safely fetch environment variables with fallback default.
 */
function bm_env($key, $default = '')
{
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }
    return $default;
}

// Mail recipient & sender settings
define("TO_EMAIL", bm_env("TO_EMAIL", "info@brahmnmitra.com"));
define("FROM_EMAIL", bm_env("FROM_EMAIL", "enquiry@brahmnmitra.com"));
define("FROM_NAME", bm_env("FROM_NAME", "BrahmnMitra Website"));

// Business details
define("BIZ_NAME", bm_env("BIZ_NAME", "BrahmnMitra"));
define("BIZ_PHONE", bm_env("BIZ_PHONE", "+91 92117 61885"));
define("BIZ_WA", bm_env("BIZ_WA", "919211761885"));
define("BIZ_EMAIL", bm_env("BIZ_EMAIL", "info@brahmnmitra.com"));
define("BIZ_CITY", bm_env("BIZ_CITY", "New Delhi, India"));

// Log settings & log rotation
define("LOG_FILE", bm_env("LOG_FILE", dirname(__DIR__) . "/logs/enquiries.log"));
define("RATE_LIMIT_PER_HOUR", (int) bm_env("RATE_LIMIT_PER_HOUR", 12));
define("LOG_MAX_BYTES", (int) bm_env("LOG_MAX_BYTES", 2 * 1024 * 1024)); // 2MB limit
define("LOG_KEEP_DAYS", (int) bm_env("LOG_KEEP_DAYS", 180));

date_default_timezone_set(bm_env("TIMEZONE", "Asia/Kolkata"));

// Optional SMTP settings (leave SMTP_HOST empty to use PHP mail())
define("SMTP_HOST", bm_env("SMTP_HOST", ""));
define("SMTP_PORT", (int) bm_env("SMTP_PORT", 587));
define("SMTP_SECURE", bm_env("SMTP_SECURE", "tls"));
define("SMTP_USERNAME", bm_env("SMTP_USERNAME", FROM_EMAIL));
define("SMTP_PASSWORD", bm_env("SMTP_PASSWORD", ""));
define("SMTP_DEBUG", (int) bm_env("SMTP_DEBUG", 0));

// CORS origin configuration
define("ALLOWED_ORIGIN", bm_env("ALLOWED_ORIGIN", "*"));
