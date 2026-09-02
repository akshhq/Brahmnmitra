"use strict";
// BrahmnMitra — Universal Header and Navigation

window.BM = window.BM || {};

BM.initNavigation = function () {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  if (!header || !nav || !toggle) return;

  const content =
    document.getElementById("content") ||
    document.querySelector(".portal-main") ||
    document.querySelector("main") ||
    document.body;

  const links = Array.prototype.slice.call(
    nav.querySelectorAll('a[href^="#"]'),
  );

  // Theme shift on scroll
  const flip = () => {
    if (!content) return;
    const top = content.getBoundingClientRect().top;
    header.classList.toggle("on-light", top < 80);
  };
  window.addEventListener("scroll", flip, { passive: true });
  flip();

  /* ---------- mobile overlay ---------- */
  function closeNav() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }
  function openNav() {
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
    const firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    open ? closeNav() : openNav();
  });

  // Close on link click
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });

  // Modal keyboard handling: Escape to close + Tab focus trap
  document.addEventListener("keydown", (e) => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;

    if (e.key === "Escape") {
      closeNav();
      toggle.focus();
      return;
    }

    if (e.key === "Tab") {
      const focusables = [toggle, ...Array.from(nav.querySelectorAll("a[href], button:not([disabled])"))];
      if (!focusables.length) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });

  // Reset overlay on desktop breakpoint
  const mq = matchMedia("(min-width:1141px)");
  const onMQ = (e) => {
    if (e.matches) closeNav();
  };
  mq.addEventListener
    ? mq.addEventListener("change", onMQ)
    : mq.addListener(onMQ);

  // Scroll spy (for anchor links present on the page)
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (sections.length) {
    function spy() {
      const line = window.innerHeight * 0.34;
      let active = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) {
          active = s.id;
          break;
        }
      }
      links.forEach((a) => {
        const on = active && a.getAttribute("href") === "#" + active;
        if (on) {
          a.setAttribute("aria-current", "true");
        } else if (!a.hasAttribute("data-static-current")) {
          a.removeAttribute("aria-current");
        }
      });
    }
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  // Smooth anchor scrolling for local hash links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const targetEl =
        targetId === "#top" ? document.body : document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 90;
        const targetPos =
          targetId === "#top"
            ? 0
            : targetEl.getBoundingClientRect().top +
              window.pageYOffset -
              headerOffset;
        window.scrollTo({
          top: targetPos,
          behavior: "smooth",
        });
        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });

  /* ---------- back to top button ---------- */
  let backToTop = document.getElementById("back-to-top");
  if (!backToTop) {
    backToTop = document.createElement("button");
    backToTop.id = "back-to-top";
    backToTop.type = "button";
    backToTop.setAttribute("aria-label", "Back to top");
    backToTop.innerHTML = '<span aria-hidden="true">&#8593;</span>';
    document.body.appendChild(backToTop);
  }

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const checkBackToTop = () => {
    if (window.pageYOffset > 500) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  };

  window.addEventListener("scroll", checkBackToTop, { passive: true });
  checkBackToTop();
};

// Universal 3D Spatial Animation Bootstrap
(() => {
  if (!window._bm3DAnimationsLoaded && !document.querySelector('script[src*="3d-animations.js"]')) {
    window._bm3DAnimationsLoaded = true;
    const s = document.createElement("script");
    s.src = "/assets/js/3d-animations.js";
    s.defer = true;
    document.head.appendChild(s);
  }
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", BM.initNavigation);
} else {
  BM.initNavigation();
}
