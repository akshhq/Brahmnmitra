"use strict";
// BrahmnMitra — Header and Navigation

window.BM = window.BM || {};

BM.initNavigation = function () {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  const content = document.getElementById("content");
  const links = Array.prototype.slice.call(
    nav.querySelectorAll('a[href^="#"]'),
  );

  // Theme shift on scroll
  const flip = () => {
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
  }

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    open ? closeNav() : openNav();
  });

  // Close on link click
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeNav();
      toggle.focus();
    }
  });

  // Reset overlay on desktop breakpoint
  const mq = matchMedia("(min-width:1081px)");
  const onMQ = (e) => {
    if (e.matches) closeNav();
  };
  mq.addEventListener
    ? mq.addEventListener("change", onMQ)
    : mq.addListener(onMQ);

  // Scroll spy
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) return;

  let ticking = false;
  function spy() {
    ticking = false;
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
      on
        ? a.setAttribute("aria-current", "true")
        : a.removeAttribute("aria-current");
    });
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const targetEl = targetId === "#top" ? document.body : document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 90;
        const targetPos = targetId === "#top" ? 0 : targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
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
