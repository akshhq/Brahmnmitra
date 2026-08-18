<?php
// BrahmnMitra — Enquiry Email Dispatcher via PHPMailer

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

if (!defined("BM_OK")) {
    http_response_code(403);
    exit("Forbidden");
}

require_once __DIR__ . "/PHPMailer/Exception.php";
require_once __DIR__ . "/PHPMailer/PHPMailer.php";
require_once __DIR__ . "/PHPMailer/SMTP.php";

/**
 * Send enquiry notification email.
 */
function bm_send_enquiry(array $d)
{
    $subject = "Enquiry · " . $d["service_label"];
    if ($d["is_flight"] && $d["from_city"] !== "" && $d["to_city"] !== "") {
        $subject .= " · " . $d["from_city"] . " → " . $d["to_city"];
    }
    $subject .= " · " . $d["name"];

    $L = [];
    $L[] = "NEW ENQUIRY — " . BIZ_NAME;
    $L[] = str_repeat("=", 52);
    $L[] = "";
    $L[] = "Name       : " . $d["name"];
    $L[] = "Phone      : " . $d["phone"];
    $L[] = "Email      : " . ($d["email"] !== "" ? $d["email"] : "—");
    $L[] = "Company    : " . ($d["company"] !== "" ? $d["company"] : "—");
    $L[] = "Service    : " . $d["service_label"];

    if ($d["is_flight"]) {
        $L[] = "";
        $L[] = "--- FLIGHT DETAILS ---";
        $L[] = "Trip       : " . $d["trip_label"];
        $L[] = "Route      : " . $d["from_city"] . "  →  " . $d["to_city"];
        $L[] = "Departure  : " . $d["depart_date"];
        $L[] =
            "Return     : " .
            ($d["return_date"] !== "" ? $d["return_date"] : "—");
        $L[] = "Passengers : " . $d["passengers"];
        $L[] = "Cabin      : " . $d["cabin_label"];
    }

    if ($d["message"] !== "") {
        $L[] = "";
        $L[] = "--- MESSAGE ---";
        $L[] = $d["message"];
    }

    $L[] = "";
    $L[] = str_repeat("-", 52);
    $L[] = "Received   : " . date("d M Y, H:i") . " IST";
    $L[] = "IP         : " . $d["ip"];
    $L[] = "Page       : " . $d["referer"];
    $L[] = "";
    $L[] = "Reply to this email to answer them directly.";

    $body = implode("\n", $L);

    $mail = new PHPMailer(true);

    try {
        if (defined("SMTP_HOST") && SMTP_HOST !== "") {
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->Port = SMTP_PORT;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USERNAME;
            $mail->Password = SMTP_PASSWORD;
            $mail->SMTPSecure =
                SMTP_SECURE === "ssl"
                    ? PHPMailer::ENCRYPTION_SMTPS
                    : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPDebug = defined("SMTP_DEBUG") ? (int) SMTP_DEBUG : 0;
            if ($mail->SMTPDebug > 0) {
                $mail->Debugoutput = function ($str) {
                    bm_log(["smtp_debug" => trim((string) $str)]);
                };
            }
        } else {
            $mail->isMail();
        }

        $mail->CharSet = "UTF-8";
        $mail->Encoding = "base64";

        $mail->setFrom(FROM_EMAIL, FROM_NAME);
        $mail->addAddress(TO_EMAIL);

        if ($d["email"] !== "") {
            $mail->addReplyTo($d["email"], $d["name"]);
        }

        $mail->Sender = FROM_EMAIL;

        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->XMailer = "BrahmnMitra Website";

        return $mail->send();
    } catch (PHPMailerException $e) {
        bm_log([
            "mail_error" =>
                $mail->ErrorInfo !== "" ? $mail->ErrorInfo : $e->getMessage(),
        ]);
        return false;
    }
}
