<?php
// BrahmnMitra — Bookings & Quotations Management Endpoint (Hostinger MySQL)

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

header("Content-Type: application/json; charset=utf-8");

$db = bm_get_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    if ($db) {
        try {
            $stmt = $db->query("
                SELECT id, booking_id, customer_name, customer_email, customer_phone, trip_title, destination, 
                       travel_date, passengers, total_amount, paid_amount, status, notes, details_json, created_at, updated_at
                FROM bookings
                WHERE deleted_at IS NULL
                ORDER BY id DESC
                LIMIT 200
            ");
            $bookings = $stmt->fetchAll();
            echo json_encode(["status" => "ok", "source" => "hostinger_mysql", "bookings" => $bookings], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (PDOException $e) {
            error_log("[BM_DB_BOOKINGS_GET_ERROR] " . $e->getMessage());
        }
    }

    echo json_encode(["status" => "ok", "source" => "empty_fallback", "bookings" => []], JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = file_get_contents("php://input");
    $req = json_decode($input, true) ?: $_POST;

    $action = isset($req["action"]) ? $req["action"] : "save_booking";

    if ($action === "save_booking") {
        $bookingId = isset($req["booking_id"]) ? trim($req["booking_id"]) : ("BM-BK-" . date("Ymd") . "-" . rand(100, 999));
        $customer = isset($req["customer_name"]) ? trim($req["customer_name"]) : "Valued Traveler";
        $email = isset($req["customer_email"]) ? trim($req["customer_email"]) : null;
        $phone = isset($req["customer_phone"]) ? trim($req["customer_phone"]) : null;
        $title = isset($req["trip_title"]) ? trim($req["trip_title"]) : "Custom Travel Journey";
        $destination = isset($req["destination"]) ? trim($req["destination"]) : "";
        $travelDate = isset($req["travel_date"]) && bm_valid_date($req["travel_date"]) ? $req["travel_date"] : null;
        $pax = isset($req["passengers"]) ? max(1, (int)$req["passengers"]) : 1;
        $totalAmount = isset($req["total_amount"]) ? (float)$req["total_amount"] : 0;
        $paidAmount = isset($req["paid_amount"]) ? (float)$req["paid_amount"] : 0;
        $status = isset($req["status"]) ? trim($req["status"]) : "draft";
        $notes = isset($req["notes"]) ? trim($req["notes"]) : "";

        if ($db) {
            try {
                $stmt = $db->prepare("
                    INSERT INTO bookings (booking_id, customer_name, customer_email, customer_phone, trip_title, destination, travel_date, passengers, total_amount, paid_amount, status, notes)
                    VALUES (:bid, :cust, :email, :phone, :title, :dest, :tdate, :pax, :total, :paid, :status, :notes)
                    ON DUPLICATE KEY UPDATE 
                        customer_name = VALUES(customer_name),
                        customer_email = VALUES(customer_email),
                        customer_phone = VALUES(customer_phone),
                        trip_title = VALUES(trip_title),
                        destination = VALUES(destination),
                        travel_date = VALUES(travel_date),
                        passengers = VALUES(passengers),
                        total_amount = VALUES(total_amount),
                        paid_amount = VALUES(paid_amount),
                        status = VALUES(status),
                        notes = VALUES(notes),
                        deleted_at = NULL,
                        updated_at = NOW()
                ");
                $stmt->execute([
                    ':bid' => $bookingId,
                    ':cust' => $customer,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':title' => $title,
                    ':dest' => $destination,
                    ':tdate' => $travelDate,
                    ':pax' => $pax,
                    ':total' => $totalAmount,
                    ':paid' => $paidAmount,
                    ':status' => $status,
                    ':notes' => $notes
                ]);

                echo json_encode([
                    "ok" => true,
                    "message" => "Booking saved successfully.",
                    "booking_id" => $bookingId
                ], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }

        bm_respond(true, "Booking saved (Offline mode)", 200, ["booking_id" => $bookingId]);
    }

    if ($action === "delete_booking") {
        $bookingId = isset($req["booking_id"]) ? trim($req["booking_id"]) : "";
        if (empty($bookingId)) {
            bm_respond(false, "Booking ID required.", 422);
        }

        if ($db) {
            try {
                $stmt = $db->prepare("UPDATE bookings SET deleted_at = NOW() WHERE booking_id = :bid");
                $stmt->execute([':bid' => $bookingId]);
                echo json_encode(["ok" => true, "message" => "Booking moved to Recycle Bin (15 days retention)"], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }
        bm_respond(true, "Booking removed", 200);
    }
}

bm_respond(false, "Method not allowed.", 405);
