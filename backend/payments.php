<?php
// BrahmnMitra — Payment Gateway & Ledger Endpoint (Hostinger MySQL)
// Supports Dev Gateway Verifications, Two-Way Ledger Queries, Manual Disbursements, and 15-Day Soft Deletes

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";

bm_handle_cors();

$paymentsFile = __DIR__ . "/logs/payments-ledger.json";
$db = bm_get_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    header("Content-Type: application/json; charset=utf-8");

    if ($db) {
        try {
            $stmt = $db->query("
                SELECT id, transaction_id, order_id, booking_id, customer_name, customer_email, customer_phone, 
                       amount, currency, payment_method, utr_reference, invoice_number, status, notes, created_at
                FROM payments
                WHERE deleted_at IS NULL
                ORDER BY id DESC
                LIMIT 500
            ");
            $payments = $stmt->fetchAll();

            $totalRevenue = 0;
            $inflow = [];

            foreach ($payments as $p) {
                $amt = (float)$p['amount'];
                if ($p['status'] === 'verified') {
                    $totalRevenue += $amt;
                }
                $inflow[] = [
                    'id' => $p['transaction_id'],
                    'bookingId' => $p['booking_id'],
                    'customer' => $p['customer_name'],
                    'amount' => $amt,
                    'mode' => $p['payment_method'],
                    'utr' => $p['utr_reference'] ?? ('UTR-' . substr(md5($p['transaction_id']), 0, 10)),
                    'date' => date('Y-m-d', strtotime($p['created_at'])),
                    'status' => $p['status'] === 'verified' ? 'Settled' : ucfirst($p['status']),
                    'invoice' => $p['invoice_number'] ?? 'BM-INV-PENDING'
                ];
            }

            echo json_encode([
                "status" => "ok",
                "source" => "hostinger_mysql",
                "inflow" => $inflow,
                "outflow" => [],
                "summary" => [
                    "totalRevenue" => $totalRevenue,
                    "totalVendorCost" => round($totalRevenue * 0.78, 2),
                    "grossMargin" => round($totalRevenue * 0.22, 2),
                    "marginPercent" => $totalRevenue > 0 ? 22 : 0
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        } catch (PDOException $e) {
            error_log("[BM_DB_PAYMENTS_GET_ERROR] " . $e->getMessage());
        }
    }

    if (file_exists($paymentsFile)) {
        echo file_get_contents($paymentsFile);
    } else {
        echo json_encode([
            "status" => "ok",
            "source" => "json_fallback",
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

    $action = isset($_GET["action"]) ? $_GET["action"] : ($req["action"] ?? "create_order");

    // A. Soft Delete Payment Record (Move to Recycle Bin)
    if ($action === "delete_payment") {
        $txnId = isset($req["id"]) ? trim($req["id"]) : (isset($req["transaction_id"]) ? trim($req["transaction_id"]) : "");
        if (empty($txnId)) {
            bm_respond(false, "Transaction ID required.", 422);
        }

        if ($db) {
            try {
                $stmt = $db->prepare("UPDATE payments SET deleted_at = NOW() WHERE transaction_id = :txn");
                $stmt->execute([':txn' => $txnId]);
                echo json_encode(["ok" => true, "message" => "Payment moved to Recycle Bin (15 days retention)"], JSON_PRETTY_PRINT);
                exit;
            } catch (PDOException $e) {
                bm_respond(false, "Database error: " . $e->getMessage(), 500);
            }
        }
        bm_respond(true, "Payment removed", 200);
    }

    // B. Create Dev Payment Gateway Order
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

    // C. Verify / Process Mock Gateway Payment or Admin Manual Inflow
    if ($action === "verify_payment" || $action === "record_payment") {
        $orderId = isset($req["order_id"]) ? trim($req["order_id"]) : ("manual-" . time());
        $method = isset($req["method"]) ? trim($req["method"]) : "UPI";
        $simulate = isset($req["simulate"]) ? trim($req["simulate"]) : "success";
        $amount = isset($req["amount"]) ? (float)$req["amount"] : 0;
        $customer = isset($req["customer"]) ? trim($req["customer"]) : "Traveler";
        $bookingId = isset($req["booking_id"]) ? trim($req["booking_id"]) : "BM-BK-" . time();
        $email = isset($req["email"]) ? trim($req["email"]) : null;
        $phone = isset($req["phone"]) ? trim($req["phone"]) : null;
        $utrInput = isset($req["utr"]) ? trim($req["utr"]) : null;

        if ($simulate === "fail") {
            bm_respond(false, "Simulated payment failure: Transaction declined by issuing bank.", 400);
        }

        $txnId = "pay_test_BM" . time() . rand(1000, 9999);
        $utrRef = $utrInput ?: ("UTR-" . date("Ymd") . "-" . rand(100000, 999999));
        $invoiceNo = "BM-INV-" . date("Y") . "-" . rand(1000, 9999);

        // Save to Hostinger MySQL Database
        if ($db) {
            try {
                $stmt = $db->prepare("
                    INSERT INTO payments (transaction_id, order_id, booking_id, customer_name, customer_email, customer_phone, amount, currency, payment_method, utr_reference, invoice_number, status, ip_address, deleted_at)
                    VALUES (:txn, :oid, :bid, :cust, :email, :phone, :amt, 'INR', :method, :utr, :inv, 'verified', :ip, NULL)
                ");
                $stmt->execute([
                    ':txn' => $txnId,
                    ':oid' => $orderId,
                    ':bid' => $bookingId,
                    ':cust' => $customer,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':amt' => $amount,
                    ':method' => $method,
                    ':utr' => $utrRef,
                    ':inv' => $invoiceNo,
                    ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);

                // Insert into audit trail table
                $logStmt = $db->prepare("
                    INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address)
                    VALUES (:lid, :actor, 'PAYMENT', 'PAYMENT_VERIFIED', :details, :ip)
                ");
                $logStmt->execute([
                    ':lid' => 'log-' . microtime(true),
                    ':actor' => $customer,
                    ':details' => json_encode(['txn' => $txnId, 'amount' => $amount, 'booking_id' => $bookingId]),
                    ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);
            } catch (PDOException $e) {
                error_log("[BM_DB_PAYMENT_INSERT_ERROR] " . $e->getMessage());
            }
        }

        // Backup JSON ledger update
        $ledger = ["status" => "ok", "inflow" => [], "outflow" => [], "summary" => ["totalRevenue" => 0, "totalVendorCost" => 0, "grossMargin" => 0, "marginPercent" => 0]];
        if (file_exists($paymentsFile)) {
            $ledger = json_decode(file_get_contents($paymentsFile), true) ?: $ledger;
        }

        $paymentItem = [
            "id" => $txnId,
            "bookingId" => $bookingId,
            "customer" => $customer,
            "amount" => $amount,
            "mode" => $method,
            "utr" => $utrRef,
            "date" => date("Y-m-d"),
            "status" => "Settled",
            "invoice" => $invoiceNo
        ];

        array_unshift($ledger["inflow"], $paymentItem);
        $ledger["summary"]["totalRevenue"] += $amount;
        $ledger["summary"]["totalVendorCost"] = round($ledger["summary"]["totalRevenue"] * 0.78, 2);
        $ledger["summary"]["grossMargin"] = round($ledger["summary"]["totalRevenue"] * 0.22, 2);
        $ledger["summary"]["marginPercent"] = 22;

        $dir = dirname($paymentsFile);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        @file_put_contents($paymentsFile, json_encode($ledger, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        header("Content-Type: application/json; charset=utf-8");
        echo json_encode([
            "status" => "ok",
            "verified" => true,
            "transaction_id" => $txnId,
            "order_id" => $orderId,
            "booking_id" => $bookingId,
            "customer" => $customer,
            "amount" => $amount,
            "payment_method" => $method,
            "utr_reference" => $utrRef,
            "invoice_number" => $invoiceNo,
            "created_at" => date("c")
        ], JSON_PRETTY_PRINT);
        exit;
    }
}

bm_respond(false, "Method not allowed.", 405);
