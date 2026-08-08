<?php
/* ============================================================
   BRAHMNMITRA — includes/mailer.php
   ------------------------------------------------------------
   Composes and sends the enquiry email via PHPMailer
   (includes/PHPMailer — vendored as plain files, no Composer,
   so this still drops straight into Hostinger with no build step).

   Transport: PHPMailer connects over authenticated SMTP when
   SMTP_HOST is set in config.php, and falls back to PHP's mail()
   automatically when it is blank — so a fresh upload with nothing
   configured still sends mail exactly as before, just through a
   more capable, better-tested library.

   Header safety: every value that reaches PHPMailer has already
   had CR/LF stripped by bm_field() in helpers.php (defence in
   depth — PHPMailer also rejects header-injection attempts itself,
   throwing rather than silently sending a malformed message).
   ============================================================ */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

if (!defined('BM_OK')) { http_response_code(403); exit('Forbidden'); }

require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

/**
 * Send one enquiry.
 *
 * @param  array $d  The cleaned, validated fields.
 * @return bool      True if the mailer accepted it for delivery.
 */
function bm_send_enquiry(array $d) {

    /* ---------- subject ----------
       Written so the inbox is scannable at a glance: the service and
       the name, so Naveen knows what he is opening before he opens it. */
    $subject = 'Enquiry · ' . $d['service_label'];
    if ($d['is_flight'] && $d['from_city'] !== '' && $d['to_city'] !== '') {
        $subject .= ' · ' . $d['from_city'] . ' → ' . $d['to_city'];
    }
    $subject .= ' · ' . $d['name'];

    /* ---------- body ---------- */
    $L = [];
    $L[] = 'NEW ENQUIRY — ' . BIZ_NAME;
    $L[] = str_repeat('=', 52);
    $L[] = '';
    $L[] = 'Name       : ' . $d['name'];
    $L[] = 'Phone      : ' . $d['phone'];
    $L[] = 'Email      : ' . ($d['email']   !== '' ? $d['email']   : '—');
    $L[] = 'Company    : ' . ($d['company'] !== '' ? $d['company'] : '—');
    $L[] = 'Service    : ' . $d['service_label'];

    if ($d['is_flight']) {
        $L[] = '';
        $L[] = '--- FLIGHT DETAILS ---';
        $L[] = 'Trip       : ' . $d['trip_label'];
        $L[] = 'Route      : ' . $d['from_city'] . '  →  ' . $d['to_city'];
        $L[] = 'Departure  : ' . $d['depart_date'];
        $L[] = 'Return     : ' . ($d['return_date'] !== '' ? $d['return_date'] : '—');
        $L[] = 'Passengers : ' . $d['passengers'];
        $L[] = 'Cabin      : ' . $d['cabin_label'];
    }

    if ($d['message'] !== '') {
        $L[] = '';
        $L[] = '--- MESSAGE ---';
        $L[] = $d['message'];
    }

    $L[] = '';
    $L[] = str_repeat('-', 52);
    $L[] = 'Received   : ' . date('d M Y, H:i') . ' IST';
    $L[] = 'IP         : ' . $d['ip'];
    $L[] = 'Page       : ' . $d['referer'];
    $L[] = '';
    $L[] = 'Reply to this email to answer them directly.';

    $body = implode("\n", $L);

    $mail = new PHPMailer(true);

    try {
        /* ---------- transport ----------
           SMTP when configured, PHP's own mail() otherwise. Either way
           the caller sees the same true/false contract as before. */
        if (defined('SMTP_HOST') && SMTP_HOST !== '') {
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->Port       = SMTP_PORT;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USERNAME;
            $mail->Password   = SMTP_PASSWORD;
            $mail->SMTPSecure = SMTP_SECURE === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPDebug  = defined('SMTP_DEBUG') ? (int) SMTP_DEBUG : 0;
            if ($mail->SMTPDebug > 0) {
                // Debug output goes to the same protected log, never to the browser.
                $mail->Debugoutput = function ($str) { bm_log(['smtp_debug' => trim((string) $str)]); };
            }
        } else {
            $mail->isMail();
        }

        $mail->CharSet  = 'UTF-8';
        $mail->Encoding = 'base64';   // matches the old =?UTF-8?B?...?= subject encoding, keeps the → intact

        $mail->setFrom(FROM_EMAIL, FROM_NAME);
        $mail->addAddress(TO_EMAIL);

        /* Reply-To is set to the visitor when they gave an email, so hitting
           Reply in the inbox goes to the customer, not to the website. */
        if ($d['email'] !== '') {
            $mail->addReplyTo($d['email'], $d['name']);
        }

        /* The envelope sender. Without this, a shared-host MTA stamps the
           mail with the server's default address and it is far more likely
           to be filtered as spam. PHPMailer sets this from `From` by
           default over mail(); this makes it explicit either way. */
        $mail->Sender = FROM_EMAIL;

        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->XMailer = 'BrahmnMitra Website';

        return $mail->send();

    } catch (PHPMailerException $e) {
        // Never let a mailer exception surface to the visitor — the log
        // already has the enquiry (bm_log runs before this is called),
        // so nothing is lost. Record why sending failed for diagnosis.
        bm_log(['mail_error' => $mail->ErrorInfo !== '' ? $mail->ErrorInfo : $e->getMessage()]);
        return false;
    }
}
