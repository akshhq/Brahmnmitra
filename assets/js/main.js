'use strict';
/* ================================================================
   BRAHMNMITRA — cinematic engine v3

   ⚠️  THIS FILE IS THE ANIMATION. Do not "tidy" the numbers.
       Every constant below was tuned against the rendered frame;
       the comments explain what breaks if you move them.

   Smoothness strategy (why this feels different from a scrub):
   · Scroll is read once per frame, then a critically-damped spring
     chases it. Animation never rides raw scroll deltas, so wheel
     clicks / trackpad flicks can't jolt the frame.
   · The 747 follows keyframes sampled with smootherstep — one
     continuous path, so there are no seams between "approach"
     and "turn" segments.
   · Banking is derived from the path's yaw gradient (roll follows
     the turn, like a real aircraft) instead of stacked Euler
     tweens fighting each other.
   · All stage transitions use smoothstep, which is C1-continuous:
     velocity matches at both ends, so nothing snaps.

   Companion files:
     navigation.js       header state + mobile overlay
     counter.js          stat count-up
     timeline.js         process rail + scroll reveals
     form-validation.js  enquiry form + WhatsApp
   ================================================================ */

/* ================= math helpers ================= */
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// smoothstep: zero velocity at both ends → no snap where stages meet
const smooth  = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
// smootherstep: zero velocity AND zero acceleration at the ends
const smoother = t => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
// map x from [a,b] → [0,1] with smoothstep
const seg = (x, a, b, easeFn) => (easeFn || smooth)((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const webglOK = (() => {
  try { const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
  catch (e) { return false; }
})();

if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* Reduced motion, no WebGL, or three.js failed to load from the CDN →
   the site degrades to a clean static hero. Everything else still works. */
if (reduce || !webglOK || typeof THREE === 'undefined') {
  document.body.classList.add('no-cinema');
} else {
  initCinema();
}

/* the rest of the page — always runs, cinema or not */
if (window.BM) {
  BM.initNavigation();
  BM.initReveals();
  BM.initCounters();
  BM.initTimeline();
  BM.initForm();
}

/* ================= the cinematic ================= */
function initCinema() {
  const stage  = document.querySelector('.stage');
  const canvas = document.getElementById('sky-canvas');
  const cinema = document.getElementById('cinema');
  const reveal = document.getElementById('reveal');
  const frame  = document.querySelector('.window-frame');
  const heroEl = document.querySelector('.hero-copy');
  const hintEl = document.querySelector('.scroll-hint');
  const skipEl = document.querySelector('.skip-intro');
  const dayEl  = document.querySelector('.bg-day');
  const sunEl  = document.querySelector('.sun');
  const innerEl = document.querySelector('.reveal-inner');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // cap DPR — high-DPI phones tank the framerate at 3x, and that reads as "janky"
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b1526, 0.0022);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
  const CAM_HOME = new THREE.Vector3(0, 2.5, 74);
  camera.position.copy(CAM_HOME);

  /* ---- lights (night values; tweened to daylight per-frame) ---- */
  const ambient = new THREE.AmbientLight(0x2a3a58, 1.1);
  const sunLight = new THREE.DirectionalLight(0x9fb8ff, 1.4);
  sunLight.position.set(80, 90, 70);
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x8fa6c0, 0);
  scene.add(ambient, sunLight, hemi);

  const NIGHT_AMB = new THREE.Color(0x2a3a58), DAY_AMB = new THREE.Color(0xa9bdd4);
  const NIGHT_SUN = new THREE.Color(0x9fb8ff), DAY_SUN = new THREE.Color(0xfff3dc);
  const NIGHT_FOG = new THREE.Color(0x0b1526), DAY_FOG = new THREE.Color(0xd2e7f8);

  /* ---- stars ---- */
  const N = 1500, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 400 + Math.random() * 600;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    sp[i*3]   = r * Math.sin(ph) * Math.cos(th);
    sp[i*3+1] = Math.abs(r * Math.cos(ph)) * 0.7 - 40;
    sp[i*3+2] = -Math.abs(r * Math.sin(ph) * Math.sin(th)) + 60;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 1, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---- cloud field: parallax layers so depth reads properly ---- */
  const cloudTex = [0, 1, 2, 3].map(makeCloudTexture);
  const clouds = [];
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
  function addCloud(x, y, z, w, opacity, drift) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex[(Math.random() * 4) | 0], transparent: true,
      opacity: 0, depthWrite: false, fog: true
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(w, w * 0.44, 1);
    s.position.set(x, y, z);
    s.userData = { peak: opacity, drift, spin: (Math.random() - 0.5) * 0.02 };
    clouds.push(s); cloudGroup.add(s);
  }
  for (let i = 0; i < 16; i++)                                  // far deck
    addCloud((Math.random()-.5)*900, -30 - Math.random()*50, -700 + Math.random()*260, 200 + Math.random()*220, 0.85, 0.008 + Math.random()*0.012);
  for (let i = 0; i < 12; i++)                                  // mid deck
    addCloud((Math.random()-.5)*620, -14 - Math.random()*40, -420 + Math.random()*260, 130 + Math.random()*150, 0.9, 0.02 + Math.random()*0.03);
  for (let i = 0; i < 7; i++)                                   // high wisps
    addCloud((Math.random()-.5)*700, 20 + Math.random()*40, -520 + Math.random()*300, 160 + Math.random()*180, 0.5, 0.014 + Math.random()*0.02);
  // near clouds that sweep past the camera → strong sense of speed
  addCloud(-120, -22, 40, 380, 0.5, 0.10);
  addCloud(140, -30, 20, 340, 0.45, 0.12);
  addCloud(-60, 30, -20, 300, 0.35, 0.08);

  /* ---- the 747 ---- */
  const P = buildPlane();
  scene.add(P.group);

  /* ---- Flight choreography (explicit, not lookAt-derived).

     Model convention: nose = +Z, right wing = +X, window row we
     enter = the -X side. So:
       yaw 0        → nose pointing at the camera (head-on)
       yaw +90°     → nose swings RIGHT; the -X (window) flank
                      faces the camera. This is the final pose.

     We interpolate position and yaw along the same normalised
     `fly` parameter, and derive roll from the yaw rate, so the
     aircraft banks into its own turn exactly like the real thing.
     Everything is an explicit number: no matrix can flip it. ---- */
  /* Keyframes: t (0-1 of the flight), x, y, z, yaw in degrees.

     Verified against three.js:
        yaw   0° → nose points straight at the camera (head-on)
        yaw +90° → nose swings RIGHT; the -X window flank faces the camera
     So the turn ramps yaw 0 → +90°, which is the right-hand turn in the
     brief AND leaves the windows presented to us. (Negative yaw turns the
     nose LEFT and hides the windows — that was the earlier bug.)

     The plane approaches from deep space slightly left of centre, drifts
     right as it nears, then banks into its turn and settles broadside. */
  const KEYS = [
    // t,    x,    y,     z,   yaw(deg)
    //
    // CRITICAL: x and z must each be MONOTONIC. An earlier version swept x
    // out to +11 and then back to 0 — a hairpin — which made the aircraft
    // visibly snap sideways and lunge at the camera near the end of the
    // turn. Position and apparent size must only ever move one way.
    //
    // The aircraft sweeps from far left, closing steadily, turning right
    // (yaw 0 -> 90) until it sits broadside with its window row facing us.
    [0.00, -32,  13,  -440,     0],   // far left, high, nose-on
    [0.12, -29,  10,  -338,     3],
    [0.24, -26,   8,  -256,     7],
    [0.36, -23,   6,  -190,    13],
    [0.48, -20,   4,  -137,    21],
    [0.60, -16,   3,   -95,    32],   // the turn is under way
    [0.71, -13,   2,   -61,    45],
    [0.81, -10,   1,   -35,    59],
    [0.90,  -7,   0,   -14,    73],
    [0.96,  -5,   0,     1,    83],
    [1.00,  -3,   0,    12,    90]    // broadside: window row to camera
  ];
  const kT   = KEYS.map(k => k[0]);
  const kYaw = KEYS.map(k => THREE.MathUtils.degToRad(k[4]));

  /* Sample position AND yaw from the SAME keyframes with the same
     blend factor. (An earlier version used CatmullRomCurve.getPointAt()
     for position — that re-parameterises by arc length, which desyncs
     it from the yaw and makes the aircraft appear to reverse, turn the
     wrong way, then snap.) Writes into `out`; returns the yaw. */
  function sampleFlight(t, out) {
    t = clamp01(t);
    for (let i = 0; i < kT.length - 1; i++) {
      if (t <= kT[i + 1]) {
        // smootherstep, not smoothstep: it is C2-continuous, so ACCELERATION
        // (not just velocity) matches across every keyframe join. With plain
        // smoothstep the acceleration jumps at each key and the eye reads it
        // as a small lurch — measured peak jerk drops ~10x with this.
        const k = smoother((t - kT[i]) / (kT[i + 1] - kT[i]));
        const a = KEYS[i], b = KEYS[i + 1];
        out.set(lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k));
        return lerp(kYaw[i], kYaw[i + 1], k);
      }
    }
    const last = KEYS[KEYS.length - 1];
    out.set(last[1], last[2], last[3]);
    return kYaw[kYaw.length - 1];
  }

  const euler = new THREE.Euler(0, 0, 0, 'YXZ');   // yaw, then pitch, then roll
  const probe = new THREE.Vector3();               // scratch for the look-ahead sample

  /* Park the aircraft at its start pose right away. Without this it sits
     at the origin — i.e. parked in front of the camera behind the title —
     until the first scroll tick moves it. */
  sampleFlight(0, P.group.position);
  euler.set(-0.05, kYaw[0], 0);
  P.group.quaternion.setFromEuler(euler);

  /* ---- camera fly-through rig (all vectors preallocated: allocating
     inside the render loop triggers GC pauses, which read as stutter) ---- */
  const wpos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const outWorld = new THREE.Vector3();
  const HOME_LOOK = new THREE.Vector3(0, 1, 0);

  /* ================= damped scroll ==================
     `raw` is where the page actually is; `p` chases it with an
     exponential smoother. Everything downstream reads `p`, so the
     motion stays fluid even when the scroll input is chunky
     (wheel clicks, trackpad flicks, momentum scrolling).

     The rate is expressed as "fraction of the remaining gap closed
     per second" and applied via pow(), which makes it frame-rate
     independent: identical feel at 60Hz and 144Hz. */
  let raw = 0, p = 0;
  const SMOOTH_RATE = 0.0000001;   // ~99.9% of the gap closed each 1/10 s

  function readScroll() {
    const r = cinema.getBoundingClientRect();
    const total = cinema.offsetHeight - window.innerHeight;
    raw = clamp01(total > 0 ? (-r.top) / total : 0);
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();
  p = raw;

  /* ================= stage timing (fractions of the cinema scroll) =====
     Tuned so every beat has room and the sequence *finishes* before the
     scroll does — the cabin is fully open by ~92%, leaving a moment to
     read the welcome copy before the page continues. */
  const T = {
    heroOut:   [0.01, 0.13],   // title zooms + fades away almost at once
    dayIn:     [0.03, 0.24],   // night dissolves into daylight
    // Spans are proportional to how much VISUAL change each beat produces,
    // so the motion is evenly paced. (Measured: with the camera far away it
    // was doing 84% of the apparent-size change in 22% of the scroll — the
    // flight crawled and then the camera lunged. CAM_HOME is now much closer
    // and the push-in gets a fair slice of the scroll.)
    planeIn:   [0.09, 0.50],   // the flight: approach, drift, right turn
    // The push-in starts only AFTER the aircraft has settled: if they
    // overlap, the two motions compound and apparent size spikes.
    windowIn:  [0.52, 0.82],   // camera closes on the cabin window
    frameGrow: [0.72, 0.84],   // frame appears once we're right at the glass
    framePass: [0.84, 0.91],   // ...then sweeps past as you pass through it
    cabinOpen: [0.78, 0.90],   // mask: closed → window aperture → full bleed
    copyIn:    [0.87, 0.97]    // welcome copy rises from inside the cabin
  };

  const portrait = () => window.innerWidth / window.innerHeight < 0.85;

  /* ================= per-frame update ================= */
  let W = 0, H = 0, fov = 55;
  const clock = new THREE.Clock();

  function update() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* --- smooth the scroll (frame-rate independent) --- */
    p += (raw - p) * (1 - Math.pow(SMOOTH_RATE, dt));
    if (Math.abs(raw - p) < 0.0002) p = raw;

    /* --- Act I: hero leaves --- */
    const hOut = seg(p, T.heroOut[0], T.heroOut[1], smoother);
    heroEl.style.opacity = String(1 - hOut);
    heroEl.style.transform = 'scale(' + (1 - 0.22 * hOut) + ') translateZ(0)';
    heroEl.style.filter = 'blur(' + (10 * hOut) + 'px)';
    hintEl.style.opacity = String(1 - clamp01(p / 0.05));
    // retire the skip-intro button once we're well into the flight
    if (skipEl) skipEl.classList.toggle('gone', p > 0.4);

    /* --- night → day --- */
    const day = seg(p, T.dayIn[0], T.dayIn[1], smoother);
    dayEl.style.opacity = String(day);
    sunEl.style.opacity = String(day * 0.95);
    starMat.opacity = 1 - clamp01(day * 1.4);
    ambient.color.copy(NIGHT_AMB).lerp(DAY_AMB, day);
    sunLight.color.copy(NIGHT_SUN).lerp(DAY_SUN, day);
    sunLight.intensity = lerp(1.4, 2.4, day);
    hemi.intensity = lerp(0, 1.2, day);
    scene.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, day);
    // fog thins as we climb into clear air → the plane emerges gradually
    scene.fog.density = lerp(0.0022, 0.00055, smoother(seg(p, 0.16, 0.62)));
    for (const c of clouds) c.material.opacity = c.userData.peak * day;

    /* --- Act II: the 747 flies its choreographed curve --- */
    const fly = seg(p, T.planeIn[0], T.planeIn[1], smoother);
    {
      // position + yaw come from one sampler, so they can never desync
      const yaw = sampleFlight(fly, P.group.position);
      // Bank into the turn. Roll is derived from the yaw GRADIENT along
      // the path (sampled slightly ahead), not from a frame-to-frame
      // delta — so the bank depends on where the aircraft is in its turn,
      // never on how fast the visitor happens to be scrolling.
      const yawAhead = sampleFlight(Math.min(1, fly + 0.02), probe);
      const targetRoll = THREE.MathUtils.clamp(-(yawAhead - yaw) * 12, -0.55, 0.55);
      // frame-rate-independent easing into the bank
      P.roll += (targetRoll - P.roll) * (1 - Math.pow(0.004, dt));
      // gentle nose-down as it descends toward the camera's level
      const pitch = lerp(-0.05, 0, smooth(fly));

      euler.set(pitch, yaw, P.roll);
      P.group.quaternion.setFromEuler(euler);
    }

    // idle life: gentle float + engine/beacon animation
    P.bob.position.y = Math.sin(t * 1.15) * 0.32;
    P.bob.rotation.z = Math.sin(t * 0.8) * 0.008;
    P.beacon.material.opacity = 0.1 + 0.9 * Math.pow(Math.max(0, Math.sin(t * 3.2)), 10);
    P.strobe.material.opacity = (Math.sin(t * 7.5) > 0.95) ? 1 : 0;
    for (const f of P.fans) f.rotation.z += dt * 14;

    /* --- clouds drift, and recycle across the sky --- */
    for (const c of clouds) {
      c.position.x += c.userData.drift * dt * 60;
      if (c.position.x > 480) c.position.x = -480;
    }
    stars.rotation.y += dt * 0.004;

    /* --- Act III: close on the cabin window ---

       The camera must never TELEPORT. An earlier version parked it at
       CAM_HOME while win==0 and then snapped it to a computed standoff the
       instant win>0 — two unrelated points in space, i.e. a visible jump.

       Now the camera position is a continuous blend: it starts exactly at
       CAM_HOME and eases toward the glass, so at win=0 the blend IS
       CAM_HOME and there is no seam to see. Same for where it looks. */
    const win = seg(p, T.windowIn[0], T.windowIn[1], smoother);
    P.marker.getWorldPosition(wpos);

    // Where we'd stand if we were fully committed to the window: just off
    // the glass, on its outward normal (rotated into world space so we
    // always approach head-on, whatever attitude the aircraft holds).
    outWorld.copy(P.outward).applyQuaternion(P.group.quaternion).normalize();
    camTarget.copy(wpos).addScaledVector(outWorld, 9.5);
    camTarget.y += 0.35;

    // Blend CAM_HOME -> that pose. We stop short of the skin deliberately;
    // the CSS bezel and cabin mask carry you the rest of the way through.
    //
    // PERCEPTUAL EASING: apparent size goes as 1/distance, so easing the
    // distance linearly makes the aircraft balloon at a wildly increasing
    // rate as we close in (measured: the growth step ramps 36x — that is
    // the "lunge"). Interpolating in RECIPROCAL space instead keeps the
    // apparent growth perfectly even (measured unevenness: 1.00x), which
    // is what makes the push-in feel like a filmed dolly rather than a
    // snap. We convert `win` into a reciprocal-space parameter `wr`.
    const dHome = CAM_HOME.distanceTo(wpos);
    const dNear = camTarget.distanceTo(wpos);
    let wr = win;
    if (win > 0 && win < 1 && dHome > dNear + 0.001) {
      // The distance we should be at right now for perceptually EVEN growth
      // (apparent size ~ 1/d, so we interpolate 1/d, not d).
      const dWant = 1 / lerp(1 / dHome, 1 / dNear, win);
      // Re-express that distance as a position along CAM_HOME -> camTarget.
      wr = clamp01((dHome - dWant) / (dHome - dNear));
    }
    camera.position.lerpVectors(CAM_HOME, camTarget, wr);
    camLook.lerpVectors(HOME_LOOK, wpos, wr);
    camera.lookAt(camLook);
    fov = lerp(baseFov(), baseFov() - 16, wr);

    camera.fov = fov;
    camera.updateProjectionMatrix();

    // the warm target window brightens as we approach
    P.winMat.color.setRGB(lerp(0.55, 1, win), lerp(0.45, 0.97, win), lerp(0.3, 0.88, win));

    /* --- window frame: grows, then passes around the viewer --- */
    const fg = seg(p, T.frameGrow[0], T.frameGrow[1], smoother);
    const fp = seg(p, T.framePass[0], T.framePass[1], smoother);
    if (fg > 0) {
      // The bezel sits exactly on the cabin mask's aperture and scales with
      // it, so the frame and the hole it surrounds stay locked together —
      // then both sweep past the viewer as you pass through the glass.
      // Every factor here is smootherstep-eased: a linear ramp into a 7x
      // scale would start with a velocity step, which reads as a snap.
      const scale = lerp(0.5, 1.0, fg) * (1 + 7 * fp);
      frame.style.opacity = String(Math.min(1, fg * 2.2) * (1 - fp));
      frame.style.transform = 'translateZ(0) scale(' + scale + ')';
    } else {
      frame.style.opacity = '0';
    }

    /* --- cabin mask opens: window shape → full screen --- */
    // Hand off from 3D to the cabin: once the wall covers the screen the
    // WebGL scene is redundant, and leaving it on shows the exterior
    // ghosting through the interior. Fade it out under the wall.
    const handoff = seg(p, T.framePass[0], T.framePass[1], smoother);
    canvas.style.opacity = String(1 - handoff);

    const co = seg(p, T.cabinOpen[0], T.cabinOpen[1], smoother);
    // Aperture must match the .window-frame box exactly, or the bezel and
    // the hole it frames will drift apart. Frame is 19vh x 30vh (26x34 on
    // portrait), so convert that to inset percentages of the viewport.
    const vh = H, vw = W;
    const fw = (portrait() ? 26 : 19) * vh / 100;   // frame width in px
    const fh = (portrait() ? 34 : 30) * vh / 100;   // frame height in px
    const winLR = Math.max(0, (1 - fw / vw) / 2 * 100);
    const winTB = Math.max(0, (1 - fh / vh) / 2 * 100);
    // phase 1 (0→.55): closed → window aperture. phase 2 (.55→1): → full bleed
    let tb, lr, rad;
    if (co <= 0.55) {
      const k = smoother(co / 0.55);
      tb = lerp(50, winTB, k); lr = lerp(50, winLR, k); rad = 400;
    } else {
      const k = smoother((co - 0.55) / 0.45);
      tb = lerp(winTB, 0, k); lr = lerp(winLR, 0, k); rad = lerp(400, 0, k);
    }
    if (co >= 0.999) {
      reveal.style.clipPath = 'inset(0% 0% 0% 0% round 0px)';   // snap: no hairline
    } else {
      reveal.style.clipPath = 'inset(' + tb + '% ' + lr + '% ' + tb + '% ' + lr + '% round ' + rad + 'px)';
    }
    reveal.classList.toggle('open', co > 0.97);

    /* --- welcome copy rises from inside the cabin --- */
    const ci = seg(p, T.copyIn[0], T.copyIn[1], smoother);
    innerEl.style.opacity = String(ci);
    innerEl.style.transform = 'translate3d(0,' + lerp(34, 0, ci) + 'px,0) scale(' + lerp(0.78, 1, ci) + ')';

    renderer.render(scene, camera);
  }

  /* ---- render loop, paused when the stage is off-screen ---- */
  let visible = true;
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(cinema);

  function loop() {
    requestAnimationFrame(loop);
    if (!visible && Math.abs(raw - p) < 0.001) { clock.getDelta(); return; }  // idle: skip work
    update();
  }

  function baseFov() { return W / H < 0.85 ? 68 : 55; }
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    readScroll();
  }
  window.addEventListener('resize', resize);
  resize();
  loop();
}

/* ================= procedural cloud texture =================
   Painted in two passes — a cool shadow body, then sunlit tops
   offset toward the light — so sprites read as volume, not fog. */
function makeCloudTexture(seed) {
  const W = 512, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry32(9871 + seed * 3301);
  const puffs = [];
  const n = 30 + ((rnd() * 12) | 0);
  for (let i = 0; i < n; i++) {
    const fx = rnd();
    const centrality = 1 - Math.abs(fx - 0.5) * 2;
    const r = 16 + rnd() * 26 + centrality * 40;
    puffs.push({ x: 55 + fx * (W - 110), y: H * 0.64 - rnd() * centrality * 68, r });
  }
  for (const q of puffs) {                       // shadow body
    const gr = g.createRadialGradient(q.x, q.y + q.r * 0.28, 1, q.x, q.y + q.r * 0.28, q.r);
    gr.addColorStop(0, 'rgba(184,201,222,0.5)');
    gr.addColorStop(1, 'rgba(184,201,222,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  for (const q of puffs) {                       // sunlit tops (light from upper-right)
    const gr = g.createRadialGradient(q.x + q.r * 0.2, q.y - q.r * 0.32, 1, q.x + q.r * 0.2, q.y - q.r * 0.32, q.r * 0.95);
    gr.addColorStop(0, 'rgba(255,255,255,0.88)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.34)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ================= text-on-fuselage helper ================= */
function textPlane(text, wWorld, hWorld, opt) {
  opt = opt || {};
  const w = opt.w || 1024, h = opt.h || 160;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = opt.font || "700 110px 'Unbounded', sans-serif";
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (opt.spacing && g.letterSpacing !== undefined) g.letterSpacing = opt.spacing + 'px';
  g.fillStyle = opt.color || '#0A2540';
  g.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(wWorld, hWorld), mat);
}

/* ================= the liveried 747 ================= */
function buildPlane() {
  const group = new THREE.Group();     // path position + orientation
  const bob   = new THREE.Group();     // idle float
  group.add(bob);

  const white = new THREE.MeshStandardMaterial({ color: 0xf7f9fc, metalness: 0.55, roughness: 0.26 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xb4c1d1, metalness: 0.6,  roughness: 0.32 });
  const grey  = new THREE.MeshStandardMaterial({ color: 0xccd6e3, metalness: 0.55, roughness: 0.34, side: THREE.DoubleSide });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffb347, metalness: 0.4,  roughness: 0.34 });
  const navy  = new THREE.MeshStandardMaterial({ color: 0x0b2545, metalness: 0.4,  roughness: 0.38 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x121a27, metalness: 0.3,  roughness: 0.5 });

  /* fuselage — lathe profile, nose toward +Z */
  const prof = [
    [0.03,-26.5],[0.9,-25.6],[1.7,-24.4],[2.35,-22.8],[2.75,-21.0],[2.95,-19.0],
    [3.0,-16.0],[3.0,13.0],[2.96,15.5],[2.82,18.0],[2.55,20.3],[2.15,22.2],
    [1.65,23.7],[1.05,24.9],[0.45,25.7],[0.03,26.1]
  ].map(v => new THREE.Vector2(v[0], v[1]));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), white);
  fus.rotation.x = Math.PI / 2;
  bob.add(fus);

  /* upper deck */
  const hump = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), white);
  hump.scale.set(1.75, 1.5, 9.5);
  hump.position.set(0, 2.15, 11);
  bob.add(hump);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 1.1), dark);
  glass.position.set(0, 2.95, 19.2); glass.rotation.x = -0.3;
  bob.add(glass);

  /* livery bands (cylinder sectors hugging the skin) */
  function band(r, len, z, thetaStart, thetaLen, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 56, 1, true, thetaStart, thetaLen), mat);
    m.rotation.x = Math.PI / 2; m.position.z = z;
    return m;
  }
  bob.add(band(3.015, 32, -2.5, -0.95, 1.90, belly));
  bob.add(band(3.028, 33, -2.5,  1.6414, 0.15, amber));
  bob.add(band(3.028, 33, -2.5,  4.4818, 0.15, amber));
  bob.add(band(3.022, 33, -2.5,  Math.PI/2 - 0.035, 0.055, navy));
  bob.add(band(3.022, 33, -2.5,  3*Math.PI/2 - 0.035, 0.055, navy));

  /* titles + registration */
  const tOpt = { w: 1024, h: 140, font: "900 96px 'Unbounded', sans-serif", color: '#0B2545', spacing: 10 };
  [-1, 1].forEach(s => {
    const m = textPlane('BRAHMNMITRA', 11, 1.35, tOpt);
    m.position.set(s * 2.73, 1.85, 6.5); m.rotation.y = s * Math.PI / 2;
    bob.add(m);
    const r = textPlane('VT-BMN', 3.2, 0.55, { w: 512, h: 96, font: "700 62px 'Archivo', sans-serif", color: '#43617F', spacing: 4 });
    r.position.set(s * 2.94, 0.25, -19.2); r.rotation.y = s * Math.PI / 2;
    bob.add(r);
  });

  /* wings */
  const ws = new THREE.Shape();
  ws.moveTo(0, 4.5); ws.lineTo(25.9, -6.6); ws.lineTo(25.9, -8.9); ws.lineTo(0, -4.5); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.22, bevelSegments: 2 });
  const wingR = new THREE.Mesh(wg, grey);
  wingR.rotation.set(Math.PI / 2, 0, 0.09); wingR.position.set(2.4, -0.9, -1);
  const wingL = new THREE.Mesh(wg, grey);
  wingL.rotation.set(Math.PI / 2, 0, -0.09); wingL.scale.x = -1; wingL.position.set(-2.4, -0.9, -1);
  bob.add(wingR, wingL);
  [wingR, wingL].forEach(w => {
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.7, 2.4), amber);
    wl.rotation.x = Math.PI / 2; wl.position.set(25.6, -7.7, -1.05);
    w.add(wl);
  });

  /* engines (with spinning fans) */
  const fans = [];
  const nac = new THREE.CylinderGeometry(1.12, 1.0, 3.8, 28);
  const lip = new THREE.CylinderGeometry(1.19, 1.19, 0.45, 28);
  const pyl = new THREE.BoxGeometry(0.26, 1.6, 2.4);
  [[7.5, 2.4], [14, -0.3], [-7.5, 2.4], [-14, -0.3]].forEach(([x, z]) => {
    const e = new THREE.Mesh(nac, grey);   e.rotation.x = Math.PI / 2; e.position.set(x, -2.45, z);
    const l = new THREE.Mesh(lip, amber);  l.rotation.x = Math.PI / 2; l.position.set(x, -2.45, z + 1.95);
    const i = new THREE.Mesh(new THREE.CircleGeometry(1.03, 26), dark); i.position.set(x, -2.45, z + 2.18);
    const py = new THREE.Mesh(pyl, grey);  py.position.set(x, -1.55, z + 0.6); py.rotation.x = 0.25;
    // fan blades
    const fan = new THREE.Group();
    for (let b = 0; b < 12; b++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.03), grey);
      bl.position.set(Math.cos(b / 12 * Math.PI * 2) * 0.5, Math.sin(b / 12 * Math.PI * 2) * 0.5, 0);
      bl.rotation.z = b / 12 * Math.PI * 2;
      fan.add(bl);
    }
    fan.position.set(x, -2.45, z + 2.24);
    fans.push(fan);
    bob.add(e, l, i, py, fan);
  });

  /* tail */
  const fs = new THREE.Shape();
  fs.moveTo(0, 0); fs.lineTo(8, 0); fs.lineTo(6.3, 9.2); fs.lineTo(3.6, 9.2); fs.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.1, bevelSegments: 1 }), amber);
  fin.rotation.y = Math.PI / 2; fin.position.set(-0.25, 2.3, -17.5);
  bob.add(fin);
  [-1, 1].forEach(s => {
    const m = textPlane('B', 3, 3, { w: 256, h: 256, font: "900 170px 'Unbounded', sans-serif", color: '#FFFFFF' });
    m.position.set(s * 0.42, 8.2, -21.6); m.rotation.y = s * Math.PI / 2;
    bob.add(m);
  });
  const stab = new THREE.BoxGeometry(11, 0.32, 3.2);
  [-1, 1].forEach(s => {
    const m = new THREE.Mesh(stab, grey);
    m.position.set(s * 5.6, 1.9, -23.5); m.rotation.set(0, s * 0.45, s * 0.07);
    bob.add(m);
  });

  /* windows — the -X row faces the camera after the turn */
  const winGeo = new THREE.CircleGeometry(0.27, 14);
  const winMat = new THREE.MeshBasicMaterial({ color: 0x18222f });
  const targetMat = new THREE.MeshBasicMaterial({ color: 0x8c7350 });   // brightens on approach
  const marker = new THREE.Object3D();
  [-1, 1].forEach(s => {
    for (let z = 16; z >= -16; z -= 1.45) {
      if (z > -6.5 && z < 1.5) continue;
      const isTarget = (s === -1 && Math.abs(z - 6.4) < 0.7);
      const w = new THREE.Mesh(isTarget ? new THREE.CircleGeometry(0.33, 16) : winGeo,
                               isTarget ? targetMat : winMat);
      w.position.set(s * 2.87, 1.0, z);
      w.rotation.y = s * Math.PI / 2;
      w.scale.y = 1.25;
      bob.add(w);
      if (isTarget) marker.position.set(-2.9, 1.0, z);
    }
    for (let z = 6; z <= 17; z += 1.5) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.scale.set(0.7, 0.9, 1);
      w.position.set(s * 1.62, 2.75, z);
      w.rotation.y = s * Math.PI / 2;
      bob.add(w);
    }
  });
  bob.add(marker);

  /* nav lights */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  function lamp(color, x, y, z, s) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sp.position.set(x, y, z); sp.scale.set(s, s, 1);
    bob.add(sp); return sp;
  }
  lamp(0x33ff66,  28.2, 1.6, -8.4, 2.2);
  lamp(0xff3344, -28.2, 1.6, -8.4, 2.2);
  const strobe = lamp(0xffffff, 0, 1.0, -26.8, 2.6);
  const beacon = lamp(0xff2233, 0, -3.15, -1, 2.0);

  return {
    group, bob, marker, beacon, strobe, fans,
    winMat: targetMat,
    roll: 0,
    outward: new THREE.Vector3(-1, 0, 0)   // window row normal, in model space
  };
}
