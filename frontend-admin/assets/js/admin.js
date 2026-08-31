"use strict";

(() => {
  const STORAGE_KEY = "bm_admin_workspace_v2";
  function getActiveApiEndpoint() {
    const saved = localStorage.getItem("bm_custom_api_endpoint");
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
    // Default directly to live Render backend
    return "https://brahmnmitra.onrender.com";
  }

  let API_ENDPOINT = getActiveApiEndpoint();

  let recycleBinItems = [];
  let currentRecycleFilter = "all";

  const blankState = {
    leads: [],
    bookings: [],
    inflow: [],       // Customer receipts
    outflow: [],      // Vendor payouts (airlines, hotels, transport, visas)
    packages: [],     // Custom/edited packages
    hotels: [],       // Custom/edited hotels
    deals: [],        // Custom/edited deals
    flights: [],      // Custom/edited flights
    invoices: [],     // Issued GST Invoices
    logs: [],         // Audit trail logs
    sandboxTxns: []   // Dev gateway test transactions
  };

  const safe = (val) =>
    String(val || "").replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char]
    );

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  let state;
  let defaultCatalogue = { destinations: [], packages: [], hotels: [], deals: [], flights: [] };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? Object.assign({}, blankState, JSON.parse(raw)) : { ...blankState };
  } catch (_) {
    state = { ...blankState };
  }

  // Ensure all arrays exist
  Object.keys(blankState).forEach((key) => {
    if (!Array.isArray(state[key])) state[key] = [];
  });

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  };

  const formValue = (form, name) => (new FormData(form).get(name) || "").toString().trim();

  // ==========================================
  // AUDIT LOGGING SYSTEM
  // ==========================================
  function logAction(category, action, details) {
    const event = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      category: category || "GENERAL", // CATALOG_EDIT, CUSTOMER_PAYMENT, VENDOR_PAYOUT, INVOICE_GENERATED, GATEWAY_TEST, LEAD_STATUS
      actor: "Admin Operations Desk",
      action: action || "Action performed",
      details: typeof details === "object" ? JSON.stringify(details) : String(details || ""),
      ip: "127.0.0.1 (Local Session)"
    };
    state.logs.unshift(event);
    if (state.logs.length > 500) state.logs.pop();
    save();
    renderLogs();

    // Async push to backend if available
    fetch(`${API_ENDPOINT}/logs.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(event)
    }).catch(() => {});
  }

  // ==========================================
  // VIEW NAVIGATION & TAB SWITCHING
  // ==========================================
  const views = {
    overview: { title: "Operations dashboard", subtitle: "Manage customer bookings, vendor disbursements, inventory & billing." },
    leads: { title: "Leads & enquiries", subtitle: "Track and follow up with customer requests." },
    catalogue: { title: "Deals, Stays & Flights Inventory", subtitle: "Create and edit packages, curated hotels, flash deals, and flight routes." },
    bookings: { title: "Quotations & Bookings", subtitle: "Track approved travel proposals and active customer reservations." },
    finance: { title: "Finance & Two-Way Ledger", subtitle: "Track client inflows vs. vendor payouts (hotels, airlines, transport) & margins." },
    invoices: { title: "GST Tax Invoices (SAC 9985)", subtitle: "Generate, review, and print compliant corporate & leisure tax invoices." },
    logs: { title: "System Audit & Activity Trail", subtitle: "Immutable timestamped record of operational actions and system transactions." },
    gateway: { title: "Payment Gateway Sandbox", subtitle: "Developer test mode for checkout simulations, UPI test handles & webhook syncing." },
    "recycle-bin": { title: "15-Day Recycle Bin & Soft Deletions", subtitle: "Recover or permanently purge deleted catalog items, leads, bookings, and payments (15-day retention limit)." },
    settings: { title: "Platform Setup & Backups", subtitle: "Data export, workspace backup restore, and API configuration." }
  };

  document.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      const viewKey = button.dataset.view;
      if (!views[viewKey]) return;

      document.querySelectorAll("[data-view]").forEach((item) => item.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "page");

      document.querySelectorAll(".admin-view").forEach((view) => {
        view.hidden = view.id !== `view-${viewKey}`;
      });

      const titleEl = document.getElementById("page-title");
      const subEl = document.getElementById("page-subtitle");
      if (titleEl) titleEl.textContent = views[viewKey].title;
      if (subEl) subEl.textContent = views[viewKey].subtitle;

      renderAll();
    })
  );

  // ==========================================
  // UNIVERSAL RECYCLE BIN CONTROLLER (15-DAY LIMIT)
  // ==========================================
  async function moveToRecycleBin(type, id, title) {
    // 1. Optimistic local state update
    if (["package", "packages", "hotel", "hotels", "deals", "flights", "destination"].includes(type)) {
      const cat = type.endsWith("s") ? type : (type === "destination" ? "destinations" : type + "s");
      if (Array.isArray(state[cat])) {
        state[cat] = state[cat].filter((i) => i.id !== id && i.slug !== id);
      }
    } else if (type === "lead" || type === "enquiry") {
      state.leads = state.leads.filter((l) => String(l.id) !== String(id));
    } else if (type === "booking") {
      state.bookings = state.bookings.filter((b) => b.bookingId !== id && b.id !== id);
    } else if (type === "payment" || type === "inflow") {
      state.inflow = state.inflow.filter((p) => p.id !== id);
    }

    save();
    renderAll();
    logAction("RECYCLE_BIN", `Moved ${type} to Recycle Bin (15-day retention): ${title || id}`, { type, id });

    // 2. Push soft deletion to Hostinger MySQL
    try {
      await fetch(`${API_ENDPOINT}/recycle_bin.php?action=soft_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, id })
      });
      fetchRecycleBin();
    } catch (_) {}
  }

  async function fetchRecycleBin() {
    try {
      const res = await fetch(`${API_ENDPOINT}/recycle_bin.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.items)) {
          recycleBinItems = data.items;
          updateRecycleBadge();
          renderRecycleBin();
        }
      }
    } catch (_) {}
  }

  function updateRecycleBadge() {
    const badge = document.getElementById("recycle-bin-badge");
    const count = recycleBinItems.length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    }
    const metricTotal = document.getElementById("metric-recycle-total");
    if (metricTotal) metricTotal.textContent = count;

    const expiringCount = recycleBinItems.filter((i) => i.days_remaining <= 3).length;
    const metricExpiring = document.getElementById("metric-recycle-expiring");
    if (metricExpiring) metricExpiring.textContent = expiringCount;
  }

  function renderRecycleBin() {
    updateRecycleBadge();
    const container = document.getElementById("recycle-bin-container");
    if (!container) return;

    const filtered = recycleBinItems.filter((item) => {
      if (currentRecycleFilter === "all") return true;
      if (currentRecycleFilter === "catalog") return ["package", "hotel", "destination", "packages", "hotels", "deals", "flights"].includes(item.type);
      if (currentRecycleFilter === "lead") return item.type === "lead" || item.type === "enquiry";
      if (currentRecycleFilter === "booking") return item.type === "booking";
      if (currentRecycleFilter === "payment") return item.type === "payment" || item.type === "inflow";
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `<p class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">No items found in this Recycle Bin view. Deleted records are retained here for 15 days before automatic purge.</p>`;
      return;
    }

    container.innerHTML = filtered
      .map((item) => {
        const days = Number(item.days_remaining) || 0;
        const isExpiring = days <= 3;
        const badgeClass = isExpiring ? "expiring_soon" : "retained";
        const badgeText = days === 0 ? "Purging Today" : `${days} day${days > 1 ? "s" : ""} left`;
        const delDate = item.deleted_at ? item.deleted_at.split("T")[0] : "Recently";
        const expDate = item.expires_at ? item.expires_at.split("T")[0] : "15 days limit";

        return `
          <article class="recycle-card">
            <div class="recycle-card-head">
              <span class="recycle-type-tag">${safe(item.type_label || item.type)}</span>
              <span class="days-left-badge ${badgeClass}">⏱️ ${badgeText}</span>
            </div>
            <h4>${safe(item.title)}</h4>
            <div class="recycle-card-meta">${safe(item.meta || "")}</div>
            <div class="recycle-card-dates">
              <span>Deleted: <strong>${safe(delDate)}</strong></span>
              <span>Auto-Purge: <strong>${safe(expDate)}</strong></span>
            </div>
            <div class="recycle-card-actions">
              <button class="restore-btn" type="button" data-restore-type="${safe(item.type)}" data-restore-id="${safe(item.identifier || item.id)}">
                ↺ Restore
              </button>
              <button class="hard-delete-btn" type="button" data-hard-delete-type="${safe(item.type)}" data-hard-delete-id="${safe(item.identifier || item.id)}">
                ✕ Delete Permanently
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function restoreRecycleItem(type, id) {
    try {
      const res = await fetch(`${API_ENDPOINT}/recycle_bin.php?action=restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, id })
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        recycleBinItems = recycleBinItems.filter((i) => i.identifier !== id && String(i.id) !== String(id));
        updateRecycleBadge();
        renderRecycleBin();
        logAction("RECYCLE_BIN", `Restored ${type} from Recycle Bin: ${id}`, { type, id });
        syncBackendData();
        window.alert(`✅ Restored "${id}" back to active database inventory!`);
      } else {
        window.alert(`Could not restore: ${data.error || "Unknown error"}`);
      }
    } catch (_) {
      window.alert("Could not connect to backend to restore item.");
    }
  }

  async function hardDeleteRecycleItem(type, id) {
    try {
      const res = await fetch(`${API_ENDPOINT}/recycle_bin.php?action=hard_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, id })
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        recycleBinItems = recycleBinItems.filter((i) => i.identifier !== id && String(i.id) !== String(id));
        updateRecycleBadge();
        renderRecycleBin();
        logAction("RECYCLE_BIN", `Permanently erased ${type}: ${id}`, { type, id });
      }
    } catch (_) {
      window.alert("Could not connect to backend to delete item.");
    }
  }

  // ==========================================
  // 1. OVERVIEW RENDERING
  // ==========================================
  function renderOverview() {
    const openLeads = state.leads.filter((l) => l.status !== "Won" && l.status !== "Lost").length;
    document.getElementById("metric-leads").textContent = openLeads;
    document.getElementById("metric-bookings").textContent = state.bookings.length;

    const totalRev = state.inflow.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalCost = state.outflow.reduce((acc, item) => acc + (Number(item.amountPaid) || 0), 0);
    const grossMargin = totalRev - totalCost;
    const marginPct = totalRev > 0 ? ((grossMargin / totalRev) * 100).toFixed(1) : 0;

    document.getElementById("metric-revenue").textContent = money.format(totalRev);
    document.getElementById("metric-cost").textContent = money.format(totalCost);
    document.getElementById("metric-margin").textContent = `${money.format(grossMargin)} (${marginPct}%)`;

    const allCat = getAllCatalogueItems();
    document.getElementById("metric-catalogue").textContent = allCat.length;

    // Recent leads list
    const recentLeadsEl = document.getElementById("recent-leads");
    recentLeadsEl.innerHTML = state.leads.length
      ? state.leads
          .slice(-5)
          .reverse()
          .map(
            (item) =>
              `<tr>
                <td><strong>${safe(item.name)}</strong><small>${safe(item.phone || item.email)}</small></td>
                <td>${safe(item.destination || "General Consultation")}</td>
                <td>${safe(item.travelDate || "Flexible")}</td>
                <td><span class="status-pill ${getStatusClass(item.status)}">${safe(item.status)}</span></td>
                <td>
                  <button class="admin-button secondary small" type="button" data-convert-booking="${safe(item.id)}">Quote →</button>
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="empty-state">No enquiries logged yet. Add your first lead in the Leads view.</td></tr>`;

    // Cash flow visual breakdown
    document.getElementById("ov-cf-rev").textContent = money.format(totalRev);
    document.getElementById("ov-cf-cost").textContent = money.format(totalCost);
    document.getElementById("ov-cf-margin").textContent = money.format(grossMargin);

    const receivables = state.bookings.reduce((sum, b) => sum + Math.max(0, (Number(b.value) || 0) - (Number(b.advance) || 0)), 0);
    const payables = state.outflow.filter((o) => o.status !== "Paid in Full").reduce((sum, o) => sum + (Number(o.amountPaid) || 0), 0);

    document.getElementById("ov-receivables").textContent = money.format(receivables);
    document.getElementById("ov-payables").textContent = money.format(payables);
  }

  function getStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("received") || s.includes("confirmed") || s.includes("paid") || s.includes("won") || s.includes("active")) return "good";
    if (s.includes("advance") || s.includes("partial") || s.includes("pending") || s.includes("quotation")) return "pending";
    if (s.includes("declined") || s.includes("due") || s.includes("lost") || s.includes("cancel") || s.includes("inactive")) return "danger";
    return "info";
  }

  // ==========================================
  // 2. LEADS & ENQUIRIES RENDERING
  // ==========================================
  function renderLeads() {
    const filterText = (document.getElementById("search-leads")?.value || "").toLowerCase().trim();
    const list = document.getElementById("lead-list");

    const filtered = state.leads.filter((item) => {
      const text = `${item.name} ${item.email} ${item.phone} ${item.destination} ${item.status}`.toLowerCase();
      return !filterText || text.includes(filterText);
    });

    list.innerHTML = filtered.length
      ? filtered
          .slice()
          .reverse()
          .map(
            (item) =>
              `<tr>
                <td>
                  <strong>${safe(item.name)}</strong>
                  <small>${safe(item.phone)} · ${safe(item.email)}</small>
                </td>
                <td>${safe(item.destination)}</td>
                <td>${safe(item.travelDate || "Flexible")}</td>
                <td>${safe(item.budget ? money.format(item.budget) : "To discuss")}</td>
                <td>
                  <select class="admin-inline-select" data-lead-status="${safe(item.id)}">
                    ${["New", "Contacted", "Quotation sent", "Won", "Lost"]
                      .map((st) => `<option${item.status === st ? " selected" : ""}>${st}</option>`)
                      .join("")}
                  </select>
                </td>
                <td>
                  <button class="admin-delete" type="button" data-delete-lead="${safe(item.id)}">Delete</button>
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty-state">No matching leads found.</td></tr>`;
  }

  // Lead inline status change & deletion listeners
  document.getElementById("lead-list")?.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-lead-status]");
    if (!select) return;
    const id = select.dataset.leadStatus;
    const newStatus = select.value;
    const lead = state.leads.find((l) => String(l.id) === String(id));
    if (lead) {
      lead.status = newStatus;
      save();
      logAction("LEAD_STATUS", `Updated lead status for ${lead.name} to ${newStatus}`, { id, status: newStatus });
      renderOverview();
      try {
        await fetch(`${API_ENDPOINT}/enquiry.php?action=update_lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(id) || id, status: newStatus })
        });
      } catch (_) {}
    }
  });

  document.getElementById("lead-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-lead]");
    if (!btn) return;
    const id = btn.dataset.deleteLead;
    const lead = state.leads.find((l) => String(l.id) === String(id));
    const name = lead ? lead.name : id;
    if (!window.confirm(`Move lead "${name}" to Recycle Bin? (Retained for 15 days)`)) return;
    moveToRecycleBin("lead", id, name);
  });

  // ==========================================
  // 3. CATALOGUE & INVENTORY MANAGEMENT (CRUD)
  // ==========================================
  let currentCatFilter = "all";

  function getAllCatalogueItems() {
    const pkgs = (defaultCatalogue.packages || []).concat(state.packages || []).map((p) => ({ ...p, category: "packages" }));
    const htls = (defaultCatalogue.hotels || []).concat(state.hotels || []).map((h) => ({ ...h, category: "hotels" }));
    const deals = (defaultCatalogue.deals || []).concat(state.deals || []).map((d) => ({ ...d, category: "deals" }));
    const flts = (defaultCatalogue.flights || []).concat(state.flights || []).map((f) => ({ ...f, category: "flights" }));
    return [...deals, ...pkgs, ...htls, ...flts];
  }

  function renderCatalogue() {
    const all = getAllCatalogueItems();
    const searchVal = (document.getElementById("catalog-search-admin")?.value || "").toLowerCase().trim();

    // Update tab counts
    document.getElementById("count-all").textContent = all.length;
    document.getElementById("count-pkg").textContent = all.filter((i) => i.category === "packages").length;
    document.getElementById("count-htl").textContent = all.filter((i) => i.category === "hotels").length;
    document.getElementById("count-deals").textContent = all.filter((i) => i.category === "deals").length;
    document.getElementById("count-flt").textContent = all.filter((i) => i.category === "flights").length;

    const filtered = all.filter((item) => {
      if (currentCatFilter !== "all" && item.category !== currentCatFilter) return false;
      if (!searchVal) return true;
      const haystack = `${item.name || item.title || item.sector} ${item.destination || item.region || item.airline || ""} ${item.description || item.notes || ""}`.toLowerCase();
      return haystack.includes(searchVal);
    });

    const grid = document.getElementById("catalog-admin-cards");
    grid.innerHTML = filtered.length
      ? filtered.map((item) => renderCatalogCard(item)).join("")
      : `<div class="wide empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">No items found in this category. Click "+ Add New Item" to create one.</div>`;
  }

  function renderCatalogCard(item) {
    const id = item.id || item.slug || `item-${Date.now()}`;
    const name = item.name || item.title || item.sector || "Untitled Item";
    const dest = item.destination || item.region || item.airline || "Domestic";
    const price = item.price || item.dealPrice || item.baseFare || 0;
    const origPrice = item.originalPrice ? money.format(item.originalPrice) : "";
    const img = item.image || "assets/images/sample.webp";
    const status = item.status || "Active";
    const categoryLabel = { packages: "Package", hotels: "Hotel Stay", deals: "Special Deal", flights: "Flight Route" }[item.category] || "Item";

    let meta = "";
    if (item.category === "packages") meta = `${item.duration || "Bespoke"} · ${item.style || "Curated"}`;
    else if (item.category === "hotels") meta = `${item.type || "Hotel"} · ${"★".repeat(item.stars || 4)}`;
    else if (item.category === "deals") meta = `Promo: ${item.promoCode || "SPECIAL"} · ${item.discount || "Discounted"}`;
    else if (item.category === "flights") meta = `${item.flightNo || "Direct"} · ${item.duration || "2h+"} · ${item.cabin || "Economy"}`;

    return `
      <article class="catalog-admin-card" data-cat-id="${safe(id)}" data-cat-type="${safe(item.category)}">
        <div class="admin-card-media">
          <img src="${safe(img)}" alt="" class="admin-card-thumb" onerror="this.src='assets/images/sample.webp'" />
          <span class="admin-card-badge">${safe(categoryLabel)}</span>
          <span class="admin-card-status ${status.toLowerCase()}">${safe(status)}</span>
        </div>
        <div class="admin-card-info">
          <span class="admin-card-meta">${safe(dest)} · ${safe(meta)}</span>
          <h3>${safe(name)}</h3>
          <p style="color: var(--admin-muted); font-size: 0.84rem; margin: 4px 0 10px; line-height: 1.5;">
            ${safe(item.description || item.tagline || item.notes || (item.highlights ? item.highlights.join(" · ") : ""))}
          </p>
          <div class="admin-card-price">
            <strong>${money.format(price)}</strong> ${origPrice ? `<del style="color: var(--admin-muted); font-size: 0.85rem; margin-left: 6px;">${origPrice}</del>` : ""}
          </div>
          <div class="admin-card-actions">
            <button type="button" class="admin-button secondary small" data-edit-item="${safe(id)}" data-edit-type="${safe(item.category)}">✏️ Edit Details</button>
            <button type="button" class="admin-delete small" data-del-item="${safe(id)}" data-del-type="${safe(item.category)}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }

  // Catalogue Tab Clicking
  document.querySelectorAll(".catalog-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".catalog-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCatFilter = btn.dataset.catFilter;
      renderCatalogue();
    });
  });

  document.getElementById("catalog-search-admin")?.addEventListener("input", renderCatalogue);

  // ==========================================
  // INVENTORY MODAL (ADD / EDIT)
  // ==========================================
  const itemModal = document.getElementById("item-modal");
  const itemForm = document.getElementById("modal-item-form");

  function openItemModal(item = null, category = "packages") {
    if (!itemModal || !itemForm) return;

    itemForm.reset();
    const isEdit = Boolean(item);
    document.getElementById("modal-item-title").textContent = isEdit ? `Edit ${item.name || item.title || item.sector}` : `Add New ${category.toUpperCase()}`;

    const catSelect = document.getElementById("modal-item-type");
    catSelect.value = item ? item.category : category;
    catSelect.disabled = isEdit;

    document.getElementById("modal-item-id").value = item ? item.id || item.slug : `item-${Date.now()}`;
    document.getElementById("modal-item-category").value = item ? item.category : category;
    document.getElementById("modal-item-name").value = item ? item.name || item.title || item.sector || "" : "";
    document.getElementById("modal-item-dest").value = item ? item.destination || item.region || item.airline || "" : "";
    document.getElementById("modal-item-price").value = item ? item.price || item.dealPrice || item.baseFare || 0 : "";
    document.getElementById("modal-item-img").value = item ? item.image || "assets/images/sample.webp" : "assets/images/sample.webp";
    document.getElementById("modal-item-desc").value = item ? item.description || item.tagline || item.notes || "" : "";
    document.getElementById("modal-item-status").value = item ? item.status || "Active" : "Active";

    // Populate category specifics
    if (item && item.category === "packages") {
      document.getElementById("modal-pkg-duration").value = item.duration || "";
      document.getElementById("modal-pkg-style").value = item.style || "";
      document.getElementById("modal-pkg-highlights").value = item.highlights ? item.highlights.join(", ") : "";
    } else if (item && item.category === "hotels") {
      document.getElementById("modal-htl-type").value = item.type || "";
      document.getElementById("modal-htl-stars").value = item.stars || 5;
      document.getElementById("modal-htl-amenities").value = item.amenities ? item.amenities.join(", ") : "";
    } else if (item && item.category === "deals") {
      document.getElementById("modal-deal-discount").value = item.discount || "";
      document.getElementById("modal-deal-code").value = item.promoCode || "";
      document.getElementById("modal-deal-orig").value = item.originalPrice || "";
      document.getElementById("modal-deal-valid").value = item.validTill || "";
      document.getElementById("modal-deal-inclusions").value = item.inclusions ? item.inclusions.join(", ") : "";
    } else if (item && item.category === "flights") {
      document.getElementById("modal-flt-airline").value = item.airline || "";
      document.getElementById("modal-flt-number").value = item.flightNo || "";
      document.getElementById("modal-flt-duration").value = item.duration || "";
      document.getElementById("modal-flt-cabin").value = item.cabin || "";
      document.getElementById("modal-flt-baggage").value = item.baggage || "";
    }

    updateModalFieldGroups(catSelect.value);
    document.getElementById("btn-delete-modal-item").style.display = isEdit ? "inline-flex" : "none";

    itemModal.hidden = false;
  }

  function updateModalFieldGroups(cat) {
    document.getElementById("field-group-pkg").style.display = cat === "packages" ? "block" : "none";
    document.getElementById("field-group-htl").style.display = cat === "hotels" ? "block" : "none";
    document.getElementById("field-group-deal").style.display = cat === "deals" ? "block" : "none";
    document.getElementById("field-group-flt").style.display = cat === "flights" ? "block" : "none";
  }

  document.getElementById("modal-item-type")?.addEventListener("change", (e) => {
    updateModalFieldGroups(e.target.value);
  });

  document.getElementById("btn-add-item")?.addEventListener("click", () => {
    const cat = currentCatFilter === "all" ? "packages" : currentCatFilter;
    openItemModal(null, cat);
  });

  document.getElementById("btn-close-item-modal")?.addEventListener("click", () => {
    itemModal.hidden = true;
  });

  document.getElementById("btn-cancel-modal")?.addEventListener("click", () => {
    itemModal.hidden = true;
  });

  // Modal Item Form Submission
  itemForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("modal-item-id").value;
    const cat = document.getElementById("modal-item-type").value;
    const name = document.getElementById("modal-item-name").value.trim();
    const dest = document.getElementById("modal-item-dest").value.trim();
    const price = Number(document.getElementById("modal-item-price").value) || 0;
    const img = document.getElementById("modal-item-img").value.trim() || "assets/images/sample.webp";
    const desc = document.getElementById("modal-item-desc").value.trim();
    const status = document.getElementById("modal-item-status").value;

    const record = {
      id,
      slug: id.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      title: name,
      sector: name,
      destination: dest,
      region: dest,
      price,
      dealPrice: price,
      baseFare: price,
      image: img,
      description: desc,
      tagline: desc,
      notes: desc,
      status,
      category: cat
    };

    if (cat === "packages") {
      record.duration = document.getElementById("modal-pkg-duration").value.trim();
      record.style = document.getElementById("modal-pkg-style").value.trim();
      record.highlights = document.getElementById("modal-pkg-highlights").value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (cat === "hotels") {
      record.type = document.getElementById("modal-htl-type").value.trim() || "Resort";
      record.stars = Number(document.getElementById("modal-htl-stars").value) || 5;
      record.amenities = document.getElementById("modal-htl-amenities").value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (cat === "deals") {
      record.discount = document.getElementById("modal-deal-discount").value.trim() || "Special Offer";
      record.promoCode = document.getElementById("modal-deal-code").value.trim() || "DEAL";
      record.originalPrice = Number(document.getElementById("modal-deal-orig").value) || price;
      record.validTill = document.getElementById("modal-deal-valid").value;
      record.inclusions = document.getElementById("modal-deal-inclusions").value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (cat === "flights") {
      record.airline = document.getElementById("modal-flt-airline").value.trim() || "Domestic Carrier";
      record.flightNo = document.getElementById("modal-flt-number").value.trim() || "Direct";
      record.duration = document.getElementById("modal-flt-duration").value.trim() || "2h";
      record.cabin = document.getElementById("modal-flt-cabin").value.trim() || "Economy";
      record.baggage = document.getElementById("modal-flt-baggage").value.trim() || "15kg Check-in";
    }

    // Save in state array for that category
    if (!Array.isArray(state[cat])) state[cat] = [];
    const existingIndex = state[cat].findIndex((i) => i.id === id || i.slug === id);
    if (existingIndex >= 0) {
      state[cat][existingIndex] = record;
    } else {
      state[cat].push(record);
    }

    save();
    itemModal.hidden = true;
    logAction("CATALOG_EDIT", `Saved ${cat.slice(0, -1)} "${name}"`, { price, destination: dest, status });
    renderAll();

    // Async push to backend catalog endpoint (individual item & bulk)
    try {
      fetch(`${API_ENDPOINT}/catalog.php?action=save_item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
    } catch (_) {}
    syncCatalogueToBackend();
  });

  // Delete from modal (Moves to 15-day Recycle Bin)
  document.getElementById("btn-delete-modal-item")?.addEventListener("click", () => {
    const id = document.getElementById("modal-item-id").value;
    const cat = document.getElementById("modal-item-category").value;
    const name = document.getElementById("modal-item-name").value || id;
    if (!window.confirm(`Move "${name}" to Recycle Bin? (Retained for 15 days)`)) return;

    itemModal.hidden = true;
    moveToRecycleBin(cat, id, name);
  });

  // Edit/Delete click delegation in Catalog Grid
  document.getElementById("catalog-admin-cards")?.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-item]");
    if (editBtn) {
      const id = editBtn.dataset.editItem;
      const type = editBtn.dataset.editType;
      const all = getAllCatalogueItems();
      const found = all.find((i) => (i.id === id || i.slug === id));
      if (found) openItemModal(found, type);
      return;
    }

    const delBtn = e.target.closest("[data-del-item]");
    if (delBtn) {
      const id = delBtn.dataset.delItem;
      const type = delBtn.dataset.delType;
      const all = getAllCatalogueItems();
      const found = all.find((i) => (i.id === id || i.slug === id));
      const name = found ? (found.name || found.title || id) : id;
      if (!window.confirm(`Move ${type} "${name}" to Recycle Bin? (Retained for 15 days)`)) return;
      moveToRecycleBin(type, id, name);
    }
  });

  async function syncCatalogueToBackend() {
    try {
      const payload = {
        destinations: defaultCatalogue.destinations || [],
        packages: (defaultCatalogue.packages || []).concat(state.packages || []),
        hotels: (defaultCatalogue.hotels || []).concat(state.hotels || []),
        deals: (defaultCatalogue.deals || []).concat(state.deals || []),
        flights: (defaultCatalogue.flights || []).concat(state.flights || [])
      };
      await fetch(`${API_ENDPOINT}/catalog.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (_) {}
  }

  // ==========================================
  // 4. QUOTATIONS & BOOKINGS RENDERING
  // ==========================================
  function renderBookings() {
    const list = document.getElementById("booking-list");
    list.innerHTML = state.bookings.length
      ? state.bookings
          .slice()
          .reverse()
          .map((b) => {
            const val = Number(b.value) || 0;
            const adv = Number(b.advance) || 0;
            const bal = Math.max(0, val - adv);
            return `
              <tr>
                <td><strong>${safe(b.bookingId || "BM-BK-CONF")}</strong><br><small>${safe(b.customer)}</small></td>
                <td>${safe(b.trip)}</td>
                <td><strong>${money.format(val)}</strong></td>
                <td>Paid: ${money.format(adv)}<br><small style="color: #ff9e9e;">Due: ${money.format(bal)}</small></td>
                <td><span class="status-pill ${getStatusClass(b.status)}">${safe(b.status)}</span></td>
                <td>
                  <button class="admin-button secondary small" type="button" data-gen-invoice-bk="${safe(b.bookingId)}">🧾 GST Inv</button>
                  <button class="admin-button secondary small" type="button" data-gw-pay-bk="${safe(b.bookingId)}">⚡ Pay</button>
                  <button class="admin-delete small" type="button" data-delete-booking="${safe(b.bookingId)}" title="Move to Recycle Bin">🗑️</button>
                </td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-state">No quotations or active bookings tracked yet.</td></tr>`;

    // Populate Booking dropdown in Gateway view
    const gwSelect = document.getElementById("gw-booking-select");
    if (gwSelect) {
      gwSelect.innerHTML = `<option value="custom">-- Custom Sandbox Payment --</option>` +
        state.bookings.map((b) => `<option value="${safe(b.bookingId)}">${safe(b.bookingId)} · ${safe(b.customer)} (${money.format(b.value)})</option>`).join("");
    }
  }

  // Booking click delegation (Delete booking to Recycle Bin)
  document.getElementById("booking-list")?.addEventListener("click", (e) => {
    const delBtn = e.target.closest("[data-delete-booking]");
    if (delBtn) {
      const bkId = delBtn.dataset.deleteBooking;
      const b = state.bookings.find((item) => item.bookingId === bkId || item.id === bkId);
      const title = b ? `${b.trip} (${b.customer})` : bkId;
      if (!window.confirm(`Move booking "${title}" to Recycle Bin? (Retained for 15 days)`)) return;
      moveToRecycleBin("booking", bkId, title);
      return;
    }
  });

  // Booking form submission (Saves to MySQL)
  document.getElementById("booking-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const bkId = formValue(form, "bookingId") || `BM-BK-${Date.now().toString().slice(-6)}`;
    const cust = formValue(form, "customer");
    const trip = formValue(form, "trip");
    const val = Number(formValue(form, "value")) || 0;
    const adv = Number(formValue(form, "advance")) || 0;
    const status = formValue(form, "status");

    const newBooking = {
      id: bkId,
      bookingId: bkId,
      customer: cust,
      trip,
      value: val,
      advance: adv,
      status
    };
    state.bookings.push(newBooking);

    if (adv > 0) {
      state.inflow.push({
        id: `in-${Date.now()}`,
        bookingRef: bkId,
        customer: cust,
        amount: adv,
        method: "Bank Transfer (NEFT/RTGS)",
        utr: `INIT-DEP-${Date.now().toString().slice(-5)}`,
        status: "Advance / Deposit",
        date: new Date().toISOString().split("T")[0]
      });
    }

    save();
    form.reset();
    logAction("CUSTOMER_PAYMENT", `Created booking ${bkId} for ${cust}`, { trip, value: val, advance: adv });
    renderAll();

    // Push to backend bookings API
    try {
      await fetch(`${API_ENDPOINT}/bookings.php?action=save_booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bkId,
          customer_name: cust,
          trip_title: trip,
          total_amount: val,
          paid_amount: adv,
          status
        })
      });
    } catch (_) {}
  });

  // ==========================================
  // 5. FINANCE & TWO-WAY LEDGER RENDERING
  // ==========================================
  let currentFinTab = "all-ledger";

  function renderFinance() {
    const totalInflow = state.inflow.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalOutflow = state.outflow.reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
    const grossMargin = totalInflow - totalOutflow;
    const marginPct = totalInflow > 0 ? ((grossMargin / totalInflow) * 100).toFixed(1) : 0;

    const receivables = state.bookings.reduce((sum, b) => sum + Math.max(0, (Number(b.value) || 0) - (Number(b.advance) || 0)), 0);
    const payables = state.outflow.filter((o) => o.status !== "Paid in Full").reduce((sum, o) => sum + (Number(o.amountPaid) || 0), 0);

    document.getElementById("f-total-inflow").textContent = money.format(totalInflow);
    document.getElementById("f-total-outflow").textContent = money.format(totalOutflow);
    document.getElementById("f-net-margin").textContent = `${money.format(grossMargin)} (${marginPct}%)`;
    document.getElementById("f-pending-receivables").textContent = money.format(receivables);
    document.getElementById("f-pending-payables").textContent = money.format(payables);

    const filterText = (document.getElementById("search-finance")?.value || "").toLowerCase().trim();

    // Prepare consolidated ledger items
    const inflowRecords = state.inflow.map((inf) => ({
      id: inf.id,
      date: inf.date || new Date().toISOString().split("T")[0],
      party: inf.customer,
      category: inf.bookingRef || "Client Collection",
      type: "INFLOW (+)",
      amount: Number(inf.amount) || 0,
      method: `${inf.method} ${inf.utr ? `· ${inf.utr}` : ""}`,
      status: inf.status,
      rawType: "inflow"
    }));

    const outflowRecords = state.outflow.map((out) => ({
      id: out.id,
      date: out.date || new Date().toISOString().split("T")[0],
      party: out.vendorName,
      category: `${out.vendorCategory} · ${out.linkedBooking || ""}`,
      type: "OUTFLOW (-)",
      amount: Number(out.amountPaid) || 0,
      method: out.vendorInvoice ? `Inv: ${out.vendorInvoice}` : "Disbursement",
      status: out.status,
      rawType: "outflow"
    }));

    let allLedger = [...inflowRecords, ...outflowRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (currentFinTab === "inflow") allLedger = allLedger.filter((item) => item.rawType === "inflow");
    if (currentFinTab === "outflow") allLedger = allLedger.filter((item) => item.rawType === "outflow");

    if (filterText) {
      allLedger = allLedger.filter((item) => `${item.party} ${item.category} ${item.method} ${item.status}`.toLowerCase().includes(filterText));
    }

    const list = document.getElementById("finance-ledger-list");
    list.innerHTML = allLedger.length
      ? allLedger
          .map(
            (item) => `
            <tr>
              <td>${safe(item.date)}</td>
              <td><strong>${safe(item.party)}</strong></td>
              <td>${safe(item.category)}</td>
              <td><span class="status-pill ${item.rawType === "inflow" ? "good" : "pending"}">${safe(item.type)}</span></td>
              <td><strong style="color: ${item.rawType === "inflow" ? "var(--admin-good)" : "var(--admin-accent)"}">${money.format(item.amount)}</strong></td>
              <td><small>${safe(item.method)}</small></td>
              <td><span class="status-pill ${getStatusClass(item.status)}">${safe(item.status)}</span></td>
              <td>
                <button class="admin-delete" type="button" data-del-ledger="${safe(item.id)}" data-ledger-kind="${safe(item.rawType)}">Delete</button>
              </td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="8" class="empty-state">No transaction records found in this view.</td></tr>`;
  }

  // Finance tab switching
  document.querySelectorAll(".finance-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".finance-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFinTab = btn.dataset.finTab;
      renderFinance();
    });
  });

  document.getElementById("search-finance")?.addEventListener("input", renderFinance);

  // Inflow vs Outflow Form Mode Toggle
  const btnModeInflow = document.getElementById("btn-mode-inflow");
  const btnModeOutflow = document.getElementById("btn-mode-outflow");
  const formInflow = document.getElementById("inflow-form");
  const formOutflow = document.getElementById("outflow-form");

  btnModeInflow?.addEventListener("click", () => {
    btnModeInflow.classList.add("active");
    btnModeOutflow.classList.remove("active");
    formInflow.style.display = "grid";
    formOutflow.style.display = "none";
  });

  btnModeOutflow?.addEventListener("click", () => {
    btnModeOutflow.classList.add("active");
    btnModeInflow.classList.remove("active");
    formOutflow.style.display = "grid";
    formInflow.style.display = "none";
  });

  // Submit Customer Inflow
  formInflow?.addEventListener("submit", (e) => {
    e.preventDefault();
    const cust = formValue(formInflow, "customer");
    const amount = Number(formValue(formInflow, "amount")) || 0;
    const bkRef = formValue(formInflow, "bookingRef");
    const method = formValue(formInflow, "method");
    const utr = formValue(formInflow, "utr") || `UTR-${Date.now().toString().slice(-6)}`;
    const status = formValue(formInflow, "status");

    state.inflow.push({
      id: `in-${Date.now()}`,
      customer: cust,
      bookingRef: bkRef,
      amount,
      method,
      utr,
      status,
      date: new Date().toISOString().split("T")[0]
    });

    save();
    formInflow.reset();
    logAction("CUSTOMER_PAYMENT", `Recorded receipt of ${money.format(amount)} from ${cust}`, { method, utr, status });
    renderAll();
  });

  // Submit Vendor Outflow
  formOutflow?.addEventListener("submit", (e) => {
    e.preventDefault();
    const vCat = formValue(formOutflow, "vendorCategory");
    const vName = formValue(formOutflow, "vendorName");
    const linkedBk = formValue(formOutflow, "linkedBooking");
    const amount = Number(formValue(formOutflow, "amountPaid")) || 0;
    const vInv = formValue(formOutflow, "vendorInvoice");
    const status = formValue(formOutflow, "status");
    const notes = formValue(formOutflow, "notes");

    state.outflow.push({
      id: `out-${Date.now()}`,
      vendorCategory: vCat,
      vendorName: vName,
      linkedBooking: linkedBk,
      amountPaid: amount,
      vendorInvoice: vInv,
      status,
      notes,
      date: new Date().toISOString().split("T")[0]
    });

    save();
    formOutflow.reset();
    logAction("VENDOR_PAYOUT", `Recorded payout of ${money.format(amount)} to ${vName} (${vCat})`, { linkedBk, vInv, status });
    renderAll();
  });

  // Delete ledger item delegation (Moves to 15-day Recycle Bin)
  document.getElementById("finance-ledger-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del-ledger]");
    if (!btn) return;
    const id = btn.dataset.delLedger;
    const kind = btn.dataset.ledgerKind;
    if (!window.confirm(`Move this ${kind} record (${id}) to Recycle Bin? (Retained for 15 days)`)) return;

    moveToRecycleBin("payment", id, `${kind.toUpperCase()} ${id}`);
  });

  // ==========================================
  // 6. GST TAX INVOICE GENERATOR & PREVIEW
  // ==========================================
  function initInvoiceForm() {
    const invNumField = document.getElementById("inv-num-field");
    const invDateField = document.getElementById("inv-date-field");
    const invDueField = document.getElementById("inv-due-field");

    if (invNumField && !invNumField.value) {
      invNumField.value = `BM-INV-2026-${String(state.invoices.length + 1).padStart(4, "0")}`;
    }
    if (invDateField && !invDateField.value) {
      invDateField.value = new Date().toISOString().split("T")[0];
    }
    if (invDueField && !invDueField.value) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      invDueField.value = d.toISOString().split("T")[0];
    }
    updateInvoiceCalculations();
  }

  function updateInvoiceCalculations() {
    let subtotal = 0;
    document.querySelectorAll(".inv-line-row").forEach((row) => {
      const rate = Number(row.querySelector(".inv-item-rate")?.value) || 0;
      const qty = Number(row.querySelector(".inv-item-qty")?.value) || 1;
      subtotal += rate * qty;
    });

    const tax = subtotal * 0.05; // 5% GST on SAC 9985
    const total = subtotal + tax;
    const advance = Number(document.getElementById("inv-adv-field")?.value) || 0;
    const balance = Math.max(0, total - advance);

    document.getElementById("inv-calc-subtotal").textContent = money.format(subtotal);
    document.getElementById("inv-calc-tax").textContent = money.format(tax);
    document.getElementById("inv-calc-total").textContent = money.format(total);
    document.getElementById("inv-calc-balance").textContent = money.format(balance);

    return { subtotal, tax, total, advance, balance };
  }

  document.getElementById("inv-line-items-container")?.addEventListener("input", updateInvoiceCalculations);
  document.getElementById("inv-adv-field")?.addEventListener("input", updateInvoiceCalculations);
  document.getElementById("inv-tax-type")?.addEventListener("change", updateInvoiceCalculations);

  document.getElementById("btn-add-inv-item")?.addEventListener("click", () => {
    const container = document.getElementById("inv-line-items-container");
    const row = document.createElement("div");
    row.className = "inv-line-row";
    row.innerHTML = `
      <input class="inv-item-desc" placeholder="Service description..." value="Luxury Hotel Allocation & Transfers" required />
      <input class="inv-item-sac" value="9985" title="SAC Code" style="width: 70px;" readonly />
      <input class="inv-item-rate" type="number" placeholder="Rate (₹)" value="25000" style="width: 100px;" required />
      <input class="inv-item-qty" type="number" value="1" min="1" style="width: 55px;" required />
      <button type="button" class="btn-remove-line" title="Remove">×</button>
    `;
    container.appendChild(row);
    updateInvoiceCalculations();
  });

  document.getElementById("inv-line-items-container")?.addEventListener("click", (e) => {
    if (e.target.closest(".btn-remove-line")) {
      const rows = document.querySelectorAll(".inv-line-row");
      if (rows.length > 1) {
        e.target.closest(".inv-line-row").remove();
        updateInvoiceCalculations();
      }
    }
  });

  // Generate Invoice Form Submit
  document.getElementById("invoice-generator-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const invNo = formValue(form, "invNumber");
    const invDate = formValue(form, "invDate");
    const clientName = formValue(form, "invClientName");
    const clientGst = formValue(form, "invClientGst");
    const clientContact = formValue(form, "invClientContact");
    const clientAddr = formValue(form, "invClientAddress");
    const taxType = formValue(form, "invTaxType");
    const dueDate = formValue(form, "invDueDate");

    const lineItems = [];
    document.querySelectorAll(".inv-line-row").forEach((row) => {
      lineItems.push({
        desc: row.querySelector(".inv-item-desc")?.value || "Travel Service",
        sac: "9985",
        rate: Number(row.querySelector(".inv-item-rate")?.value) || 0,
        qty: Number(row.querySelector(".inv-item-qty")?.value) || 1
      });
    });

    const calcs = updateInvoiceCalculations();

    const invoiceRecord = {
      id: invNo,
      invoiceNo: invNo,
      date: invDate,
      dueDate,
      clientName,
      clientGst,
      clientContact,
      clientAddress: clientAddr,
      taxType,
      lineItems,
      subtotal: calcs.subtotal,
      tax: calcs.tax,
      total: calcs.total,
      advance: calcs.advance,
      balance: calcs.balance,
      status: calcs.balance <= 0 ? "Paid in Full" : (calcs.advance > 0 ? "Partial Paid" : "Unpaid / Due")
    };

    // Save or update in state
    const existingIndex = state.invoices.findIndex((i) => i.invoiceNo === invNo);
    if (existingIndex >= 0) state.invoices[existingIndex] = invoiceRecord;
    else state.invoices.unshift(invoiceRecord);

    save();
    logAction("INVOICE_GENERATED", `Issued Tax Invoice ${invNo} for ${clientName}`, { total: calcs.total, balance: calcs.balance });
    renderInvoices();
    showInvoicePreviewModal(invoiceRecord);
  });

  function renderInvoices() {
    const filterText = (document.getElementById("search-invoices")?.value || "").toLowerCase().trim();
    const list = document.getElementById("invoice-list");

    const filtered = state.invoices.filter((inv) => {
      const text = `${inv.invoiceNo} ${inv.clientName} ${inv.clientGst || ""} ${inv.status}`.toLowerCase();
      return !filterText || text.includes(filterText);
    });

    list.innerHTML = filtered.length
      ? filtered
          .map(
            (inv) => `
            <tr>
              <td><strong>${safe(inv.invoiceNo)}</strong></td>
              <td>${safe(inv.date)}</td>
              <td><strong>${safe(inv.clientName)}</strong><br><small>${safe(inv.clientGst ? `GSTIN: ${inv.clientGst}` : inv.clientContact)}</small></td>
              <td><strong>${money.format(inv.total)}</strong></td>
              <td>${money.format(inv.tax)}</td>
              <td><span style="color: ${inv.balance > 0 ? "#ff9e9e" : "var(--admin-good)"}; font-weight: 600;">${money.format(inv.balance)}</span></td>
              <td><span class="status-pill ${getStatusClass(inv.status)}">${safe(inv.status)}</span></td>
              <td>
                <button class="admin-button secondary small" type="button" data-view-inv="${safe(inv.invoiceNo)}">🖨️ View / Print</button>
              </td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="8" class="empty-state">No GST invoices generated yet. Use the form on the right.</td></tr>`;
  }

  function showInvoicePreviewModal(inv) {
    const docEl = document.getElementById("invoice-printable-doc");
    const modal = document.getElementById("invoice-preview-modal");
    if (!docEl || !modal) return;

    const isIntra = inv.taxType === "intra";
    const cgst = isIntra ? inv.tax / 2 : 0;
    const sgst = isIntra ? inv.tax / 2 : 0;
    const igst = isIntra ? 0 : inv.tax;

    docEl.innerHTML = `
      <div class="inv-doc-header">
        <div>
          <div class="inv-brand-name">BRAHMNMITRA</div>
          <p style="margin: 4px 0 0; color: #475569; font-size: 0.85rem;">
            Bespoke Travel Solutions &amp; Corporate MICE Desk<br>
            Service Accounting Code (SAC): <strong>9985</strong><br>
            New Delhi, India · info@brahmnmitra.com · +91 92117 61885
          </p>
        </div>
        <div style="text-align: right;">
          <h1 style="font-size: 1.4rem; margin: 0; color: #0f172a; text-transform: uppercase;">TAX INVOICE</h1>
          <p style="margin: 4px 0 0; font-size: 0.9rem;"><strong>Invoice #:</strong> ${safe(inv.invoiceNo)}</p>
          <p style="margin: 2px 0 0; font-size: 0.85rem; color: #475569;"><strong>Date:</strong> ${safe(inv.date)}</p>
          ${inv.dueDate ? `<p style="margin: 2px 0 0; font-size: 0.85rem; color: #b91c1c;"><strong>Due Date:</strong> ${safe(inv.dueDate)}</p>` : ""}
        </div>
      </div>

      <div class="inv-meta-grid">
        <div>
          <strong style="color: #475569; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em;">Billed To:</strong>
          <h3 style="margin: 4px 0 2px; font-size: 1.05rem; color: #0f172a;">${safe(inv.clientName)}</h3>
          ${inv.clientGst ? `<p style="margin: 2px 0; color: #0f172a;"><strong>GSTIN:</strong> <code>${safe(inv.clientGst)}</code></p>` : ""}
          <p style="margin: 2px 0; color: #475569;">${safe(inv.clientAddress)}</p>
          <p style="margin: 2px 0; color: #475569;">${safe(inv.clientContact)}</p>
        </div>
        <div style="text-align: right;">
          <strong style="color: #475569; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em;">Billing Specifications:</strong>
          <p style="margin: 4px 0; color: #0f172a;"><strong>Place of Supply:</strong> ${isIntra ? "Delhi (Intra-State)" : "Other State (Inter-State)"}</p>
          <p style="margin: 2px 0; color: #0f172a;"><strong>SAC Classification:</strong> 9985 (Tour Operator Services)</p>
          <p style="margin: 2px 0; color: #0f172a;"><strong>GST Rate:</strong> 5.0% (Input Tax Credit Compliant)</p>
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th style="width: 50%;">Service Description</th>
            <th style="width: 12%; text-align: center;">SAC</th>
            <th style="width: 15%; text-align: right;">Rate (₹)</th>
            <th style="width: 8%; text-align: center;">Qty</th>
            <th style="width: 15%; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${inv.lineItems
            .map(
              (item) => `
            <tr>
              <td><strong>${safe(item.desc)}</strong></td>
              <td style="text-align: center;"><code>${safe(item.sac)}</code></td>
              <td style="text-align: right;">${money.format(item.rate)}</td>
              <td style="text-align: center;">${item.qty}</td>
              <td style="text-align: right;">${money.format(item.rate * item.qty)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="inv-totals-box">
        <div class="inv-totals-row">
          <span>Taxable Subtotal:</span>
          <strong>${money.format(inv.subtotal)}</strong>
        </div>
        ${
          isIntra
            ? `
          <div class="inv-totals-row">
            <span>CGST (2.5%):</span>
            <span>${money.format(cgst)}</span>
          </div>
          <div class="inv-totals-row">
            <span>SGST (2.5%):</span>
            <span>${money.format(sgst)}</span>
          </div>
        `
            : `
          <div class="inv-totals-row">
            <span>IGST (5.0%):</span>
            <span>${money.format(igst)}</span>
          </div>
        `
        }
        <div class="inv-totals-row grand-total">
          <span>Total Invoice Value:</span>
          <strong>${money.format(inv.total)}</strong>
        </div>
        ${
          inv.advance > 0
            ? `
          <div class="inv-totals-row" style="color: #15803d;">
            <span>Advance Received:</span>
            <span>-${money.format(inv.advance)}</span>
          </div>
          <div class="inv-totals-row grand-total" style="color: #b91c1c; background: #fff1f2;">
            <span>Balance Due:</span>
            <strong>${money.format(inv.balance)}</strong>
          </div>
        `
            : ""
        }
      </div>

      <div class="inv-bank-terms">
        <div>
          <strong style="color: #0f172a;">Bank Wire Transfer Details:</strong>
          <p style="margin: 4px 0 0; line-height: 1.6;">
            Bank Name: HDFC Bank Limited<br>
            Account Name: BRAHMNMITRA TRAVEL SERVICES<br>
            Account No: 50200088991122 (Current Account)<br>
            IFSC Code: HDFC0000123 (New Delhi)
          </p>
        </div>
        <div>
          <strong style="color: #0f172a;">Terms &amp; Conditions:</strong>
          <p style="margin: 4px 0 0; line-height: 1.6;">
            1. SAC 9985 applicable for tour operator and ticketing management.<br>
            2. Invoices subject to Delhi jurisdiction.<br>
            3. Instant payment verification via NEFT/RTGS/UPI.
          </p>
        </div>
      </div>
    `;

    modal.hidden = false;
  }

  document.getElementById("btn-close-inv-modal")?.addEventListener("click", () => {
    document.getElementById("invoice-preview-modal").hidden = true;
  });

  // View invoice click delegation
  document.getElementById("invoice-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view-inv]");
    if (!btn) return;
    const invNo = btn.dataset.viewInv;
    const inv = state.invoices.find((i) => i.invoiceNo === invNo);
    if (inv) showInvoicePreviewModal(inv);
  });

  // ==========================================
  // 7. AUDIT & SYSTEM LOGS RENDERING
  // ==========================================
  function renderLogs() {
    const catFilter = document.getElementById("filter-log-category")?.value || "";
    const list = document.getElementById("audit-log-list");

    const filtered = state.logs.filter((ev) => !catFilter || ev.category === catFilter);

    list.innerHTML = filtered.length
      ? filtered
          .map((ev) => {
            const time = new Date(ev.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
            return `
            <tr>
              <td><small>${safe(time)}</small></td>
              <td><span class="status-pill ${getStatusClass(ev.category)}">${safe(ev.category)}</span></td>
              <td><strong>${safe(ev.actor)}</strong><br><small>${safe(ev.ip)}</small></td>
              <td>${safe(ev.action)}</td>
              <td><code style="font-size: 0.76rem; word-break: break-all;">${safe(ev.details)}</code></td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="5" class="empty-state">No audit logs recorded in this filter.</td></tr>`;
  }

  document.getElementById("filter-log-category")?.addEventListener("change", renderLogs);

  document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
    if (!window.confirm("Clear all local audit logs?")) return;
    state.logs = [];
    save();
    renderLogs();
  });

  document.getElementById("btn-export-logs")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.logs, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `brahmnmitra-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  });

  // ==========================================
  // 8. PAYMENT GATEWAY SANDBOX (DEV MODE)
  // ==========================================
  const gwBookingSelect = document.getElementById("gw-booking-select");
  gwBookingSelect?.addEventListener("change", () => {
    const val = gwBookingSelect.value;
    if (val !== "custom") {
      const b = state.bookings.find((item) => item.bookingId === val);
      if (b) {
        document.getElementById("gw-customer").value = b.customer;
        document.getElementById("gw-amount").value = b.value;
        document.getElementById("gw-trip").value = b.trip;
        document.getElementById("gw-btn-amount").textContent = Number(b.value).toLocaleString("en-IN");
      }
    }
  });

  document.getElementById("gw-amount")?.addEventListener("input", (e) => {
    const v = Number(e.target.value) || 0;
    document.getElementById("gw-btn-amount").textContent = v.toLocaleString("en-IN");
  });

  document.getElementById("gateway-sim-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("gw-submit-btn");
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>⚡ Processing Sandbox Checkout…</span>";

    const cust = document.getElementById("gw-customer").value.trim();
    const amount = Number(document.getElementById("gw-amount").value) || 0;
    const trip = document.getElementById("gw-trip").value.trim();
    const method = document.getElementById("gw-method").value;
    const scenario = document.getElementById("gw-scenario").value;
    const bookingId = gwBookingSelect.value !== "custom" ? gwBookingSelect.value : `BM-BK-${Date.now().toString().slice(-5)}`;

    if (scenario === "timeout") {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;

    if (scenario === "fail") {
      logAction("GATEWAY_TEST", `Sandbox Payment DECLINED for ${cust} (${money.format(amount)})`, { method, scenario, reason: "Card declined by test issuing bank" });
      addSandboxTxnRecord({
        status: "DECLINED",
        txnId: `pay_declined_${Date.now().toString().slice(-6)}`,
        customer: cust,
        amount,
        method,
        note: "Simulated Card Decline (Dev Mode)"
      });
      window.alert("❌ [DEV SANDBOX DECLINE]: Test payment was simulated as declined by the issuing bank.");
      return;
    }

    const payAmount = scenario === "advance_30" ? Math.round(amount * 0.3) : amount;
    const txnId = `pay_test_BM${Date.now()}`;
    const utr = `DEV-UTR-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 1. Record Inflow
    state.inflow.push({
      id: txnId,
      customer: cust,
      bookingRef: bookingId,
      amount: payAmount,
      method: `Dev Gateway (${method})`,
      utr,
      status: scenario === "advance_30" ? "Advance / Deposit" : "Received (Full)",
      date: new Date().toISOString().split("T")[0]
    });

    // 2. Update Booking if matched
    const matchedBooking = state.bookings.find((b) => b.bookingId === bookingId);
    if (matchedBooking) {
      matchedBooking.advance = (Number(matchedBooking.advance) || 0) + payAmount;
      matchedBooking.status = matchedBooking.advance >= matchedBooking.value ? "Confirmed" : "Deposit Received";
    }

    // 3. Issue instant GST receipt invoice
    const invNo = `BM-INV-2026-${String(state.invoices.length + 1).padStart(4, "0")}`;
    const subtotal = Math.round(payAmount / 1.05);
    const tax = payAmount - subtotal;

    const receiptInvoice = {
      id: invNo,
      invoiceNo: invNo,
      date: new Date().toISOString().split("T")[0],
      clientName: cust,
      clientContact: "Verified Online Client",
      clientAddress: "New Delhi, India",
      taxType: "inter",
      lineItems: [{ desc: `${trip} (Online Payment Receipt)`, sac: "9985", rate: subtotal, qty: 1 }],
      subtotal,
      tax,
      total: payAmount,
      advance: payAmount,
      balance: 0,
      status: "Paid in Full"
    };
    state.invoices.unshift(receiptInvoice);

    // 4. Audit Log
    logAction("GATEWAY_TEST", `Sandbox Payment SUCCESS: ${cust} paid ${money.format(payAmount)}`, { txnId, utr, method, bookingId });

    // 5. Txn list
    addSandboxTxnRecord({
      status: "SUCCESS",
      txnId,
      customer: cust,
      amount: payAmount,
      method,
      note: scenario === "advance_30" ? "30% Advance Deposit" : "100% Full Payment Receipt"
    });

    save();
    renderAll();
    window.alert(`✅ [DEV SANDBOX SUCCESS] Payment of ${money.format(payAmount)} received!\nTxn ID: ${txnId}\nUTR: ${utr}\n\nInvoice ${invNo} generated & ledger updated.`);
  });

  function addSandboxTxnRecord(txn) {
    const container = document.getElementById("gw-transactions-list");
    if (!container) return;

    if (container.querySelector(".empty-state")) container.innerHTML = "";

    const card = document.createElement("div");
    card.className = `gw-txn-item ${txn.status === "SUCCESS" ? "success" : "fail"}`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>${safe(txn.customer)} · ${money.format(txn.amount)}</strong>
        <span class="status-pill ${txn.status === "SUCCESS" ? "good" : "danger"}">${safe(txn.status)}</span>
      </div>
      <p style="margin: 4px 0 0; color: var(--admin-muted); font-size: 0.78rem;">
        ID: <code>${safe(txn.txnId)}</code> · ${safe(txn.method)} · ${safe(txn.note)}
      </p>
    `;
    container.prepend(card);
  }

  // ==========================================
  // 9. PLATFORM BACKUP / RESTORE
  // ==========================================
  document.getElementById("export-workspace")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `brahmnmitra-full-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  });

  document.getElementById("import-workspace")?.addEventListener("change", (e) => {
    const [file] = e.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(reader.result);
        state = Object.assign({}, blankState, next);
        save();
        logAction("GENERAL", "Imported and restored workspace backup JSON");
        renderAll();
        window.alert("Workspace restored successfully.");
      } catch (_) {
        window.alert("Invalid workspace JSON file.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clear-workspace")?.addEventListener("click", () => {
    if (!window.confirm("Clear all local operational records? This cannot be undone.")) return;
    state = { ...blankState };
    save();
    renderAll();
  });

  // ==========================================
  // BACKEND API ENDPOINT CONFIGURATION & TESTING
  // ==========================================
  const cfgEndpointInput = document.getElementById("cfg-api-endpoint");
  const btnTestApi = document.getElementById("btn-test-api");
  const btnSaveApi = document.getElementById("btn-save-api");

  if (cfgEndpointInput) {
    cfgEndpointInput.value = API_ENDPOINT;
  }

  btnTestApi?.addEventListener("click", async () => {
    if (!cfgEndpointInput) return;
    const targetUrl = cfgEndpointInput.value.trim();
    btnTestApi.disabled = true;
    btnTestApi.textContent = "Testing...";
    const success = await checkApiLive(targetUrl);
    btnTestApi.disabled = false;
    btnTestApi.textContent = "🔄 Test Connection";
    if (success) {
      window.alert(`Connected successfully to backend API at: ${targetUrl}`);
    } else {
      window.alert(`Failed to connect to ${targetUrl}. Ensure the service is awake and CORS is permitted.`);
    }
  });

  btnSaveApi?.addEventListener("click", async () => {
    if (!cfgEndpointInput) return;
    const targetUrl = cfgEndpointInput.value.trim().replace(/\/+$/, "");
    if (!targetUrl) return;
    localStorage.setItem("bm_custom_api_endpoint", targetUrl);
    API_ENDPOINT = targetUrl;
    btnSaveApi.disabled = true;
    btnSaveApi.textContent = "Connecting...";
    await checkApiLive(targetUrl);
    btnSaveApi.disabled = false;
    btnSaveApi.textContent = "Save & Connect";
  });

  document.getElementById("preset-render")?.addEventListener("click", () => {
    if (cfgEndpointInput) cfgEndpointInput.value = "https://brahmnmitra.onrender.com";
    btnSaveApi?.click();
  });

  document.getElementById("preset-hostinger")?.addEventListener("click", () => {
    if (cfgEndpointInput) cfgEndpointInput.value = "https://brahmnmitra.com/backend";
    btnSaveApi?.click();
  });

  document.getElementById("preset-imperion")?.addEventListener("click", () => {
    if (cfgEndpointInput) cfgEndpointInput.value = "https://brahmnmitra.imperioncapitals.com/backend";
    btnSaveApi?.click();
  });

  // ==========================================
  // MASTER RENDER
  // ==========================================
  function renderAll() {
    renderOverview();
    renderLeads();
    renderCatalogue();
    renderBookings();
    renderFinance();
    renderInvoices();
    renderLogs();
    renderRecycleBin();
  }

  // ==========================================
  // RECYCLE BIN UI EVENT LISTENERS
  // ==========================================
  // Filter tabs
  document.querySelectorAll("[data-recycle-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-recycle-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRecycleFilter = btn.dataset.recycleFilter;
      renderRecycleBin();
    });
  });

  // Recycle action clicks (Restore & Hard Delete)
  document.getElementById("recycle-bin-container")?.addEventListener("click", async (e) => {
    const restoreBtn = e.target.closest("[data-restore-type]");
    if (restoreBtn) {
      const type = restoreBtn.dataset.restoreType;
      const id = restoreBtn.dataset.restoreId;
      await restoreRecycleItem(type, id);
      return;
    }

    const hardDelBtn = e.target.closest("[data-hard-delete-type]");
    if (hardDelBtn) {
      const type = hardDelBtn.dataset.hardDeleteType;
      const id = hardDelBtn.dataset.hardDeleteId;
      if (!window.confirm("⚠️ PERMANENT DELETE WARNING: This item will be permanently wiped from the Hostinger database and cannot be recovered. Proceed?")) return;
      await hardDeleteRecycleItem(type, id);
      return;
    }
  });

  // Purge expired (>15 days retention limit)
  document.getElementById("btn-purge-expired-recycle")?.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_ENDPOINT}/recycle_bin.php?action=purge_expired`, {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const data = await res.json().catch(() => ({}));
      window.alert(data.message || "Expired items purged successfully.");
      fetchRecycleBin();
      logAction("RECYCLE_BIN", "Purged expired items exceeding 15-day limit", data);
    } catch (_) {
      window.alert("Failed to purge expired items. Check connection.");
    }
  });

  // Empty entire recycle bin
  document.getElementById("btn-empty-recycle-bin")?.addEventListener("click", async () => {
    if (!window.confirm("⚠️ EMPTY RECYCLE BIN: Are you sure you want to permanently erase ALL items in the recycle bin? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_ENDPOINT}/recycle_bin.php?action=empty_bin`, {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const data = await res.json().catch(() => ({}));
      recycleBinItems = [];
      updateRecycleBadge();
      renderRecycleBin();
      window.alert("Recycle bin emptied.");
      logAction("RECYCLE_BIN", "Emptied entire recycle bin", data);
    } catch (_) {
      window.alert("Failed to empty recycle bin.");
    }
  });

  // Backend API Signal & Multi-Service Sync
  const apiStatusEl = document.getElementById("api-status");
  const apiTextEl = document.getElementById("api-status-text");

  async function checkApiLive(customTargetUrl) {
    if (!apiStatusEl || !apiTextEl) return false;

    apiStatusEl.className = "api-signal standby";
    apiTextEl.textContent = "Connecting...";

    const candidates = [
      customTargetUrl,
      localStorage.getItem("bm_custom_api_endpoint"),
      "https://brahmnmitra.onrender.com",
      "https://brahmnmitra.com/backend",
      "https://brahmnmitra.imperioncapitals.com/backend",
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "/backend" : null
    ];
    const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

    for (const rawUrl of uniqueCandidates) {
      const url = rawUrl.trim().replace(/\/+$/, "");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let res = await fetch(`${url}/`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch(`${url}/index.php`, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal
          }).catch(() => null);
        }
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.status === "ok") {
            API_ENDPOINT = url;
            localStorage.setItem("bm_custom_api_endpoint", url);

            apiStatusEl.className = "api-signal live";
            const hostLabel = url.includes("render") ? "Render" : url.includes("imperion") ? "Imperion" : url.includes("localhost") ? "Local" : "Live";
            const dbLabel = data.database?.connected ? "MySQL Connected" : "MySQL Standby";
            apiStatusEl.title = `API Live (${hostLabel}): ${url} · ${dbLabel}`;
            apiTextEl.textContent = `API Live (${hostLabel})`;

            const cfgInput = document.getElementById("cfg-api-endpoint");
            if (cfgInput) cfgInput.value = url;

            const cfgMsg = document.getElementById("cfg-api-status-msg");
            if (cfgMsg) {
              cfgMsg.style.display = "block";
              cfgMsg.style.background = "rgba(37, 211, 102, 0.15)";
              cfgMsg.style.color = "#25d366";
              cfgMsg.style.border = "1px solid rgba(37, 211, 102, 0.3)";
              cfgMsg.textContent = `Connected successfully to ${url} (${dbLabel})`;
            }

            syncBackendData();
            return true;
          }
        }
      } catch (_) {
        // try next candidate
      }
    }

    apiStatusEl.className = "api-signal offline";
    apiStatusEl.title = `API Offline: Could not reach ${API_ENDPOINT}`;
    apiTextEl.textContent = "API Offline";

    const cfgMsg = document.getElementById("cfg-api-status-msg");
    if (cfgMsg && customTargetUrl) {
      cfgMsg.style.display = "block";
      cfgMsg.style.background = "rgba(255, 100, 100, 0.15)";
      cfgMsg.style.color = "#ff8c8c";
      cfgMsg.style.border = "1px solid rgba(255, 100, 100, 0.3)";
      cfgMsg.textContent = `Could not connect to ${customTargetUrl}. Check service status.`;
    }
    return false;
  }

  async function syncBackendData() {
    try {
      // 1. Sync Live Catalog Items from Hostinger MySQL
      const catRes = await fetch(`${API_ENDPOINT}/catalog.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (catRes.ok) {
        const catData = await catRes.json().catch(() => ({}));
        if (catData && (Array.isArray(catData.packages) || Array.isArray(catData.hotels))) {
          defaultCatalogue = Object.assign({}, defaultCatalogue, catData);
          renderCatalogue();
          renderOverview();
        }
      }

      // 2. Sync Leads from Hostinger MySQL
      const leadRes = await fetch(`${API_ENDPOINT}/enquiry.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (leadRes.ok) {
        const leadData = await leadRes.json().catch(() => ({}));
        if (Array.isArray(leadData.leads) && leadData.leads.length) {
          state.leads = leadData.leads.map((l) => ({
            id: l.id,
            name: l.name || "Customer",
            phone: l.phone || "",
            email: l.email || "",
            destination: l.destination || "Trip",
            travelDate: l.travelDate || l.travel_date || "Flexible",
            budget: Number(l.budget) || 0,
            status: l.status || "New",
            notes: l.notes || ""
          }));
          save();
          renderLeads();
          renderOverview();
        }
      }

      // 3. Sync Bookings from Hostinger MySQL
      const bkRes = await fetch(`${API_ENDPOINT}/bookings.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (bkRes.ok) {
        const bkData = await bkRes.json().catch(() => ({}));
        if (Array.isArray(bkData.bookings) && bkData.bookings.length) {
          state.bookings = bkData.bookings.map((b) => ({
            id: b.booking_id || b.id,
            bookingId: b.booking_id || b.id,
            customer: b.customer_name || b.customer,
            trip: b.trip_title || b.trip,
            value: Number(b.total_amount || b.value) || 0,
            advance: Number(b.paid_amount || b.advance) || 0,
            status: b.status || "Quoted"
          }));
          save();
          renderBookings();
          renderOverview();
        }
      }

      // 4. Sync Payments & Inflows from Backend API
      const payRes = await fetch(`${API_ENDPOINT}/payments.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (payRes.ok) {
        const payData = await payRes.json().catch(() => ({}));
        if (Array.isArray(payData.inflow) && payData.inflow.length) {
          let updated = false;
          payData.inflow.forEach((item) => {
            if (!item || !item.id) return;
            const exists = state.inflow.some((inf) => inf.id === item.id);
            if (!exists) {
              state.inflow.unshift({
                id: item.id,
                customer: item.customer || "Traveler",
                bookingRef: item.booking_id || item.bookingRef || "Direct Checkout",
                amount: Number(item.amount) || 0,
                method: item.method || "Online Gateway",
                utr: item.utr || "",
                status: item.status || "Received (Full)",
                date: item.timestamp ? item.timestamp.split("T")[0] : (item.date || new Date().toISOString().split("T")[0])
              });
              updated = true;
            }
          });
          if (updated) {
            save();
            renderFinance();
            renderOverview();
          }
        }
      }

      // 5. Sync System Audit Logs from Backend API
      const logRes = await fetch(`${API_ENDPOINT}/logs.php`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (logRes.ok) {
        const logData = await logRes.json().catch(() => ({}));
        if (Array.isArray(logData.logs) && logData.logs.length) {
          let logUpdated = false;
          logData.logs.forEach((ev) => {
            if (!ev || !ev.id) return;
            const exists = state.logs.some((l) => l.id === ev.id);
            if (!exists) {
              state.logs.unshift(ev);
              logUpdated = true;
            }
          });
          if (logUpdated) {
            state.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (state.logs.length > 500) state.logs = state.logs.slice(0, 500);
            save();
            renderLogs();
          }
        }
      }

      // 6. Sync 15-Day Recycle Bin Items
      await fetchRecycleBin();
    } catch (_) {
      // Backend offline or unreachable
    }
  }

  apiStatusEl?.addEventListener("click", () => {
    checkApiLive();
  });
  checkApiLive();
  setInterval(checkApiLive, 45000);

  // Load default catalogue
  fetch("data/travel-catalog.json")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      defaultCatalogue = data;
      initInvoiceForm();
      renderAll();
    })
    .catch(() => {
      initInvoiceForm();
      renderAll();
    });
})();
