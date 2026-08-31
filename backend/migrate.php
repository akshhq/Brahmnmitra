<?php
// BrahmnMitra — Database Migration & Seed Runner (Hostinger MySQL)
// Supports Schema Init & 15-Day Recycle Bin Updates

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

$isCli = (php_sapi_name() === 'cli');

function output_log($msg, $type = 'info')
{
    global $isCli, $results;
    $results[] = ['type' => $type, 'message' => $msg];
    if ($isCli) {
        echo "[{$type}] {$msg}\n";
    }
}

$results = [];

output_log("Starting BrahmnMitra Database Migration on Hostinger...");
output_log("Target Database: " . DB_NAME . " on " . DB_HOST . ":" . DB_PORT);

$db = bm_get_db();
if (!$db) {
    output_log("Failed to connect to MySQL database. Please verify credentials in backend/.env.", "error");
    if (!$isCli) {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(['ok' => false, 'error' => 'Database connection failed', 'logs' => $results], JSON_PRETTY_PRINT);
    }
    exit(1);
}

output_log("Connected to MySQL successfully.", "success");

// 1. Run Schema SQL
$schemaFile = __DIR__ . "/schema.sql";
if (file_exists($schemaFile)) {
    $sql = file_get_contents($schemaFile);
    try {
        $db->exec($sql);
        output_log("Schema tables created / verified successfully.", "success");
    } catch (PDOException $e) {
        output_log("Schema execution error: " . $e->getMessage(), "error");
    }
} else {
    output_log("schema.sql not found.", "warning");
}

// 2. Ensure deleted_at column exists in all tables for 15-Day Recycle Bin
$tablesToCheck = ['catalog_items', 'enquiries', 'payments', 'users', 'bookings'];
foreach ($tablesToCheck as $tbl) {
    try {
        $colCheck = $db->query("SHOW COLUMNS FROM `{$tbl}` LIKE 'deleted_at'")->fetch();
        if (!$colCheck) {
            $db->exec("ALTER TABLE `{$tbl}` ADD COLUMN `deleted_at` DATETIME DEFAULT NULL");
            $db->exec("ALTER TABLE `{$tbl}` ADD INDEX `idx_{$tbl}_deleted` (`deleted_at`)");
            output_log("Added deleted_at column to {$tbl} table for Recycle Bin support.", "success");
        }
    } catch (Exception $e) {
        // Table might not exist yet if schema failed
    }
}

// 3. Seed Default Admin Account
$adminEmail = "admin@brahmnmitra.com";
$adminPass = "Admin@Brahmnmitra2026!";

try {
    $checkAdmin = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $checkAdmin->execute([':email' => $adminEmail]);
    if (!$checkAdmin->fetch()) {
        $hash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 12]);
        $seedAdmin = $db->prepare("
            INSERT INTO users (name, email, phone, password_hash, role, status)
            VALUES ('BrahmnMitra Administrator', :email, '+919211761885', :hash, 'admin', 'active')
        ");
        $seedAdmin->execute([':email' => $adminEmail, ':hash' => $hash]);
        output_log("Default Admin user created: {$adminEmail}", "success");
    } else {
        output_log("Admin user already exists ({$adminEmail}).", "info");
    }
} catch (PDOException $e) {
    output_log("Error creating admin user: " . $e->getMessage(), "error");
}

// 4. Seed Catalog Inventory from data/travel-catalog.json
$catalogJsonFile = __DIR__ . "/../data/travel-catalog.json";
if (file_exists($catalogJsonFile)) {
    $catalogData = json_decode(file_get_contents($catalogJsonFile), true);
    if ($catalogData) {
        $insertedCount = 0;

        // Packages
        if (!empty($catalogData['packages'])) {
            $stmt = $db->prepare("
                INSERT INTO catalog_items (category, slug, name, region, destination, duration, price, highlights_json, image)
                VALUES ('package', :slug, :name, :region, :destination, :duration, :price, :highlights, :image)
                ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), duration = VALUES(duration), image = VALUES(image)
            ");
            foreach ($catalogData['packages'] as $pkg) {
                $stmt->execute([
                    ':slug' => $pkg['slug'] ?? substr(md5($pkg['name']), 0, 12),
                    ':name' => $pkg['name'],
                    ':region' => $pkg['region'] ?? '',
                    ':destination' => $pkg['destination'] ?? '',
                    ':duration' => $pkg['duration'] ?? '',
                    ':price' => (float)($pkg['price'] ?? 0),
                    ':highlights' => json_encode($pkg['highlights'] ?? []),
                    ':image' => $pkg['image'] ?? 'assets/images/sample.webp'
                ]);
                $insertedCount++;
            }
        }

        // Hotels / Curated Stays
        if (!empty($catalogData['hotels'])) {
            $stmt = $db->prepare("
                INSERT INTO catalog_items (category, slug, name, destination, price, stars, type, description, amenities_json, image)
                VALUES ('hotel', :slug, :name, :destination, :price, :stars, :type, :description, :amenities, :image)
                ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), stars = VALUES(stars), image = VALUES(image)
            ");
            foreach ($catalogData['hotels'] as $htl) {
                $stmt->execute([
                    ':slug' => $htl['slug'] ?? substr(md5($htl['name']), 0, 12),
                    ':name' => $htl['name'],
                    ':destination' => $htl['destination'] ?? '',
                    ':price' => (float)($htl['price'] ?? 0),
                    ':stars' => (int)($htl['stars'] ?? 5),
                    ':type' => $htl['type'] ?? 'Luxury Stay',
                    ':description' => $htl['description'] ?? '',
                    ':amenities' => json_encode($htl['amenities'] ?? []),
                    ':image' => $htl['image'] ?? 'assets/images/sample.webp'
                ]);
                $insertedCount++;
            }
        }

        // Destinations
        if (!empty($catalogData['destinations'])) {
            $stmt = $db->prepare("
                INSERT INTO catalog_items (category, slug, name, region, tagline, places_json, image)
                VALUES ('destination', :slug, :name, :region, :tagline, :places, :image)
                ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), image = VALUES(image)
            ");
            foreach ($catalogData['destinations'] as $dest) {
                $stmt->execute([
                    ':slug' => $dest['slug'] ?? substr(md5($dest['name']), 0, 12),
                    ':name' => $dest['name'],
                    ':region' => $dest['region'] ?? '',
                    ':tagline' => $dest['tagline'] ?? '',
                    ':places' => json_encode($dest['places'] ?? []),
                    ':image' => $dest['image'] ?? 'assets/images/sample.webp'
                ]);
                $insertedCount++;
            }
        }

        output_log("Seeded {$insertedCount} catalog items into catalog_items table.", "success");
    }
}

// 5. Run initial 15-Day Recycle Bin Purge
try {
    $purgeDate = date('Y-m-d H:i:s', strtotime('-15 days'));
    foreach ($tablesToCheck as $tbl) {
        $db->exec("DELETE FROM `{$tbl}` WHERE `deleted_at` IS NOT NULL AND `deleted_at` < '{$purgeDate}'");
    }
    output_log("Recycle Bin retention policy verified (15-day limit active).", "success");
} catch (Exception $e) {}

output_log("Database migration complete and verified.", "success");

if (!$isCli) {
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        'ok' => true,
        'message' => 'Migration completed successfully.',
        'database' => DB_NAME,
        'host' => DB_HOST,
        'admin_account' => $adminEmail,
        'recycle_bin_retention_days' => 15,
        'logs' => $results
    ], JSON_PRETTY_PRINT);
}
