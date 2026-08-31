# BrahmnMitra — Backend Architecture Roadmap & Operations Platform Blueprint

**Target Architecture:** Decoupled Marketing Frontend (`brahmnmitra.com`) + Dedicated Authenticated Operations Application (`admin.brahmnmitra.com` / `app.brahmnmitra.com`) + Centralized RESTful API Service.

---

## 1. Executive Summary & Separation of Concerns

To preserve performance, search engine authority, and client-facing branding on the public marketing site, internal tools (CRM, lead management, quotation generators, invoice vaults, and role-based staff operations) are cleanly separated into a dedicated internal application.

```
                  ┌─────────────────────────────────┐
                  │    brahmnmitra.com (Frontend)   │
                  │   Fast, static, SEO-optimized   │
                  └────────────────┬────────────────┘
                                   │ Public Inquiries & Catalog API
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                 BrahmnMitra Unified API Service                   │
│         (Node.js/Express or PHP Laravel + PostgreSQL/MySQL)        │
│                                                                   │
│  ├── Auth & RBAC (JWT / Secure HttpOnly Sessions)                 │
│  ├── Inquiries & Lead Pipeline Engine                             │
│  ├── Dynamic Catalog Service (Destinations, Packages, Stays)      │
│  ├── Quotation & Booking State Machine                            │
│  ├── Payments & GST Invoicing Integration (Razorpay / Webhooks)   │
│  └── Document Vault & Storage (Encrypted S3 / Cloud Storage)      │
└──────────────────────────────────┬────────────────────────────────┘
                                   ▲
                                   │ Authenticated Staff / Customer Access
                  ┌────────────────┴────────────────┐
                  │ admin.brahmnmitra.com (Portal)  │
                  │  Role-Gated Operations Workspace│
                  └─────────────────────────────────┘
```

---

## 2. Phased Roadmap & Sequencing

### Phase 1: API Foundation & Role-Based Authentication
* **Objective:** Establish the secure data layer and eliminate browser-local storage dependencies.
* **Deliverables:**
  - Relational database schema (PostgreSQL/MySQL) for users, roles, inquiries, and catalogue.
  - Authentication system:
    - Secure password hashing (Argon2id / bcrypt).
    - Session management / HttpOnly JWTs with refresh token rotation.
    - Role-Based Access Control (`SuperAdmin`, `TravelConsultant`, `OperationsLead`, `Accountant`, `Customer`).
  - Rate limiting (Redis / in-memory leaky bucket) and brute-force protection across all auth routes.
  - Centralized structured logging (Winston/Pino or Monolog) with audit trail for sensitive customer records.

### Phase 2: CRM & Lead Pipeline Workflow
* **Objective:** Replace static PHP mailer scripts with an automated, trackable lead pipeline.
* **Deliverables:**
  - `POST /api/v1/inquiries` with honeypot verification, deduplication, and automated email/SMS/WhatsApp notifications.
  - Lead lifecycle state machine:
    - `NEW` → `ASSIGNED` → `CONTACTED` → `PROPOSAL_SENT` → `WON_BOOKED` / `LOST`.
  - Consultant assignment logic with SLA timers and follow-up reminders.
  - Customer timeline log (recording call notes, email exchanges, and itinerary preferences).

### Phase 3: Quotation Builder & Booking Operations
* **Objective:** Enable travel consultants to create structured, branded PDF/web quotations in minutes.
* **Deliverables:**
  - Interactive Itinerary Builder: Day-by-day flight segments, hotel stays, private transfers, and sightseeing notes.
  - Multi-tier pricing calculator (Economy, Superior, Luxury) with automated GST calculation.
  - Quotation sharing link with customer approval button and digital signature capture.
  - Supplier voucher generation for hoteliers and transport vendors.

### Phase 4: Payment Gateway & GST Invoicing
* **Objective:** Secure, automated payment milestones and compliant tax document generation.
* **Deliverables:**
  - Razorpay / Cashfree / Stripe payment gateway integration with webhook listeners.
  - Milestone payment support: Initial Deposit (25%), Mid-term (50%), Final Balance (25%).
  - Automated GST-compliant tax invoices (SAC code 9985 for Tour Operator Services).
  - Credit notes and refund workflow handling.

### Phase 5: Customer Account Portal & Loyalty
* **Objective:** Give travelers a private portal for upcoming itineraries and loyalty tracking.
* **Deliverables:**
  - Customer login via OTP / magic link.
  - Live itinerary tracker with flight PNR status, hotel check-in vouchers, and driver contact cards.
  - BrahmnMitra Rewards Engine (earning points on completed trips, referral credits).

### Phase 6: AI-Assisted Curation & Smart Support
* **Objective:** Accelerate itinerary drafting using curated knowledge bases.
* **Deliverables:**
  - LLM-powered prompt workflow: Input dates, destination, budget, and travel style to generate a tailored 7-day day-by-day outline matching BrahmnMitra partner hotel inventory.
  - Automated pre-trip departure checklists (visa status, weather forecast, packing guides) sent via WhatsApp API.

---

## 3. Database Schema Overview (Core Entities)

```sql
-- Core Accounts & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'consultant', 'ops', 'accountant', 'customer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquiries & CRM Leads
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    destination VARCHAR(150),
    depart_date DATE,
    return_date DATE,
    traveller_count INT DEFAULT 1,
    budget_range VARCHAR(50),
    special_notes TEXT,
    status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'contacted', 'quoted', 'won', 'lost')),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog Items (Packages & Stays)
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('package', 'hotel', 'destination')),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    base_price NUMERIC(12, 2) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations & Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    inquiry_id UUID REFERENCES inquiries(id),
    customer_id UUID REFERENCES users(id),
    total_amount NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Hostinger MySQL Database & Live Deployment

### Database Credentials
- **Host:** `localhost`
- **Port:** `3306`
- **Database:** `u844555645_brahmnmitra`
- **Username:** `u844555645_brahmnmitra`
- **Configuration File:** `backend/.env`

### One-Click Database Initialization & Migration
To create all tables, seed the default Admin account, and import all packages/hotels/destinations:
1. **Via Browser / HTTP:**
   Navigate to `https://brahmnmitra.com/backend/migrate.php`
2. **Via SSH / Terminal:**
   ```bash
   cd backend
   php migrate.php
   ```

### Default Admin Credentials:
- **Email:** `admin@brahmnmitra.com`
- **Password:** `Admin@Brahmnmitra2026!`
*(Please log in to `admin.brahmnmitra.com` and change this password after initial setup).*

---

## 5. Authentication API Endpoints (`/auth.php`)

All requests accept JSON or standard `POST` form data:

| Endpoint | Method | Purpose | Auth Required |
|:---|:---|:---|:---|
| `/auth.php?action=login` | `POST` | Authenticate user & issue Bearer token | No |
| `/auth.php?action=register` | `POST` | Create new customer account | No |
| `/auth.php?action=me` | `GET` | Validate session token & get profile | Yes (Bearer) |
| `/auth.php?action=logout` | `POST` | Revoke active token session | Yes (Bearer) |
| `/auth.php?action=change_password` | `POST` | Update password | Yes (Bearer) |
| `/auth.php?action=list_users` | `GET` | List accounts (Admin only) | Yes (Admin) |

---

## 6. Security & Compliance Checklist

1. **Authentication:** BCRYPT password hashing (`PASSWORD_BCRYPT` with cost 12) + cryptographically secure 64-char Bearer tokens.
2. **Data Protection:** Strict input validation, SQL injection prevention via PDO prepared statements, and DPDP compliance.
3. **Transport Security:** Strict HTTPS (TLS 1.3), HSTS headers, and CSP policies allowing `brahmnmitra.com` and `admin.brahmnmitra.com`.
4. **Environment Variables:** All credentials reside in `backend/.env` which is ignored by Git (`.gitignore`).

