<?php
// BrahmnMitra — Backend API & Health Check Endpoint

// Handle CORS
$origin_raw = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
$origin_clean = rtrim($origin_raw, '/');
$allowed = getenv('ALLOWED_ORIGIN') ?: '*';

if ($allowed === '*' || empty($origin_raw)) {
    header("Access-Control-Allow-Origin: *");
} else {
    $allowed_list = array_map(function ($item) {
        return rtrim(trim($item), '/');
    }, explode(',', $allowed));
    $allowed_list = array_values(array_filter($allowed_list));

    $origin_host = parse_url($origin_raw, PHP_URL_HOST);
    $is_allowed = in_array($origin_clean, $allowed_list, true);

    // Allow any subdomain of brahmnmitra.com, imperioncapitals.com, onrender.com, or local development
    if (!$is_allowed && !empty($origin_host)) {
        if (
            preg_match('/(^|\.)brahmnmitra\.com$/i', $origin_host) ||
            preg_match('/(^|\.)imperioncapitals\.com$/i', $origin_host) ||
            preg_match('/(^|\.)onrender\.com$/i', $origin_host) ||
            $origin_host === 'localhost' ||
            $origin_host === '127.0.0.1'
        ) {
            $is_allowed = true;
        }
    }

    if ($is_allowed) {
        header("Access-Control-Allow-Origin: " . $origin_raw);
        header("Vary: Origin");
    } elseif (!empty($allowed_list)) {
        header("Access-Control-Allow-Origin: " . $allowed_list[0]);
    } else {
        header("Access-Control-Allow-Origin: *");
    }
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, Authorization, X-Custom-Header");
header("Access-Control-Max-Age: 86400");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

http_response_code(200);
header('Content-Type: application/json; charset=utf-8');

$dbAvailable = false;
try {
    if (file_exists(__DIR__ . '/includes/config.php') && file_exists(__DIR__ . '/includes/db.php')) {
        if (!defined('BM_OK')) {
            define('BM_OK', true);
        }
        require_once __DIR__ . '/includes/config.php';
        require_once __DIR__ . '/includes/db.php';
        $dbAvailable = bm_db_is_available();
    }
} catch (Throwable $e) {
    $dbAvailable = false;
}

echo json_encode([
    'status' => 'ok',
    'service' => 'brahmnmitra-backend',
    'version' => '2.0.0',
    'php_version' => PHP_VERSION,
    'database' => [
        'configured_db' => defined('DB_NAME') ? DB_NAME : 'u844555645_brahmnmitra',
        'host' => defined('DB_HOST') ? DB_HOST : 'localhost',
        'connected' => $dbAvailable
    ],
    'timestamp' => date('c'),
    'endpoints' => [
        'health' => '/',
        'auth' => '/auth.php',
        'enquiry' => '/enquiry.php',
        'catalog' => '/catalog.php',
        'bookings' => '/bookings.php',
        'payments' => '/payments.php',
        'logs' => '/logs.php',
        'recycle_bin' => '/recycle_bin.php',
        'migration' => '/migrate.php'
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

