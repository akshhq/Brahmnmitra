<?php
// BrahmnMitra — Backend Configuration

/**
 * Automatically load environment variables from .env file if present.
 */
function bm_load_env($filePath)
{
    if (!file_exists($filePath) || !is_readable($filePath)) {
        return;
    }
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Strip enclosing quotes if present
        if (preg_match('/^"([\s\S]*)"$/', $value, $m) || preg_match("/^'([\s\S]*)'$/", $value, $m)) {
            $value = $m[1];
        }

        if (!array_key_exists($key, $_ENV) && !array_key_exists($key, $_SERVER)) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

// Load backend/.env first, fallback to root .env
bm_load_env(dirname(__DIR__) . '/.env');
bm_load_env(dirname(__DIR__, 2) . '/.env');

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

// Database settings (Hostinger MySQL)
define("DB_HOST", bm_env("DB_HOST", "localhost"));
define("DB_PORT", (int) bm_env("DB_PORT", 3306));
define("DB_NAME", bm_env("DB_NAME", "u844555645_brahmnmitra"));
define("DB_USER", bm_env("DB_USER", "u844555645_brahmnmitra"));
define("DB_PASS", bm_env("DB_PASS", "Brahmnmitra@1234"));
define("DB_CHARSET", bm_env("DB_CHARSET", "utf8mb4"));

// Auth & Session settings
define("AUTH_SECRET", bm_env("AUTH_SECRET", "bm_sec_98f4a7c1e3b20d884615a9e012fa87cd31e7bb2"));
define("AUTH_TOKEN_TTL_HOURS", (int) bm_env("AUTH_TOKEN_TTL_HOURS", 72));

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
define("RATE_LIMIT_PER_HOUR", (int) bm_env("RATE_LIMIT_PER_HOUR", 30));
define("LOG_MAX_BYTES", (int) bm_env("LOG_MAX_BYTES", 2 * 1024 * 1024)); // 2MB limit
define("LOG_KEEP_DAYS", (int) bm_env("LOG_KEEP_DAYS", 180));

date_default_timezone_set(bm_env("TIMEZONE", "Asia/Kolkata"));

// Optional SMTP settings
define("SMTP_HOST", bm_env("SMTP_HOST", ""));
define("SMTP_PORT", (int) bm_env("SMTP_PORT", 587));
define("SMTP_SECURE", bm_env("SMTP_SECURE", "tls"));
define("SMTP_USERNAME", bm_env("SMTP_USERNAME", FROM_EMAIL));
define("SMTP_PASSWORD", bm_env("SMTP_PASSWORD", ""));
define("SMTP_DEBUG", (int) bm_env("SMTP_DEBUG", 0));

// CORS origin configuration
define("ALLOWED_ORIGIN", bm_env("ALLOWED_ORIGIN", "*"));
