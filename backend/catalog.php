<?php
// BrahmnMitra — Catalog & Inventory Management Endpoint (Hostinger MySQL)
// Supports Item CRUD, Active Inventory Queries, and 15-Day Soft Deletion

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

$catalogFile = file_exists(__DIR__ . "/data/travel-catalog.json") 
    ? (__DIR__ . "/data/travel-catalog.json") 
    : (file_exists(__DIR__ . "/../data/travel-catalog.json") ? (__DIR__ . "/../data/travel-catalog.json") : (__DIR__ . "/travel-catalog.json"));
$db = bm_get_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");

    if ($db) {
        try {
            $stmt = $db->query("
                SELECT category, slug, name, region, destination, duration, price, stars, type, tagline, description, 
                       highlights_json, amenities_json, places_json, image, is_active
                FROM catalog_items
                WHERE is_active = 1 AND deleted_at IS NULL
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
    $data = json_decode($input, true) ?: $_POST;

    $action = isset($_GET["action"]) ? $_GET["action"] : ($data["action"] ?? "save_all");

    // 1. Soft Delete Single Item (Move to Recycle Bin)
    if ($action === "delete_item") {
        $category = isset($data["category"]) ? trim($data["category"]) : "";
        $slug = isset($data["slug"]) ? trim($data["slug"]) : "";

        if (empty($slug)) {
            bm_respond(false, "Item slug is required.", 422);
        }

        if ($db) {
            try {
                $stmt = $db->prepare("UPDATE catalog_items SET deleted_at = NOW() WHERE slug = :slug");
                $stmt->execute([':slug' => $slug]);
                echo json_encode([
                    "ok" => true,
                    "message" => "Item moved to Recycle Bin (15-day retention policy active)."
                ], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }
        bm_respond(true, "Item deleted (offline mode)", 200);
    }

    // 2. Save / Update Single Item
    if ($action === "save_item") {
        $category = isset($data["category"]) ? trim($data["category"]) : "package";
        $slug = isset($data["slug"]) ? trim($data["slug"]) : substr(md5(microtime()), 0, 10);
        $name = isset($data["name"]) ? trim($data["name"]) : "New Item";
        $region = isset($data["region"]) ? trim($data["region"]) : "";
        $destination = isset($data["destination"]) ? trim($data["destination"]) : "";
        $duration = isset($data["duration"]) ? trim($data["duration"]) : "";
        $price = isset($data["price"]) ? (float)$data["price"] : 0;
        $stars = isset($data["stars"]) ? (int)$data["stars"] : 5;
        $type = isset($data["type"]) ? trim($data["type"]) : "";
        $tagline = isset($data["tagline"]) ? trim($data["tagline"]) : "";
        $description = isset($data["description"]) ? trim($data["description"]) : "";
        $image = isset($data["image"]) ? trim($data["image"]) : "assets/images/sample.webp";
        $highlights = isset($data["highlights"]) ? (is_array($data["highlights"]) ? $data["highlights"] : explode("\n", $data["highlights"])) : [];
        $amenities = isset($data["amenities"]) ? (is_array($data["amenities"]) ? $data["amenities"] : explode("\n", $data["amenities"])) : [];
        $places = isset($data["places"]) ? (is_array($data["places"]) ? $data["places"] : explode("\n", $data["places"])) : [];

        if ($db) {
            try {
                $stmt = $db->prepare("
                    INSERT INTO catalog_items (category, slug, name, region, destination, duration, price, stars, type, tagline, description, highlights_json, amenities_json, places_json, image, deleted_at, is_active)
                    VALUES (:cat, :slug, :name, :reg, :dest, :dur, :price, :stars, :type, :tagline, :desc, :high, :amen, :places, :img, NULL, 1)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        region = VALUES(region),
                        destination = VALUES(destination),
                        duration = VALUES(duration),
                        price = VALUES(price),
                        stars = VALUES(stars),
                        type = VALUES(type),
                        tagline = VALUES(tagline),
                        description = VALUES(description),
                        highlights_json = VALUES(highlights_json),
                        amenities_json = VALUES(amenities_json),
                        places_json = VALUES(places_json),
                        image = VALUES(image),
                        deleted_at = NULL,
                        is_active = 1,
                        updated_at = NOW()
                ");
                $stmt->execute([
                    ':cat' => $category,
                    ':slug' => $slug,
                    ':name' => $name,
                    ':reg' => $region,
                    ':dest' => $destination,
                    ':dur' => $duration,
                    ':price' => $price,
                    ':stars' => $stars,
                    ':type' => $type,
                    ':tagline' => $tagline,
                    ':desc' => $description,
                    ':high' => json_encode(array_values(array_filter($highlights))),
                    ':amen' => json_encode(array_values(array_filter($amenities))),
                    ':places' => json_encode(array_values(array_filter($places))),
                    ':img' => $image
                ]);

                echo json_encode([
                    "ok" => true,
                    "message" => "Catalog item saved successfully to database.",
                    "slug" => $slug
                ], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }

        bm_respond(true, "Catalog item saved (offline mode)", 200, ["slug" => $slug]);
    }

    // 3. Bulk Save
    if (!$data || !is_array($data)) {
        bm_respond(false, "Invalid JSON payload.", 400);
    }

    $updatedTime = date("Y-m-d H:i:s");

    if ($db) {
        try {
            // Packages
            if (isset($data['packages']) && is_array($data['packages'])) {
                $stmt = $db->prepare("
                    INSERT INTO catalog_items (category, slug, name, region, destination, duration, price, highlights_json, image, deleted_at)
                    VALUES ('package', :slug, :name, :region, :destination, :duration, :price, :highlights, :image, NULL)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), duration = VALUES(duration), image = VALUES(image), deleted_at = NULL, updated_at = NOW()
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
                    INSERT INTO catalog_items (category, slug, name, destination, price, stars, type, description, amenities_json, image, deleted_at)
                    VALUES ('hotel', :slug, :name, :destination, :price, :stars, :type, :description, :amenities, :image, NULL)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), stars = VALUES(stars), image = VALUES(image), deleted_at = NULL, updated_at = NOW()
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
                    INSERT INTO catalog_items (category, slug, name, region, tagline, places_json, image, deleted_at)
                    VALUES ('destination', :slug, :name, :region, :tagline, :places, :image, NULL)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), image = VALUES(image), deleted_at = NULL, updated_at = NOW()
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
