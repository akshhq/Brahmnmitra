<?php
/* ============================================================
   BRAHMNMITRA — includes/config.php
   ------------------------------------------------------------
   ⚠️  THIS IS THE ONLY FILE YOU NEED TO EDIT BEFORE GOING LIVE.

   Change the two email addresses below. Nothing else in the
   site needs touching.
   ============================================================ */

/* ---- 1. WHERE ENQUIRIES SHOULD LAND -------------------------
   The inbox that receives every enquiry. Your normal address
   (Gmail, Outlook, anything) is fine here.                      */
define('TO_EMAIL', 'info@brahmnmitra.com');          // <-- CHANGE THIS


/* ---- 2. WHO THE EMAIL IS FROM -------------------------------
   This MUST be a real mailbox on brahmnmitra.com.

   Create it free in Hostinger hPanel → Emails → Create mailbox.

   Why it matters: Hostinger's mail() is only delivered reliably
   when the From: address belongs to the sending domain. Put a
   Gmail address here and your enquiries will land in spam — or
   vanish entirely.                                              */
define('FROM_EMAIL', 'enquiry@brahmnmitra.com');     // <-- CHANGE THIS
define('FROM_NAME',  'BrahmnMitra Website');


/* ============================================================
   Below this line you should not need to change anything.
   ============================================================ */

/* Business details — used in the emails and the fallback page.
   Keep these in step with index.html. */
define('BIZ_NAME',    'BrahmnMitra');
define('BIZ_PHONE',   '+91 92117 61885');
define('BIZ_WA',      '919211761885');               // wa.me format: no +, no spaces
define('BIZ_EMAIL',   'info@brahmnmitra.com');
define('BIZ_CITY',    'New Delhi, India');

/* The backup log. Every enquiry is written here BEFORE we try to
   email it, so a mail failure can never lose you a customer.
   logs/.htaccess blocks public access to this directory. */
define('LOG_FILE', dirname(__DIR__) . '/logs/enquiries.log');

/* Simple flood guard: max submissions accepted from one IP per hour.
   Set to 0 to disable. */
define('RATE_LIMIT_PER_HOUR', 12);

/* ---- log rotation ----
   enquiries.log has no natural end — left alone it grows forever and,
   on shared hosting, can quietly eat your disk quota. When the active
   log passes LOG_MAX_BYTES, bm_log() rotates it into logs/archive/ and
   starts a fresh file. Archives older than LOG_KEEP_DAYS are deleted
   automatically. logs/.htaccess denies the whole logs/ tree, which
   covers the archive folder too — nothing extra to configure. */
define('LOG_MAX_BYTES', 2 * 1024 * 1024);   // rotate at 2MB
define('LOG_KEEP_DAYS', 180);               // delete archives older than this

/* Timezone for the timestamps in the log and the emails. */
date_default_timezone_set('Asia/Kolkata');

/* ---- 3. OPTIONAL: SMTP (recommended) -------------------------
   Mail now goes through PHPMailer (includes/PHPMailer). By default
   SMTP_HOST is empty, which tells PHPMailer to hand the message to
   PHP's own mail() the same way the site always has — so a fresh
   upload with nothing configured here still works exactly as before.

   Filling these in switches to an authenticated SMTP connection,
   which is far more likely to land in the inbox than shared-hosting
   mail() ever is. In Hostinger hPanel: Emails -> the mailbox you
   made in Step 2 -> "Connect apps / Configure email client" shows
   the exact host, port and password to use below.

   Leave SMTP_HOST blank to keep using mail() — nothing else needs
   to change. */
define('SMTP_HOST',       '');                 // e.g. 'smtp.hostinger.com' — blank = use mail()
define('SMTP_PORT',       587);                // 587 = STARTTLS (recommended), 465 = SSL
define('SMTP_SECURE',     'tls');              // 'tls' for port 587, 'ssl' for port 465
define('SMTP_USERNAME',   FROM_EMAIL);         // usually the same mailbox as FROM_EMAIL
define('SMTP_PASSWORD',   '');                 // the mailbox password — never commit a real one to git
define('SMTP_DEBUG',      0);                  // 0 = silent, 2 = verbose (logs/enquiries.log) while testing only
