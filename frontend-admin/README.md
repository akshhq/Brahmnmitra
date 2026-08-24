# BrahmnMitra Admin Portal — Subdomain Deployment Guide

This folder contains the complete, self-contained Admin Frontend designed to be hosted on your Hostinger subdomain (e.g., `admin.brahmnmitra.com`).

---

## 📁 Directory Contents

```
frontend-admin/
├── index.html                  # Admin portal dashboard
├── robots.txt                  # Blocks search engine crawlers
├── .htaccess                   # Security headers and directory index protection
├── assets/
│   ├── css/
│   │   └── admin.css           # Self-contained theme and layout styles
│   └── js/
│       └── admin.js            # Operations logic, state management, and export/import
└── data/
    └── travel-catalog.json     # Travel catalogue reference data
```

---

## 🚀 Hostinger Subdomain Setup

1. **Create Subdomain in Hostinger hPanel**:
   - Go to **Domains** → **Subdomains**.
   - Enter `admin` (creating `admin.brahmnmitra.com`).
   - Note the document root (usually `public_html/admin` or `domains/admin.brahmnmitra.com/public_html`).

2. **Upload Files**:
   - Open Hostinger **File Manager** (or connect via FTP).
   - Navigate into your subdomain directory.
   - Upload the entire contents of this `frontend-admin/` folder (such that `index.html` is at the root of the subdomain folder).

3. **Verify**:
   - Visit `https://admin.brahmnmitra.com` in your browser.
