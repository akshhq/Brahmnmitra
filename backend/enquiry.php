<?php
// BrahmnMitra — Enquiry Form Endpoint

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/mailer.php";

// Request guards (POST only, honeypot, rate-limit)
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    bm_respond(false, "Please use the enquiry form on the website.", 405);
}

if (bm_field("website") !== "") {
    bm_respond(true, "", 200);
}

$ip = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "unknown";

if (bm_rate_limited($ip)) {
    bm_respond(
        false,
        "Too many enquiries from this connection. Please call us instead.",
        429,
    );
}

// Collect input fields
$name = bm_field("name", 100);
$email = bm_field("email", 120);
$phone = bm_field("phone", 20);
$company = bm_field("company", 120);
$service = bm_field("service", 40);
$message = bm_text("message", 2000);

// Flight specific fields
$trip = bm_field("trip_type", 20);
$from = bm_field("from_city", 80);
$to = bm_field("to_city", 80);
$depart = bm_field("depart_date", 10);
$return = bm_field("return_date", 10);
$pax = max(1, min(99, (int) bm_field("passengers", 2)));
$cabin = bm_field("cabin_class", 30);

$referer = bm_field("page", 200);
if ($referer === "" && isset($_SERVER["HTTP_REFERER"])) {
    $referer = bm_cut(
        str_replace(["\r", "\n"], "", $_SERVER["HTTP_REFERER"]),
        200,
    );
}

// Validate fields
$SERVICES = bm_services();
$TRIPS = bm_trip_types();
$CABINS = bm_cabins();

if ($name === "") {
    bm_respond(false, "Please tell us your name.", 422);
}
if ($phone === "") {
    bm_respond(false, "Please give us a phone number.", 422);
}
if (!bm_valid_phone($phone)) {
    bm_respond(false, "That phone number does not look right.", 422);
}
if ($email === "") {
    bm_respond(false, "Please give us an email address.", 422);
}
if (!bm_valid_email($email)) {
    bm_respond(false, "That email address does not look right.", 422);
}
if (!isset($SERVICES[$service])) {
    bm_respond(false, "Please choose a service.", 422);
}

$isFlight =
    $service === "domestic_flights" || $service === "international_flights";

if ($isFlight) {
    if ($from === "" || $to === "") {
        bm_respond(
            false,
            "Please tell us where you are flying from and to.",
            422,
        );
    }
    if (!bm_valid_date($depart)) {
        bm_respond(false, "Please give us a valid departure date.", 422);
    }
    if ($return !== "" && !bm_valid_date($return)) {
        bm_respond(false, "That return date does not look right.", 422);
    }
    if ($trip === "one_way") {
        $return = "";
    }
    if (!isset($TRIPS[$trip])) {
        $trip = "round_trip";
    }
    if (!isset($CABINS[$cabin])) {
        $cabin = "economy";
    }
} else {
    $trip = $from = $to = $depart = $return = $cabin = "";
    $pax = 0;
}

// Assemble record
$data = [
    "name" => $name,
    "email" => $email,
    "phone" => $phone,
    "company" => $company,
    "service" => $service,
    "service_label" => $SERVICES[$service],
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

// Log to backup file first
bm_log($data);

// Send email
if ($bm_mail_result = bm_send_enquiry($data)) {
    bm_respond(true, "", 200);
}

bm_respond(false, "We could not email your enquiry just now.", 500);

