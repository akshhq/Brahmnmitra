<?php
// BrahmnMitra — Payment Gateway (Dev Mode) & Ledger Endpoint

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";

bm_handle_cors();

$paymentsFile = __DIR__ . "/logs/payments-ledger.json";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");
    if (file_exists($paymentsFile)) {
        echo file_get_contents($paymentsFile);
    } else {
        echo json_encode([
            "status" => "ok",
            "inflow" => [],
            "outflow" => [],
            "summary" => [
                "totalRevenue" => 0,
                "totalVendorCost" => 0,
                "grossMargin" => 0,
                "marginPercent" => 0
            ]
        ], JSON_PRETTY_PRINT);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = file_get_contents("php://input");
    $req = json_decode($input, true) ?: $_POST;

    $action = isset($req["action"]) ? $req["action"] : "create_order";

    // 1. Create Dev Payment Gateway Order
    if ($action === "create_order") {
        $amount = isset($req["amount"]) ? (float)$req["amount"] : 0;
        $customer = isset($req["customer"]) ? trim($req["customer"]) : "Valued Traveler";
        $bookingId = isset($req["booking_id"]) ? trim($req["booking_id"]) : "BM-BK-" . date("Ymd") . "-" . rand(100, 999);
        $tripTitle = isset($req["trip_title"]) ? trim($req["trip_title"]) : "Custom Travel Itinerary";

        if ($amount <= 0) {
            bm_respond(false, "Amount must be greater than zero.", 422);
        }

        $orderId = "order_test_BM" . time() . rand(1000, 9999);

        header("Content-Type: application/json; charset=utf-8");
        echo json_encode([
            "status" => "ok",
            "mode" => "development_sandbox",
            "order_id" => $orderId,
            "amount" => $amount,
            "currency" => "INR",
            "customer" => $customer,
            "booking_id" => $bookingId,
            "trip_title" => $tripTitle,
            "merchant" => [
                "name" => "BrahmnMitra Travel Desk",
                "sac" => "9985",
                "gstin_status" => "GST Registered",
                "city" => "New Delhi, India"
            ],
            "test_credentials" => [
                "upi_success" => "success@upi",
                "upi_fail" => "failure@upi",
                "card_test" => "4111 1111 1111 1111"
            ],
            "created_at" => date("c")
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // 2. Verify / Process Mock Gateway Payment
    if ($action === "verify_payment") {
        $orderId = isset($req["order_id"]) ? trim($req["order_id"]) : "";
        $method = isset($req["method"]) ? trim($req["method"]) : "UPI";
        $simulate = isset($req["simulate"]) ? trim($req["simulate"]) : "success";
        $amount = isset($req["amount"]) ? (float)$req["amount"] : 0;
        $customer = isset($req["customer"]) ? trim($req["customer"]) : "Traveler";
        $bookingId = isset($req["booking_id"]) ? trim($req["booking_id"]) : "BM-BK-" . time();

        if ($simulate === "fail") {
            bm_respond(false, "Simulated payment failure (Dev Mode): Transaction declined by issuing bank.", 400, [
                "error_code" => "DEV_DECLINED",
                "order_id" => $orderId
            ]);
        }

        $txnId = "pay_test_BM" . time() . rand(1000, 9999);
        $paymentRecord = [
            "id" => $txnId,
            "order_id" => $orderId,
            "booking_id" => $bookingId,
            "customer" => $customer,
            "amount" => $amount,
            "method" => $method,
            "type" => "inflow",
            "status" => "Received (Full)",
            "gateway" => "BrahmnMitra Sandbox (Dev Mode)",
            "timestamp" => date("c"),
            "utr" => "DEV-UTR-" . rand(1000000000, 9999999999)
        ];

        // Append to ledger file
        $ledger = ["inflow" => [], "outflow" => []];
        if (file_exists($paymentsFile)) {
            $ledger = json_decode(file_get_contents($paymentsFile), true) ?: $ledger;
        }
        $ledger["inflow"][] = $paymentRecord;

        $dir = dirname($paymentsFile);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        @file_put_contents($paymentsFile, json_encode($ledger, JSON_PRETTY_PRINT));

        // Append to audit trail logs
        $logsFile = __DIR__ . "/logs/audit-trail.json";
        $auditData = ["status" => "ok", "logs" => []];
        if (file_exists($logsFile)) {
            $auditData = json_decode(file_get_contents($logsFile), true) ?: $auditData;
        }
        $auditEvent = [
            "id" => "log-" . microtime(true) . "-" . rand(100, 999),
            "timestamp" => date("c"),
            "actor" => "Client Checkout Portal (brahmnmitra.com)",
            "category" => "CUSTOMER_PAYMENT",
            "action" => "Client " . $customer . " settled payment (" . $method . "): ₹" . number_format($amount, 0, '.', ','),
            "details" => json_encode(["bookingId" => $bookingId, "txnId" => $txnId, "utr" => $paymentRecord["utr"], "method" => $method, "orderId" => $orderId]),
            "ip" => isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "127.0.0.1"
        ];
        array_unshift($auditData["logs"], $auditEvent);
        if (count($auditData["logs"]) > 1000) {
            $auditData["logs"] = array_slice($auditData["logs"], 0, 1000);
        }
        @file_put_contents($logsFile, json_encode($auditData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        header("Content-Type: application/json; charset=utf-8");
        echo json_encode([
            "status" => "ok",
            "message" => "Payment verified successfully in Developer Mode.",
            "payment" => $paymentRecord
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // 3. Save Ledger (Bulk or sync from admin)
    if ($action === "sync_ledger") {
        $ledger = isset($req["ledger"]) ? $req["ledger"] : $req;
        $dir = dirname($paymentsFile);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        @file_put_contents($paymentsFile, json_encode($ledger, JSON_PRETTY_PRINT));
        bm_respond(true, "Ledger synchronized successfully.", 200);
    }
}

bm_respond(false, "Invalid request.", 400);
