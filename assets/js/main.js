"use strict";
// BrahmnMitra — 3D Aviation Cinematic Engine

// Math helpers
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
const smoother = (t) => {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const seg = (x, a, b, easeFn) => (easeFn || smooth)((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const webglOK = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
})();

if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

// Fallback for reduced motion or unavailable WebGL
if (reduce || !webglOK || typeof THREE === "undefined") {
  document.body.classList.add("no-cinema");
} else {
  initCinema();
}

// Initialize modules
if (window.BM) {
  BM.initNavigation();
  BM.initReveals();
  BM.initCounters();
  BM.initTimeline();
  BM.initForm();
  if (BM.initTravelDiscovery) BM.initTravelDiscovery();
}

// Cinematic 3D engine
function initCinema() {
  const stage = document.querySelector(".stage");
  const canvas = document.getElementById("sky-canvas");
  const cinema = document.getElementById("cinema");
  const reveal = document.getElementById("reveal");
  const frame = document.querySelector(".window-frame");
  const heroEl = document.querySelector(".hero-copy");
  const hintEl = document.querySelector(".scroll-hint");
  const skipEl = document.querySelector(".skip-intro");
  const dayEl = document.querySelector(".bg-day");
  const sunEl = document.querySelector(".sun");
  const innerEl = document.querySelector(".reveal-inner");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  if (renderer.outputEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  if (renderer.toneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c192e, 0.0018);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3500);
  const CAM_HOME = new THREE.Vector3(0, 3.2, 58);
  camera.position.copy(CAM_HOME);

  // Lighting
  const ambient = new THREE.AmbientLight(0x384c70, 1.4);
  const sunLight = new THREE.DirectionalLight(0xffeedd, 2.2);
  sunLight.position.set(70, 85, 60);
  
  const rimLight = new THREE.DirectionalLight(0x78a8ff, 1.6);
  rimLight.position.set(-60, -20, -50);
  
  const hemi = new THREE.HemisphereLight(0xcde2ff, 0x5a7090, 0.6);
  scene.add(ambient, sunLight, rimLight, hemi);

  const NIGHT_AMB = new THREE.Color(0x384c70),
    DAY_AMB = new THREE.Color(0xd2e4f6);
  const NIGHT_SUN = new THREE.Color(0xffd5a0),
    DAY_SUN = new THREE.Color(0xfff5ea);
  const NIGHT_FOG = new THREE.Color(0x0c192e),
    DAY_FOG = new THREE.Color(0xdcebf8);

  // Starfield
  const STAR_COUNT = 1400;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 400 + Math.random() * 600;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.8 - 25;
    starPositions[i * 3 + 2] = -Math.abs(r * Math.sin(ph) * Math.sin(th)) + 50;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe8f2ff,
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Cloud decks
  const cloudTex = [0, 1, 2, 3].map(makeCloudTexture);
  const clouds = [];
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);

  function addCloud(x, y, z, w, opacity, drift) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex[(Math.random() * 4) | 0],
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(w, w * 0.42, 1);
    s.position.set(x, y, z);
    s.userData = {
      peak: opacity,
      drift,
      spin: (Math.random() - 0.5) * 0.015,
    };
    clouds.push(s);
    cloudGroup.add(s);
  }

  for (let i = 0; i < 16; i++) {
    addCloud(
      (Math.random() - 0.5) * 900,
      -28 - Math.random() * 45,
      -650 + Math.random() * 260,
      240 + Math.random() * 260,
      0.75,
      0.008 + Math.random() * 0.012,
    );
  }
  for (let i = 0; i < 12; i++) {
    addCloud(
      (Math.random() - 0.5) * 600,
      -14 - Math.random() * 35,
      -380 + Math.random() * 240,
      160 + Math.random() * 180,
      0.82,
      0.018 + Math.random() * 0.024,
    );
  }
  addCloud(-110, -16, 25, 360, 0.42, 0.08);
  addCloud(130, -22, 10, 320, 0.38, 0.09);
  addCloud(-50, 26, -30, 280, 0.3, 0.06);

  // Procedural 3D aircraft
  const glowTexture = makeGlowTexture();
  const P = buildPlane(glowTexture);
  scene.add(P.group);

  // Contrail particle ribbons
  const contrailGroup = new THREE.Group();
  scene.add(contrailGroup);
  const contrailMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xf0f7ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const contrailLeft = new THREE.Sprite(contrailMat.clone());
  const contrailRight = new THREE.Sprite(contrailMat.clone());
  contrailLeft.scale.set(7.5, 1.4, 1);
  contrailRight.scale.set(7.5, 1.4, 1);
  contrailGroup.add(contrailLeft, contrailRight);

  // Flight trajectory waypoints & Catmull-Rom spline
  const FLIGHT_WAYPOINTS = [
    new THREE.Vector3(0, 0.8, 4),
    new THREE.Vector3(-4.5, 1.8, -12),
    new THREE.Vector3(-14, 3.8, -55),
    new THREE.Vector3(-18, 4.5, -115),
    new THREE.Vector3(-14, 3.2, -60),
    new THREE.Vector3(-7.2, 1.2, -14),
    new THREE.Vector3(-3.2, 0, 10),
  ];
  const flightCurve = new THREE.CatmullRomCurve3(FLIGHT_WAYPOINTS, false, "centripetal");

  const posSample = new THREE.Vector3();
  const tanSample = new THREE.Vector3();
  const probePos = new THREE.Vector3();

  function sampleFlightState(t, outPos) {
    t = clamp01(t);
    flightCurve.getPoint(t, outPos);
    flightCurve.getTangent(t, tanSample).normalize();
    const yaw = THREE.MathUtils.lerp(-0.42, Math.PI / 2, smoother(t));
    return yaw;
  }

  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  sampleFlightState(0, P.group.position);
  euler.set(-0.03, -0.42, -0.06);
  P.group.quaternion.setFromEuler(euler);

  // Camera rig
  const wpos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const outWorld = new THREE.Vector3();
  const HOME_LOOK = new THREE.Vector3(0, 1.2, 0);

  // Mouse parallax tracker
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  window.addEventListener(
    "mousemove",
    (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  // Damped scroll
  let raw = 0, p = 0;
  const SMOOTH_RATE = 0.0000001;

  function readScroll() {
    const r = cinema.getBoundingClientRect();
    const total = cinema.offsetHeight - window.innerHeight;
    raw = clamp01(total > 0 ? -r.top / total : 0);
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();
  p = raw;

  // Stage timing keyframes
  const T = {
    heroOut: [0.00, 0.20],
    dayIn: [0.05, 0.45],
    planeIn: [0.00, 0.68],
    windowIn: [0.62, 0.88],
    frameGrow: [0.76, 0.90],
    framePass: [0.89, 0.96],
    cabinOpen: [0.82, 0.95],
    copyIn: [0.90, 1.00],
  };

  // Render loop
  let W = 0, H = 0, fov = 50;
  const clock = new THREE.Clock();

  function update() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    p += (raw - p) * (1 - Math.pow(SMOOTH_RATE, dt));
    if (Math.abs(raw - p) < 0.00015) p = raw;

    mouseX += (targetMouseX - mouseX) * (1 - Math.pow(0.001, dt));
    mouseY += (targetMouseY - mouseY) * (1 - Math.pow(0.001, dt));

    // Act I: Hero copy & hint
    const hOut = seg(p, T.heroOut[0], T.heroOut[1], smoother);
    heroEl.style.opacity = String(1 - hOut);
    heroEl.style.transform = `scale(${1 - 0.18 * hOut}) translateY(${-36 * hOut}px) translateZ(0)`;
    heroEl.style.filter = `blur(${10 * hOut}px)`;
    hintEl.style.opacity = String(1 - clamp01(p / 0.08));
    if (skipEl) skipEl.classList.toggle("gone", p > 0.32);

    // Atmosphere transition
    const day = seg(p, T.dayIn[0], T.dayIn[1], smoother);
    dayEl.style.opacity = String(day);
    sunEl.style.opacity = String(day * 0.98);
    starMat.opacity = Math.max(0, 0.95 - day * 1.6);

    ambient.color.copy(NIGHT_AMB).lerp(DAY_AMB, day);
    ambient.intensity = lerp(1.4, 1.85, day);
    sunLight.color.copy(NIGHT_SUN).lerp(DAY_SUN, day);
    sunLight.intensity = lerp(2.2, 3.2, day);
    hemi.intensity = lerp(0.6, 1.4, day);

    scene.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, day);
    scene.fog.density = lerp(0.0018, 0.0004, smoother(seg(p, 0.10, 0.65)));
    for (const c of clouds) {
      c.material.opacity = (0.25 + 0.75 * day) * c.userData.peak;
    }

    // Act II: Spline flight & aerodynamic banking
    const fly = seg(p, T.planeIn[0], T.planeIn[1], smoother);
    {
      const yaw = sampleFlightState(fly, P.group.position);
      const flyAhead = Math.min(1, fly + 0.035);
      flightCurve.getPoint(flyAhead, probePos);
      const yawAhead = THREE.MathUtils.lerp(-0.42, Math.PI / 2, smoother(flyAhead));

      const turnRate = -(yawAhead - yaw) * 9.5;
      const targetRoll = THREE.MathUtils.clamp(turnRate - 0.06 * (1 - fly), -0.62, 0.62);
      P.roll += (targetRoll - P.roll) * (1 - Math.pow(0.004, dt));

      const pitch =
        lerp(-0.04, 0.008, smooth(fly)) + mouseY * 0.035 * (1 - fly);

      const mouseYaw = mouseX * 0.05 * (1 - fly);
      const mouseRoll = -mouseX * 0.08 * (1 - fly);
      euler.set(pitch, yaw + mouseYaw, P.roll + mouseRoll);
      P.group.quaternion.setFromEuler(euler);
    }

    P.bob.position.y = Math.sin(t * 1.4) * 0.22;
    P.bob.position.x = Math.cos(t * 0.9) * 0.12;
    P.bob.rotation.z = Math.sin(t * 0.95) * 0.008;
    P.bob.rotation.x = Math.sin(t * 1.1) * 0.005;

    // Beacons & strobes
    const beaconPulse = Math.pow(Math.max(0, Math.sin(t * 3.2)), 12);
    P.beaconTop.material.opacity = 0.2 + 0.8 * beaconPulse;
    P.beaconBelly.material.opacity = 0.2 + 0.8 * beaconPulse;

    const strobeTime = (t * 1.2) % 1.0;
    const isStrobe = (strobeTime < 0.06) || (strobeTime > 0.14 && strobeTime < 0.20);
    P.strobeLeft.material.opacity = isStrobe ? 1.0 : 0.05;
    P.strobeRight.material.opacity = isStrobe ? 1.0 : 0.05;
    if (P.strobeTail) P.strobeTail.material.opacity = isStrobe ? 1.0 : 0.05;

    for (const f of P.fans) f.rotation.z += dt * 28;

    const contrailOpacity =
      THREE.MathUtils.clamp(Math.abs(P.roll) * 2.2 + 0.15 * fly, 0, 0.75) *
      (1 - seg(p, 0.65, 0.88));
    contrailLeft.material.opacity = contrailOpacity;
    contrailRight.material.opacity = contrailOpacity;
    if (contrailOpacity > 0.01) {
      contrailLeft.position
        .set(-27.2, -0.6, -11)
        .applyQuaternion(P.group.quaternion)
        .add(P.group.position);
      contrailRight.position
        .set(27.2, -0.6, -11)
        .applyQuaternion(P.group.quaternion)
        .add(P.group.position);
    }

    for (const c of clouds) {
      c.position.x += c.userData.drift * dt * 60;
      if (c.position.x > 520) c.position.x = -520;
    }
    stars.rotation.y += dt * 0.0025;

    // Act III: Reciprocal dolly into cabin window
    const win = seg(p, T.windowIn[0], T.windowIn[1], smoother);
    P.marker.getWorldPosition(wpos);

    outWorld.copy(P.outward).applyQuaternion(P.group.quaternion).normalize();
    camTarget.copy(wpos).addScaledVector(outWorld, 8.8);
    camTarget.y += 0.28;

    const homeWithParallax = CAM_HOME.clone();
    homeWithParallax.x += mouseX * 2.8 * (1 - win);
    homeWithParallax.y += -mouseY * 1.8 * (1 - win);

    const dHome = homeWithParallax.distanceTo(wpos);
    const dNear = camTarget.distanceTo(wpos);
    let wr = win;
    if (win > 0 && win < 1 && dHome > dNear + 0.001) {
      const dWant = 1 / lerp(1 / dHome, 1 / dNear, win);
      wr = clamp01((dHome - dWant) / (dHome - dNear));
    }

    camera.position.lerpVectors(homeWithParallax, camTarget, wr);
    camLook.lerpVectors(HOME_LOOK, wpos, wr);
    camera.lookAt(camLook);
    fov = lerp(baseFov(), baseFov() - 14, wr);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    P.winMat.color.setRGB(
      lerp(0.65, 1.0, win),
      lerp(0.52, 0.95, win),
      lerp(0.32, 0.85, win),
    );

    // Window frame bezel & pass-through
    const fg = seg(p, T.frameGrow[0], T.frameGrow[1], smoother);
    const fp = seg(p, T.framePass[0], T.framePass[1], smoother);
    if (fg > 0) {
      const scale = lerp(0.55, 1.0, fg) * (1 + 8.0 * fp);
      frame.style.opacity = String(Math.min(1, fg * 2.4) * (1 - fp));
      frame.style.transform = `translateZ(0) scale(${scale})`;
    } else {
      frame.style.opacity = "0";
    }

    const handoff = seg(p, T.framePass[0], T.framePass[1], smoother);
    canvas.style.opacity = String(1 - handoff);

    // Cabin aperture expansion
    const co = seg(p, T.cabinOpen[0], T.cabinOpen[1], smoother);
    const vh = H, vw = W;
    const isPortrait = vw / vh < 0.85;
    const fW = isPortrait ? 0.28 * vw : 0.20 * vh;
    const fH = isPortrait ? 0.36 * vh : 0.32 * vh;
    const padX = Math.max(0, (vw - fW) / 2);
    const padY = Math.max(0, (vh - fH) / 2);
    const pX = padX * (1 - co);
    const pY = padY * (1 - co);
    const rad = (isPortrait ? 90 : 76) * (1 - co);

    reveal.style.clipPath = `inset(${pY}px ${pX}px ${pY}px ${pX}px round ${rad}px)`;
    reveal.style.opacity = String(co > 0.01 ? 1 : 0);

    // Act IV: Welcome copy reveal
    const ci = seg(p, T.copyIn[0], T.copyIn[1], smoother);
    innerEl.style.opacity = String(ci);
    innerEl.style.transform = `translateY(${lerp(38, 0, ci)}px) translateZ(0)`;

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  function baseFov() {
    return window.innerWidth / window.innerHeight < 0.85 ? 60 : 50;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.fov = baseFov();
    camera.updateProjectionMatrix();
    readScroll();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(update);
}

// Cloud texture generator
function makeCloudTexture(seed) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  const rng = (function (s) {
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })(seed * 997 + 13);

  for (let i = 0; i < 45; i++) {
    const x = 256 + (rng() - 0.5) * 330;
    const y = 135 + (rng() - 0.5) * 95;
    const r = 48 + rng() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,0.26)");
    gr.addColorStop(0.5, "rgba(240,248,255,0.14)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = true;
  return tex;
}

/* ================= glow particle texture ================= */
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.3, "rgba(255,235,190,0.85)");
  gr.addColorStop(0.7, "rgba(255,190,120,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Text on fuselage texture helper
function drawTextOnCanvas(c, text, w, h, opt) {
  const g = c.getContext("2d");
  g.clearRect(0, 0, w, h);
  g.font = opt.font || "700 68px 'Unbounded', sans-serif";
  g.fillStyle = opt.color || "#081C36";
  g.textBaseline = "middle";

  const spacing = opt.spacing || 0;
  const chars = text.split("");
  const widths = chars.map((ch) => g.measureText(ch).width);
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + (chars.length - 1) * spacing;

  let startX = (w - totalWidth) / 2;
  g.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    g.fillText(chars[i], startX, h / 2);
    startX += widths[i] + spacing;
  }
}

function textPlane(text, wWorld, hWorld, opt) {
  opt = opt || {};
  const w = opt.w || 2048,
    h = opt.h || 200;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  drawTextOnCanvas(c, text, w, h, opt);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  if (document.fonts) {
    if (document.fonts.load) {
      document.fonts.load(opt.font || "700 68px 'Unbounded'").then(() => {
        drawTextOnCanvas(c, text, w, h, opt);
        tex.needsUpdate = true;
      }).catch(() => {});
    }
    if (document.fonts.ready) {
      document.fonts.ready.then(() => {
        drawTextOnCanvas(c, text, w, h, opt);
        tex.needsUpdate = true;
      });
    }
  }

  return new THREE.Mesh(new THREE.PlaneGeometry(wWorld, hWorld), mat);
}

// Build 3D aircraft model
function buildPlane(glowTex) {
  const glow = glowTex || makeGlowTexture();
  const group = new THREE.Group();
  const bob = new THREE.Group();
  group.add(bob);

  // Materials
  const whiteLacquer = new THREE.MeshStandardMaterial({
    color: 0xfcfdff,
    metalness: 0.12,
    roughness: 0.15,
  });
  const bellyTitanium = new THREE.MeshStandardMaterial({
    color: 0xb5c5d6,
    metalness: 0.52,
    roughness: 0.24,
  });
  const wingGrey = new THREE.MeshStandardMaterial({
    color: 0xdde6f0,
    metalness: 0.32,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });
  const amberGold = new THREE.MeshStandardMaterial({
    color: 0xffb84d,
    metalness: 0.78,
    roughness: 0.18,
  });
  const navyCheatline = new THREE.MeshStandardMaterial({
    color: 0x092244,
    metalness: 0.25,
    roughness: 0.3,
  });
  const cockpitGlass = new THREE.MeshStandardMaterial({
    color: 0x07111e,
    metalness: 0.96,
    roughness: 0.04,
  });
  const engineChrome = new THREE.MeshStandardMaterial({
    color: 0xe8eef5,
    metalness: 0.88,
    roughness: 0.12,
  });
  const turbineDark = new THREE.MeshStandardMaterial({
    color: 0x12161f,
    metalness: 0.65,
    roughness: 0.35,
  });
  const exhaustCore = new THREE.MeshStandardMaterial({
    color: 0x221a14,
    emissive: 0xff6600,
    emissiveIntensity: 0.22,
    metalness: 0.8,
    roughness: 0.25,
  });

  // 1. Fuselage
  const prof = [
    [0.02, -28.0],
    [0.55, -27.4],
    [1.15, -26.4],
    [1.85, -25.0],
    [2.45, -23.0],
    [2.85, -20.8],
    [3.08, -18.2],
    [3.14, -14.0],
    [3.14, 12.0],
    [3.10, 15.0],
    [2.96, 17.8],
    [2.70, 20.4],
    [2.28, 22.8],
    [1.75, 24.8],
    [1.12, 26.2],
    [0.52, 27.2],
    [0.02, 27.8],
  ].map((v) => new THREE.Vector2(v[0], v[1]));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), whiteLacquer);
  fus.rotation.x = Math.PI / 2;
  bob.add(fus);

  // 2. Cockpit canopy
  const hump = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    whiteLacquer,
  );
  hump.scale.set(1.82, 1.56, 10.4);
  hump.position.set(0, 2.22, 10.8);
  bob.add(hump);

  const glassGeo = new THREE.CylinderGeometry(1.68, 1.95, 1.4, 24, 1, false, -1.2, 2.4);
  const glass = new THREE.Mesh(glassGeo, cockpitGlass);
  glass.rotation.x = 0.72;
  glass.position.set(0, 2.76, 19.8);
  bob.add(glass);

  const glassFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.25, 0.8),
    amberGold,
  );
  glassFrame.position.set(0, 2.82, 20.2);
  glassFrame.rotation.x = -0.38;
  bob.add(glassFrame);

  // 3. Livery bands
  function band(r, len, z, thetaStart, thetaLen, mat) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 80, 1, true, thetaStart, thetaLen),
      mat,
    );
    m.rotation.x = Math.PI / 2;
    m.position.z = z;
    return m;
  }
  bob.add(band(3.15, 34, -2.0, -0.92, 1.84, bellyTitanium));
  bob.add(band(3.165, 36, -2.0, 1.62, 0.14, amberGold));
  bob.add(band(3.165, 36, -2.0, 4.48, 0.14, amberGold));
  bob.add(
    band(3.158, 36, -2.0, Math.PI / 2 - 0.038, 0.06, navyCheatline),
  );
  bob.add(
    band(3.158, 36, -2.0, (3 * Math.PI) / 2 - 0.038, 0.06, navyCheatline),
  );

  // 4. Fuselage branding
  const tOpt = {
    w: 2048,
    h: 200,
    font: "700 70px 'Unbounded', sans-serif",
    color: "#081C36",
    spacing: 5,
  };
  [-1, 1].forEach((s) => {
    const m = textPlane("BRAHMNMITRA", 10.24, 1.0, tOpt);
    m.position.set(s * 2.98, 1.95, 6.2);
    m.rotation.y = (s * Math.PI) / 2;
    bob.add(m);

    const r = textPlane("VT-BMN", 3.2, 0.5, {
      w: 1024,
      h: 160,
      font: "700 60px 'Archivo', sans-serif",
      color: "#304D6D",
      spacing: 4,
    });
    r.position.set(s * 3.12, 0.28, -20.2);
    r.rotation.y = (s * Math.PI) / 2;
    bob.add(r);
  });

  // 5. Wings & winglets
  const ws = new THREE.Shape();
  ws.moveTo(0, 5.2);
  ws.lineTo(27.0, -6.5);
  ws.lineTo(27.0, -9.0);
  ws.lineTo(0, -4.6);
  ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.28,
    bevelSegments: 3,
  });

  const wingR = new THREE.Mesh(wg, wingGrey);
  wingR.rotation.set(Math.PI / 2, 0.06, 0.095);
  wingR.position.set(2.4, -0.85, -0.8);

  const wingL = new THREE.Mesh(wg, wingGrey);
  wingL.rotation.set(Math.PI / 2, -0.06, -0.095);
  wingL.scale.x = -1;
  wingL.position.set(-2.4, -0.85, -0.8);
  bob.add(wingR, wingL);

  const wlShape = new THREE.Shape();
  wlShape.moveTo(0, 0);
  wlShape.lineTo(-2.8, 0);
  wlShape.lineTo(-1.6, 3.2);
  wlShape.lineTo(-0.4, 3.2);
  wlShape.closePath();
  const wlGeo = new THREE.ExtrudeGeometry(wlShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });

  const wlR = new THREE.Mesh(wlGeo, amberGold);
  wlR.rotation.set(0, 0, -0.22);
  wlR.position.set(27.6, -0.6, -6.8);

  const wlL = new THREE.Mesh(wlGeo, amberGold);
  wlL.rotation.set(0, 0, 0.22);
  wlL.position.set(-27.6, -0.6, -6.8);
  bob.add(wlR, wlL);

  // 6. Turbofan engines
  const fans = [];
  const nac = new THREE.CylinderGeometry(1.18, 1.05, 4.2, 36);
  const lip = new THREE.CylinderGeometry(1.26, 1.26, 0.52, 36);
  const pyl = new THREE.BoxGeometry(0.3, 1.75, 2.8);

  [
    [7.8, 2.6],
    [14.6, -0.2],
    [-7.8, 2.6],
    [-14.6, -0.2],
  ].forEach(([x, z]) => {
    const e = new THREE.Mesh(nac, wingGrey);
    e.rotation.x = Math.PI / 2;
    e.position.set(x, -2.52, z);

    const l = new THREE.Mesh(lip, amberGold);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, -2.52, z + 2.15);

    const i = new THREE.Mesh(new THREE.CircleGeometry(1.08, 32), turbineDark);
    i.position.set(x, -2.52, z + 2.38);

    const ex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.88, 0.8, 24),
      exhaustCore,
    );
    ex.rotation.x = Math.PI / 2;
    ex.position.set(x, -2.52, z - 2.2);

    const py = new THREE.Mesh(pyl, bellyTitanium);
    py.position.set(x, -1.6, z + 0.7);
    py.rotation.x = 0.22;

    const fan = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.65, 18),
      amberGold,
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0, 0.18);
    fan.add(cone);

    for (let b = 0; b < 18; b++) {
      const bl = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.98, 0.04),
        turbineDark,
      );
      bl.position.set(
        Math.cos((b / 18) * Math.PI * 2) * 0.54,
        Math.sin((b / 18) * Math.PI * 2) * 0.54,
        0,
      );
      bl.rotation.z = (b / 18) * Math.PI * 2;
      bl.rotation.y = 0.28;
      fan.add(bl);
    }
    fan.position.set(x, -2.52, z + 2.42);
    fans.push(fan);

    bob.add(e, l, i, ex, py, fan);
  });

  // 7. Tailfin & stabilizers
  const fs = new THREE.Shape();
  fs.moveTo(0, 0);
  fs.lineTo(8.6, 0);
  fs.lineTo(6.8, 9.8);
  fs.lineTo(3.8, 9.8);
  fs.closePath();
  const fin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(fs, {
      depth: 0.56,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.12,
      bevelSegments: 2,
    }),
    amberGold,
  );
  fin.rotation.y = Math.PI / 2;
  fin.position.set(-0.28, 2.45, -18.4);
  bob.add(fin);

  [-1, 1].forEach((s) => {
    const m = textPlane("B", 3.4, 3.4, {
      w: 256,
      h: 256,
      font: "900 180px 'Unbounded', sans-serif",
      color: "#FFFFFF",
    });
    m.position.set(s * 0.48, 8.6, -22.8);
    m.rotation.y = (s * Math.PI) / 2;
    bob.add(m);
  });

  const stabShape = new THREE.Shape();
  stabShape.moveTo(0, 2.2);
  stabShape.lineTo(10.5, -2.8);
  stabShape.lineTo(10.5, -4.2);
  stabShape.lineTo(0, -2.2);
  stabShape.closePath();
  const stabGeo = new THREE.ExtrudeGeometry(stabShape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.12,
  });

  const stabR = new THREE.Mesh(stabGeo, wingGrey);
  stabR.rotation.set(Math.PI / 2, 0.05, 0.06);
  stabR.position.set(1.6, 1.85, -21.8);

  const stabL = new THREE.Mesh(stabGeo, wingGrey);
  stabL.rotation.set(Math.PI / 2, -0.05, -0.06);
  stabL.scale.x = -1;
  stabL.position.set(-1.6, 1.85, -21.8);
  bob.add(stabR, stabL);

  // 8. Passenger windows
  const winGeo = new THREE.CircleGeometry(0.3, 18);
  const winMat = new THREE.MeshBasicMaterial({ color: 0x162232 });
  const targetMat = new THREE.MeshBasicMaterial({ color: 0xa88a62 });
  const marker = new THREE.Object3D();

  [-1, 1].forEach((s) => {
    for (let z = 16.5; z >= -16.5; z -= 1.42) {
      if (z > -6.8 && z < 1.8) continue;
      const isTarget = s === -1 && Math.abs(z - 6.4) < 0.7;
      const w = new THREE.Mesh(
        isTarget ? new THREE.CircleGeometry(0.36, 20) : winGeo,
        isTarget ? targetMat : winMat,
      );
      w.position.set(s * 3.02, 1.05, z);
      w.rotation.y = (s * Math.PI) / 2;
      w.scale.y = 1.28;
      bob.add(w);
      if (isTarget) marker.position.set(-3.08, 1.05, z);
    }
    for (let z = 5.5; z <= 17.5; z += 1.48) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.scale.set(0.72, 0.92, 1);
      w.position.set(s * 1.72, 2.82, z);
      w.rotation.y = (s * Math.PI) / 2;
      bob.add(w);
    }
  });
  bob.add(marker);

  // 9. Aviation lights
  function lamp(color, x, y, z, s) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sp.position.set(x, y, z);
    sp.scale.set(s, s, 1);
    bob.add(sp);
    return sp;
  }

  const navGreen = lamp(0x22ff66, 28.6, 0.4, -7.5, 2.2);
  const navRed = lamp(0xff2244, -28.6, 0.4, -7.5, 2.2);

  const beaconTop = lamp(0xff1824, 0, 4.2, 4.0, 2.4);
  const beaconBelly = lamp(0xff1824, 0, -3.4, -0.8, 2.4);

  const strobeLeft = lamp(0xffffff, -28.6, 0.6, -7.8, 2.2);
  const strobeRight = lamp(0xffffff, 28.6, 0.6, -7.8, 2.2);
  const strobeTail = lamp(0xffffff, 0, 1.2, -27.6, 1.8);

  return {
    group,
    bob,
    marker,
    beaconTop,
    beaconBelly,
    strobeLeft,
    strobeRight,
    strobeTail,
    fans,
    winMat: targetMat,
    roll: 0,
    outward: new THREE.Vector3(-1, 0, 0),
  };
}
