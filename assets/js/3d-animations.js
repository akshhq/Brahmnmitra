"use strict";

/**
 * BrahmnMitra — Universal 3D Spatial Animation & Interactive Tilt Engine
 * Provides buttery-smooth 60fps/120fps 3D micro-interactions for Mobile and Desktop
 */

(() => {
  // 1. Accessibility Check: Disable all motion if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  const TILT_SELECTORS = [
    ".portal-card",
    ".workspace-card",
    ".service-card",
    ".why-card",
    ".step-card",
    ".tour-card",
    ".checkout-card",
    ".stat-card",
    ".stat",
    ".travel-card",
    ".destination-card",
    ".trip-planner-panel",
    ".assistant-card",
    "[data-tilt-3d]"
  ].join(",");

  // =========================================================================
  // 2. Desktop High-Precision 3D Tilt & Specular Glare Engine
  // =========================================================================
  function initCard3DTilt(card) {
    if (card._has3DTiltInit) return;
    card._has3DTiltInit = true;

    // Inject 3D Glare Element if absent
    let glare = card.querySelector(".glare-sheen-3d");
    if (!glare) {
      glare = document.createElement("div");
      glare.className = "glare-sheen-3d";
      card.appendChild(glare);
    }

    let rafId = null;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isHovered = false;

    const maxTilt = 8; // Max pitch and roll degrees for subtle luxury feel

    function updateTransform() {
      if (!isHovered) {
        // Damping return to neutral
        currentRotX += (0 - currentRotX) * 0.12;
        currentRotY += (0 - currentRotY) * 0.12;

        if (Math.abs(currentRotX) < 0.05 && Math.abs(currentRotY) < 0.05) {
          card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
          cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
      } else {
        // Fluid interpolation towards target
        currentRotX += (targetRotX - currentRotX) * 0.18;
        currentRotY += (targetRotY - currentRotY) * 0.18;
      }

      card.style.transform = `perspective(1000px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg) translateZ(${isHovered ? "12px" : "0px"})`;

      rafId = requestAnimationFrame(updateTransform);
    }

    // Pointer events for Desktop / Mouse
    card.addEventListener("pointerenter", () => {
      if (isTouchDevice()) return;
      isHovered = true;
      if (!rafId) rafId = requestAnimationFrame(updateTransform);
    });

    card.addEventListener("pointermove", (e) => {
      if (isTouchDevice()) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const normX = Math.max(0, Math.min(1, x / rect.width));
      const normY = Math.max(0, Math.min(1, y / rect.height));

      // Calculate angles
      targetRotX = -((normY - 0.5) * 2) * maxTilt;
      targetRotY = ((normX - 0.5) * 2) * maxTilt;

      // Update glare position
      card.style.setProperty("--glare-x", `${(normX * 100).toFixed(1)}%`);
      card.style.setProperty("--glare-y", `${(normY * 100).toFixed(1)}%`);

      if (!rafId) rafId = requestAnimationFrame(updateTransform);
    });

    card.addEventListener("pointerleave", () => {
      isHovered = false;
      targetRotX = 0;
      targetRotY = 0;
    });

    // Touch Feedback for Mobile
    card.addEventListener("touchstart", () => {
      card.style.transform = "perspective(800px) scale(0.98) translateZ(-10px) rotateX(1.5deg)";
    }, { passive: true });

    card.addEventListener("touchend", () => {
      card.style.transform = "perspective(800px) scale(1) translateZ(0px) rotateX(0deg)";
    }, { passive: true });

    card.addEventListener("touchcancel", () => {
      card.style.transform = "perspective(800px) scale(1) translateZ(0px) rotateX(0deg)";
    }, { passive: true });
  }

  // Bind to all current cards
  function attachTiltToAllCards() {
    document.querySelectorAll(TILT_SELECTORS).forEach(initCard3DTilt);
  }

  // =========================================================================
  // 3. Smooth 3D Scroll Reveal Engine
  // =========================================================================
  function init3DScrollReveal() {
    const revealTargets = document.querySelectorAll(
      ".portal-card, .workspace-card, .service-card, .why-card, .step-card, .tour-card, .stat-card, .checkout-card, .portal-hero, .portal-cta, main section > h2, main section > .section-head"
    );

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -40px 0px",
        threshold: 0.05
      }
    );

    revealTargets.forEach((el, index) => {
      if (!el.classList.contains("reveal-3d")) {
        el.classList.add("reveal-3d");
        // Stagger cards within grids
        const parent = el.parentElement;
        if (parent && (parent.classList.contains("portal-grid") || parent.classList.contains("workspace-grid") || parent.classList.contains("cards-grid"))) {
          const siblingIndex = Array.from(parent.children).indexOf(el);
          el.style.transitionDelay = `${(siblingIndex % 6) * 0.08}s`;
        }
      }
      observer.observe(el);
    });
  }

  // =========================================================================
  // 4. Mobile 3D Scroll Parallax & Gyroscopic Dynamics
  // =========================================================================
  function initMobile3DDynamics() {
    if (!isTouchDevice()) return;

    let lastScrollY = window.pageYOffset;
    let scrollVelocity = 0;
    let scrollTimeout = null;

    window.addEventListener("scroll", () => {
      const currentScrollY = window.pageYOffset;
      scrollVelocity = Math.max(-15, Math.min(15, (currentScrollY - lastScrollY) * 0.4));
      lastScrollY = currentScrollY;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollVelocity = 0;
      }, 100);
    }, { passive: true });
  }

  // =========================================================================
  // 5. Watch for Dynamic Catalog Injections (SPA / Async Cards)
  // =========================================================================
  function observeDynamicCards() {
    const observer = new MutationObserver((mutations) => {
      let hasNewCards = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.matches && node.matches(TILT_SELECTORS)) {
                initCard3DTilt(node);
                hasNewCards = true;
              } else if (node.querySelectorAll) {
                const nested = node.querySelectorAll(TILT_SELECTORS);
                if (nested.length) {
                  nested.forEach(initCard3DTilt);
                  hasNewCards = true;
                }
              }
            }
          });
        }
      });
      if (hasNewCards) {
        init3DScrollReveal();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =========================================================================
  // 6. Header 3D Depth on Scroll
  // =========================================================================
  function initHeader3DDepth() {
    const header = document.getElementById("site-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 40) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }, { passive: true });
  }

  // =========================================================================
  // 7. Initialization
  // =========================================================================
  function init() {
    attachTiltToAllCards();
    init3DScrollReveal();
    initMobile3DDynamics();
    observeDynamicCards();
    initHeader3DDepth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
