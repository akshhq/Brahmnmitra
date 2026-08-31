<?php
// BrahmnMitra — 15-Day Retention Recycle Bin API (Hostinger MySQL)
// Allows Soft Delete, Item Restoration, Hard Delete, and 15-Day Auto-Purging

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

header("Content-Type: application/json; charset=utf-8");

$db = bm_get_db();
if (!$db) {
    echo json_encode([
        'ok' => false,
        'error' => 'Database connection unavailable',
        'items' => []
    ], JSON_PRETTY_PRINT);
    exit;
}

$action = isset($_GET['action']) ? trim($_GET['action']) : '';
if (empty($action) && isset($_POST['action'])) {
    $action = trim($_POST['action']);
}

$rawInput = file_get_contents("php://input");
$req = json_decode($rawInput, true) ?: $_POST;
if (empty($action) && isset($req['action'])) {
    $action = trim($req['action']);
}

const RETENTION_DAYS = 15;

/**
 * Automatically purge items deleted more than 15 days ago.
 */
function bm_purge_expired_recycle_bin($db)
{
    $purgeCutoff = date('Y-m-d H:i:s', strtotime('-' . RETENTION_DAYS . ' days'));
    $tables = ['catalog_items', 'enquiries', 'bookings', 'payments', 'users'];
    $totalPurged = 0;

    foreach ($tables as $tbl) {
        try {
            $stmt = $db->prepare("DELETE FROM `{$tbl}` WHERE `deleted_at` IS NOT NULL AND `deleted_at` < :cutoff");
            $stmt->execute([':cutoff' => $purgeCutoff]);
            $totalPurged += $stmt->rowCount();
        } catch (Exception $e) {
            error_log("[BM_RECYCLE_PURGE_ERROR] " . $e->getMessage());
        }
    }
    return $totalPurged;
}

// ---------------------------------------------------------
// 1. GET: Fetch all items in Recycle Bin (with 15-Day countdown)
// ---------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($action)) {
    // Run automated 15-day purge first
    $purged = bm_purge_expired_recycle_bin($db);

    $items = [];

    // A. Recycled Catalog Items (Packages, Hotels, Destinations)
    try {
        $stmt = $db->query("
            SELECT id, category, slug, name, region, destination, price, image, deleted_at, created_at
            FROM catalog_items
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        ");
        while ($row = $stmt->fetch()) {
            $deletedTs = strtotime($row['deleted_at']);
            $daysSince = (time() - $deletedTs) / 86400;
            $daysLeft = max(0, ceil(RETENTION_DAYS - $daysSince));

            $items[] = [
                'id' => (int)$row['id'],
                'identifier' => $row['slug'],
                'type' => $row['category'], // 'package', 'hotel', 'destination'
                'type_label' => ucfirst($row['category']),
                'title' => $row['name'],
                'meta' => ($row['destination'] ?: $row['region']) . ($row['price'] > 0 ? " · ₹" . number_format($row['price']) : ""),
                'image' => $row['image'] ?? 'assets/images/sample.webp',
                'deleted_at' => $row['deleted_at'],
                'expires_at' => date('Y-m-d H:i:s', $deletedTs + (RETENTION_DAYS * 86400)),
                'days_remaining' => $daysLeft,
                'status' => $daysLeft <= 2 ? 'expiring_soon' : 'retained'
            ];
        }
    } catch (Exception $e) {}

    // B. Recycled Enquiries / Leads
    try {
        $stmt = $db->query("
            SELECT id, name, email, phone, service, service_name, destination, message, deleted_at, created_at
            FROM enquiries
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        ");
        while ($row = $stmt->fetch()) {
            $deletedTs = strtotime($row['deleted_at']);
            $daysSince = (time() - $deletedTs) / 86400;
            $daysLeft = max(0, ceil(RETENTION_DAYS - $daysSince));

            $items[] = [
                'id' => (int)$row['id'],
                'identifier' => (string)$row['id'],
                'type' => 'lead',
                'type_label' => 'Customer Lead',
                'title' => $row['name'] . " (" . ($row['service_name'] ?: $row['service']) . ")",
                'meta' => $row['phone'] . " · " . $row['email'],
                'image' => 'assets/images/sample.webp',
                'deleted_at' => $row['deleted_at'],
                'expires_at' => date('Y-m-d H:i:s', $deletedTs + (RETENTION_DAYS * 86400)),
                'days_remaining' => $daysLeft,
                'status' => $daysLeft <= 2 ? 'expiring_soon' : 'retained'
            ];
        }
    } catch (Exception $e) {}

    // C. Recycled Bookings / Quotations
    try {
        $stmt = $db->query("
            SELECT id, booking_id, customer_name, trip_title, destination, total_amount, deleted_at, created_at
            FROM bookings
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        ");
        while ($row = $stmt->fetch()) {
            $deletedTs = strtotime($row['deleted_at']);
            $daysSince = (time() - $deletedTs) / 86400;
            $daysLeft = max(0, ceil(RETENTION_DAYS - $daysSince));

            $items[] = [
                'id' => (int)$row['id'],
                'identifier' => $row['booking_id'],
                'type' => 'booking',
                'type_label' => 'Booking / Quote',
                'title' => $row['trip_title'] . " — " . $row['customer_name'],
                'meta' => $row['booking_id'] . " · ₹" . number_format($row['total_amount']),
                'image' => 'assets/images/sample.webp',
                'deleted_at' => $row['deleted_at'],
                'expires_at' => date('Y-m-d H:i:s', $deletedTs + (RETENTION_DAYS * 86400)),
                'days_remaining' => $daysLeft,
                'status' => $daysLeft <= 2 ? 'expiring_soon' : 'retained'
            ];
        }
    } catch (Exception $e) {}

    // D. Recycled Payments
    try {
        $stmt = $db->query("
            SELECT id, transaction_id, booking_id, customer_name, amount, payment_method, deleted_at, created_at
            FROM payments
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        ");
        while ($row = $stmt->fetch()) {
            $deletedTs = strtotime($row['deleted_at']);
            $daysSince = (time() - $deletedTs) / 86400;
            $daysLeft = max(0, ceil(RETENTION_DAYS - $daysSince));

            $items[] = [
                'id' => (int)$row['id'],
                'identifier' => $row['transaction_id'],
                'type' => 'payment',
                'type_label' => 'Payment Ledger Entry',
                'title' => "Payment ₹" . number_format($row['amount']) . " (" . $row['customer_name'] . ")",
                'meta' => $row['transaction_id'] . " · " . $row['booking_id'] . " · " . $row['payment_method'],
                'image' => 'assets/images/sample.webp',
                'deleted_at' => $row['deleted_at'],
                'expires_at' => date('Y-m-d H:i:s', $deletedTs + (RETENTION_DAYS * 86400)),
                'days_remaining' => $daysLeft,
                'status' => $daysLeft <= 2 ? 'expiring_soon' : 'retained'
            ];
        }
    } catch (Exception $e) {}

    // Sort by deleted_at descending
    usort($items, function($a, $b) {
        return strtotime($b['deleted_at']) - strtotime($a['deleted_at']);
    });

    echo json_encode([
        'ok' => true,
        'retention_policy_days' => RETENTION_DAYS,
        'count' => count($items),
        'auto_purged_expired_count' => $purged,
        'items' => $items
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// ---------------------------------------------------------
// 2. POST: Soft Delete (Move to Recycle Bin)
// ---------------------------------------------------------
if ($action === 'soft_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = isset($req['type']) ? trim($req['type']) : '';
    $id = isset($req['id']) ? trim($req['id']) : '';

    if (empty($type) || empty($id)) {
        bm_respond(false, "Entity type and id/slug are required for soft deletion.", 422);
    }

    $affected = 0;
    try {
        if (in_array($type, ['package', 'hotel', 'destination', 'catalog'], true)) {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE catalog_items SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL")
                : $db->prepare("UPDATE catalog_items SET deleted_at = NOW() WHERE slug = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'lead' || $type === 'enquiry') {
            $stmt = $db->prepare("UPDATE enquiries SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'booking') {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE bookings SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL")
                : $db->prepare("UPDATE bookings SET deleted_at = NOW() WHERE booking_id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'payment') {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE payments SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL")
                : $db->prepare("UPDATE payments SET deleted_at = NOW() WHERE transaction_id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        }

        // Log audit event
        try {
            $logStmt = $db->prepare("INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address) VALUES (:lid, 'Admin Desk', 'RECYCLE_BIN', 'ITEM_SOFT_DELETED', :details, :ip)");
            $logStmt->execute([
                ':lid' => 'log-' . microtime(true),
                ':details' => json_encode(['type' => $type, 'id' => $id, 'retention' => '15_days']),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Exception $e) {}

        echo json_encode([
            'ok' => true,
            'message' => "Item moved to Recycle Bin (will be retained for 15 days).",
            'affected' => $affected,
            'retention_days' => RETENTION_DAYS
        ], JSON_PRETTY_PRINT);
        exit;
    } catch (PDOException $e) {
        bm_respond(false, "Database error while soft deleting: " . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------
// 3. POST: Restore Item from Recycle Bin
// ---------------------------------------------------------
if ($action === 'restore' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = isset($req['type']) ? trim($req['type']) : '';
    $id = isset($req['id']) ? trim($req['id']) : '';

    if (empty($type) || empty($id)) {
        bm_respond(false, "Entity type and id are required to restore.", 422);
    }

    $affected = 0;
    try {
        if (in_array($type, ['package', 'hotel', 'destination', 'catalog'], true)) {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE catalog_items SET deleted_at = NULL WHERE id = :id")
                : $db->prepare("UPDATE catalog_items SET deleted_at = NULL WHERE slug = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'lead' || $type === 'enquiry') {
            $stmt = $db->prepare("UPDATE enquiries SET deleted_at = NULL WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'booking') {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE bookings SET deleted_at = NULL WHERE id = :id")
                : $db->prepare("UPDATE bookings SET deleted_at = NULL WHERE booking_id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'payment') {
            $stmt = is_numeric($id)
                ? $db->prepare("UPDATE payments SET deleted_at = NULL WHERE id = :id")
                : $db->prepare("UPDATE payments SET deleted_at = NULL WHERE transaction_id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        }

        // Log audit event
        try {
            $logStmt = $db->prepare("INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address) VALUES (:lid, 'Admin Desk', 'RECYCLE_BIN', 'ITEM_RESTORED', :details, :ip)");
            $logStmt->execute([
                ':lid' => 'log-' . microtime(true),
                ':details' => json_encode(['type' => $type, 'id' => $id]),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Exception $e) {}

        echo json_encode([
            'ok' => true,
            'message' => "Item restored successfully.",
            'affected' => $affected
        ], JSON_PRETTY_PRINT);
        exit;
    } catch (PDOException $e) {
        bm_respond(false, "Database error while restoring: " . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------
// 4. POST: Hard Delete (Permanently Delete from Database)
// ---------------------------------------------------------
if ($action === 'hard_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = isset($req['type']) ? trim($req['type']) : '';
    $id = isset($req['id']) ? trim($req['id']) : '';

    if (empty($type) || empty($id)) {
        bm_respond(false, "Entity type and id are required for permanent deletion.", 422);
    }

    $affected = 0;
    try {
        if (in_array($type, ['package', 'hotel', 'destination', 'catalog'], true)) {
            $stmt = is_numeric($id)
                ? $db->prepare("DELETE FROM catalog_items WHERE id = :id")
                : $db->prepare("DELETE FROM catalog_items WHERE slug = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'lead' || $type === 'enquiry') {
            $stmt = $db->prepare("DELETE FROM enquiries WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'booking') {
            $stmt = is_numeric($id)
                ? $db->prepare("DELETE FROM bookings WHERE id = :id")
                : $db->prepare("DELETE FROM bookings WHERE booking_id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        } elseif ($type === 'payment') {
            $stmt = is_numeric($id)
                ? $db->prepare("DELETE FROM payments WHERE id = :id")
                : $db->prepare("DELETE FROM payments WHERE transaction_id = :id");
            $stmt->execute([':id' => $id]);
            $affected = $stmt->rowCount();
        }

        // Log audit event
        try {
            $logStmt = $db->prepare("INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address) VALUES (:lid, 'Admin Desk', 'RECYCLE_BIN', 'ITEM_HARD_DELETED', :details, :ip)");
            $logStmt->execute([
                ':lid' => 'log-' . microtime(true),
                ':details' => json_encode(['type' => $type, 'id' => $id]),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Exception $e) {}

        echo json_encode([
            'ok' => true,
            'message' => "Item permanently deleted from database.",
            'affected' => $affected
        ], JSON_PRETTY_PRINT);
        exit;
    } catch (PDOException $e) {
        bm_respond(false, "Database error while permanently deleting: " . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------
// 5. POST: Empty Recycle Bin (Permanently Purge All Recycled Items)
// ---------------------------------------------------------
if ($action === 'empty_bin' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $totalPurged = 0;
    $tables = ['catalog_items', 'enquiries', 'bookings', 'payments', 'users'];
    foreach ($tables as $tbl) {
        try {
            $stmt = $db->query("DELETE FROM `{$tbl}` WHERE `deleted_at` IS NOT NULL");
            $totalPurged += $stmt->rowCount();
        } catch (Exception $e) {}
    }

    // Log audit event
    try {
        $logStmt = $db->prepare("INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address) VALUES (:lid, 'Admin Desk', 'RECYCLE_BIN', 'RECYCLE_BIN_EMPTIED', :details, :ip)");
        $logStmt->execute([
            ':lid' => 'log-' . microtime(true),
            ':details' => json_encode(['purged_count' => $totalPurged]),
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch (Exception $e) {}

    echo json_encode([
        'ok' => true,
        'message' => "Recycle bin emptied successfully.",
        'purged_count' => $totalPurged
    ], JSON_PRETTY_PRINT);
    exit;
}

// ---------------------------------------------------------
// 6. POST: Purge Expired (>15 days)
// ---------------------------------------------------------
if ($action === 'purge_expired' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $purged = bm_purge_expired_recycle_bin($db);
    echo json_encode([
        'ok' => true,
        'message' => "Purged {$purged} expired item(s) exceeding 15 days retention.",
        'purged_count' => $purged
    ], JSON_PRETTY_PRINT);
    exit;
}

echo json_encode([
    'ok' => false,
    'error' => 'Invalid action or request method.',
    'endpoints' => [
        'GET /recycle_bin.php' => 'Fetch all items in recycle bin with days left countdown',
        'POST /recycle_bin.php?action=soft_delete' => 'Move item to recycle bin (15-day limit)',
        'POST /recycle_bin.php?action=restore' => 'Restore item to active database state',
        'POST /recycle_bin.php?action=hard_delete' => 'Permanently delete item from database',
        'POST /recycle_bin.php?action=empty_bin' => 'Purge all items in recycle bin',
        'POST /recycle_bin.php?action=purge_expired' => 'Purge items older than 15 days'
    ]
], JSON_PRETTY_PRINT);
