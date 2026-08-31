<?php
// BrahmnMitra — Enquiry Form & Leads Management Endpoint (Hostinger MySQL)
// Supports Public Form Ingestion, Admin Leads Retrieval, Updates, and 15-Day Soft Deletes

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";
require_once __DIR__ . "/includes/mailer.php";

bm_handle_cors();

$db = bm_get_db();

// ---------------------------------------------------------
// 1. GET: Fetch active leads for Admin Panel
// ---------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");

    if ($db) {
        try {
            $stmt = $db->query("
                SELECT id, name, phone, email, service, service_name, destination, travel_date, company, 
                       message, status, notes, assigned_to, created_at
                FROM enquiries
                WHERE deleted_at IS NULL
                ORDER BY id DESC
                LIMIT 300
            ");
            $leads = $stmt->fetchAll();
            echo json_encode(["status" => "ok", "source" => "hostinger_mysql", "leads" => $leads], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (PDOException $e) {
            error_log("[BM_DB_LEADS_GET_ERROR] " . $e->getMessage());
        }
    }

    echo json_encode(["status" => "ok", "source" => "empty_fallback", "leads" => []], JSON_PRETTY_PRINT);
    exit;
}

// ---------------------------------------------------------
// 2. POST: Handle Form Submissions or Admin Actions
// ---------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $rawInput = file_get_contents("php://input");
    $req = json_decode($rawInput, true) ?: $_POST;

    $action = isset($_GET["action"]) ? $_GET["action"] : ($req["action"] ?? "");

    // A. Update Lead Status / Notes / Assigned
    if ($action === "update_lead") {
        $id = isset($req["id"]) ? (int)$req["id"] : 0;
        $status = isset($req["status"]) ? trim($req["status"]) : "new";
        $notes = isset($req["notes"]) ? trim($req["notes"]) : "";

        if ($id <= 0) {
            bm_respond(false, "Valid Lead ID is required.", 422);
        }

        if ($db) {
            try {
                $stmt = $db->prepare("UPDATE enquiries SET status = :status, notes = :notes WHERE id = :id");
                $stmt->execute([':status' => $status, ':notes' => $notes, ':id' => $id]);
                echo json_encode(["ok" => true, "message" => "Lead updated successfully."], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }
        bm_respond(true, "Lead updated (offline mode)", 200);
    }

    // B. Soft Delete Lead (Move to Recycle Bin)
    if ($action === "delete_lead") {
        $id = isset($req["id"]) ? (int)$req["id"] : 0;
        if ($id <= 0) {
            bm_respond(false, "Valid Lead ID is required.", 422);
        }

        if ($db) {
            try {
                $stmt = $db->prepare("UPDATE enquiries SET deleted_at = NOW() WHERE id = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(["ok" => true, "message" => "Lead moved to Recycle Bin (15 days retention)"], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }
        bm_respond(true, "Lead removed", 200);
    }

    // C. Public Lead Ingestion
    if (bm_field("website") !== "") {
        bm_respond(true, "", 200);
    }

    $ip = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "unknown";

    if (bm_rate_limited($ip)) {
        bm_respond(false, "Too many enquiries from this connection. Please call us instead.", 429);
    }

    $name = bm_field("name", 100);
    $email = bm_field("email", 120);
    $phone = bm_field("phone", 20);
    $company = bm_field("company", 120);
    $service = bm_field("service", 40);
    $message = bm_text("message", 2000);
    $destination = bm_field("destination", 100);

    // Flight fields
    $trip = bm_field("trip_type", 20);
    $from = bm_field("from_city", 80);
    $to = bm_field("to_city", 80);
    $depart = bm_field("depart_date", 10);
    $return = bm_field("return_date", 10);
    $pax = max(1, min(99, (int) bm_field("passengers", 2)));
    $cabin = bm_field("cabin_class", 30);

    $referer = bm_field("page", 200);
    if ($referer === "" && isset($_SERVER["HTTP_REFERER"])) {
        $referer = bm_cut(str_replace(["\r", "\n"], "", $_SERVER["HTTP_REFERER"]), 200);
    }

    $SERVICES = bm_services();
    $TRIPS = bm_trip_types();
    $CABINS = bm_cabins();

    if ($name === "") bm_respond(false, "Please tell us your name.", 422);
    if ($phone === "") bm_respond(false, "Please give us a phone number.", 422);
    if (!bm_valid_phone($phone)) bm_respond(false, "That phone number does not look right.", 422);
    if ($email === "") bm_respond(false, "Please give us an email address.", 422);
    if (!bm_valid_email($email)) bm_respond(false, "That email address does not look right.", 422);
    if (!isset($SERVICES[$service])) bm_respond(false, "Please choose a service.", 422);

    $isFlight = ($service === "domestic_flights" || $service === "international_flights");
    if ($isFlight) {
        if ($from === "" || $to === "") bm_respond(false, "Please tell us where you are flying from and to.", 422);
        if (!bm_valid_date($depart)) bm_respond(false, "Please give us a valid departure date.", 422);
        if ($return !== "" && !bm_valid_date($return)) bm_respond(false, "That return date does not look right.", 422);
        if ($trip === "one_way") $return = "";
        if (!isset($TRIPS[$trip])) $trip = "round_trip";
        if (!isset($CABINS[$cabin])) $cabin = "economy";
    } else {
        $trip = $from = $to = $depart = $return = $cabin = "";
        $pax = 0;
    }

    $data = [
        "name" => $name,
        "email" => $email,
        "phone" => $phone,
        "company" => $company,
        "service" => $service,
        "service_label" => $SERVICES[$service],
        "destination" => $destination ?: ($to ?: ""),
        "message" => $message,
        "is_flight" => $isFlight,
        "trip" => $trip,
        "trip_label" => $isFlight && isset($TRIPS[$trip]) ? $TRIPS[$trip] : "",
        "from_city" => $from,
        "to_city" => $to,
        "depart_date" => $depart,
        "return_date" => $return,
        "passengers" => $pax,
        "cabin_label" => $isFlight && isset($CABINS[$cabin]) ? $CABINS[$cabin] : "",
        "ip" => $ip,
        "referer" => $referer,
    ];

    if ($db) {
        try {
            $travelDate = !empty($depart) && bm_valid_date($depart) ? $depart : null;
            $stmt = $db->prepare("
                INSERT INTO enquiries (name, phone, email, service, service_name, destination, travel_date, company, message, ip_address, status, deleted_at)
                VALUES (:name, :phone, :email, :service, :service_name, :destination, :travel_date, :company, :message, :ip, 'new', NULL)
            ");
            $stmt->execute([
                ':name' => $name,
                ':phone' => $phone,
                ':email' => $email,
                ':service' => $service,
                ':service_name' => $SERVICES[$service] ?? $service,
                ':destination' => $destination ?: ($to ?: null),
                ':travel_date' => $travelDate,
                ':company' => $company ?: null,
                ':message' => $message ?: null,
                ':ip' => $ip
            ]);
            $data["db_id"] = (int)$db->lastInsertId();
        } catch (PDOException $e) {
            error_log("[BM_DB_ENQUIRY_INSERT_ERROR] " . $e->getMessage());
        }
    }

    bm_log($data);

    if ($bm_mail_result = bm_send_enquiry($data)) {
        bm_respond(true, "", 200);
    }

    if (!empty($data["db_id"])) {
        bm_respond(true, "", 200);
    }

    bm_respond(false, "We could not submit your enquiry just now.", 500);
}

bm_respond(false, "Method not allowed.", 405);
