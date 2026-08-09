"use strict";
/* ============================================================
   BRAHMNMITRA — navigation.js
   ------------------------------------------------------------
   · flips the header from dark glass (over the night sky) to
     light glass (once we're in daylight)
   · hamburger → full-screen overlay on mobile
   · scroll-spy: marks the section you're currently reading
   ============================================================ */

window.BM = window.BM || {};

BM.initNavigation = function () {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  const content = document.getElementById("content");
  const links = Array.prototype.slice.call(
    nav.querySelectorAll('a[href^="#"]'),
  );

  /* ---------- dark glass → light glass ----------
     The header sits over the night sky during the cinematic and over
     daylight afterwards. One class swap, CSS does the transition. */
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

  // tapping any link inside the overlay closes it
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });

  // Escape closes it and returns focus to the button — keyboard users
  // must never get trapped behind a full-screen overlay.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeNav();
      toggle.focus();
    }
  });

  // if the viewport grows past the breakpoint while the overlay is open,
  // drop it — otherwise it hangs around invisibly and blocks the page
  const mq = matchMedia("(min-width:1081px)");
  const onMQ = (e) => {
    if (e.matches) closeNav();
  };
  mq.addEventListener
    ? mq.addEventListener("change", onMQ)
    : mq.addListener(onMQ);

  /* ---------- scroll-spy ----------
     Highlights the nav item for whichever section owns the upper third
     of the viewport. Uses aria-current, so screen readers get it too. */
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
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(spy);
      }
    },
    { passive: true },
  );
  spy();
};
