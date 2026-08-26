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

echo json_encode([
    'status' => 'ok',
    'service' => 'brahmnmitra-backend',
    'version' => '1.0.0',
    'php_version' => PHP_VERSION,
    'timestamp' => date('c'),
    'endpoints' => [
        'health' => '/',
        'enquiry' => '/enquiry.php',
        'catalog' => '/catalog.php',
        'payments' => '/payments.php',
        'logs' => '/logs.php'
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
