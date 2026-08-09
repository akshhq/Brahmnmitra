"use strict";

(() => {
  const key = "bm_admin_workspace_v1";
  const blank = {
    leads: [],
    bookings: [],
    payments: [],
    packages: [],
    hotels: [],
  };
  const safe = (value) =>
    String(value || "").replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  let state;
  let catalogue = { packages: [], hotels: [] };
  try {
    state = Object.assign(
      {},
      blank,
      JSON.parse(localStorage.getItem(key) || "{}"),
    );
  } catch (_) {
    state = { ...blank };
  }
  state.leads = (Array.isArray(state.leads) ? state.leads : []).map(
    (lead, index) => ({
      ...lead,
      id: lead.id || `legacy-lead-${index}-${Date.now()}`,
    }),
  );
  state.bookings = Array.isArray(state.bookings) ? state.bookings : [];
  state.payments = Array.isArray(state.payments) ? state.payments : [];
  state.packages = Array.isArray(state.packages) ? state.packages : [];
  state.hotels = Array.isArray(state.hotels) ? state.hotels : [];
  const save = () => localStorage.setItem(key, JSON.stringify(state));
  const value = (id) => document.getElementById(id).value.trim();
  const formValue = (form, name) => new FormData(form).get(name) || "";

  function renderOverview() {
    document.getElementById("metric-leads").textContent = state.leads.length;
    document.getElementById("metric-bookings").textContent =
      state.bookings.length;
    document.getElementById("metric-payments").textContent = money.format(
      state.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    );
    document.getElementById("metric-catalogue").textContent =
      catalogue.packages.length +
      catalogue.hotels.length +
      state.packages.length +
      state.hotels.length;
    const list = document.getElementById("recent-leads");
    list.innerHTML = state.leads.length
      ? state.leads
          .slice(-5)
          .reverse()
          .map(
            (item) =>
              "<tr><td>" +
              safe(item.name) +
              "</td><td>" +
              safe(item.destination) +
              '</td><td><select class="admin-inline-select" data-lead-status="' +
              safe(item.id) +
              '">' +
              ["New", "Contacted", "Quotation sent", "Won", "Lost"]
                .map(
                  (status) =>
                    "<option" +
                    (item.status === status ? " selected" : "") +
                    ">" +
                    status +
                    "</option>",
                )
                .join("") +
              '</select></td><td><button class="admin-delete" type="button" data-delete-lead="' +
              safe(item.id) +
              '">Remove</button></td></tr>',
          )
          .join("")
      : '<tr><td colspan="3" class="empty-state">No leads yet. Add the first enquiry from the Leads area.</td></tr>';
  }
  function renderLeads() {
    const list = document.getElementById("lead-list");
    list.innerHTML = state.leads.length
      ? state.leads
          .slice()
          .reverse()
          .map(
            (item) =>
              "<tr><td>" +
              safe(item.name) +
              "<br><small>" +
              safe(item.email || item.phone) +
              "</small></td><td>" +
              safe(item.destination) +
              "</td><td>" +
              safe(item.travelDate || "Flexible") +
              "</td><td>" +
              safe(item.budget || "To discuss") +
              '</td><td><span class="status-pill">' +
              safe(item.status) +
              "</span></td></tr>",
          )
          .join("")
      : '<tr><td colspan="5" class="empty-state">No leads stored in this browser yet.</td></tr>';
  }
  function renderCatalogue() {
    const all = catalogue.packages
      .concat(state.packages)
      .map((item) => ({ ...item, type: "Package" }))
      .concat(
        catalogue.hotels
          .concat(state.hotels)
          .map((item) => ({ ...item, type: "Hotel" })),
      );
    const list = document.getElementById("catalog-list");
    list.innerHTML = all.length
      ? all
          .map(
            (item) =>
              '<article class="catalog-admin-card"><span>' +
              safe(item.type) +
              " · " +
              safe(item.destination) +
              "</span><h3>" +
              safe(item.name) +
              "</h3><p>" +
              (item.price
                ? "From " + money.format(item.price)
                : safe(item.description || "Custom catalogue item")) +
              "</p></article>",
          )
          .join("")
      : '<p class="empty-state">No catalogue records found.</p>';
  }
  function renderBookings() {
    const list = document.getElementById("booking-list");
    list.innerHTML = state.bookings.length
      ? state.bookings
          .slice()
          .reverse()
          .map(
            (item) =>
              "<tr><td>" +
              safe(item.customer) +
              "</td><td>" +
              safe(item.trip) +
              "</td><td>" +
              safe(item.value) +
              '</td><td><span class="status-pill">' +
              safe(item.status) +
              "</span></td></tr>",
          )
          .join("")
      : '<tr><td colspan="4" class="empty-state">No bookings have been added to this workspace.</td></tr>';
  }
  function renderFinance() {
    const total = state.payments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    document.getElementById("finance-total").textContent = money.format(total);
    const list = document.getElementById("payment-list");
    list.innerHTML = state.payments.length
      ? state.payments
          .slice()
          .reverse()
          .map(
            (item) =>
              "<tr><td>" +
              safe(item.customer) +
              "</td><td>" +
              money.format(item.amount) +
              "</td><td>" +
              safe(item.method) +
              "</td><td>" +
              safe(item.status) +
              "</td></tr>",
          )
          .join("")
      : '<tr><td colspan="4" class="empty-state">No payments recorded in this workspace.</td></tr>';
  }
  function renderAll() {
    renderOverview();
    renderLeads();
    renderCatalogue();
    renderBookings();
    renderFinance();
  }

  document.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-view]")
        .forEach((item) => item.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "page");
      document
        .querySelectorAll(".admin-view")
        .forEach(
          (view) => (view.hidden = view.id !== "view-" + button.dataset.view),
        );
    }),
  );
  document.getElementById("lead-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    state.leads.push({
      id: `lead-${Date.now()}`,
      name: formValue(form, "name"),
      email: formValue(form, "email"),
      phone: formValue(form, "phone"),
      destination: formValue(form, "destination"),
      travelDate: formValue(form, "travelDate"),
      budget: formValue(form, "budget"),
      status: "New",
    });
    save();
    form.reset();
    renderAll();
  });
  document
    .getElementById("catalog-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const record = {
        name: formValue(form, "name"),
        destination: formValue(form, "destination"),
        price: Number(formValue(form, "price")) || 0,
        description: formValue(form, "description"),
      };
      state[formValue(form, "type") === "hotel" ? "hotels" : "packages"].push(
        record,
      );
      save();
      form.reset();
      renderAll();
    });
  document.getElementById("lead-list").addEventListener("change", (event) => {
    const control = event.target.closest("[data-lead-status]");
    if (!control) return;
    const lead = state.leads.find(
      (item) => item.id === control.dataset.leadStatus,
    );
    if (lead) {
      lead.status = control.value;
      save();
      renderAll();
    }
  });
  document.getElementById("lead-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-lead]");
    if (!button) return;
    state.leads = state.leads.filter(
      (item) => item.id !== button.dataset.deleteLead,
    );
    save();
    renderAll();
  });
  document.getElementById("export-workspace").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `brahmnmitra-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  });
  document
    .getElementById("import-workspace")
    .addEventListener("change", (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const next = JSON.parse(reader.result);
          state = Object.assign({}, blank, next);
          state.leads = Array.isArray(state.leads) ? state.leads : [];
          state.bookings = Array.isArray(state.bookings) ? state.bookings : [];
          state.payments = Array.isArray(state.payments) ? state.payments : [];
          state.packages = Array.isArray(state.packages) ? state.packages : [];
          state.hotels = Array.isArray(state.hotels) ? state.hotels : [];
          save();
          renderAll();
        } catch (_) {
          window.alert(
            "This file is not a valid BrahmnMitra workspace backup.",
          );
        }
        event.target.value = "";
      };
      reader.readAsText(file);
    });
  document.getElementById("clear-workspace").addEventListener("click", () => {
    if (
      !window.confirm(
        "Clear all browser-local admin records? This cannot be undone unless you exported a backup.",
      )
    )
      return;
    state = { ...blank };
    save();
    renderAll();
  });
  document
    .getElementById("booking-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      state.bookings.push({
        customer: formValue(form, "customer"),
        trip: formValue(form, "trip"),
        value: formValue(form, "value"),
        status: "Quotation sent",
      });
      save();
      form.reset();
      renderAll();
    });
  document
    .getElementById("payment-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      state.payments.push({
        customer: formValue(form, "customer"),
        amount: Number(formValue(form, "amount")) || 0,
        method: formValue(form, "method"),
        status: formValue(form, "status"),
      });
      save();
      form.reset();
      renderAll();
    });

  fetch("data/travel-catalog.json")
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then((data) => {
      catalogue = data;
      renderAll();
    })
    .catch(renderAll);
})();
