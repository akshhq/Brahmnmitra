<?php
// BrahmnMitra — Catalog & Inventory Management Endpoint (Hostinger MySQL)

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

$catalogFile = __DIR__ . "/../data/travel-catalog.json";
$db = bm_get_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");

    if ($db) {
        try {
            $stmt = $db->query("
                SELECT category, slug, name, region, destination, duration, price, stars, type, tagline, description, 
                       highlights_json, amenities_json, places_json, image, is_active
                FROM catalog_items
                WHERE is_active = 1
                ORDER BY id ASC
            ");
            $rows = $stmt->fetchAll();

            if (!empty($rows)) {
                $packages = [];
                $hotels = [];
                $destinations = [];

                foreach ($rows as $r) {
                    $cat = $r['category'];
                    if ($cat === 'package') {
                        $packages[] = [
                            'slug' => $r['slug'],
                            'name' => $r['name'],
                            'region' => $r['region'],
                            'destination' => $r['destination'],
                            'duration' => $r['duration'],
                            'price' => (float)$r['price'],
                            'highlights' => json_decode($r['highlights_json'] ?? '[]', true) ?: [],
                            'image' => $r['image']
                        ];
                    } elseif ($cat === 'hotel') {
                        $hotels[] = [
                            'slug' => $r['slug'],
                            'name' => $r['name'],
                            'destination' => $r['destination'],
                            'price' => (float)$r['price'],
                            'stars' => (int)$r['stars'],
                            'type' => $r['type'],
                            'description' => $r['description'],
                            'amenities' => json_decode($r['amenities_json'] ?? '[]', true) ?: [],
                            'image' => $r['image']
                        ];
                    } elseif ($cat === 'destination') {
                        $destinations[] = [
                            'slug' => $r['slug'],
                            'name' => $r['name'],
                            'region' => $r['region'],
                            'tagline' => $r['tagline'],
                            'places' => json_decode($r['places_json'] ?? '[]', true) ?: [],
                            'image' => $r['image']
                        ];
                    }
                }

                echo json_encode([
                    "updated" => date("Y-m-d H:i:s"),
                    "source" => "hostinger_mysql",
                    "packages" => $packages,
                    "hotels" => $hotels,
                    "destinations" => $destinations
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        } catch (PDOException $e) {
            error_log("[BM_DB_CATALOG_GET_ERROR] " . $e->getMessage());
        }
    }

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

    $updatedTime = date("Y-m-d H:i:s");

    // Persist to MySQL if available
    if ($db) {
        try {
            // Packages
            if (isset($data['packages']) && is_array($data['packages'])) {
                $stmt = $db->prepare("
                    INSERT INTO catalog_items (category, slug, name, region, destination, duration, price, highlights_json, image)
                    VALUES ('package', :slug, :name, :region, :destination, :duration, :price, :highlights, :image)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), duration = VALUES(duration), image = VALUES(image), updated_at = NOW()
                ");
                foreach ($data['packages'] as $pkg) {
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
                }
            }

            // Hotels
            if (isset($data['hotels']) && is_array($data['hotels'])) {
                $stmt = $db->prepare("
                    INSERT INTO catalog_items (category, slug, name, destination, price, stars, type, description, amenities_json, image)
                    VALUES ('hotel', :slug, :name, :destination, :price, :stars, :type, :description, :amenities, :image)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), stars = VALUES(stars), image = VALUES(image), updated_at = NOW()
                ");
                foreach ($data['hotels'] as $htl) {
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
                }
            }

            // Destinations
            if (isset($data['destinations']) && is_array($data['destinations'])) {
                $stmt = $db->prepare("
                    INSERT INTO catalog_items (category, slug, name, region, tagline, places_json, image)
                    VALUES ('destination', :slug, :name, :region, :tagline, :places, :image)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), image = VALUES(image), updated_at = NOW()
                ");
                foreach ($data['destinations'] as $dest) {
                    $stmt->execute([
                        ':slug' => $dest['slug'] ?? substr(md5($dest['name']), 0, 12),
                        ':name' => $dest['name'],
                        ':region' => $dest['region'] ?? '',
                        ':tagline' => $dest['tagline'] ?? '',
                        ':places' => json_encode($dest['places'] ?? []),
                        ':image' => $dest['image'] ?? 'assets/images/sample.webp'
                    ]);
                }
            }
        } catch (PDOException $e) {
            error_log("[BM_DB_CATALOG_POST_ERROR] " . $e->getMessage());
        }
    }

    // Backup current catalog file before overwriting
    if (file_exists($catalogFile)) {
        $backupDir = __DIR__ . "/logs";
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }
        @copy($catalogFile, $backupDir . "/catalog-backup-" . date("Ymd-His") . ".json");
    }

    $data["updated"] = $updatedTime;
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
