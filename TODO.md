# BrahmnMitra Implementation TODO (Pending Work)

> Focused actionable implementation tracker containing only pending tasks, upcoming architectural prerequisites, and items awaiting client input.
> Reconciled against [brahmnmitra-full-review.md](file:///d:/Clg/Client%20Work/brahmnmitra/brahmnmitra-full-review.md) & [brahmnmitra-full-review (1).md](file:///d:/Clg/Client%20Work/brahmnmitra/brahmnmitra-full-review%20%281%29.md).
>
> Statuses:
> - `[~]` IN PROGRESS
> - `[ ]` PENDING IMPLEMENTATION
> - `[!]` BLOCKED (Requires Human / Client Input)

---

## Pending Work Summary

- **0. Core Prerequisites & Auth Architecture**: 6 pending
- **P3. Future Scale & Live Integrations**: 5 pending
- **Blocked / Requires Client Input**: 4 items

---

# 0. Core Prerequisites & High-Priority New Features (Auth & Security Architecture)

> [!IMPORTANT]
> **Authentication is the primary architectural prerequisite** before enabling real customer data, live ticketing documents, private booking vouchers, and multi-user corporate accounts on `account.html` and `frontend-admin/`.

- [ ] **0.1 Complete Customer Authentication System (`account.html`)**:
  - Implement secure user registration (Email/Phone, Password, Name, Company).
  - Password hashing with industry-standard bcrypt / Argon2id.
  - Session management via secure, `HttpOnly`, `SameSite=Strict` cookies or JWT tokens.
  - Customer login modal / auth page with password reset & email verification.
  - Protect `account.html` profile data, personal travel history, saved itineraries, and booking vouchers behind active login sessions.

- [ ] **0.2 Admin & Operations Role-Based Authentication (`frontend-admin/`)**:
  - Implement strict server-side authentication gate for the Operations & Finance portal.
  - Role-Based Access Control (RBAC) tiers: `Super Admin`, `Operations Manager`, `Finance & Invoicing Desk`, `Travel Consultant`.
  - Multi-Factor Authentication (MFA / OTP) for financial actions (recording disbursements, issuing tax invoices, modifying inventory pricing).

- [ ] **0.3 Persistent Production Database Backend (PostgreSQL / MySQL)**:
  - Replace client-side `localStorage` / static JSON file writes with a structured relational database schema:
    - `users` (id, email, password_hash, role, profile_data, created_at)
    - `leads` (id, contact_info, destination, budget, status, assigned_agent)
    - `inventory_items` (id, type, name, destination, price, details, active_status)
    - `bookings` (id, user_id, trip_details, quotation_amount, advance_paid, status)
    - `payments_ledger` (id, booking_id, type_inflow_outflow, amount, party, utr, status)
    - `invoices` (id, invoice_no, client_id, line_items, tax_breakdown, balance_due)
    - `audit_logs` (id, timestamp, actor_id, category, action, payload_diff, ip)

- [ ] **0.4 Live Payment Gateway Production Integration (Razorpay / Stripe)**:
  - Transition from sandbox dev mode to live merchant gateway.
  - Server-side order creation (`/api/gateway/create-order`) with HMAC-SHA256 signature verification.
  - Webhook listener endpoint with replay attack prevention and idempotency keys to handle asynchronous bank settlements.

- [ ] **0.5 Production Hosting & Zero-Downtime Infrastructure**:
  - Upgrade backend from Render free tier to a persistent production instance (avoiding 20–50s spin-down latency).
  - Implement automated health check heartbeat and Redis caching layer for catalog queries.

- [ ] **0.6 Minified Asset Bundling & Production Build Pipeline**:
  - Set up a lightweight build/bundle step for `main.js` (30KB unminified) and CSS stylesheets (`style.css`, `portal.css`, `responsive.css`) to optimize throttled mobile connections.

---

# P3. Future Scale & Live Integrations (Roadmap)

## Live Flight & Hotel Inventory
- [ ] **P3-01 Direct Flight GDS API Integration**:
  - Connect Amadeus / Sabre / TBO flight API for real-time seat inventory, live fare rules, and instant PNR generation.

- [ ] **P3-02 Hotel Channel Manager & Live Room Allocations**:
  - Connect Hotelbeds / RateGain API for live room availability and instant booking confirmation numbers.

## Operations & CRM Automation
- [ ] **P3-03 Automated WhatsApp Business API Dispatch**:
  - Send instant booking vouchers, PNR updates, and flight disruption alerts directly to customer WhatsApp numbers via Meta WhatsApp Cloud API.

- [ ] **P3-04 Automated Vendor Payout Processing**:
  - Integrate automated vendor payouts via bank API (e.g. ICICI / HDFC Corporate Banking API / RazorpayX) for scheduled vendor settlements.

## Multi-Market Localization
- [ ] **P3-05 Multi-Currency & Internationalization**:
  - Dynamic currency conversion (USD, EUR, GBP, AED) and `hreflang` metadata when expanding marketing campaigns beyond the domestic India market.

---

# Blocked / Requires Human & Client Input

- [!] **Verified GSTIN Registration Number**:
  - Insert official 15-character GSTIN once provided by client (currently formatted as transparent "GSTIN provided upon booking confirmation & corporate invoicing").

- [!] **Official IATA / TAAI Membership Accreditation**:
  - Add verified membership ID if formal accreditation is acquired in the future.

- [!] **Corporate LinkedIn Company Profile URL**:
  - Add official LinkedIn company page link to footer once published.

- [!] **Production Payment Gateway Merchant Credentials**:
  - Provide live Razorpay / Stripe API Key & Secret for production switchover.
