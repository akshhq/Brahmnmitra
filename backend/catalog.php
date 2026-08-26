<?php
// BrahmnMitra — Catalog & Inventory Management Endpoint

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";

bm_handle_cors();

$catalogFile = __DIR__ . "/../data/travel-catalog.json";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");
    if (file_exists($catalogFile)) {
        echo file_get_contents($catalogFile);
    } else {
        echo json_encode(["status" => "error", "message" => "Catalog file not found"], JSON_PRETTY_PRINT);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || !is_array($data)) {
        bm_respond(false, "Invalid JSON payload.", 400);
    }

    // Backup current catalog before overwriting
    if (file_exists($catalogFile)) {
        $backupDir = __DIR__ . "/logs";
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }
        @copy($catalogFile, $backupDir . "/catalog-backup-" . date("Ymd-His") . ".json");
    }

    $data["updated"] = date("Y-m-d H:i:s");
    $saved = @file_put_contents($catalogFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

    // Also sync to frontend-admin/data/travel-catalog.json if present
    $adminCatalogFile = __DIR__ . "/../frontend-admin/data/travel-catalog.json";
    if (file_exists(dirname($adminCatalogFile))) {
        @file_put_contents($adminCatalogFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    if ($saved !== false) {
        bm_respond(true, "Catalog updated successfully.", 200, ["updated" => $data["updated"]]);
    } else {
        bm_respond(false, "Failed to write catalog file. Please check permissions.", 500);
    }
}

bm_respond(false, "Method not allowed.", 405);
