"use strict";
// BrahmnMitra — Enquiry Form Validation & WhatsApp Hand-off

window.BM = window.BM || {};

BM.initForm = function () {
  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const toast = document.getElementById("form-toast");
  const flightEl = document.getElementById("flight-block");
  const retWrap = document.getElementById("return-wrap");
  const service = form.elements["service"];

  const elName = form.elements["name"];
  const elDepart = form.elements["depart_date"];
  const elReturn = form.elements["return_date"];

  const PHONE = form.dataset.phone || "";
  const WA = form.dataset.whatsapp || "";

  // Flight services require route & date inputs
  const FLIGHT_SERVICES = ["domestic_flights", "international_flights"];
  const isFlight = () => FLIGHT_SERVICES.indexOf(service.value) !== -1;

  function syncFlightBlock() {
    const on = isFlight();
    flightEl.hidden = !on;
    ["from_city", "to_city", "depart_date"].forEach((n) => {
      form.elements[n].required = on;
      form.elements[n].disabled = !on;
    });
  }
  service.addEventListener("change", syncFlightBlock);
  syncFlightBlock();

  // Departure date constraints (prevent past dates)
  const today = new Date().toISOString().split("T")[0];
  elDepart.min = today;
  elReturn.min = today;
  elDepart.addEventListener("change", () => {
    elReturn.min = elDepart.value || today;
  });

  /* ---------- one-way hides the return date ---------- */
  const tripValue = () => {
    const r = form.querySelector('input[name="trip_type"]:checked');
    return r ? r.value : "round_trip";
  };
  form
    .querySelectorAll('input[name="trip_type"]')
    .forEach((r) =>
      r.addEventListener("change", () =>
        retWrap.classList.toggle("hidden", tripValue() === "one_way"),
      ),
    );

  /* ---------- inline validation ---------- */
  const RE_PHONE = /^[0-9+\-\s()]{7,}$/;

  function setError(el, msg) {
    const slot = document.getElementById(el.id + "-err");
    if (msg) {
      el.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = msg;
    } else {
      el.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
    return !msg;
  }

  function checkField(el) {
    const v = (el.value || "").trim();
    if (el.disabled) return true;
    if (el.required && !v) return setError(el, "This one is needed.");
    if (el.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v))
      return setError(el, "That email does not look right.");
    if (el.type === "tel" && v && !RE_PHONE.test(v))
      return setError(el, "That phone number does not look right.");
    if (el.tagName === "SELECT" && el.required && !v)
      return setError(el, "Please choose a service.");
    return setError(el, "");
  }

  // validate on blur, then live-clear once they start fixing it
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "hidden" || el.name === "website") return;
    el.addEventListener("blur", () => checkField(el));
    el.addEventListener("input", () => {
      if (el.getAttribute("aria-invalid") === "true") checkField(el);
    });
  });

  function validateAll() {
    let ok = true,
      first = null;
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.type === "hidden" || el.name === "website" || el.disabled) return;
      if (!checkField(el)) {
        ok = false;
        if (!first) first = el;
      }
    });
    if (first) {
      first.focus();
      first.scrollIntoView({ behavior: BM_MOTION(), block: "center" });
    }
    return ok;
  }
  function BM_MOTION() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  }

  // Build WhatsApp enquiry message
  function summary() {
    const d = Object.fromEntries(new FormData(form).entries());
    const svc = service.options[service.selectedIndex];
    const svcLabel =
      svc && svc.value ? svc.textContent.trim() : "Travel enquiry";

    const L = [];
    L.push("Hi BrahmnMitra, enquiry from " + (d.name || "the website") + ":");
    L.push("Service: " + svcLabel);

    if (isFlight()) {
      const trip =
        {
          round_trip: "Round trip",
          one_way: "One way",
          multi_city: "Multi-city",
        }[d.trip_type] || "Trip";
      L.push(trip + " · " + (d.from_city || "?") + " → " + (d.to_city || "?"));
      L.push(
        "Depart: " +
          (d.depart_date || "flexible") +
          (d.return_date && d.trip_type !== "one_way"
            ? " · Return: " + d.return_date
            : ""),
      );
      L.push(
        (d.passengers || 1) + " passenger(s), " + (d.cabin_class || "economy"),
      );
    }
    if (d.company) L.push("Company: " + d.company);
    if (d.message) L.push("Notes: " + d.message);
    L.push("Phone: " + (d.phone || "-"));
    if (d.email) L.push("Email: " + d.email);
    return L.join("\n");
  }

  const waBtn = document.getElementById("wa-send");
  if (waBtn && WA) {
    waBtn.addEventListener("click", () => {
      window.open(
        "https://wa.me/" + WA + "?text=" + encodeURIComponent(summary()),
        "_blank",
        "noopener",
      );
    });
  }

  // Handle AJAX submission with cold-start resilience
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    const btn = form.querySelector('button[type="submit"]');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending enquiry…";

    // Progressive cold-start messaging for Render hosting spin-up
    let slowTimer = setTimeout(() => {
      btn.textContent = "Connecting to travel desk server… please wait";
      toast.classList.remove("warn");
      toast.textContent = "Waking up secure travel desk… thanks for your patience!";
      toast.classList.add("show");
    }, 6000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "send_failed");

      toast.classList.remove("warn");
      toast.innerHTML =
        "Enquiry sent, " +
        esc(elName.value.trim().split(" ")[0] || "friend") +
        "! We'll call you back shortly. Anything urgent: " +
        '<a href="tel:' +
        esc(PHONE.replace(/\s/g, "")) +
        '">' +
        esc(PHONE) +
        "</a>.";
      form.reset();
      retWrap.classList.remove("hidden");
      syncFlightBlock();
    } catch (err) {
      toast.classList.add("warn");
      toast.innerHTML =
        "Could not send just now — tap " +
        "<strong>Send on WhatsApp instead</strong>, or call " +
        '<a href="tel:' +
        esc(PHONE.replace(/\s/g, "")) +
        '">' +
        esc(PHONE) +
        "</a>" +
        " and we'll take it from there.";
    } finally {
      clearTimeout(slowTimer);
      btn.disabled = false;
      btn.textContent = originalLabel;
    }

    toast.classList.add("show");
    toast.scrollIntoView({ behavior: BM_MOTION(), block: "center" });
  });

  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
};
