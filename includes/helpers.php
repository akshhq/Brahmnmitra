<?php
/* ============================================================
   BRAHMNMITRA — includes/helpers.php
   ------------------------------------------------------------
   Sanitisation, validation, logging and the response writer.

   Security posture: the browser's validation is a courtesy to
   the visitor. THIS file is what actually decides whether a
   submission is accepted. Anything arriving here is assumed
   hostile until proven otherwise.
   ============================================================ */

if (!defined('BM_OK')) { http_response_code(403); exit('Forbidden'); }

/* ---------- input ---------- */

/** mb-safe truncate (a non-mb server would cut a UTF-8 char in half) */
function bm_cut($v, $max) {
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/**
 * Read one POST field, safely.
 *
 * CR and LF are stripped from every value. This is the header-injection
 * guard: a field that reaches an email header carrying "\r\nBcc: ..."
 * would otherwise turn this form into an open relay.
 */
function bm_field($key, $max = 200) {
    $v = isset($_POST[$key]) ? trim((string)$_POST[$key]) : '';
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return bm_cut($v, $max);
}

/** The message body may keep its newlines — it never touches a header. */
function bm_text($key, $max = 2000) {
    $v = isset($_POST[$key]) ? trim((string)$_POST[$key]) : '';
    $v = str_replace("\0", '', $v);
    return bm_cut($v, $max);
}

/* ---------- validation ---------- */

function bm_valid_phone($p) {
    return (bool)preg_match('/^[0-9+\-\s()]{7,20}$/', $p);
}
function bm_valid_email($e) {
    return (bool)filter_var($e, FILTER_VALIDATE_EMAIL);
}
function bm_valid_date($d) {
    // strictly YYYY-MM-DD, and a date that actually exists
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)) return false;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

/** The services the form is allowed to submit. Anything else is rejected. */
function bm_services() {
    return [
        'group_tours'            => 'Group Tours',
        'tailor_made'            => 'Tailor-Made Journeys',
        'luxury_travel'          => 'Luxury Travel',
        'heritage_tours'         => 'Cultural & Heritage Tours',
        'mice_corporate'         => 'MICE & Corporate Travel',
        'ground_transport'       => 'Ground Transport',
        'domestic_flights'       => 'Domestic Flights',
        'international_flights'  => 'International Flights',
        'other'                  => 'Other',
    ];
}
function bm_trip_types() {
    return [
        'round_trip' => 'Round trip',
        'one_way'    => 'One way',
        'multi_city' => 'Multi-city',
    ];
}
function bm_cabins() {
    return [
        'economy'          => 'Economy',
        'premium_economy'  => 'Premium Economy',
        'business'         => 'Business',
        'first'            => 'First',
    ];
}

/* ---------- rate limiting ----------
   A crude but effective flood guard. Counts this IP's entries in the
   log over the last hour. No database needed. */
function bm_rate_limited($ip) {
    if (!defined('RATE_LIMIT_PER_HOUR') || RATE_LIMIT_PER_HOUR <= 0) return false;
    if (!is_readable(LOG_FILE)) return false;

    $cutoff = time() - 3600;
    $hits   = 0;

    $fh = @fopen(LOG_FILE, 'r');
    if (!$fh) return false;
    while (($line = fgets($fh)) !== false) {
        $tab = strpos($line, "\t");
        if ($tab === false) continue;
        $ts = strtotime(substr($line, 0, $tab));
        if ($ts === false || $ts < $cutoff) continue;
        if (strpos($line, '"ip":"' . $ip . '"') !== false) $hits++;
    }
    fclose($fh);

    return $hits >= RATE_LIMIT_PER_HOUR;
}

/* ---------- logging ----------
   Written BEFORE the email is attempted. If mail() fails, the enquiry
   is still on disk and the business has not lost a customer. */
function bm_log(array $data) {
    $dir = dirname(LOG_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    bm_rotate_log_if_needed();

    $line = date('c') . "\t" . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    return @file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX) !== false;
}

/**
 * Rotate enquiries.log once it passes LOG_MAX_BYTES, and prune archives
 * older than LOG_KEEP_DAYS. Runs on every write, but the size check is a
 * single filesize() call, so the cost is negligible next to a form POST.
 *
 * No cron job required — this is a self-contained, no-build-step site,
 * so rotation happens inline rather than depending on a Hostinger cron
 * that someone has to remember to set up.
 */
function bm_rotate_log_if_needed() {
    if (!defined('LOG_MAX_BYTES') || LOG_MAX_BYTES <= 0) return;
    if (!is_file(LOG_FILE) || filesize(LOG_FILE) < LOG_MAX_BYTES) return;

    $archiveDir = dirname(LOG_FILE) . '/archive';
    if (!is_dir($archiveDir)) @mkdir($archiveDir, 0755, true);

    // Timestamped so two rotations on the same day never collide.
    $dest = $archiveDir . '/enquiries-' . date('Y-m-d_His') . '.log';
    @rename(LOG_FILE, $dest);

    // Prune anything past LOG_KEEP_DAYS. A plain filename scan, no
    // dependency on filesystem mtime having survived a backup/restore.
    if (defined('LOG_KEEP_DAYS') && LOG_KEEP_DAYS > 0) {
        $cutoff = time() - (LOG_KEEP_DAYS * 86400);
        foreach (glob($archiveDir . '/enquiries-*.log') ?: [] as $file) {
            if (@filemtime($file) !== false && filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
}

/* ---------- response ---------- */

function bm_wants_json() {
    return isset($_SERVER['HTTP_ACCEPT'])
        && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;
}

function bm_e($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/**
 * Reply and stop.
 *
 * JSON for the fetch() path. A styled HTML page for the no-JavaScript
 * path — a visitor with JS off must still get a clear answer, and on
 * failure must still be given the phone number and WhatsApp link. A
 * dead form is a lost customer.
 */
function bm_respond($ok, $message = '', $http = 200) {
    if (bm_wants_json()) {
        http_response_code($http);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $message]);
        exit;
    }

    http_response_code($http);
    header('Content-Type: text/html; charset=utf-8');

    $title = $ok ? 'Enquiry sent ✈' : 'Something went wrong';

    if ($ok) {
        $body = 'Thank you — your enquiry has reached us. We will call you back shortly.';
        $extra = '';
    } else {
        $body = bm_e($message);
        // The failure path ALWAYS carries a way to reach a human.
        $extra =
            '<p class="alt">Please call <a href="tel:' . bm_e(str_replace(' ', '', BIZ_PHONE)) . '">'
            . bm_e(BIZ_PHONE) . '</a> or '
            . '<a href="https://wa.me/' . bm_e(BIZ_WA) . '">message us on WhatsApp</a> instead — '
            . 'we will pick it up from there.</p>';
    }

    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex">'
       . '<title>' . $title . ' — ' . bm_e(BIZ_NAME) . '</title>'
       . '<style>'
       . 'body{font-family:Archivo,system-ui,sans-serif;background:linear-gradient(180deg,#9CD1FF,#EEF8FF);'
       . 'color:#0A2540;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}'
       . '.card{background:#fff;border-radius:22px;padding:44px 36px;max-width:520px;'
       . 'box-shadow:0 18px 50px -18px rgba(10,37,64,.28)}'
       . 'h1{margin:0 0 14px;font-size:1.5rem}'
       . 'p{line-height:1.65;color:#42618A;margin:0 0 12px}'
       . '.alt a{color:#0B63C5;font-weight:700}'
       . 'a.btn{display:inline-block;margin-top:22px;background:#FFB347;color:#2A1600;'
       . 'font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px}'
       . '</style></head><body>'
       . '<div class="card"><h1>' . $title . '</h1><p>' . $body . '</p>' . $extra
       . '<a class="btn" href="./">Back to the site</a></div></body></html>';
    exit;
}
