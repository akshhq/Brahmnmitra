'use strict';
/* ============================================================
   BRAHMNMITRA — timeline.js
   ------------------------------------------------------------
   Two jobs:
     1. the Process rail draws itself in as you reach it, and the
        five step markers pop in one after the other
     2. every [data-reveal] glass panel rises + un-blurs on scroll
        (this is the liquid-glass entrance from the original build)

   GSAP/ScrollTrigger is used when present; if the CDN is blocked
   we fall back to an IntersectionObserver so the content still
   appears. Under prefers-reduced-motion nothing animates at all —
   panels are simply visible from the start.
   ============================================================ */

window.BM = window.BM || {};

const BM_REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. glass panels rise in ---------- */
BM.initReveals = function () {
  const panels = document.querySelectorAll('[data-reveal]');
  if (!panels.length) return;

  // Reduced motion: leave everything as authored — fully visible.
  if (BM_REDUCE) {
    panels.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.utils.toArray('[data-reveal]').forEach(el => {
      gsap.fromTo(el,
        { y: 46, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0, opacity: 1, filter: 'blur(0px)',
          duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
    });

    // the aurora field drifts slower than the page — parallax depth
    gsap.to('.aurora', {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: '#content', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
    });
  } else {
    // GSAP unavailable (offline / CDN blocked) — plain CSS transition
    panels.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(46px)';
      el.style.transition = 'opacity .9s ease, transform .9s cubic-bezier(.22,1,.36,1)';
    });
    const io = new IntersectionObserver((es, obs) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    panels.forEach(el => io.observe(el));
  }

  /* ---------- cursor-tracked specular highlight ----------
     A soft light follows the pointer across each glass panel. Only on
     devices that actually have a hover-capable pointer — on a phone
     this would fire on every tap and just look like a flicker. */
  if (matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.glass').forEach(card => {
      // A trackpad/high-poll-rate mouse can fire pointermove far more often
      // than the screen repaints. Stash the latest position and let one
      // rAF per frame do the actual style write, instead of one write per
      // raw event — same visual result, far fewer style recalculations.
      let pending = false, lastX = 0, lastY = 0;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        lastX = ((e.clientX - r.left) / r.width) * 100;
        lastY = ((e.clientY - r.top) / r.height) * 100;
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          card.style.backgroundImage =
            'radial-gradient(340px circle at ' + lastX + '% ' + lastY + '%, rgba(255,255,255,.45), transparent 62%)';
        });
      });
      card.addEventListener('pointerleave', () => { card.style.backgroundImage = ''; });
    });
  }
};

/* ---------- 2. the process timeline ---------- */
BM.initTimeline = function () {
  const proc = document.querySelector('.proc');
  if (!proc) return;

  const rail  = proc.querySelector('.proc-rail');
  const steps = proc.querySelectorAll('.proc-step');

  if (BM_REDUCE) {
    if (rail) rail.style.transform = 'none';
    steps.forEach(s => { s.style.opacity = '1'; s.style.transform = 'none'; });
    return;
  }

  // The rail is drawn with a scaleX (scaleY on the mobile vertical
  // layout — see responsive.css, where the rail rotates to a spine).
  const vertical = matchMedia('(max-width:920px)').matches;
  const axis = vertical ? 'scaleY' : 'scaleX';
  const origin = vertical ? 'top center' : 'left center';

  if (rail) {
    rail.style.transformOrigin = origin;
    rail.style.transform = axis + '(0)';
  }
  steps.forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(22px)';
  });

  function play() {
    if (rail) {
      rail.style.transition = 'transform 1.5s cubic-bezier(.22,1,.36,1)';
      rail.style.transform = axis + '(1)';
    }
    steps.forEach((s, i) => {
      s.style.transition = 'opacity .7s ease ' + (i * 0.13 + 0.15) + 's, ' +
                           'transform .7s cubic-bezier(.22,1,.36,1) ' + (i * 0.13 + 0.15) + 's';
    });
    // One frame later, commit all five at once. (Setting the transition and
    // the end state in the same frame gives the browser nothing to animate
    // FROM, and the steps would simply appear.)
    requestAnimationFrame(() => {
      steps.forEach(s => {
        s.style.opacity = '1';
        s.style.transform = 'none';
      });
    });
  }

  const io = new IntersectionObserver((es, obs) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      play();
      obs.disconnect();                 // draw once
    });
  }, { threshold: 0.25 });
  io.observe(proc);
};
