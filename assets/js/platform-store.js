"use strict";

/* Shared browser-local state for the two Phase 1 frontends. This is a
 * convenience layer, not authentication or secure customer storage. */
(() => {
  const storageKey = "bm_travel_workspace_v2";
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

  window.BMPlatform = {
    read,
    updateProfile,
    addActivity,
    toggleSaved,
    isSaved,
    savePlan,
    removeSaved,
    removePlan,
  };
})();
