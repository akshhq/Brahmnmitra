<?php
// BrahmnMitra — Backend API & Health Check Endpoint

// Handle CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed = getenv('ALLOWED_ORIGIN') ?: '*';

if ($allowed === '*') {
    header("Access-Control-Allow-Origin: *");
} else {
    $allowed_list = array_map('trim', explode(',', $allowed));
    if (in_array($origin, $allowed_list, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
    } else {
        header("Access-Control-Allow-Origin: " . $allowed_list[0]);
    }
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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
