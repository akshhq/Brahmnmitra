<?php
// BrahmnMitra — Backend API & Health Check Endpoint

// Handle CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
$allowed = getenv('ALLOWED_ORIGIN') ?: '*';

if ($allowed === '*') {
    header("Access-Control-Allow-Origin: *");
} else {
    $allowed_list = array_filter(array_map('trim', explode(',', $allowed)));
    if (!empty($origin) && in_array($origin, $allowed_list, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
    } elseif (!empty($allowed_list)) {
        header("Access-Control-Allow-Origin: " . reset($allowed_list));
    } else {
        header("Access-Control-Allow-Origin: *");
    }
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, Authorization");
header("Access-Control-Max-Age: 86400");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

http_response_code(200);
header('Content-Type: application/json; charset=utf-8');

$dbAvailable = false;
if (file_exists(__DIR__ . '/includes/config.php') && file_exists(__DIR__ . '/includes/db.php')) {
    define('BM_OK', true);
    require_once __DIR__ . '/includes/config.php';
    require_once __DIR__ . '/includes/db.php';
    $dbAvailable = bm_db_is_available();
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
        'payments' => '/payments.php',
        'logs' => '/logs.php',
        'migration' => '/migrate.php'
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

