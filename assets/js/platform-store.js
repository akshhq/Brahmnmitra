"use strict";
// BrahmnMitra — Browser-Local Workspace Store & Theme Manager
(() => {
  const storageKey = "bm_travel_workspace_v2";
  const themeKey = "bm_portal_theme_v1";
  const defaults = {
    profile: { name: "", email: "", phone: "", travelStyle: "" },
    saved: [],
    plans: [],
    activity: [],
    rewards: { points: 0, referrals: 0 },
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalise = (value) => ({
    ...clone(defaults),
    ...(value && typeof value === "object" ? value : {}),
    profile: { ...defaults.profile, ...(value?.profile || {}) },
    rewards: { ...defaults.rewards, ...(value?.rewards || {}) },
    saved: Array.isArray(value?.saved) ? value.saved.slice(0, 40) : [],
    plans: Array.isArray(value?.plans) ? value.plans.slice(0, 20) : [],
    activity: Array.isArray(value?.activity) ? value.activity.slice(0, 30) : [],
  });

  let state;
  try {
    state = normalise(JSON.parse(localStorage.getItem(storageKey) || "{}"));
  } catch (_) {
    state = clone(defaults);
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (_) {
      /* Storage can be disabled by the visitor; the page still functions. */
    }
    window.dispatchEvent(
      new CustomEvent("bm:workspace-change", { detail: read() }),
    );
  }

  function read() {
    return clone(state);
  }

  function updateProfile(values) {
    state.profile = { ...state.profile, ...values };
    persist();
  }

  function addActivity(label, href = "") {
    const cleanLabel = String(label || "").trim();
    if (!cleanLabel) return;
    state.activity = [
      { label: cleanLabel, href, createdAt: new Date().toISOString() },
      ...state.activity.filter((item) => item.label !== cleanLabel),
    ].slice(0, 30);
    persist();
  }

  function toggleSaved(item) {
    const key = `${item.type}:${item.slug || item.name}`;
    const index = state.saved.findIndex((entry) => entry.key === key);
    if (index >= 0) {
      state.saved.splice(index, 1);
      persist();
      return false;
    }
    state.saved.unshift({
      key,
      type: item.type,
      slug: item.slug || "",
      name: item.name || "Untitled journey",
      destination: item.destination || item.name || "",
      detail: item.detail || "",
      image: item.image || "assets/images/sample.webp",
      createdAt: new Date().toISOString(),
    });
    persist();
    return true;
  }

  function isSaved(item) {
    const key = `${item.type}:${item.slug || item.name}`;
    return state.saved.some((entry) => entry.key === key);
  }

  function savePlan(plan) {
    const record = {
      id: `plan-${Date.now()}`,
      ...plan,
      createdAt: new Date().toISOString(),
    };
    state.plans.unshift(record);
    state.plans = state.plans.slice(0, 20);
    state.rewards.points += 25;
    persist();
    return record;
  }

  function removeSaved(key) {
    state.saved = state.saved.filter((item) => item.key !== key);
    persist();
  }

  function removePlan(id) {
    state.plans = state.plans.filter((item) => item.id !== id);
    persist();
  }

  function toast(message, type = "info") {
    let container = document.querySelector(".bm-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "bm-toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.className = "bm-toast";
    const icon = type === "success" ? "✓" : "✦";
    const iconClass =
      type === "success" ? "bm-toast-icon success" : "bm-toast-icon";
    el.innerHTML = `<span class="${iconClass}">${icon}</span><span>${message}</span>`;
    container.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add("bm-toast-visible");
    });

    setTimeout(() => {
      el.classList.remove("bm-toast-visible");
      el.classList.add("bm-toast-leaving");
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }

  /* ---------- Theme Management (Luxury Dark vs Day) ---------- */
  function getTheme() {
    try {
      return localStorage.getItem(themeKey) || "dark";
    } catch (_) {
      return "dark";
    }
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    if (document.body) {
      document.body.classList.toggle("theme-dark", isDark);
    }
    try {
      localStorage.setItem(themeKey, theme);
    } catch (_) {}
    updateThemeButtons(theme);
    window.dispatchEvent(
      new CustomEvent("bm:theme-change", { detail: { theme } }),
    );
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    toast(
      next === "dark" ? "Switched to Luxury Dark mode" : "Switched to Day mode",
      "info",
    );
    return next;
  }

  function updateThemeButtons(theme) {
    const buttons = document.querySelectorAll(".theme-toggle-btn");
    const isDark = theme === "dark";
    buttons.forEach((btn) => {
      btn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> <span>Day</span>'
        : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> <span>Night</span>';
      btn.setAttribute(
        "aria-label",
        isDark ? "Switch to Day mode" : "Switch to Luxury Dark mode",
      );
    });
  }

  // Auto-init theme
  const initialTheme = getTheme();
  setTheme(initialTheme);
  document.addEventListener("DOMContentLoaded", () => {
    setTheme(getTheme());
    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });
  });

  /* ---------- Global Keyboard Shortcut for Search (Press '/') ---------- */
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.isContentEditable);
      if (!isInput) {
        const searchInput =
          document.getElementById("catalog-search") ||
          document.getElementById("travel-search");
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  });

  window.BMPlatform = {
    read,
    updateProfile,
    addActivity,
    toggleSaved,
    isSaved,
    savePlan,
    removeSaved,
    removePlan,
    toast,
    getTheme,
    setTheme,
    toggleTheme,
  };
})();
