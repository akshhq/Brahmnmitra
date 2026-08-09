# BrahmnMitra backend

The existing PHP enquiry endpoint is intentionally located here:

```text
backend/enquiry.php
```

The public website posts enquiries to that endpoint. `includes/` and `logs/`
are protected from direct web access by both the root and backend `.htaccess`
files.

Future application code belongs here, organised by domain (for example
`api/`, `controllers/`, `models/`, `routes/`, `services/` and `database/`).
Do not expose a CRM, staff dashboard, payment endpoint, or document vault
until it has authentication, authorization, validation and audit logging.
