<?php
// BrahmnMitra — System Audit & Activity Logs Endpoint

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";

bm_handle_cors();

$logsFile = __DIR__ . "/logs/audit-trail.json";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");
    if (file_exists($logsFile)) {
        echo file_get_contents($logsFile);
    } else {
        echo json_encode(["status" => "ok", "logs" => []], JSON_PRETTY_PRINT);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = file_get_contents("php://input");
    $req = json_decode($input, true) ?: $_POST;

    $event = [
        "id" => "log-" . microtime(true) . "-" . rand(100, 999),
        "timestamp" => date("c"),
        "actor" => isset($req["actor"]) ? trim($req["actor"]) : "Admin Desk",
        "category" => isset($req["category"]) ? trim($req["category"]) : "GENERAL",
        "action" => isset($req["action"]) ? trim($req["action"]) : "ACTION_LOGGED",
        "details" => isset($req["details"]) ? $req["details"] : "",
        "ip" => isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "127.0.0.1"
    ];

    $data = ["status" => "ok", "logs" => []];
    if (file_exists($logsFile)) {
        $data = json_decode(file_get_contents($logsFile), true) ?: $data;
    }
    array_unshift($data["logs"], $event);

    // Keep last 1000 logs
    if (count($data["logs"]) > 1000) {
        $data["logs"] = array_slice($data["logs"], 0, 1000);
    }

    $dir = dirname($logsFile);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    @file_put_contents($logsFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["status" => "ok", "event" => $event], JSON_PRETTY_PRINT);
    exit;
}

bm_respond(false, "Method not allowed.", 405);
