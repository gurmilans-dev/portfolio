/*
 * scene.js — gated motion + spatial-3D enhancement layer.
 * Loads GSAP / ScrollTrigger (and Three.js for capable desktops) only when
 * motion is allowed and the device can afford it. Everything here is a pure
 * enhancement: the page is complete, readable, and correct without a single
 * byte of this file executing. Reduced motion short-circuits immediately.
 */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(hover: none), (pointer: coarse)");
  const VENDOR = "assets/vendor/";
  const PLATE_Z = { interface: 58, boundary: 30, core: 4 };

  function disarm() { root.classList.remove("scene-arm"); }

  function canRender3D() {
    if (reduceMotion.matches || innerWidth < 960 || coarse.matches) return false;
    if ((navigator.deviceMemory || 4) < 4 || (navigator.hardwareConcurrency || 4) < 4) return false;
    try {
      const c = document.createElement("canvas");
      return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  }

  const injected = new Map();
  function loadScript(src) {
    if (injected.has(src)) return injected.get(src);
    const promise = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = () => resolve(window);
      el.onerror = () => reject(new Error(`failed: ${src}`));
      document.head.appendChild(el);
    });
    injected.set(src, promise);
    return promise;
  }

  // Reduced motion: render nothing, reveal everything. CSS holds final states.
  if (reduceMotion.matches) { disarm(); root.classList.add("scene-static"); return; }

  // Failsafe: if enhancement never arrives, the armed (hidden) elements reveal.
  const armSafety = setTimeout(disarm, 2600);

  /* ---------- Hero boot choreography ---------- */
  function heroBoot(gsap) {
    const hero = document.querySelector("[data-operating-model]");
    if (!hero) { disarm(); return; }
    // The boot reveal is armed pre-paint only on desktop; on smaller screens the
    // hero renders statically to avoid a hide-then-reveal flash.
    if (innerWidth <= 768) { disarm(); return; }
    const plates = gsap.utils.toArray("[data-schematic] .plate");
    const spans = gsap.utils.toArray("[data-operating-model] h1 span");

    // Hand the armed initial states to GSAP via inline styles (which win over
    // the .scene-arm class), then disarm so nothing stays hidden on failure.
    gsap.set("[data-operating-model] .hero-system-status", { opacity: 0 });
    gsap.set(spans, { opacity: 0, yPercent: 42 });
    gsap.set("[data-schematic] .schematic-caption", { opacity: 0 });
    gsap.set(plates, { opacity: 0 });
    gsap.set("[data-operating-model] .hero-intro", { opacity: 0, y: 18 });
    disarm();

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to("[data-operating-model] .hero-system-status", { opacity: 1, duration: 0.45 })
      .to(spans, { opacity: 1, yPercent: 0, duration: 0.7, stagger: 0.08 }, "-=0.15")
      .to("[data-schematic] .schematic-caption", { opacity: 1, duration: 0.4 }, "-=0.45");
    plates.forEach((plate, i) => {
      const z = PLATE_Z[plate.dataset.plate] ?? 0;
      tl.fromTo(plate,
        { opacity: 0, z: z - 90, y: 34 },
        { opacity: 1, z, y: 0, duration: 0.85, ease: "power3.out" },
        0.55 + i * 0.13);
    });
    tl.to("[data-operating-model] .hero-intro", { opacity: 1, y: 0, duration: 0.6 }, 0.7);

    heroParallax(gsap);
  }

  // Pointer parallax: nudge the schematic's tilt toward the cursor (desktop).
  function heroParallax(gsap) {
    const stage = document.querySelector("[data-hero-stage]");
    const schematic = document.querySelector("[data-schematic]");
    if (!stage || !schematic || coarse.matches) return;
    const rotX = gsap.quickTo(schematic, "rotationX", { duration: 0.6, ease: "power2.out" });
    const rotY = gsap.quickTo(schematic, "rotationY", { duration: 0.6, ease: "power2.out" });
    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      rotX(15 - ny * 9);
      rotY(-21 + nx * 12);
    });
    stage.addEventListener("pointerleave", () => { rotX(15); rotY(-21); });
  }

  // As the hero scrolls away, the operating-model visual recedes into depth and dims, so
  // entering the content feels like stepping past the system rather than leaving a scene.
  function heroDepart(gsap) {
    const ST = window.ScrollTrigger;
    const hero = document.querySelector("[data-operating-model]");
    const stage = document.querySelector("[data-hero-stage]");
    if (!ST || !hero || !stage || coarse.matches || innerWidth <= 768) return;
    gsap.to(stage, {
      yPercent: -14, scale: 0.82, opacity: 0.12, ease: "none", transformOrigin: "50% 28%",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 }
    });
  }

  /* ---------- Three.js wireframe (ambient operating-model volume) ---------- */
  function heroWireframe(THREE, gsap) {
    const canvas = document.querySelector("[data-hero-canvas]");
    const stage = document.querySelector("[data-hero-stage]");
    if (!canvas || !stage) return;

    const css = getComputedStyle(root);
    const signal = new THREE.Color((css.getPropertyValue("--signal") || "#174bc4").trim() || "#174bc4");
    const faint = new THREE.Color((css.getPropertyValue("--line") || "#b7b2a7").trim() || "#b7b2a7");

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0.1, 1.5, 6.6);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    const W = 3.3, D = 2.1;
    const planeGeo = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2);
    const levels = [1.35, 0, -1.35];
    let coreMat;
    levels.forEach((y, i) => {
      const mat = new THREE.LineBasicMaterial({ color: i === 1 ? signal : faint, transparent: true, opacity: i === 1 ? 0.62 : 0.42 });
      if (i === 1) coreMat = mat;                                  // the relational core — flares as a signal arrives
      const plate = new THREE.LineSegments(new THREE.EdgesGeometry(planeGeo), mat);
      plate.position.y = y;
      group.add(plate);
    });
    // Module lattice on the core level.
    const lattice = new THREE.Group();
    const cols = 5, rows = 3;
    for (let c = 1; c < cols; c++) {
      const x = -W / 2 + (W / cols) * c;
      lattice.add(lineSeg(THREE, faint, [x, 0, -D / 2], [x, 0, D / 2], 0.32));
    }
    for (let r = 1; r < rows; r++) {
      const z = -D / 2 + (D / rows) * r;
      lattice.add(lineSeg(THREE, faint, [-W / 2, 0, z], [W / 2, 0, z], 0.32));
    }
    group.add(lattice);
    // Vertical connectors between level centres.
    group.add(lineSeg(THREE, signal, [0, levels[0], 0], [0, levels[2], 0], 0.55));
    // A drifting node above the stack (the "request" entering the system).
    const node = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.34, 0.34)), new THREE.LineBasicMaterial({ color: signal, transparent: true, opacity: 0.8 }));
    node.position.set(0, 1.72, 0);                                 // the input sitting at the top of the stack
    group.add(node);
    // A signal packet flows down the spine through the layers, then rests — the diegetic
    // "operation running through the system". One at a time, slow, with a pause between.
    const packet = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.26, 0.26, 0.26)), new THREE.LineBasicMaterial({ color: signal, transparent: true, opacity: 0 }));
    group.add(packet);
    // A ring that bursts out of the core when the packet arrives — the visible "result".
    const ringPts = [];
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: signal, transparent: true, opacity: 0 }));
    group.add(ring);

    group.rotation.y = -0.5;
    scene.add(group);

    function lineSeg(T, color, a, b, opacity) {
      const g = new T.BufferGeometry().setFromPoints([new T.Vector3(...a), new T.Vector3(...b)]);
      return new T.LineSegments(g, new T.LineBasicMaterial({ color, transparent: true, opacity }));
    }

    function resize() {
      const w = canvas.clientWidth || stage.clientWidth;
      const h = canvas.clientHeight || stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener("resize", resize, { passive: true });

    // Pointer drift target.
    let pointerX = 0, pointerY = 0, curX = 0, curY = 0;
    if (!coarse.matches) {
      stage.addEventListener("pointermove", (e) => {
        const rect = stage.getBoundingClientRect();
        pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
        pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
      });
      stage.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0; });
    }

    let visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(stage);
    }

    let lit = false, coreFlare = 0;
    function tick() {
      if (!visible) return;
      const t = gsap.ticker.time;
      group.rotation.y += 0.0016;
      curX += (pointerY - curX) * 0.05;
      curY += (pointerX - curY) * 0.05;
      group.rotation.x = -0.12 + curX;
      group.position.x = curY * 1.2;
      node.position.y = 1.72 + Math.sin(t * 0.9) * 0.07;
      // One signal packet travels the spine (input -> runtime) over ~3.5s, then rests
      // ~4s; the relational core flares as the packet crosses it.
      const cycle = 7.5, ph = (t % cycle) / cycle;
      let flareTarget = 0;
      if (ph < 0.46) {
        const dp = ph / 0.46;
        packet.position.y = 1.5 - dp * 3.0;
        packet.material.opacity = Math.sin(dp * Math.PI) * 0.95;
        packet.rotation.x += 0.05; packet.rotation.y += 0.045;
        flareTarget = Math.max(0, 1 - Math.abs(packet.position.y) / 0.55);
      } else {
        packet.material.opacity *= 0.82;
      }
      coreFlare += (flareTarget - coreFlare) * 0.2;
      coreMat.opacity = 0.55 + coreFlare * 0.42;
      // ring bursts out of the core just after the packet passes through it
      if (ph > 0.23 && ph < 0.42) {
        const bp = (ph - 0.23) / 0.19;
        ring.scale.setScalar(0.2 + bp * 1.35);
        ring.material.opacity = (1 - bp) * 0.7;
      } else if (ring.material.opacity > 0.001) {
        ring.material.opacity *= 0.8;
      }
      renderer.render(scene, camera);
      if (!lit) { lit = true; canvas.classList.add("is-live"); }
    }
    gsap.ticker.add(tick);
  }

  /* ---------- Work · pinned horizontal rail ---------- */
  // The three featured projects ride a horizontal track while the section is pinned:
  // the page keeps its reading order (plain vertical stack without JS, on coarse
  // pointers, short viewports, or reduced motion), but capable desktops browse the
  // work like a filmstrip with a HUD readout instead of three stacked screens.
  function workRail(gsap) {
    const ST = window.ScrollTrigger;
    const stage = document.querySelector("[data-rail-stage]");
    const track = document.querySelector("[data-work-track]");
    if (!ST || !stage || !track) return false;
    if (coarse.matches || innerWidth < 1100 || innerHeight < 740) return false;
    const slides = Array.from(track.children);
    if (slides.length < 2) return false;
    root.classList.add("work-rail-active");

    const viewport = track.parentElement;
    const hudIndex = stage.querySelector("[data-rail-index]");
    const hudName = stage.querySelector("[data-rail-name]");
    const hudBar = stage.querySelector("[data-rail-bar]");
    const names = slides.map((slide) => slide.querySelector("h3")?.textContent.trim() ?? "");
    const headerOffset = () => document.querySelector(".site-header")?.offsetHeight ?? 76;
    const distance = () => Math.max(1, track.scrollWidth - viewport.clientWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: stage,
        pin: true,
        anticipatePin: 1,
        scrub: 0.85,
        start: () => `top ${headerOffset()}px`,
        end: () => `+=${distance()}`,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / (slides.length - 1), duration: { min: 0.18, max: 0.45 }, ease: "power2.out", delay: 0.05 },
        onUpdate(self) {
          const index = Math.round(self.progress * (slides.length - 1));
          if (hudIndex) hudIndex.textContent = String(index + 1).padStart(2, "0");
          if (hudName) hudName.textContent = names[index];
          if (hudBar) hudBar.style.setProperty("--rail-progress", self.progress.toFixed(4));
        }
      }
    });

    // Keyboard support: tabbing into a slide drives the page to that slide's
    // scroll position so focus is never trapped off-screen inside the track.
    track.addEventListener("focusin", (event) => {
      const slide = event.target.closest("[data-work-track] > *");
      const index = slides.indexOf(slide);
      const trigger = tween.scrollTrigger;
      if (index < 0 || !trigger) return;
      window.scrollTo(0, trigger.start + (trigger.end - trigger.start) * (index / (slides.length - 1)));
    });
    return true;
  }

  /* ---------- Page-wide parallax depth on scroll ---------- */
  // Decorative section markers float at a shallower depth than the body text, so the whole
  // page reads as spatial while you scroll — continuous, quiet, and never moves what you read.
  function scrollDepth(gsap, railActive) {
    const ST = window.ScrollTrigger;
    if (!ST || coarse.matches || innerWidth <= 900) return;
    gsap.utils.toArray(".section").forEach((section) => {
      // The pinned work rail manages its own heading; floating it would drift while pinned.
      if (railActive && section.classList.contains("section-work")) return;
      const num = section.querySelector(".section-number");
      const eyebrow = section.querySelector(".section-heading .eyebrow");
      const heading = section.querySelector(".section-heading h2");
      const floatY = (el, amount) => el && gsap.fromTo(el, { y: amount }, {
        y: -amount, ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.5 }
      });
      floatY(num, 86);          // big decorative marker — clearly floats at the front
      floatY(eyebrow, 48);
      floatY(heading, 22);      // headline drifts gently behind it — readable depth
    });
  }


  /* ---------- Work · spatial scroll choreography ---------- */
  function workMotion(gsap, railActive) {
    const ST = window.ScrollTrigger;
    if (!ST) return;
    // Project media drifts against the scroll — parallax depth. Skipped when the rail
    // owns the work section: vertical drift inside a horizontal track reads as jitter.
    if (!railActive) {
      gsap.utils.toArray(".section-work .project-media").forEach((media) => {
        gsap.fromTo(media, { y: 28 }, {
          y: -28, ease: "none",
          scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: true }
        });
      });
    }
    // Technical-index rows rise into place with a light stagger.
    const entries = gsap.utils.toArray("[data-archive-index] .archive-entry");
    if (entries.length) {
      gsap.from(entries, {
        y: 18, opacity: 0, duration: 0.55, ease: "power3.out", stagger: 0.07,
        scrollTrigger: { trigger: "[data-archive-index]", start: "top 82%" }
      });
    }
  }

  /* ---------- boot ---------- */
  async function boot() {
    // Nothing to choreograph on this page (e.g. case studies): skip the libraries.
    if (!document.querySelector("[data-operating-model]") && !document.querySelector(".section-work")) { disarm(); return; }
    try {
      await loadScript(`${VENDOR}gsap.min.js`);
      await loadScript(`${VENDOR}ScrollTrigger.min.js`);
      const gsap = window.gsap;
      if (!gsap || !window.ScrollTrigger) { disarm(); return; }
      gsap.registerPlugin(window.ScrollTrigger);
      clearTimeout(armSafety);
      root.classList.add("scene-ready");
      window.__sceneGsap = gsap;
      heroBoot(gsap);
      const railActive = workRail(gsap);
      workMotion(gsap, railActive);
      heroDepart(gsap);
      scrollDepth(gsap, railActive);
      if (canRender3D()) {
        loadScript(`${VENDOR}three.min.js`)
          .then(() => { if (window.THREE) heroWireframe(window.THREE, gsap); })
          .catch(() => {});
      }
    } catch { disarm(); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
