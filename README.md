# Brahmnmitra — Website & Travel Platform

**Project:** Brahmnmitra  
**Current package:** Existing static travel-agency website + PHP enquiry backend  
**Planned direction:** Premium travel website → customer travel platform → CRM → loyalty → AI → finance

---

## 1. Project Overview

Brahmnmitra is a premium travel-agency website focused on:

- Domestic travel
- International travel
- Tours
- Tailor-made journeys
- Luxury travel
- Heritage tours
- MICE & corporate travel
- Ground transportation
- Domestic flights
- International flights

The **current project is intentionally lightweight** and can be deployed directly to shared hosting such as Hostinger. It currently has:

- HTML/CSS/JavaScript frontend
- Three.js + GSAP cinematic airplane intro
- PHP enquiry backend
- PHPMailer
- Optional SMTP
- Server-side validation
- Enquiry logging
- Log rotation
- Security headers / CSP
- Branded 404/500 pages
- Responsive design
- Accessibility / reduced-motion fallback

The long-term goal is to evolve Brahmnmitra into:

> **A premium travel brand on the outside + a complete travel-management platform on the inside.**

---

# 2. CURRENT PROJECT STRUCTURE

```text
brahmnmitra/
│
├── index.html
├── enquiry.php
├── .htaccess
├── 404.html
├── 500.html
├── favicon.ico
├── robots.txt
├── sitemap.xml
├── README.txt
├── START-LOCAL-SERVER.txt
├── start-windows.bat
├── start-mac-linux.command
│
├── .vscode/
│   └── settings.json
│
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── animations.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── main.js
│   │   ├── navigation.js
│   │   ├── counter.js
│   │   ├── timeline.js
│   │   └── form-validation.js
│   │
│   ├── fonts/
│   │   ├── fraunces/
│   │   └── inter/
│   │
│   └── images/
│       ├── about/
│       ├── branding/
│       ├── hero/
│       ├── misc/
│       └── services/
│
├── data/
│   └── services.json
│
├── includes/
│   ├── config.php
│   ├── helpers.php
│   ├── mailer.php
│   └── PHPMailer/
│       ├── Exception.php
│       ├── PHPMailer.php
│       └── SMTP.php
│
└── logs/
    ├── .htaccess
    └── enquiries.log
```

### Existing files — purpose

| File / Folder | Purpose |
|---|---|
| `index.html` | Main public website |
| `enquiry.php` | Enquiry form backend |
| `.htaccess` | HTTPS, compression, caching, security headers, CSP and error routing |
| `404.html` | Branded 404 page |
| `500.html` | Branded 500 page |
| `robots.txt` | Search-engine crawler rules |
| `sitemap.xml` | Search-engine sitemap |
| `favicon.ico` | Browser favicon |
| `assets/css/style.css` | Main styling and components |
| `assets/css/animations.css` | Cinematic / liquid-glass / airplane animation styling |
| `assets/css/responsive.css` | Responsive layout rules |
| `assets/js/main.js` | Main frontend logic + Three.js airplane experience |
| `assets/js/navigation.js` | Header and mobile navigation |
| `assets/js/counter.js` | Animated statistics |
| `assets/js/timeline.js` | Process/timeline interactions |
| `assets/js/form-validation.js` | Client-side enquiry validation |
| `assets/images/` | Existing visual assets |
| `data/services.json` | Existing service master list |
| `includes/config.php` | Email/business configuration |
| `includes/helpers.php` | Validation, sanitisation, logging and response helpers |
| `includes/mailer.php` | Email construction/sending |
| `includes/PHPMailer/` | Vendored PHPMailer library |
| `logs/enquiries.log` | Backup enquiry log |
| `logs/.htaccess` | Prevents public access to logs |
| `START-LOCAL-SERVER.txt` | Existing local-server instructions |
| `start-windows.bat` | Existing Windows local server launcher |
| `start-mac-linux.command` | Existing macOS/Linux launcher |

---

# 3. IMPORTANT: PRESERVE THE EXISTING WEBSITE

The current visual website should **not** be blindly rewritten.

Before implementing the new platform:

1. Inspect the complete existing project.
2. Understand the current HTML/CSS/JS architecture.
3. Identify reusable components and logic.
4. Preserve the Brahmnmitra visual identity.
5. Preserve working enquiry functionality.
6. Preserve security measures.
7. Preserve responsive behaviour.
8. Preserve accessibility and reduced-motion fallbacks.
9. Preserve existing assets unless replacement is intentional.
10. Refactor only where necessary.

The new system should be an evolution of the existing project, not an unrelated redesign.

---

# 4. CURRENT DEPLOYMENT MODEL

The current package is designed for direct shared-hosting deployment.

### Current setup

- No build step
- No Node.js requirement
- No Docker requirement
- PHP backend
- Hostinger-compatible
- `index.html` at public root

### Current production flow

```text
Visitor
   ↓
index.html
   ↓
Enquiry form
   ↓
enquiry.php
   ↓
helpers.php
   ↓
logs/enquiries.log
   ↓
mailer.php / PHPMailer
   ↓
Email
```

This should continue working while the new architecture is being developed.

---

# 5. EXISTING ENQUIRY SYSTEM

The existing enquiry system should be retained until the new CRM/booking system replaces it.

## Current protections

- Server-side validation
- Client-side validation
- Header-injection protection
- Email validation
- Phone validation
- Date validation
- Service whitelist
- Rate limiting
- Enquiry logging
- Log rotation
- JSON response support
- No-JavaScript fallback
- WhatsApp fallback

### Important

`logs/enquiries.log` contains customer information.

Do not remove:

```text
logs/.htaccess
```

Do not expose the log through a public route.

---

# 6. EXISTING EMAIL CONFIGURATION

The primary configuration file is:

```text
includes/config.php
```

Current important settings include:

```php
define('TO_EMAIL', 'info@brahmnmitra.com');
define('FROM_EMAIL', 'enquiry@brahmnmitra.com');
define('FROM_NAME', 'BrahmnMitra');
```

Optional SMTP settings are also available.

**Never commit real SMTP passwords or other secrets to Git.**

Use environment variables / secure server configuration when the project is migrated to a backend architecture.

---

# 7. EXISTING AIRPLANE EXPERIENCE

The cinematic airplane intro is implemented primarily through:

```text
assets/js/main.js
assets/css/animations.css
```

The current experience uses:

- Three.js
- GSAP
- ScrollTrigger
- Smooth interpolation
- Flight-path keyframes
- Camera movement
- Plane rotation/banking
- WebGL fallback
- Reduced-motion fallback

## Planned improvement

### Smoothen the airplane animation

The current airplane movement should be made significantly smoother.

Do not solve this by simply adding random easing.

Review:

- Scroll-to-progress mapping
- Position interpolation
- Rotation interpolation
- Banking
- Camera interpolation
- Acceleration/deceleration
- Flight path
- RAF loop
- Frame-rate independence
- Mobile rendering
- DPR
- Reduced-motion behaviour

The airplane should feel cinematic and physically smooth.

Avoid:

- Jitter
- Snapping
- Sudden banking
- Turbulence-like movement
- Abrupt acceleration
- Camera/plane desynchronisation

---

# 8. CURRENT CONTENT ITEMS TO VERIFY

Before public launch, verify all statistics and testimonials currently present in the existing website.

Current statistics include values such as:

- 500+ Happy Clients
- 50+ Destinations
- 24/7 On-Ground Support
- 10+ Years of Experience
- 500+ Happy Corporate Clients
- 50,000+ Trips Managed
- 98% Client Retention

These must represent real, supportable figures.

Likewise, verify the existing testimonials and company/person names before publishing.

Do not publish fabricated testimonials or unsupported statistics.

---

# 9. WEBSITE 2.0 — NEW CUSTOMER-FACING FEATURES

The following features are the planned website expansion.

## 9.1 Domestic / International Packages

Add a dedicated **Packages** section.

### Domestic

Examples:

- Kerala
- Goa
- Rajasthan
- Kashmir
- Himachal Pradesh
- Northeast India
- Andaman
- etc.

### International

Examples:

- Dubai
- Singapore
- Thailand
- Bali
- Maldives
- Europe
- etc.

Each package should eventually support:

- Package name
- Destination
- Domestic / International
- Duration
- Starting price
- Best time to visit
- Description
- Gallery
- Day-wise itinerary
- Hotels
- Transportation
- Activities
- Inclusions
- Exclusions
- Add-ons
- Reviews
- Ratings
- Availability
- Enquiry
- Booking
- Related packages
- Similar destinations

Packages should eventually become database-driven.

---

# 10. HOTELS SECTION

Add a dedicated **Hotels** section.

Initially this can contain Brahmnmitra-curated hotels.

Support filtering by:

- Destination
- Price
- Star rating
- Hotel type
- Amenities
- Availability

Hotel records should support:

- Images
- Name
- Destination
- Rating
- Price
- Amenities
- Description
- Rooms
- Enquiry
- Booking

The architecture should allow future hotel API integration.

---

# 11. DESTINATION PAGES

Create rich destination pages.

Example:

```text
Kerala
├── Overview
├── Best time to visit
├── Popular places
├── Things to do
├── Packages
├── Hotels
├── Weather
├── Travel information
├── Gallery
├── Reviews
├── FAQs
├── Travel guides
└── Similar destinations
```

Destination pages should be SEO-friendly.

---

# 12. SEARCH

Add a site-wide search system.

Search across:

- Destinations
- Packages
- Hotels
- Activities
- Travel guides
- Blogs
- FAQs

Example:

```text
Search: Kerala

→ Kerala Destination
→ Kerala Packages
→ Kerala Hotels
→ Kerala Activities
→ Kerala Travel Guides
```

---

# 13. USER MANAGEMENT / LOGIC SYSTEM

Add a proper user-management system.

Users should eventually be able to:

- Register
- Login
- Logout
- Manage profile
- View bookings
- View travel history
- Save destinations
- Save packages
- View reviews
- Manage loyalty points
- View documents
- View payments
- Manage preferences

Implement:

- Authentication
- Authorization
- Sessions
- Role-based access control
- Protected routes
- Secure password handling
- Admin/customer separation

---

# 14. AI FEATURES

Create a central:

## Brahmnmitra AI Travel Assistant

The planned AI features are:

### 14.1 Visa Eligibility Checker

Inputs:

- Nationality
- Destination
- Passport type
- Travel purpose
- Duration

Output:

- Visa requirement
- Visa type
- Basic eligibility
- Required documents
- Approximate processing time
- Important conditions
- Official information sources

Visa information must be based on authoritative, current sources.

---

### 14.2 Weather Planner

Show:

- Temperature
- Rain probability
- Weather conditions
- Travel suitability
- Crowd conditions where available
- Approximate travel cost where available

Example:

```text
Kerala — October

Weather       ████████░░
Rain risk     ██████░░░░
Crowds        █████░░░░░
Price         ██████░░░░

Overall: Good time to visit
```

Use a reliable weather API.

---

### 14.3 Destination Planner

User can enter:

> 6 days, ₹50,000 budget, travelling with family.

AI generates:

- Destination suggestions
- Day-wise itinerary
- Budget
- Hotels
- Activities
- Transportation
- Food suggestions
- Travel tips

Allow users to modify the plan.

Eventually:

> **Turn this plan into a Brahmnmitra package**

should create an enquiry / quotation workflow.

---

### 14.4 You Recently Searched For

Add:

> **You recently searched for**

For logged-in users:

- Store in account
- Show across sessions

For anonymous users:

- localStorage
- anonymous session ID
- cookie/session-based approach

Show:

- Recent destinations
- Recent packages
- Recent hotels

---

### 14.5 Travel History Based Recommendations

Use previous travel/search/booking history to recommend destinations.

Example:

> Because you visited Kerala...

Possible recommendations:

- Goa
- Andaman
- Maldives
- Sri Lanka
- Coorg

---

### 14.6 People Who Visited Kerala Also Went To Goa

Build a recommendation system based on customer behaviour.

Example:

```text
People who visited Kerala also visited:

Goa          38%
Rajasthan    24%
Andaman      17%
Dubai        12%
```

Initially this can use manually configured relationships or basic statistics.

Later it should use actual behavioural/booking data.

---

# 15. LOYALTY & MEMBERSHIP PROGRAM

Create:

# Brahmnmitra Rewards

Include:

- Reward points
- Birthday discounts
- Referral bonus
- Travel credits
- Coupons
- Special offers
- Membership levels

Users should see:

- Current points
- Points earned
- Points redeemed
- Points history
- Rewards
- Membership level
- Referral status

Membership names and point values should be configurable.

Possible tiers:

```text
Explorer
Voyager
Elite
```

---

# 16. VERIFIED TRAVEL REVIEWS

Add a proper review system.

### Verified reviews

Login / booking verification required.

Display:

```text
★★★★★

"Excellent planning and support."

Customer Name
Kerala
Travelled: June 2026

✓ Verified Traveller
```

The verified badge must only be available when the system can verify the traveller.

---

# 17. RATINGS

Ratings should be possible **without mandatory login**, as originally planned.

However, protect the system against abuse using:

- Rate limiting
- CAPTCHA where appropriate
- Duplicate-rating prevention
- Booking/reference verification where possible

Support ratings for:

- Package
- Hotel
- Destination
- Service
- Overall experience

---

# 18. REFUND & CANCELLATIONS SYSTEM

Add a cancellation workflow.

Customer:

```text
Cancel Booking
       ↓
Cancellation policy
       ↓
Refund calculation
       ↓
Request refund
```

Display:

- Booking amount
- Cancellation fee
- Refund eligible amount
- Refund status

Statuses:

```text
Requested
Under Review
Approved
Rejected
Processing
Refunded
```

Maintain an audit trail.

---

# 19. CUSTOMER ACCOUNT / MY BRAHMNMITRA

Create a customer dashboard:

```text
My Brahmnmitra
├── Profile
├── My Trips
├── My Bookings
├── Travel History
├── Saved Destinations
├── Saved Packages
├── Recently Viewed
├── Reviews
├── Ratings
├── Brahmnmitra Rewards
├── Referrals
├── Payments
├── Invoices
├── Documents
├── Notifications
└── Preferences
```

---

# 20. TRAVEL DOCUMENT VAULT

Allow secure access to:

- Tickets
- Hotel vouchers
- Invoices
- Itineraries
- Travel insurance
- Visa documents
- Receipts

Sensitive documents require secure storage and access control.

---

# 21. CRM

Create a protected:

# Brahmnmitra Admin / CRM

The CRM should not be exposed as part of the public website.

## Leads

Track:

- Name
- Phone
- Email
- Destination
- Travel dates
- Number of travellers
- Budget
- Source
- Assigned employee
- Status
- Notes
- Follow-up date

Pipeline:

```text
New
 ↓
Contacted
 ↓
Interested
 ↓
Quotation Sent
 ↓
Negotiation
 ↓
Confirmed
 ↓
Lost
```

---

# 22. FOLLOW-UP MANAGEMENT

CRM should support:

- Follow-up dates
- Follow-up reminders
- Staff assignment
- Notes
- Lead history
- Contact history

Dashboard:

- Today's follow-ups
- Overdue follow-ups
- Upcoming follow-ups

---

# 23. QUOTATION SYSTEM

Create a quotation builder.

Example:

```text
Quotation #BM-2026-00124

Client: Customer Name

Kerala — 6 Nights / 7 Days

Flights                 ₹24,000
Hotel                   ₹36,000
Transport               ₹14,000
Activities               ₹8,000
Service Fee              ₹3,000
--------------------------------
Total                   ₹85,000
```

Staff should be able to:

- Create quotation
- Edit quotation
- Add/remove items
- Apply discounts
- Add taxes/fees
- Generate PDF
- Send quotation
- Track quotation status
- Allow customer acceptance
- Convert quotation to booking

---

# 24. BOOKING SYSTEM

Target workflow:

```text
Enquiry
 ↓
Quotation
 ↓
Customer Approval
 ↓
Advance Payment
 ↓
Booking Confirmation
 ↓
Trip
 ↓
Completion
 ↓
Review
```

---

# 25. PAYMENT SYSTEM

Track:

- Advance payments
- Partial payments
- Final payments
- Payment methods
- Payment dates
- Payment status
- Invoices
- Outstanding amount

Statuses:

```text
Pending
Partially Paid
Paid
Failed
Refunded
```

---

# 26. SUPPLIER / VENDOR MANAGEMENT

Support suppliers such as:

- Hotels
- Transport providers
- Airlines
- Tour operators
- Visa agents
- Activity providers
- Guides

Track:

- Supplier details
- Contact
- Pricing
- Commission
- Payment terms
- Contracts
- Outstanding payments
- Booking history

---

# 27. STAFF / EMPLOYEE MANAGEMENT

Role-based access should include possible roles:

### Super Admin

Everything.

### Manager

CRM + bookings + operational overview.

### Sales

Leads + customers + quotations.

### Operations

Bookings + suppliers + trips.

### Accounts

Payments + expenses + finance.

### Content Manager

Packages + hotels + destinations + blogs.

Permissions should be configurable rather than hardcoded wherever practical.

---

# 28. NOTIFICATION SYSTEM

Customer notifications:

- Booking confirmed
- Payment received
- Payment pending
- Trip approaching
- Cancellation update
- Refund update
- Review request
- Reward points earned
- Birthday reward
- Referral reward

Staff notifications:

- New lead
- New booking
- New payment
- Follow-up due
- Cancellation request
- Refund request

Future channels:

- Email
- WhatsApp
- SMS
- Push notifications

---

# 29. ACCOUNTS / FINANCE

The original requirement is:

## Accounts

- Jetpack CRM / Tally
- Profit/loss
- Quotations
- Payments
- Registrations
- Expenses
- Incomes
- Monthly positions
- Finance reports

Do not attempt to recreate the entire Tally product.

Instead, create a lightweight finance layer and integrate with an established accounting system where appropriate.

---

# 30. FINANCE DASHBOARD

Track:

- Revenue
- Income
- Expenses
- Receivables
- Payables
- Refunds
- Commissions
- Monthly revenue
- Monthly expenses
- Profit/Loss
- Outstanding payments
- Financial reports

---

# 31. BLOG / TRAVEL JOURNAL

Add:

# Brahmnmitra Travel Journal

Categories:

- Destination Guides
- Travel Tips
- Visa Guides
- Budget Travel
- Honeymoon Travel
- Family Travel
- Corporate Travel
- Travel News

AI may assist in drafting content, but factual travel information must be reviewed before publication.

---

# 32. HOMEPAGE DIRECTION

The homepage should evolve from:

> "Here is our travel agency."

toward:

> **"Tell us where you want to go."**

Possible primary planning interface:

```text
Where are you going?
[ Destination ]

When?
[ Dates ]

Travellers
[ 2 Adults ]

Budget
[ ₹50,000 – ₹1,00,000 ]

[ PLAN MY TRIP ]
```

Follow with:

- Popular destinations
- Domestic packages
- International packages
- Hotels
- Recommended for you
- Brahmnmitra AI Travel Assistant
- Verified travellers
- Brahmnmitra Rewards
- Travel Journal

Keep the homepage premium and uncluttered.

---

# 33. TECHNICAL ARCHITECTURE — TARGET STATE

The current static site is suitable for the initial public website, but the complete platform should eventually move toward a scalable architecture.

Recommended target:

```text
                    BRAHMNMITRA
                         │
          ┌──────────────┴──────────────┐
          │                             │
      Public Website                Admin Panel
          │                             │
          └──────────────┬──────────────┘
                         │
                      Backend
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    PostgreSQL         Redis           Storage
        │                                 │
        └──────────────┬──────────────────┘
                       │
                External Services
                       │
       ┌───────────────┼─────────────────┐
       │               │                 │
    Payments        WhatsApp          Email
       │
    AI / APIs
```

Possible stack:

### Frontend

Next.js + React + TypeScript

### Backend

Node.js / Express / NestJS

or FastAPI if Python is preferred.

### Database

PostgreSQL

### Cache

Redis

### Storage

AWS S3 / Cloudflare R2 or equivalent

### Authentication

Secure authentication + role-based authorization

The existing site does **not** need to be migrated all at once.

---

# 34. DATABASE TARGET STRUCTURE

Design the database before implementing the full feature set.

Core entities:

```text
users
profiles
roles
permissions

destinations
packages
package_days
package_activities

hotels
hotel_rooms
hotel_amenities

bookings
booking_items
travellers
payments
refunds

leads
lead_notes
followups
quotations
quotation_items

reviews
ratings

loyalty_accounts
loyalty_transactions
referrals

search_history
travel_history
recommendations

suppliers
supplier_transactions

expenses
incomes
invoices

notifications
documents

audit_logs
```

Important:

**One customer should have one customer record shared across the platform.**

Do not create separate customer records for CRM, bookings, loyalty and reviews.

---

# 35. SECURITY REQUIREMENTS

The future platform will eventually handle:

- Customer information
- Payments
- Travel documents
- Passport/visa information
- Staff accounts
- Financial information

Therefore implement:

- Authentication
- Authorization
- Role-based access
- Input validation
- Secure password hashing
- Rate limiting
- XSS protection
- CSRF protection where applicable
- Secure API design
- Audit logs
- Protected admin routes
- Secure file storage
- Environment variables
- Secret management
- Secure payment handling

Never commit:

- API keys
- SMTP passwords
- Database passwords
- JWT secrets
- Payment credentials
- Other production secrets

---

# 36. PERFORMANCE REQUIREMENTS

The website must remain fast even as features are added.

Optimize:

- Images
- Three.js
- JavaScript bundles
- Fonts
- API requests
- Database queries
- Lazy loading
- Code splitting
- Caching
- Mobile rendering

The cinematic identity should remain intact without allowing animations to destroy performance.

---

# 37. RESPONSIVE DESIGN

All customer-facing and administrative features must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Pay particular attention to:

- Airplane animation
- Navigation
- Package cards
- Hotel cards
- Search
- Forms
- AI assistant
- Customer dashboard
- CRM
- Tables
- Charts

---

# 38. ADMIN DASHBOARD

Create a professional Brahmnmitra Admin Dashboard.

Overview:

```text
Today's Enquiries
Pending Follow-ups
Confirmed Bookings
Pending Payments
Refund Requests
Today's Revenue
Monthly Revenue
```

Analytics:

- Revenue
- Bookings
- Leads
- Conversion rate
- Expenses
- Profit/Loss
- Popular destinations
- Package performance

---

# 39. ANALYTICS

Track:

- Website visitors
- Search behaviour
- Most viewed destinations
- Most viewed packages
- Enquiries
- Conversion rate
- Bookings
- Average booking value
- Customer acquisition source
- Repeat customers
- Popular destinations
- Cancellation rate
- Refund rate

This data should eventually improve the recommendation engine.

---

# 40. IMPLEMENTATION ROADMAP

Do not implement every feature simultaneously.

## PHASE 1 — WEBSITE 2.0

Priority:

- Smooth airplane animation
- Homepage UX
- Domestic packages
- International packages
- Hotels
- Destination pages
- Search
- Reviews
- Ratings
- Better enquiry forms
- SEO
- FAQ
- Travel Journal

## PHASE 2 — CUSTOMER PLATFORM

- Registration/login
- Customer dashboard
- Bookings
- Travel history
- Saved trips
- Recently searched
- Reviews
- Documents
- Notifications

## PHASE 3 — CRM

- Leads
- Follow-ups
- Employees
- Customer profiles
- Quotations
- Booking management
- Supplier management
- Payment tracking
- Cancellation/refund workflow

## PHASE 4 — LOYALTY

- Brahmnmitra Rewards
- Points
- Membership tiers
- Birthday rewards
- Referral bonuses
- Coupons
- Travel credits

## PHASE 5 — AI

1. AI Travel Assistant
2. Destination Planner
3. Recommendation Engine
4. Weather Planner
5. Visa Assistant
6. Personalized recommendations

## PHASE 6 — FINANCE

- Income
- Expenses
- Payments
- Receivables
- Payables
- P&L
- Monthly reports
- Invoices
- Accounting integration

## PHASE 7 — ADVANCED TRAVEL INFRASTRUCTURE

Potential integrations:

- Flight APIs
- Hotel APIs
- Visa information APIs
- Weather API
- Maps
- Payment gateway
- WhatsApp API
- Email
- Analytics
- AI
- Recommendation engine

---

# 41. DEVELOPMENT RULES FOR AI / CODING AGENTS

When another AI coding agent works on this repository:

### First

Inspect the entire repository.

### Then

Create a short implementation plan.

### Then

Implement only the requested phase.

### Never

- Delete existing functionality without reason
- Replace the design with a generic template
- Remove security headers casually
- Remove enquiry logging
- Expose logs
- Commit secrets
- Hardcode credentials
- Fake customer data
- Fake reviews
- Invent visa requirements
- Add unnecessary dependencies
- Rewrite the whole application when a focused change is enough

### After each major change

Check:

- Desktop
- Mobile
- JavaScript disabled
- Reduced motion
- WebGL unavailable
- Form submission
- Error handling
- Console errors
- Network errors
- Security headers

---

# 42. DEFINITION OF DONE

A feature is not complete merely because it visually appears on the page.

For each feature, verify:

```text
UI
↓
Responsive
↓
Validation
↓
Backend
↓
Database
↓
Authentication
↓
Authorization
↓
Error handling
↓
Security
↓
Loading states
↓
Empty states
↓
Mobile
↓
Testing
```

---

# 43. FINAL PRODUCT VISION

The final Brahmnmitra ecosystem should work like this:

## Customer

```text
Discover
   ↓
Search
   ↓
AI Planning
   ↓
Packages / Hotels
   ↓
Enquiry
   ↓
Quotation
   ↓
Booking
   ↓
Payment
   ↓
Trip
   ↓
Review
   ↓
Rewards
   ↓
Personalized Recommendations
```

## Business

```text
Lead
 ↓
CRM
 ↓
Follow-up
 ↓
Quotation
 ↓
Booking
 ↓
Supplier
 ↓
Payment
 ↓
Operations
 ↓
Finance
 ↓
Analytics
```

---

# 44. CURRENT STATUS

### Existing / Working

- [x] Premium public website
- [x] Responsive layout
- [x] Cinematic airplane intro
- [x] Three.js integration
- [x] GSAP / ScrollTrigger
- [x] Navigation
- [x] Service sections
- [x] Enquiry form
- [x] PHP backend
- [x] PHPMailer
- [x] Optional SMTP
- [x] Enquiry logging
- [x] Log rotation
- [x] WhatsApp fallback
- [x] Security headers
- [x] CSP
- [x] Branded error pages
- [x] SEO basics
- [x] Existing service data

### Planned

- [ ] Smoothen airplane animation
- [ ] Domestic packages
- [ ] International packages
- [ ] Hotels
- [ ] Destination pages
- [ ] Search
- [ ] User management
- [ ] Customer accounts
- [ ] Travel history
- [ ] Recently searched
- [ ] AI travel assistant
- [ ] Visa eligibility checker
- [ ] Weather planner
- [ ] Destination planner
- [ ] Behaviour-based recommendations
- [ ] Loyalty & membership
- [ ] Reward points
- [ ] Birthday discounts
- [ ] Referral bonus
- [ ] Verified travel reviews
- [ ] Ratings
- [ ] Refund system
- [ ] Cancellation system
- [ ] CRM
- [ ] Lead management
- [ ] Follow-ups
- [ ] Quotations
- [ ] Booking management
- [ ] Supplier management
- [ ] Staff management
- [ ] Payments
- [ ] Notifications
- [ ] Travel document vault
- [ ] Accounts
- [ ] Profit/Loss
- [ ] Expenses
- [ ] Incomes
- [ ] Monthly financial positions
- [ ] Finance reports
- [ ] Accounting integration
- [ ] Analytics
- [ ] Blog / Travel Journal
- [ ] Future flight API
- [ ] Future hotel API
- [ ] Future WhatsApp integration

---

# 45. IMMEDIATE NEXT STEP

Before adding the full platform, start with:

## Phase 1 — Website 2.0

1. Inspect and refactor the current frontend architecture where necessary.
2. Smoothen the airplane animation.
3. Improve homepage conversion flow.
4. Add Domestic Packages.
5. Add International Packages.
6. Add Hotels.
7. Add Destination pages.
8. Add Search.
9. Add improved Ratings / Reviews.
10. Improve enquiry flow.
11. Prepare the data model for future backend integration.

Only after Phase 1 is stable should the project move into the customer account, CRM, loyalty, AI and finance phases.

---

## 46. FUTURE DEVELOPMENT PLANS - 22-POINT PLATFORM ROADMAP

The following items capture the supplied product-development brief. They are **future plans**, not claims about functionality that is currently available.

1. **Customer-facing travel platform** - evolve the marketing website into a transactional journey-planning experience.
2. **Domestic and international packages** - build searchable, database-driven package catalogues with itinerary, inclusions, availability, reviews and enquiry/booking flows.
3. **Hotels module** - add curated hotel listings, filters and a design that can later connect to live inventory APIs.
4. **Brahmnmitra Travel Assistant** - centralise AI-assisted visa, destination-planning and weather-planning tools.
5. **Recent searches** - retain recent destinations, packages and hotels for both signed-in and anonymous visitors.
6. **Travel-history recommendations** - suggest relevant destinations using search, travel and booking history.
7. **Also-visited recommendations** - start with curated relationships and progressively use behavioural and booking data.
8. **Brahmnmitra Account and Rewards** - provide trips, bookings, saved items, documents, payments, referrals, points and membership tiers.
9. **Ratings and verified reviews** - allow protected public ratings and reservation-verified traveller reviews.
10. **Booking and cancellation journeys** - cover quotation, payment, confirmation, documents, trip completion, cancellation and refunds.
11. **Brahmnmitra Admin / CRM** - provide a protected, role-based workspace for leads, customers, notes, follow-ups and operations.
12. **Quotation builder** - enable staff to create, price, send, track and convert quotations into bookings.
13. **Payments** - support advance, partial and final payment tracking with invoices and payment statuses.
14. **Finance layer** - add reporting for income, expenses, receivables, payables, commissions, refunds and profit/loss; integrate with accounting software where appropriate.
15. **Supplier and vendor management** - manage hotels, transport, airlines, operators, visa agents, activity providers and guides.
16. **Staff and permissions** - implement configurable roles for super admins, managers, sales, operations, accounts and content staff.
17. **Notifications** - create customer and staff notifications, with future email, WhatsApp, SMS and push channels.
18. **Travel document vault** - securely provide tickets, vouchers, invoices, insurance, visas, itineraries and receipts.
19. **Global search** - search destinations, packages, hotels, activities, travel guides, blogs and FAQs from one interface.
20. **SEO-friendly destination pages and Travel Journal** - publish destination hubs, guides, travel tips and reviewed factual content.
21. **Homepage conversion flow and airplane animation** - centre the homepage on trip planning and refine the existing Three.js/GSAP flight into one smooth, frame-rate-independent animation loop.
22. **Scalable technical foundation and phased delivery** - plan the public site, admin panel, backend, PostgreSQL, Redis, secure object storage, integrations and database design before extending the platform in controlled phases.
## Existing README

The original `README.txt` is intentionally retained for the existing deployment/setup notes.

This `README.md` is the **updated master product/technical roadmap** and should be treated as the primary development reference going forward.

