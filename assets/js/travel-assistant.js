"use strict";

(() => {
  const form = document.getElementById("assistant-form");
  const result = document.getElementById("assistant-result");
  if (!form || !result) return;
  const params = new URLSearchParams(window.location.search);
  const destination = form.elements.destination;
  if (params.get("destination")) destination.value = params.get("destination");
  if (params.get("journey"))
    form.elements.journey.value = params.get("journey");
  if (params.get("stay")) form.elements.journey.value = params.get("stay");
  const escape = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const place = values.destination || "your chosen destination";
    const days = Math.max(3, Math.min(14, Number(values.days) || 6));
    const budget = values.budget || "a flexible budget";
    const travellers = values.travellers || "your travel party";
    const steps = [
      `Day 1: arrive in ${place}, settle into a well-located stay and keep the first evening open.`,
      `Day 2: explore the essential neighbourhoods and one signature local experience.`,
      `Days 3–${Math.max(3, days - 1)}: balance guided highlights, free time and travel between stays.`,
      `Day ${days}: enjoy a relaxed final morning before departure.`,
    ];
    const plan = window.BMPlatform?.savePlan({
      destination: place,
      journey: values.journey || `Tailor-made ${place} journey`,
      days,
      budget,
      travellers,
      notes: values.notes || "",
    });
    window.BMPlatform?.addActivity(
      `Planned a ${days}-day ${place} journey`,
      "account.html",
    );
    if (window.BMPlatform?.toast) {
      window.BMPlatform.toast(
        `Draft for ${place} saved to My Account (+25 points)`,
        "success",
      );
    }
    result.hidden = false;
    result.innerHTML =
      "<h2>" +
      escape(values.journey || `${place}, thoughtfully paced`) +
      "</h2><p>A starting outline for " +
      escape(travellers) +
      " with " +
      escape(budget) +
      ". A BrahmnMitra expert will confirm live pricing, stays, transfers and availability.</p><ol>" +
      steps.map((step) => `<li>${escape(step)}</li>`).join("") +
      '</ol><div class="portal-cta"><p>Saved to this browser and added 25 planning points. Send the brief to a travel expert when you are ready.</p><a class="btn btn-amber" href="index.html#contact">Request a confirmed quote</a></div>';
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    if (plan) result.dataset.planId = plan.id;
  });
})();
