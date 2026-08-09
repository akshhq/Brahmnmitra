"use strict";
/* ============================================================
   BRAHMNMITRA — form-validation.js
   ------------------------------------------------------------
   Client-side validation is a COURTESY, not security. Everything
   here is re-checked in backend/enquiry.php, which is the only thing that
   actually decides whether a submission is accepted.

   Behaviour:
     · Service = a flight service  → the route/date/pax block appears
     · Service = a tour service    → it stays hidden and is not required
     · Submit  → POST to backend/enquiry.php, JSON response
     · Failure → the visitor is NEVER dead-ended: the error message
                 carries the phone number and a WhatsApp link
     · WhatsApp button → builds a pre-filled enquiry from the fields
                         and opens wa.me. Works with no backend at all.
   ============================================================ */

window.BM = window.BM || {};

BM.initForm = function () {
  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const toast = document.getElementById("form-toast");
  const flightEl = document.getElementById("flight-block");
  const retWrap = document.getElementById("return-wrap");
  const service = form.elements["service"];

  /* ---------- element handles ----------
     ALWAYS via form.elements[...]. Two traps otherwise:
       · form.name       -> the form's own name ATTRIBUTE (a string),
                            not the <input name="name">. Silently wrong.
       · form.depart_date -> undefined here, because the field lives
                            inside <div id="flight-block" hidden> and the
                            named shortcut does not resolve for it.
     Either one throws and kills the whole form. Use form.elements. */
  const elName = form.elements["name"];
  const elDepart = form.elements["depart_date"];
  const elReturn = form.elements["return_date"];

  // pulled from the markup so there is ONE source of truth for the number
  const PHONE = form.dataset.phone || ""; // "+91 92117 61885"
  const WA = form.dataset.whatsapp || ""; // "919211761885"

  /* ---------- which services need a route + dates? ---------- */
  const FLIGHT_SERVICES = ["domestic_flights", "international_flights"];
  const isFlight = () => FLIGHT_SERVICES.indexOf(service.value) !== -1;

  function syncFlightBlock() {
    const on = isFlight();
    flightEl.hidden = !on;
    // Required only while visible. A hidden required field is a silent
    // dead end: the browser refuses to submit and shows nothing.
    ["from_city", "to_city", "depart_date"].forEach((n) => {
      form.elements[n].required = on;
      form.elements[n].disabled = !on;
    });
  }
  service.addEventListener("change", syncFlightBlock);
  syncFlightBlock();

  /* ---------- dates: no past departures ---------- */
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

  /* ---------- the WhatsApp summary ----------
     Built from whatever is filled in. Nothing is required: a half-filled
     form still produces a usable message, because on mobile this is how
     most Indian travel enquiries actually arrive. */
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

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
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
      // NEVER a dead end. The visitor always leaves with a way to reach us.
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
    }

    btn.disabled = false;
    btn.textContent = label;
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
