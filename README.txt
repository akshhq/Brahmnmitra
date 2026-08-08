================================================================
 BRAHMNMITRA — WEBSITE PACKAGE
 (v4.2 — mail now goes through PHPMailer instead of raw mail(),
  with optional SMTP; strict Content-Security-Policy + Subresource
  Integrity on the CDN scripts; branded 404/500 pages. See section
  8 before you go live. v4.1 changes: title shortened for SEO;
  visible "Skip intro" button; footer heading levels fixed; hero
  photo slot added, off by default — see
  assets/images/README-IMAGES.txt to switch on)
 Flights · Tours · MICE · Domestic & International
================================================================

Everything in this folder drops straight into public_html on
Hostinger. There is no build step, no Node, no Docker. Upload it
and it runs.


----------------------------------------------------------------
 1.  GO LIVE IN FOUR STEPS
----------------------------------------------------------------

STEP 1 — UPLOAD
  Upload the whole folder into public_html, keeping the structure
  exactly as it is. index.html must sit at the top level, not
  inside a sub-folder.

STEP 2 — CREATE THE SENDING MAILBOX
  In Hostinger hPanel:  Emails -> Create mailbox
  Make:                 enquiry@brahmnmitra.com

  Why: Hostinger's mail() only delivers reliably when the "From"
  address is a real mailbox on your own domain. If you skip this,
  enquiry emails go to spam — or vanish.

STEP 3 — EDIT ONE FILE
  Open  includes/config.php  and change two lines:

      define('TO_EMAIL',   'info@brahmnmitra.com');
      define('FROM_EMAIL', 'enquiry@brahmnmitra.com');

  TO_EMAIL   = where you want enquiries to land (any inbox).
  FROM_EMAIL = the mailbox you just created in Step 2.

  That is the ONLY file you need to edit. Nothing else.

STEP 4 — TEST IT
  Open the site, fill in the form, hit Send Inquiry.
  - An email should arrive at TO_EMAIL.
  - A line should appear in logs/enquiries.log.
  If the email doesn't arrive but the log line does, the problem
  is Step 2 — the From mailbox doesn't exist yet.


----------------------------------------------------------------
 2.  THINGS YOU SHOULD FIX BEFORE YOU SHOW THIS TO A CUSTOMER
----------------------------------------------------------------

These are not bugs in the code. They are content problems carried
over from the old site, and they are reproduced here exactly as
you asked. Read this section before you go live.

--- STATS ---

  The site currently claims:

      500+    Happy Clients            (hero)
      50+     Destinations             (hero)
      24/7    On-Ground Support        (hero)
      10+     Years of Experience      (about)
      500+    Happy Corporate Clients  (about)
      50,000+ Trips Managed            (about)
      98%     Client Retention         (about)

  Do this division:  50,000 trips / 500 clients = 100 trips each.
  Over 10 years, that is 10 trips per client per year, every year,
  without fail. Plausible for a handful of big corporate accounts.
  Not plausible across 500 of them.

  A prospect who does that arithmetic stops trusting the rest of
  the page — including the parts that are true.

  Three options:
    a) The numbers are real -> leave them.
    b) They're inflated     -> give me the real ones, I'll swap them.
    c) You'd rather not     -> delete the <section id="stats"> block
                               and the .about-stats block in
                               index.html. A clean site with no
                               numbers beats a site with numbers
                               that don't survive division.

--- TESTIMONIALS ---

  The three testimonials are attributed to:

      Rajesh Mehta — CFO, TechNova Pvt Ltd
      Priya Sharma — HR Head, Greenfield Industries
      Anil Kapoor  — Director, Sunrise Exports

  "Anil Kapoor" is one of the most famous actors in India. Every
  Indian visitor will notice. TechNova / Greenfield / Sunrise
  Exports are the kind of generic names an AI generates by default.

  Together they read as unedited template filler, and they cast
  doubt on everything else on the page.

  Two options:
    a) They're real -> keep them, but get written permission to
                       use the names and company names.
    b) They're not  -> replace them with real ones, or delete the
                       whole <section id="testimonials"> from
                       index.html.

  A fake testimonial is worse than no testimonial. An empty space
  costs you nothing. A caught fake costs you the deal.

--- SOCIAL ICONS ---

  There are none, deliberately. Add them only for accounts that
  exist AND are actually posted to. An icon linking to a dead
  Instagram is worse than no icon.


----------------------------------------------------------------
 3.  WHAT'S IN THE BOX
----------------------------------------------------------------

  index.html           the whole site — every heading and every
                       paragraph is real HTML, visible with
                       JavaScript switched off
  enquiry.php          the form backend
  .htaccess            HTTPS, compression, caching, security
                       headers, CSP, error pages — see section 8
  404.html, 500.html   branded error pages (.htaccess points here)
  robots.txt           crawler rules
  sitemap.xml          for Google Search Console
  favicon.ico

  assets/css/
    style.css          colours, layout, every component
    animations.css     the liquid glass + the aeroplane cinematic
    responsive.css     phones, tablets, desktops (load LAST)

  assets/js/
    main.js            the 747 flight engine  <- see section 5
    navigation.js      header + mobile menu
    counter.js         the stat numbers counting up
    timeline.js        the process rail + panel reveals
    form-validation.js the enquiry form

  assets/images/branding/
    logo.svg           for light backgrounds
    logo-white.svg     for dark backgrounds
    og-image.jpg       the WhatsApp / LinkedIn share card
    favicon.png

  includes/
    config.php         <- THE ONLY FILE YOU EDIT
    mailer.php         builds and sends the email, via PHPMailer
    helpers.php        validation + safety
    PHPMailer/         vendored library (3 plain files, no
                       Composer needed) — never edit these

  logs/
    enquiries.log      every enquiry, as a backup
    .htaccess          keeps that log off the public web
                       *** DO NOT DELETE THIS FILE ***

  data/
    services.json      the master list of your 8 services


----------------------------------------------------------------
 4.  THE SAFETY NET
----------------------------------------------------------------

  Every enquiry is written to logs/enquiries.log BEFORE the email
  is attempted. So if the mail server is down, the enquiry is
  still on your disk. You have not lost the customer.

  If the form ever fails for a visitor, they are NOT left staring
  at a broken page. They are shown your phone number and a
  WhatsApp link, so they can reach you anyway.

  The "Send on WhatsApp instead" button needs no backend at all.
  It builds a pre-filled message and opens WhatsApp. It works
  even if PHP is completely broken.

  SECURITY: logs/enquiries.log contains your customers' names,
  phone numbers and email addresses. logs/.htaccess is what stops
  anyone downloading it from the web. Do not delete it.

  ROTATION: enquiries.log rotates itself automatically once it
  passes 2MB — the old file moves to logs/archive/ (also blocked
  from the web by the same .htaccess) and a fresh log starts.
  Archives older than 180 days are deleted on the next rotation.
  No cron job to set up; it just happens on the next form
  submission after the size threshold is crossed. Adjust
  LOG_MAX_BYTES / LOG_KEEP_DAYS in includes/config.php if you
  want different limits.


----------------------------------------------------------------
 5.  THE AEROPLANE — READ THIS BEFORE TOUCHING main.js
----------------------------------------------------------------

  The intro is a 3D flight: the aircraft comes in from deep space,
  banks into a right turn, and the camera flies you through a
  cabin window into the site. Every number in main.js was tuned
  against the rendered frame. If you change them casually, it will
  break in ways that are hard to diagnose.

  T = { ... }     The pacing. Fractions of the intro scroll, 0-1.
                  RULE: windowIn must START AFTER planeIn ENDS.
                  If they overlap, the plane's motion and the
                  camera's motion compound, and the aircraft
                  appears to lunge at you.

  KEYS = [ ... ]  The flight path: t, x, y, z, yaw(degrees).
                  yaw   0 = nose pointing at the camera
                  yaw +90 = turned right, window row facing you
                  RULE: x and z must each move in ONE direction
                  only. If x goes -10 -> +11 -> 0, the aircraft
                  visibly snaps sideways.

  CAM_HOME        Where the camera watches from. Nearer = the
                  plane fills more of the frame.

  The window aperture size (19vh x 30vh, or 26vh x 34vh on
  portrait) is written in TWO places — the .window-frame rule in
  animations.css, and the portrait() calculation in main.js.
  Change one and you must change the other, or the bezel and the
  hole it frames will drift apart.

  IF A VISITOR HAS "REDUCE MOTION" TURNED ON, or their browser
  has no WebGL, or the CDN is blocked — the 3D intro is skipped
  entirely and a clean static hero is shown instead. Everything
  else on the site still works. This is intentional.


----------------------------------------------------------------
 6.  MAIL: SMTP IS OPTIONAL, NOT REQUIRED
----------------------------------------------------------------

  Mail now goes through PHPMailer (includes/PHPMailer) instead of
  calling PHP's mail() directly. This does NOT change Step 2/3 of
  Section 1 — with nothing extra configured, PHPMailer hands the
  message to mail() the same way the site always has, so a fresh
  upload with only TO_EMAIL / FROM_EMAIL filled in works exactly
  as before.

  If you want mail to actually authenticate as your mailbox
  (far less likely to land in spam than shared-hosting mail()),
  fill in the SMTP_* constants near the bottom of
  includes/config.php:

      define('SMTP_HOST',     'smtp.hostinger.com');  // from hPanel
      define('SMTP_PASSWORD', 'the mailbox password');

  Hostinger hPanel -> Emails -> your mailbox -> "Connect apps" (or
  "Configure email client") shows the exact host/port for your
  account. Leave SMTP_HOST blank to keep using mail() — nothing
  else needs to change.

  To test SMTP without guessing: set SMTP_DEBUG to 2 temporarily,
  submit the form once, then check logs/enquiries.log for a
  smtp_debug line showing the conversation. Set it back to 0 once
  it's sending cleanly — verbose debug output has no place staying
  on in production.


----------------------------------------------------------------
 7.  THE CONTENT-SECURITY-POLICY (CSP)
----------------------------------------------------------------

  .htaccess now sends a strict CSP header: the browser will refuse
  to run any script, load any style, or connect to any address
  that isn't explicitly allow-listed. This is a real behaviour
  change, not just a header — test it.

  AFTER YOU UPLOAD: open the live site with the browser DevTools
  Console open (F12) and watch for red lines starting "Refused
  to...". None should appear. If one does, it means something on
  the page reaches outside what's currently allow-listed — do NOT
  just add 'unsafe-inline' to make it go away; find out what
  changed and allow-list that one thing specifically. The comment
  block directly above the CSP line in .htaccess explains what
  every part of the current policy is for.

  If you ever change which CDN serves three.js/GSAP, or bump their
  versions, you also need a new Subresource Integrity (SRI) hash —
  the <script integrity="sha512-..."> attributes in index.html.
  A version bump with the OLD hash still in place will simply fail
  to load, silently, with only a Console warning to tell you why.
  Generate a fresh one with:

      curl -s <the new file URL> | openssl dgst -sha512 -binary | openssl base64 -A


----------------------------------------------------------------
 8.  AFTER YOU GO LIVE
----------------------------------------------------------------

  1. Go to  https://search.google.com/search-console
     Add brahmnmitra.com, verify it, and submit sitemap.xml.
     This is how you CONFIRM Google has indexed the site, rather
     than assuming it. (The old site returned zero results for
     its own name for exactly this reason.)

  2. Paste your URL into  https://www.opengraph.xyz  and check
     the share card shows YOUR image, not a placeholder.

  3. Open the site on a real Android phone, not a resized desktop
     browser. Test the menu and the form.

  4. Once HTTPS is confirmed working, you can switch on the HSTS
     line in .htaccess (it is commented out). Do NOT switch it on
     before that, or a broken certificate will lock visitors out
     for a year.


----------------------------------------------------------------
 9.  NOTES
----------------------------------------------------------------

  - three.js and GSAP load from a CDN (cdnjs.cloudflare.com), so
    the 3D intro needs an internet connection. If the CDN is
    unreachable, the site degrades gracefully to the static hero.
    Nothing breaks.

  - Fonts (Unbounded, Archivo) load from Google Fonts. To go fully
    self-hosted, drop the .woff2 files into assets/fonts/ and
    replace the <link> in index.html with an @font-face block.

  - The service list lives in THREE places that must agree:
    the cards in index.html, the footer column in index.html, and
    the <select> in the form (which must match the whitelist in
    includes/helpers.php). data/services.json is the master copy.
    Add a service? Add it in all of them.

================================================================
 Questions: the code is commented throughout. Start with
 includes/config.php — it's the only file you need.
================================================================
