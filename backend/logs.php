<?php
// BrahmnMitra — System Audit & Activity Logs Endpoint (Hostinger MySQL)

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

$logsFile = __DIR__ . "/logs/audit-trail.json";
$db = bm_get_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");

    if ($db) {
        try {
            $stmt = $db->query("
                SELECT log_id AS id, actor, category, action, details_json, ip_address AS ip, created_at AS timestamp
                FROM audit_logs
                ORDER BY id DESC
                LIMIT 200
            ");
            $rows = $stmt->fetchAll();
            $logs = [];
            foreach ($rows as $r) {
                $logs[] = [
                    'id' => $r['id'],
                    'actor' => $r['actor'],
                    'category' => $r['category'],
                    'action' => $r['action'],
                    'details' => json_decode($r['details_json'] ?? '""', true) ?: $r['details_json'],
                    'ip' => $r['ip'],
                    'timestamp' => $r['timestamp']
                ];
            }
            echo json_encode(["status" => "ok", "source" => "hostinger_mysql", "logs" => $logs], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (PDOException $e) {
            error_log("[BM_DB_LOGS_GET_ERROR] " . $e->getMessage());
        }
    }

    if (file_exists($logsFile)) {
        echo file_get_contents($logsFile);
    } else {
        echo json_encode(["status" => "ok", "source" => "json_fallback", "logs" => []], JSON_PRETTY_PRINT);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = file_get_contents("php://input");
    $req = json_decode($input, true) ?: $_POST;

    $logId = "log-" . microtime(true) . "-" . rand(100, 999);
    $actor = isset($req["actor"]) ? trim($req["actor"]) : "Admin Desk";
    $category = isset($req["category"]) ? trim($req["category"]) : "GENERAL";
    $action = isset($req["action"]) ? trim($req["action"]) : "ACTION_LOGGED";
    $details = isset($req["details"]) ? $req["details"] : "";
    $ip = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "127.0.0.1";

    $event = [
        "id" => $logId,
        "timestamp" => date("c"),
        "actor" => $actor,
        "category" => $category,
        "action" => $action,
        "details" => $details,
        "ip" => $ip
    ];

    if ($db) {
        try {
            $stmt = $db->prepare("
                INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address)
                VALUES (:lid, :actor, :cat, :action, :details, :ip)
            ");
            $stmt->execute([
                ':lid' => $logId,
                ':actor' => $actor,
                ':cat' => $category,
                ':action' => $action,
                ':details' => is_string($details) ? $details : json_encode($details),
                ':ip' => $ip
            ]);
        } catch (PDOException $e) {
            error_log("[BM_DB_LOGS_POST_ERROR] " . $e->getMessage());
        }
    }

    $data = ["status" => "ok", "logs" => []];
    if (file_exists($logsFile)) {
        $data = json_decode(file_get_contents($logsFile), true) ?: $data;
    }
    array_unshift($data["logs"], $event);

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
