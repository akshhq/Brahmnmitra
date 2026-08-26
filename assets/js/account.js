"use strict";

(() => {
  const root = document.getElementById("account-workspace");
  const form = document.getElementById("profile-form");
  if (!root || !form || !window.BMPlatform) return;
  const escape = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[char],
    );
  const showDate = (value) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));

  function render() {
    const state = window.BMPlatform.read();
    form.elements.name.value = state.profile.name;
    form.elements.email.value = state.profile.email;
    form.elements.phone.value = state.profile.phone;
    form.elements.travelStyle.value = state.profile.travelStyle;
    document.getElementById("reward-points").textContent = state.rewards.points;
    document.getElementById("saved-list").innerHTML = state.saved.length
      ? state.saved
          .map(
            (item) =>
              '<li class="saved-item-row">' +
              '<img src="' +
              escape(item.image || "assets/images/sample.webp") +
              '" alt="" class="saved-thumb" onerror="this.src=\'sample.webp\'" />' +
              '<div class="saved-info"><strong>' +
              escape(item.name) +
              "</strong><br><small>" +
              escape(item.type) +
              " · " +
              escape(item.destination) +
              "</small></div>" +
              '<button class="text-button" type="button" data-remove-saved="' +
              escape(item.key) +
              '">Remove</button></li>',
          )
          .join("")
      : "<li>No saved ideas yet. Explore packages, stays or destinations and choose Save.</li>";
    document.getElementById("plan-list").innerHTML = state.plans.length
      ? state.plans
          .map(
            (item) =>
              "<li><strong>" +
              escape(item.journey) +
              "</strong><br><small>" +
              escape(item.destination) +
              " · " +
              escape(item.days) +
              " days · saved " +
              showDate(item.createdAt) +
              '</small><button class="text-button" type="button" data-remove-plan="' +
              escape(item.id) +
              '">Remove</button></li>',
          )
          .join("")
      : "<li>No saved plans yet. Use the Itinerary Builder to create one.</li>";
    document.getElementById("activity-list").innerHTML = state.activity.length
      ? state.activity
          .slice(0, 5)
          .map(
            (item) =>
              "<li>" +
              (item.href ? '<a href="' + escape(item.href) + '">' : "") +
              escape(item.label) +
              (item.href ? "</a>" : "") +
              "<br><small>" +
              showDate(item.createdAt) +
              "</small></li>",
          )
          .join("")
      : "<li>Your recent searches, saves and plans will appear here.</li>";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.BMPlatform.updateProfile(
      Object.fromEntries(new FormData(form).entries()),
    );
    document.getElementById("profile-status").textContent =
      "Preferences saved on this device.";
    if (window.BMPlatform.toast) {
      window.BMPlatform.toast("Traveler preferences updated", "success");
    }
  });
  root.addEventListener("click", (event) => {
    const saved = event.target.closest("[data-remove-saved]");
    const plan = event.target.closest("[data-remove-plan]");
    if (saved) {
      window.BMPlatform.removeSaved(saved.dataset.removeSaved);
      if (window.BMPlatform.toast) window.BMPlatform.toast("Idea removed", "info");
    }
    if (plan) {
      window.BMPlatform.removePlan(plan.dataset.removePlan);
      if (window.BMPlatform.toast) window.BMPlatform.toast("Draft plan removed", "info");
    }
  });
  window.addEventListener("bm:workspace-change", render);
  render();
})();
