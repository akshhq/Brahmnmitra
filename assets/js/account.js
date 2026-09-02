"use strict";

(() => {
  const root = document.getElementById("account-workspace");
  const form = document.getElementById("profile-form");
  if (!root || !form || !window.BMPlatform) return;

  const API_ENDPOINT = (() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return window.location.port === "8000" ? "/backend" : "https://brahmnmitra.com/backend";
    }
    return "/backend";
  })();

  const CUSTOMER_SESSION_KEY = "bm_customer_session_v1";

  function getCustomerSession() {
    try {
      const data = localStorage.getItem(CUSTOMER_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return null;
    }
  }

  function setCustomerSession(session) {
    if (session && session.token) {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
    }
  }

  const escape = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[char],
    );

  const showDate = (value) => {
    if (!value) return "Flexible";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value));
    } catch (_) {
      return String(value);
    }
  };

  // Auth Elements
  const tabLogin = document.getElementById("tab-auth-login");
  const tabRegister = document.getElementById("tab-auth-register");
  const loginForm = document.getElementById("customer-login-form");
  const registerForm = document.getElementById("customer-register-form");
  const loggedInView = document.getElementById("customer-logged-in-view");
  const loggedUserName = document.getElementById("logged-user-name");
  const loggedUserEmail = document.getElementById("logged-user-email");
  const signoutBtn = document.getElementById("customer-signout-btn");
  const loginAlert = document.getElementById("customer-login-alert");
  const regAlert = document.getElementById("customer-reg-alert");
  const bookingsContainer = document.getElementById("customer-bookings-container");

  // Switch Auth Tabs
  tabLogin?.addEventListener("click", () => {
    tabLogin.className = "btn btn-amber";
    tabRegister.className = "btn btn-glass";
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  });

  tabRegister?.addEventListener("click", () => {
    tabRegister.className = "btn btn-amber";
    tabLogin.className = "btn btn-glass";
    registerForm.style.display = "block";
    loginForm.style.display = "none";
  });

  // Render Auth UI & Live Bookings
  async function renderAuthUI() {
    const session = getCustomerSession();
    if (session && session.user) {
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "none";
      if (tabLogin) tabLogin.style.display = "none";
      if (tabRegister) tabRegister.style.display = "none";
      if (loggedInView) loggedInView.style.display = "block";
      if (loggedUserName) loggedUserName.textContent = session.user.name || "Traveler";
      if (loggedUserEmail) loggedUserEmail.textContent = session.user.email || "";

      // Auto-fill profile form
      if (form.elements.name && !form.elements.name.value) form.elements.name.value = session.user.name || "";
      if (form.elements.email && !form.elements.email.value) form.elements.email.value = session.user.email || "";
      if (form.elements.phone && !form.elements.phone.value) form.elements.phone.value = session.user.phone || "";

      // Fetch customer bookings
      fetchCustomerBookings(session.user.email);
    } else {
      if (loggedInView) loggedInView.style.display = "none";
      if (tabLogin) tabLogin.style.display = "inline-block";
      if (tabRegister) tabRegister.style.display = "inline-block";
      if (loginForm) loginForm.style.display = "block";
      if (registerForm) registerForm.style.display = "none";
      if (bookingsContainer) {
        bookingsContainer.innerHTML = '<p style="color: var(--ink-soft); font-size: 0.9rem;">Sign in above to view confirmed itineraries, travel vouchers, and tax invoices.</p>';
      }
    }
  }

  async function fetchCustomerBookings(email) {
    if (!bookingsContainer || !email) return;
    bookingsContainer.innerHTML = '<p style="color: var(--cyan); font-size: 0.88rem;">Loading your verified travel records…</p>';

    const apiBase = window.BM?.API_BASE || "https://brahmnmitra.onrender.com";
    const urls = [
      `${apiBase}/bookings.php?email=${encodeURIComponent(email)}`,
      `/backend/bookings.php?email=${encodeURIComponent(email)}`
    ];

    let bookings = [];
    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (Array.isArray(data.bookings)) {
            bookings = data.bookings;
            break;
          }
        }
      } catch (_) {}
    }

    if (bookings.length) {
      bookingsContainer.innerHTML = `
        <div style="display: grid; gap: 14px;">
          ${bookings.map(b => {
            const total = Number(b.total_amount) || 0;
            const paid = Number(b.paid_amount) || 0;
            const due = Math.max(0, total - paid);
            const statusClass = (b.status === "confirmed" || b.status === "completed") ? "color: #25d366;" : "color: var(--amber);";
            return `
              <div style="padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.72rem; letter-spacing: 0.1em; color: var(--cyan); text-transform: uppercase; font-weight: 700;">#${escape(b.booking_id || b.id)}</span>
                    <span style="font-size: 0.75rem; font-weight: 700; ${statusClass}">● ${escape(b.status || "Quote Sent")}</span>
                  </div>
                  <strong style="font-size: 1.05rem; color: #fff;">${escape(b.trip_title || b.destination || "Custom Journey")}</strong>
                  <div style="font-size: 0.82rem; color: var(--ink-soft); margin-top: 4px;">
                    Dates: ${showDate(b.travel_date)} · Travelers: ${escape(b.passengers || 2)} pax
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">₹${total.toLocaleString("en-IN")}</div>
                  ${due > 0 ? `<div style="font-size: 0.78rem; color: var(--amber);">Advance Due: ₹${due.toLocaleString("en-IN")}</div>` : '<div style="font-size: 0.78rem; color: #25d366;">Fully Settled</div>'}
                  <div style="margin-top: 8px;">
                    ${due > 0 ? `<a class="btn btn-amber" href="/pay?booking=${encodeURIComponent(b.booking_id || b.id)}&amount=${due}" style="padding: 6px 14px; font-size: 0.78rem;">Settle Deposit →</a>` : `<a class="btn btn-glass" href="/contact" style="padding: 6px 14px; font-size: 0.78rem;">Contact Desk</a>`}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else {
      bookingsContainer.innerHTML = `
        <div style="padding: 20px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); text-align: center;">
          <p style="margin: 0 0 10px; color: var(--ink-soft); font-size: 0.88rem;">No active bookings found under <strong>${escape(email)}</strong>.</p>
          <a class="btn btn-amber" href="/plan" style="font-size: 0.82rem; padding: 6px 16px;">Create Custom Journey Brief →</a>
        </div>
      `;
    }
  }

  // Handle Login Form Submit
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("cust-login-email").value.trim();
    const password = document.getElementById("cust-login-password").value;
    const btn = document.getElementById("cust-login-btn");

    if (loginAlert) loginAlert.style.display = "none";
    if (btn) { btn.disabled = true; btn.textContent = "Signing in…"; }

    const apiBase = window.BM?.API_BASE || "https://brahmnmitra.onrender.com";
    const endpoints = [
      `${apiBase}/auth.php?action=login`,
      "/backend/auth.php?action=login"
    ];

    let success = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.token) {
          setCustomerSession(data);
          renderAuthUI();
          success = true;
          if (window.BMPlatform && window.BMPlatform.toast) {
            window.BMPlatform.toast(`Welcome back, ${data.user.name || "Traveler"}!`, "success");
          }
          break;
        } else if (data.error || data.message) {
          throw new Error(data.error || data.message);
        }
      } catch (err) {
        if (loginAlert) {
          loginAlert.style.display = "block";
          loginAlert.textContent = err.message || "Invalid credentials. Please retry.";
        }
      }
    }

    if (btn) { btn.disabled = false; btn.textContent = "Sign In to Account →"; }
  });

  // Handle Register Form Submit
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("cust-reg-name").value.trim();
    const email = document.getElementById("cust-reg-email").value.trim();
    const phone = document.getElementById("cust-reg-phone").value.trim();
    const password = document.getElementById("cust-reg-password").value;
    const btn = document.getElementById("cust-reg-btn");

    if (regAlert) regAlert.style.display = "none";
    if (btn) { btn.disabled = true; btn.textContent = "Creating Account…"; }

    const apiBase = window.BM?.API_BASE || "https://brahmnmitra.onrender.com";
    const endpoints = [
      `${apiBase}/auth.php?action=register`,
      "/backend/auth.php?action=register"
    ];

    let success = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.token) {
          setCustomerSession(data);
          renderAuthUI();
          success = true;
          if (window.BMPlatform && window.BMPlatform.toast) {
            window.BMPlatform.toast("Account created successfully!", "success");
          }
          break;
        } else if (data.error || data.message) {
          throw new Error(data.error || data.message);
        }
      } catch (err) {
        if (regAlert) {
          regAlert.style.display = "block";
          regAlert.textContent = err.message || "Could not register account. Please retry.";
        }
      }
    }

    if (btn) { btn.disabled = false; btn.textContent = "Create Traveler Account →"; }
  });

  // Sign out
  signoutBtn?.addEventListener("click", () => {
    setCustomerSession(null);
    renderAuthUI();
    if (window.BMPlatform && window.BMPlatform.toast) {
      window.BMPlatform.toast("Signed out successfully.", "info");
    }
  });

  // Workspace Local Storage Sync
  function render() {
    const state = window.BMPlatform.read();
    if (!form.elements.name.value) form.elements.name.value = state.profile.name;
    if (!form.elements.email.value) form.elements.email.value = state.profile.email;
    if (!form.elements.phone.value) form.elements.phone.value = state.profile.phone;
    form.elements.travelStyle.value = state.profile.travelStyle;
    document.getElementById("reward-points").textContent = state.rewards.points;
    document.getElementById("saved-list").innerHTML = state.saved.length
      ? state.saved
          .map(
            (item) =>
              '<li class="saved-item-row">' +
              '<img src="' +
              escape(item.image || "assets/images/sample.webp") +
              '" alt="" class="saved-thumb" onerror="this.src=\'assets/images/sample.webp\'" />' +
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
  renderAuthUI();
})();
