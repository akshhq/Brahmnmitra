# Brahmnmitra — Enterprise Travel Platform & Operations Ecosystem

**Brahmnmitra** is a luxury travel management ecosystem comprising two fully decoupled frontends, a high-performance PHP REST API backend, and a relational Hostinger MySQL database with authentication, role enforcement, and an automated 15-day Recycle Bin retention engine.

```
                                  ┌──────────────────────────────────────────────┐
                                  │           HOSTINGER MYSQL DATABASE           │
                                  │            (u844555645_brahmnmitra)          │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                         │ PDO / Prepared Statements
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │               BACKEND REST API               │
                                  │      (https://brahmnmitra.com/backend)       │
                                  └──────────────┬────────────────┬──────────────┘
                                                 │                │
                        CORS / JSON API Payload  │                │  CORS / Bearer Tokens / CRUD
                                                 ▼                ▼
                 ┌───────────────────────────────────────┐ ┌─────────────────────────────────────────┐
                 │        PUBLIC TRAVELER PORTAL         │ │         ENTERPRISE ADMIN PORTAL         │
                 │         (brahmnmitra.com)             │ │       (admin.brahmnmitra.com)           │
                 └───────────────────────────────────────┘ └─────────────────────────────────────────┘
```

---

## Architecture & Domain Separation

The application is structured into two completely decoupled frontends sharing zero client-side state, communicating strictly via backend REST endpoints:

| Layer | Domain / Location | Technology Stack | Role & Scope |
|---|---|---|---|
| **Public Portal** | `https://brahmnmitra.com` | HTML5, CSS3, Vanilla JS, Three.js, GSAP | Traveler discovery, live packages, trip planning, lead capture & online checkout |
| **Admin Portal** | `https://admin.brahmnmitra.com` (`frontend-admin/`) | HTML5, CSS3, Vanilla JS | Operations dashboard, catalog CRUD, leads CRM, bookings, finance ledger & 15-day recycle bin |
| **Backend API** | `https://brahmnmitra.com/backend` (`backend/`) | PHP 8.x, PDO, PHPMailer | REST API endpoints, CORS handling, authentication, 15-day auto-purge engine & audit trail |
| **Database** | Hostinger Cloud MySQL (`u844555645_brahmnmitra`) | MySQL 8.x (InnoDB, `utf8mb4`) | Relational persistence: users, sessions, leads, bookings, payments, catalog & recycle bin |

---

## 1. Hostinger MySQL Database Architecture

The platform runs on a relational MySQL database on Hostinger (`u844555645_brahmnmitra`). All queries use PDO prepared statements with strict parameter binding to prevent SQL injection.

### What the Database Is Used For:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE TABLE RELATIONSHIPS                              │
│                                                                                        │
│   ┌──────────────┐          ┌────────────────┐          ┌──────────────────────────┐   │
│   │    users     │ ──1:N──> │  auth_tokens   │          │      catalog_items       │   │
│   │ (Admin/Staff)│          │(Bearer Sessions│          │(Packages/Hotels/Deals/Flt│   │
│   └──────────────┘          └────────────────┘          └──────────────────────────┘   │
│          │                                                           │                 │
│          │                                                           │                 │
│          ▼                                                           ▼                 │
│   ┌──────────────┐          ┌────────────────┐          ┌──────────────────────────┐   │
│   │  enquiries   │ ──1:N──> │    bookings    │ ──1:N──> │         payments         │   │
│   │(Travel Leads)│          │ (Reservations) │          │ (Client Receipts/Ledger) │   │
│   └──────────────┘          └────────────────┘          └──────────────────────────┘   │
│                                                                      │                 │
│                                     ┌─────────────────────────┐      │                 │
│                                     │       audit_logs        │ <────┘                 │
│                                     │(Immutable Action History│                        │
│                                     └─────────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Table Specifications:

1. **`users` Table (Authentication & Access Control)**:
   - Manages administrator, operational desk, and staff credentials.
   - Passwords securely hashed with `PASSWORD_BCRYPT` (cost factor 12).
   - Fields: `id`, `email`, `password_hash`, `full_name`, `role` (`admin`, `staff`, `agent`), `is_active`, `created_at`, `updated_at`, `deleted_at`.
   - Supports role-based access control and soft-deletion.

2. **`auth_tokens` Table (Stateless Session Tokens)**:
   - Stores 64-character cryptographically secure Bearer tokens generated upon login.
   - Fields: `id`, `user_id`, `token`, `expires_at` (default 30-day sliding window), `ip_address`, `user_agent`, `created_at`.
   - Automatically validated on protected admin routes via HTTP `Authorization: Bearer <token>` header.

3. **`catalog_items` Table (Dynamic Inventory Management)**:
   - Stores the entire travel catalogue across four categories: **Packages**, **Hotels & Stays**, **Special Deals**, and **Flight Routes**.
   - Fields: `id`, `slug`, `category` (`packages`, `hotels`, `deals`, `flights`), `title`, `destination`, `region`, `duration`, `travel_style`, `price`, `original_price`, `currency`, `image_url`, `description`, `highlights` (JSON), `amenities` (JSON), `flight_details` (JSON), `deal_details` (JSON), `status` (`Active`, `Inactive`), `created_at`, `updated_at`, `deleted_at`.
   - Polled dynamically by both the public portal and admin inventory manager.

4. **`enquiries` Table (Traveler Leads & CRM Pipeline)**:
   - Captures all inbound customer inquiries from the website trip planner, contact forms, and package detail drawers.
   - Fields: `id`, `name`, `email`, `phone`, `destination`, `travel_date`, `travelers_count`, `budget`, `trip_type`, `message`, `status` (`New`, `Contacted`, `Quotation sent`, `Won`, `Lost`), `notes`, `ip_address`, `source_page`, `created_at`, `updated_at`, `deleted_at`.

5. **`bookings` Table (Quotations & Reservations)**:
   - Tracks approved travel proposals, quotation hand-offs, and confirmed customer bookings.
   - Fields: `id`, `booking_id` (`BM-BK-XXXXXX`), `enquiry_id`, `customer_name`, `customer_email`, `customer_phone`, `trip_title`, `destination`, `start_date`, `end_date`, `total_amount`, `paid_amount`, `due_amount`, `status` (`Quoted`, `Confirmed`, `Deposit Received`, `Completed`, `Cancelled`), `notes`, `created_at`, `updated_at`, `deleted_at`.

6. **`payments` Table (Finance & Double-Entry Ledger)**:
   - Records all customer payment transactions, gateway checkouts, advance deposits, and disbursements.
   - Fields: `id`, `booking_id`, `customer_name`, `amount`, `currency`, `method` (`Online Gateway`, `Bank Transfer NEFT/RTGS`, `UPI`, `Cash`), `utr_number`, `transaction_reference`, `gateway_order_id`, `gateway_payment_id`, `status` (`Received (Full)`, `Advance / Deposit`, `Pending`, `Refunded`), `notes`, `timestamp`, `deleted_at`.

7. **`audit_logs` Table (Immutable Compliance Trail)**:
   - Permanent, tamper-proof activity logging for security, operations, and financial auditing.
   - Fields: `id`, `timestamp`, `category` (`AUTH`, `CATALOG_EDIT`, `CUSTOMER_PAYMENT`, `VENDOR_PAYOUT`, `INVOICE_GENERATED`, `LEAD_STATUS`, `RECYCLE_BIN`, `GENERAL`), `actor`, `action`, `details` (JSON payload), `ip_address`.
   - Never soft-deleted; preserved indefinitely for enterprise compliance.

---

## 2. 15-Day Recycle Bin Retention System

The database and backend engine incorporate an automated **15-Day Recycle Bin** architecture. When items are deleted anywhere in the system, they are soft-deleted and preserved for exactly 15 days before automatic permanent purge.

```
                           SOFT DELETION & 15-DAY RETENTION TIMELINE
 
   [Item Active] ──(Delete)──> [Recycle Bin Entry] ──(15 Days Auto-Purge)──> [Permanent Wipe]
   deleted_at: NULL            deleted_at: NOW()                              Record REMOVED from DB
                                  │
                                  └──(Restore Action within 15d)──> [Item Active]
                                                                     deleted_at: NULL
```

### Key Technical Mechanisms:

- **Soft Deletion (`deleted_at` Timestamp)**:
  Deleting an item sets `deleted_at = NOW()`. The record remains in MySQL but is immediately hidden from active public listings and operations tables.
- **Active Record Filtering**:
  All standard queries in `catalog.php`, `enquiry.php`, `bookings.php`, and `payments.php` include `WHERE deleted_at IS NULL`.
- **Dynamic Expiry & Days Remaining Math**:
  When querying the Recycle Bin (`GET /recycle_bin.php`), the engine computes:
  $$\text{Days Remaining} = \max\left(0, \left\lceil 15 - \frac{\text{Current Time} - \text{Deleted Time}}{86400} \right\rceil\right)$$
- **Automated 15-Day Purge Query**:
  Every call to `recycle_bin.php` executes the auto-purge routine:
  ```sql
  DELETE FROM table_name WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 15 DAY);
  ```
- **Instant Item Restoration (`POST action=restore`)**:
  Resets `deleted_at = NULL`, instantly returning the package, lead, booking, or payment back to its original active state.
- **Hard Deletion (`POST action=hard_delete`) & Empty Bin (`action=empty_bin`)**:
  Allows manual, permanent wiping of selected items or the entire trash bin upon administrative confirmation.

---

## 3. Public Traveler Frontend (`brahmnmitra.com`)

The public traveler website is a fast, SEO-optimized, accessible portal engineered with Vanilla HTML5, CSS3, and JavaScript, featuring cinematic 3D visualizations.

### Features & Capabilities:

1. **Clean, Extensionless URLs & Routing**:
   - Configured via Apache `.htaccess` rewrite rules for clean URLs:
     - `/` — Homepage & Interactive Trip Discovery
     - `/packages` — Complete Holiday & Curated Packages Catalog
     - `/hotels` — Curated Luxury Resorts, Palaces & Heritage Stays
     - `/destinations` — Regional & Thematic Destination Guides
     - `/pay` — Direct Online Checkout & Payment Gateway Portal
     - `/about` — Heritage, Company Story & Brand Vision
     - `/contact` — 24/7 Concierge & Travel Desk Inquiries
     - `/privacy` & `/terms` — GDPR & Legal Compliance Policies
     - `/travel-assistant` — AI Concierge & Bespoke Travel Builder
     - `/account` — Traveler Workspace, Bookmarks & Draft Itineraries
     - `/platform` — Architecture Overview & Technical Documentation
2. **Cinematic 3D Flight Experience**:
   - WebGL / Three.js interactive airplane model with orbit controls, realistic atmospheric lighting, and day/night weather effects.
   - Smooth GSAP scroll-triggered animations with automatic `prefers-reduced-motion` accessibility fallbacks.
3. **Live Database Catalog Sync with Offline Fallback**:
   - Queries `backend/catalog.php` on page load to display live packages, stays, and pricing from Hostinger MySQL.
   - Seamlessly falls back to `data/travel-catalog.json` if the network is disconnected or backend is in maintenance mode.
4. **Interactive Trip Planner & Instant Filtering**:
   - Search by keyword, region (Domestic/International), travel style, star rating, duration, and budget.
   - Instant Indian Rupee (`₹` INR) currency formatting.
5. **Lead Capture & Inquiry Dispatch**:
   - Inquiries sent asynchronously to `/backend/enquiry.php`.
   - Dual action: Ingests lead into Hostinger MySQL `enquiries` table + sends branded HTML confirmation emails to customer and concierge desk via PHPMailer/SMTP.
6. **Online Checkout & Payment Portal (`/pay`)**:
   - Live transaction calculator with 5% GST breakdown under SAC 9985.
   - Supports instant booking reference lookup, advance/deposit mode, and bank UTR submission.
7. **Comprehensive Technical SEO & OpenGraph**:
   - Standardized canonical tags, meta descriptions, OpenGraph social cards, Twitter meta tags, and structured JSON-LD (`TravelAgency`, `Organization`, `WebSite`).

---

## 4. Enterprise Admin & Operations Portal (`admin.brahmnmitra.com`)

Housed in `frontend-admin/`, the operations portal is a full-featured travel management system designed for executive desks, booking agents, and finance teams.

### Features & Operational Modules:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             ADMIN OPERATIONS DASHBOARD                                 │
├───────────────┬───────────────────────────────┬────────────────────────────────────────┤
│ 📊 Overview   │ 📦 Inventory / Catalogue CRUD │ 🗑️ 15-Day Recycle Bin (Live Badge)    │
│ 👥 Leads CRM  │ 📋 Quotations & Bookings      │ 🧾 GST Tax Invoices (SAC 9985)         │
│ 💰 Finance    │ ⚡ Gateway Sandbox (Dev Mode) │ 📜 System Audit Trail (Immutable Logs) │
└───────────────┴───────────────────────────────┴────────────────────────────────────────┘
```

1. **Executive Operations Dashboard (`#view-overview`)**:
   - Real-time KPI metric strip: **Open Leads**, **Active Bookings**, **Client Revenue**, **Vendor Outflows**, **Gross Profit Margin (%)**, and **Active Inventory Count**.
   - Cash flow visualization comparing inflows vs vendor payables.
   - Quick action shortcuts (`+ Lead`, `⚡ Test Checkout`).
2. **15-Day Recycle Bin View (`#view-recycle-bin`)**:
   - Dedicated navigation item with dynamic item count badge (`#recycle-bin-badge`).
   - Summary statistics: **Total Recycled Items**, **Expiring Soon (< 3 days)**, and **15-Day Policy Status**.
   - Category filtering: *All Items*, *Packages & Stays*, *Leads & Enquiries*, *Bookings & Quotes*, *Finance & Ledger*.
   - Item cards featuring countdown pills (`⏱️ 14 days left` / pulsating `⏱️ Expiring Soon`), exact auto-purge timestamps, **↺ Restore** button, and **✕ Delete Permanently** button.
   - Global toolbar actions: **🧹 Purge Expired (>15d)** and **🗑️ Empty Recycle Bin**.
3. **Inventory & Catalogue Management (`#view-catalogue`)**:
   - Full CRUD for Packages, Hotels, Flash Deals, and Flight Routes.
   - Interactive glassmorphic modal with category-specific field builders (duration, style, highlights, amenities, cabin class, promo codes, original vs discounted pricing).
   - Single item create/update pushed directly to `/backend/catalog.php?action=save_item`.
   - Item deletion safely routes to the 15-day Recycle Bin.
4. **Leads & Customer Inquiry CRM (`#view-leads`)**:
   - Live lead ingestion feed populated from MySQL `enquiries` table.
   - Inline status pipeline switcher: `New` → `Contacted` → `Quotation sent` → `Won` → `Lost` (instantly syncs to database).
   - Search by customer name, email, phone, or destination.
   - Delete action soft-deletes lead and moves it to Recycle Bin.
5. **Quotations & Travel Bookings (`#view-bookings`)**:
   - Track booking proposals (`BM-BK-XXXXXX`), customer details, package titles, contract values, advance deposits, and pending balances.
   - Single-click action to generate compliant GST tax invoice or launch payment checkout.
   - Deletion moves booking to 15-day Recycle Bin.
6. **Two-Way Finance & Vendor Ledger (`#view-finance`)**:
   - Double-entry ledger tracking **Client Collections (Inflows)** vs **Vendor Disbursements (Outflows)** to airlines, hotels, transport providers, and visa agents.
   - Automatic net gross margin calculation with percentage yields.
   - Track pending receivables from clients and pending payables to vendors.
   - Transaction deletion moves records to Recycle Bin.
7. **GST Tax Invoice Generator (`#view-invoices`)**:
   - SAC 9985 compliant tax invoice builder for tour operator services (5% GST rate).
   - Dynamic line items builder with automatic subtotal, CGST/SGST (intra-state), and IGST (inter-state) tax computation.
   - Printable and PDF-exportable invoice preview with print stylesheets.
8. **Payment Gateway Sandbox (`#view-gateway`)**:
   - Developer simulation workbench for checkout flows, test UPI handles, net banking, and card simulations.
   - Test full payments or 30% advance deposits with automatic UTR generation, ledger insertion, and instant receipt generation.
9. **Audit & Activity Logging (`#view-logs`)**:
   - Displays real-time operational events, login attempts, catalog edits, payment logs, and status updates synced from `/backend/logs.php`.
10. **Workspace Backup & Migration (`#view-settings`)**:
    - One-click export of complete workspace JSON snapshots for offline backup and disaster recovery.

---

## 5. Backend REST API Architecture (`backend/`)

The backend is built in modular PHP 8.x, adhering to modern API design principles with strict type safety, PDO parameterized queries, and CORS multi-origin handling.

```
backend/
├── .env                  # Hostinger MySQL credentials & environment keys (Git-ignored)
├── .env.example          # Environment template for deployment
├── index.php             # Service health check & API status endpoint
├── auth.php              # BCRYPT Authentication & Bearer token REST API
├── catalog.php           # Inventory CRUD & soft deletion endpoint
├── enquiry.php           # Lead capture, inquiry pipeline & mailer endpoint
├── bookings.php          # Quotations & booking proposals endpoint
├── payments.php          # Payment transactions & ledger verification endpoint
├── recycle_bin.php       # 15-day soft delete, restoration & auto-purge engine
├── logs.php              # Immutable audit trail persistence endpoint
├── migrate.php           # Schema migration, default admin & catalog seeder
├── schema.sql            # MySQL schema DDL with 15-day retention fields
└── includes/
    ├── config.php        # Native .env loader & constant definitions
    ├── db.php            # Shared PDO database singleton
    ├── helpers.php       # JSON responses, CORS headers, input sanitization
    └── auth_helper.php   # Bearer token validation & role enforcement
```

### Complete API Endpoint Reference:

| Endpoint | Method | Action / Purpose | Auth Required |
|---|---|---|---|
| `/` | `GET` | API Health Check, service status, database connectivity | Public |
| `/auth.php?action=login` | `POST` | Authenticate admin/staff, return 64-char Bearer token | Public |
| `/auth.php?action=register`| `POST` | Register new agent/staff user account | Admin Only |
| `/auth.php?action=me` | `GET` | Validate Bearer token & return current user profile | Bearer Token |
| `/auth.php?action=logout` | `POST` | Revoke & invalidate current Bearer token session | Bearer Token |
| `/catalog.php` | `GET` | Fetch all active inventory (packages, hotels, deals, flights) | Public |
| `/catalog.php?action=save_item` | `POST` | Create or update a single inventory item in MySQL | Admin / Staff |
| `/catalog.php?action=delete_item` | `POST` | Soft-delete inventory item to 15-day Recycle Bin | Admin / Staff |
| `/enquiry.php` | `POST` | Ingest traveler inquiry, record lead in MySQL & send email | Public |
| `/enquiry.php` | `GET` | List all active customer leads (excluding soft-deleted) | Admin / Staff |
| `/enquiry.php?action=update_lead` | `POST` | Update lead pipeline status or operational notes | Admin / Staff |
| `/enquiry.php?action=delete_lead` | `POST` | Soft-delete lead to 15-day Recycle Bin | Admin / Staff |
| `/bookings.php` | `GET` | List all active travel quotations and bookings | Admin / Staff |
| `/bookings.php?action=save_booking` | `POST` | Create or update booking quotation in MySQL | Admin / Staff |
| `/bookings.php?action=delete_booking` | `POST` | Soft-delete booking to 15-day Recycle Bin | Admin / Staff |
| `/payments.php` | `GET` | Fetch active double-entry finance transactions | Admin / Staff |
| `/payments.php?action=record_payment` | `POST` | Record manual or gateway transaction into ledger | Admin / Staff |
| `/payments.php?action=delete_payment` | `POST` | Soft-delete ledger record to 15-day Recycle Bin | Admin / Staff |
| `/recycle_bin.php` | `GET` | Auto-purge >15d items & list soft-deleted records with days remaining | Admin / Staff |
| `/recycle_bin.php?action=soft_delete` | `POST` | Soft-delete any entity (`catalog`, `lead`, `booking`, `payment`) | Admin / Staff |
| `/recycle_bin.php?action=restore` | `POST` | Restore soft-deleted item back to active inventory | Admin / Staff |
| `/recycle_bin.php?action=hard_delete` | `POST` | Permanently remove record from Hostinger database | Admin / Staff |
| `/recycle_bin.php?action=empty_bin` | `POST` | Permanently wipe all soft-deleted records | Admin / Staff |
| `/recycle_bin.php?action=purge_expired` | `POST` | Purge records exceeding the 15-day retention limit | Admin / Staff |
| `/logs.php` | `GET` | Fetch timestamped audit logs from MySQL | Admin / Staff |
| `/logs.php` | `POST` | Record immutable operational action to audit trail | Admin / Staff |
| `/migrate.php` | `GET` / `POST` | Execute schema DDL, seed default admin & import catalog | Admin / CLI |

---

## 6. Installation & Deployment Guide

### Prerequisites
- Web server with PHP 8.0+ (`mod_rewrite`, `pdo_mysql`, `openssl`, `mbstring`, `json` enabled).
- Hostinger MySQL Database (or any compatible MySQL 8.x instance).

### 1. Database Configuration
1. Navigate to the `backend/` directory.
2. Create or configure `.env` with your Hostinger database credentials:
   ```env
   DB_HOST=localhost
   DB_NAME=u844555645_brahmnmitra
   DB_USER=u844555645_brahmnmitra
   DB_PASS=Brahmnmitra@1234
   DB_PORT=3306

   ALLOWED_ORIGIN=https://brahmnmitra.com,https://admin.brahmnmitra.com,https://brahmnmitra.imperioncapitals.com,http://localhost:8000
   ENVIRONMENT=production
   ```

### 2. Database Migration & Auto-Seeding
Run the database migration script via CLI or browser:
```bash
php backend/migrate.php
```
*This automatically creates all 7 relational tables, creates the default Admin account (`admin@brahmnmitra.com` / `Admin@Brahmnmitra2026!`), and seeds initial catalog items from `data/travel-catalog.json`.*

### 3. Web Server Host Configuration (Apache / Hostinger)

Ensure Apache `.htaccess` is placed in the public web root for clean extensionless URLs:

- **Public Website (`brahmnmitra.com`)**:
  Points to the root directory (`/`).
- **Admin Portal (`admin.brahmnmitra.com`)**:
  Points to the `frontend-admin/` subfolder.
- **Backend API (`brahmnmitra.com/backend`)**:
  Points to the `backend/` subfolder.

---

## 7. Security & Compliance Standards

- **Zero Direct Frontend Linkage**: The public site and admin portal share no browser storage or direct couplings.
- **SQL Injection Prevention**: 100% of database interactions utilize PDO prepared statements with strict parameter binding.
- **BCRYPT Password Security**: User passwords are encrypted using PHP `password_hash` with cost factor 12.
- **Session Protection**: Stateless 64-character crypto Bearer tokens with sliding expiration and IP binding.
- **Cross-Origin Resource Sharing (CORS)**: Multi-origin whitelisting restricted strictly to authorized portal domains.
- **GST Compliance**: Tax invoice calculations comply with Indian GST law under Tour Operator SAC 9985 (5% rate).
- **Data Protection**: 15-day soft-delete grace period prevents accidental data loss while ensuring compliance.

---

## 8. License & Proprietary Rights

© 2026 Brahmnmitra. All rights reserved.  
Proprietary software developed for **Brahmnmitra Enterprise Travel Operations Desk**.
