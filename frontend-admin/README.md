# BrahmnMitra Admin Portal — Subdomain Deployment Guide

This folder contains the complete, self-contained Admin Frontend designed to be hosted on your Hostinger subdomain: `https://admin.brahmnmitra.com`.

---

## 🏛️ Decoupled Multi-Domain Architecture

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   https://brahmnmitra.com      │         │  https://admin.brahmnmitra.com │
│   (Public Marketing & Portal)  │         │  (Operations & Finance Portal) │
└───────────────┬────────────────┘         └────────────────┬───────────────┘
                │                                           │
                │        REST API Calls (CORS Enabled)      │
                ▼                                           ▼
      ┌───────────────────────────────────────────────────────────┐
      │          https://brahmnmitra.onrender.com                 │
      │   (Centralized Hosted PHP Backend Service & Database)     │
      └───────────────────────────────────────────────────────────┘
```

- **Zero Direct Client-Side Coupling**: Neither frontend accesses the other's storage, cookies, DOM, or windows.
- **Backend-Mediated State**: Client payments and enquiries flow through the backend API (`/payments.php`, `/logs.php`, `/enquiry.php`), which the Admin portal synchronizes with over HTTPS.

---

## 📁 Directory Contents

```
frontend-admin/
├── index.html                  # Admin portal dashboard
├── robots.txt                  # Blocks search engine crawlers
├── .htaccess                   # Comprehensive Apache security, CSP & cache headers
├── assets/
│   ├── css/
│   │   └── admin.css           # Self-contained theme and layout styles
│   └── js/
│       └── admin.js            # Operations logic, REST sync, state management
└── data/
    └── travel-catalog.json     # Initial travel catalogue reference data
```

---

## 🚀 Hostinger Subdomain Setup

1. **Create Subdomain in Hostinger hPanel**:
   - Go to **Domains** → **Subdomains**.
   - Enter `admin` (creating `admin.brahmnmitra.com`).
   - Document root is automatically set (usually `public_html/admin` or `domains/admin.brahmnmitra.com/public_html`).

2. **Upload Files**:
   - Open Hostinger **File Manager** (or connect via FTP).
   - Navigate into your subdomain folder.
   - Upload the entire contents of this `frontend-admin/` folder (such that `index.html` is at the root of the subdomain folder).

3. **Verify Deployment**:
   - Public Website: `https://brahmnmitra.com`
   - Admin Portal: `https://admin.brahmnmitra.com`
   - Backend API: `https://brahmnmitra.onrender.com`

