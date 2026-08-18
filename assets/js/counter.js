"use strict";
// BrahmnMitra — Animated Statistics Counter

window.BM = window.BM || {};

BM.initCounters = function () {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;

  const noMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // formats 50000 -> "50,000" using Indian digit grouping where it
  // matters (50,000 is the same either way; 100000 would be 1,00,000)
  const fmt = (n) => n.toLocaleString("en-IN");

  function run(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";

    if (noMotion || !isFinite(target)) {
      el.textContent = prefix + fmt(target) + suffix;
      return;
    }

    const DUR = 1600; // ms
    const start = performance.now();
    // easeOutExpo — fast off the line, settles gently on the number
    const ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function frame(now) {
      const t = Math.min(1, (now - start) / DUR);
      const v = target * ease(t);
      // integers stay integers; a decimal target keeps one place
      const shown = Number.isInteger(target)
        ? Math.round(v)
        : Math.round(v * 10) / 10;
      el.textContent = prefix + fmt(shown) + suffix;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + fmt(target) + suffix; // land exactly
    }
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        run(e.target);
        obs.unobserve(e.target); // count once, not on every pass
      });
    },
    { threshold: 0.4 },
  );

  els.forEach((el) => io.observe(el));
};
