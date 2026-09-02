<?php
// BrahmnMitra — Backend Helper Functions

if (!defined("BM_OK")) {
    http_response_code(403);
    exit("Forbidden");
}

// CORS headers & preflight handling
function bm_handle_cors()
{
    $origin_raw = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
    $origin_clean = rtrim($origin_raw, '/');
    $allowed = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : '*';

    if ($allowed === '*' || empty($origin_raw)) {
        header("Access-Control-Allow-Origin: *");
    } else {
        $allowed_list = array_map(function ($item) {
            return rtrim(trim($item), '/');
        }, explode(',', $allowed));
        $allowed_list = array_values(array_filter($allowed_list));

        $origin_host = parse_url($origin_raw, PHP_URL_HOST);
        $is_allowed = in_array($origin_clean, $allowed_list, true);

        // Allow any subdomain of brahmnmitra.com, imperioncapitals.com, onrender.com, or local development
        if (!$is_allowed && !empty($origin_host)) {
            if (
                preg_match('/(^|\.)brahmnmitra\.com$/i', $origin_host) ||
                preg_match('/(^|\.)imperioncapitals\.com$/i', $origin_host) ||
                preg_match('/(^|\.)onrender\.com$/i', $origin_host) ||
                $origin_host === 'localhost' ||
                $origin_host === '127.0.0.1'
            ) {
                $is_allowed = true;
            }
        }

        if ($is_allowed) {
            header("Access-Control-Allow-Origin: " . $origin_raw);
            header("Vary: Origin");
        } elseif (!empty($allowed_list)) {
            header("Access-Control-Allow-Origin: " . $allowed_list[0]);
        } else {
            header("Access-Control-Allow-Origin: *");
        }
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, Authorization, X-Custom-Header");
    header("Access-Control-Max-Age: 86400");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

// Input sanitization & header-injection guards
function bm_cut($v, $max)
{
    return function_exists("mb_substr")
        ? mb_substr($v, 0, $max)
        : substr($v, 0, $max);
}

function bm_field($key, $max = 200)
{
    $v = isset($_POST[$key]) ? trim((string) $_POST[$key]) : "";
    $v = str_replace(["\r", "\n", "\0"], " ", $v);
    return bm_cut($v, $max);
}

function bm_text($key, $max = 2000)
{
    $v = isset($_POST[$key]) ? trim((string) $_POST[$key]) : "";
    $v = str_replace("\0", "", $v);
    return bm_cut($v, $max);
}

// Validation helpers
function bm_valid_phone($p)
{
    return (bool) preg_match('/^[0-9+\-\s()]{7,20}$/', $p);
}
function bm_valid_email($e)
{
    return (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}
function bm_valid_date($d)
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)) {
        return false;
    }
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

function bm_services()
{
    return [
        "group_tours" => "Group Tours",
        "tailor_made" => "Tailor-Made Journeys",
        "luxury_travel" => "Luxury Travel",
        "heritage_tours" => "Cultural & Heritage Tours",
        "mice_corporate" => "MICE & Corporate Travel",
        "ground_transport" => "Ground Transport",
        "domestic_flights" => "Domestic Flights",
        "international_flights" => "International Flights",
        "other" => "Other",
    ];
}
function bm_trip_types()
{
    return [
        "round_trip" => "Round trip",
        "one_way" => "One way",
        "multi_city" => "Multi-city",
    ];
}
function bm_cabins()
{
    return [
        "economy" => "Economy",
        "premium_economy" => "Premium Economy",
        "business" => "Business",
        "first" => "First",
    ];
}

// Rate limiting (max requests per IP per hour)
function bm_rate_limited($ip)
{
    if (!defined("RATE_LIMIT_PER_HOUR") || RATE_LIMIT_PER_HOUR <= 0) {
        return false;
    }
    if (!is_readable(LOG_FILE)) {
        return false;
    }

    $cutoff = time() - 3600;
    $hits = 0;

    $fh = @fopen(LOG_FILE, "r");
    if (!$fh) {
        return false;
    }
    while (($line = fgets($fh)) !== false) {
        $tab = strpos($line, "\t");
        if ($tab === false) {
            continue;
        }
        $ts = strtotime(substr($line, 0, $tab));
        if ($ts === false || $ts < $cutoff) {
            continue;
        }
        if (strpos($line, '"ip":"' . $ip . '"') !== false) {
            $hits++;
        }
    }
    fclose($fh);

    return $hits >= RATE_LIMIT_PER_HOUR;
}

// Enquiry logging & automatic log rotation
function bm_log(array $data)
{
    $dir = dirname(LOG_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    bm_rotate_log_if_needed();

    $line =
        date("c") .
        "\t" .
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) .
        "\n";
    return @file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX) !== false;
}

function bm_rotate_log_if_needed()
{
    if (!defined("LOG_MAX_BYTES") || LOG_MAX_BYTES <= 0) {
        return;
    }
    if (!is_file(LOG_FILE) || filesize(LOG_FILE) < LOG_MAX_BYTES) {
        return;
    }

    $archiveDir = dirname(LOG_FILE) . "/archive";
    if (!is_dir($archiveDir)) {
        @mkdir($archiveDir, 0755, true);
    }

    $dest = $archiveDir . "/enquiries-" . date("Y-m-d_His") . ".log";
    @rename(LOG_FILE, $dest);

    if (defined("LOG_KEEP_DAYS") && LOG_KEEP_DAYS > 0) {
        $cutoff = time() - LOG_KEEP_DAYS * 86400;
        foreach (glob($archiveDir . "/enquiries-*.log") ?: [] as $file) {
            if (@filemtime($file) !== false && filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
}

// Response helpers (JSON or fallback HTML)
function bm_wants_json()
{
    return isset($_SERVER["HTTP_ACCEPT"]) &&
        strpos($_SERVER["HTTP_ACCEPT"], "application/json") !== false;
}

function bm_e($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, "UTF-8");
}

function bm_respond($ok, $message = "", $http = 200)
{
    if (bm_wants_json()) {
        http_response_code($http);
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(
            $ok
                ? ["ok" => true, "status" => "ok", "message" => $message ?: "Success"]
                : ["ok" => false, "status" => "error", "error" => $message, "message" => $message],
            JSON_PRETTY_PRINT
        );
        exit();
    }

    http_response_code($http);
    header("Content-Type: text/html; charset=utf-8");

    $title = $ok ? "Enquiry sent ✈" : "Something went wrong";

    if ($ok) {
        $body =
            "Thank you — your enquiry has reached us. We will call you back shortly.";
        $extra = "";
    } else {
        $body = bm_e($message);
        // The failure path ALWAYS carries a way to reach a human.
        $extra =
            '<p class="alt">Please call <a href="tel:' .
            bm_e(str_replace(" ", "", BIZ_PHONE)) .
            '">' .
            bm_e(BIZ_PHONE) .
            "</a> or " .
            '<a href="https://wa.me/' .
            bm_e(BIZ_WA) .
            '">message us on WhatsApp</a> instead — ' .
            "we will pick it up from there.</p>";
    }

    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' .
        '<meta name="viewport" content="width=device-width,initial-scale=1">' .
        '<meta name="robots" content="noindex">' .
        "<title>" .
        $title .
        " — " .
        bm_e(BIZ_NAME) .
        "</title>" .
        "<style>" .
        "body{font-family:Archivo,system-ui,sans-serif;background:linear-gradient(180deg,#9CD1FF,#EEF8FF);" .
        "color:#0A2540;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}" .
        ".card{background:#fff;border-radius:22px;padding:44px 36px;max-width:520px;" .
        "box-shadow:0 18px 50px -18px rgba(10,37,64,.28)}" .
        "h1{margin:0 0 14px;font-size:1.5rem}" .
        "p{line-height:1.65;color:#42618A;margin:0 0 12px}" .
        ".alt a{color:#0B63C5;font-weight:700}" .
        "a.btn{display:inline-block;margin-top:22px;background:#FFB347;color:#2A1600;" .
        "font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px}" .
        "</style></head><body>" .
        '<div class="card"><h1>' .
        $title .
        "</h1><p>" .
        $body .
        "</p>" .
        $extra .
        '<a class="btn" href="./">Back to the site</a></div></body></html>';
    exit();
}
