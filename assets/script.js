/*
 * script.js — shared progressive enhancement for every page.
 * Each page is complete and readable without this file. Everything here either
 * improves navigation, adds feedback, or runs the contact form and lightbox.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js"); // normally already set in <head>; nav-ready is set below, once the menu works
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const desktopQuery = matchMedia("(min-width: 1100px)");

  /* ---------- Scroll lock shared with workbench.js ---------- */
  let lockCount = 0;
  const Site = window.Site = {
    lockScroll() { lockCount += 1; root.classList.add("is-locked"); },
    unlockScroll() { lockCount = Math.max(0, lockCount - 1); if (!lockCount) root.classList.remove("is-locked"); },
    reduceMotion: () => motionQuery.matches,
    closeMenu: () => {}
  };

  /* ---------- Colour theme ----------
     The inline script in every page's <head> applies the saved or system theme
     before first paint. This wires the header switch, stores an explicit choice,
     and keeps following the system setting until the visitor makes one. */
  const THEME_KEY = "portfolio-theme";
  const THEME_COLORS = { dark: "#0c0d0f", light: "#f4f4f1" };
  const lightQuery = matchMedia("(prefers-color-scheme: light)");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeSwitch = document.querySelector("[data-theme-switch]");
  const themeButtons = [...(themeSwitch?.querySelectorAll("[data-theme-choice]") ?? [])];
  const isTheme = value => value === "light" || value === "dark";
  const savedTheme = () => { try { const value = localStorage.getItem(THEME_KEY); return isTheme(value) ? value : null; } catch { return null; } };
  const systemTheme = () => (lightQuery.matches ? "light" : "dark");

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (themeMeta) themeMeta.content = THEME_COLORS[theme];
    themeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme)));
  }
  function switchTheme(theme) {
    if (theme === root.dataset.theme) return;
    const swap = () => {
      root.classList.add("theme-switching");
      applyTheme(theme);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
    };
    if (document.startViewTransition && !motionQuery.matches) document.startViewTransition(swap);
    else swap();
  }
  applyTheme(isTheme(root.dataset.theme) ? root.dataset.theme : savedTheme() || systemTheme());
  if (themeSwitch) themeSwitch.hidden = false;
  themeButtons.forEach(button => button.addEventListener("click", () => {
    const theme = button.dataset.themeChoice;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* the choice still applies to this page */ }
    switchTheme(theme);
  }));
  lightQuery.addEventListener?.("change", () => { if (!savedTheme()) switchTheme(systemTheme()); });
  addEventListener("storage", event => { if (event.key === THEME_KEY) switchTheme(savedTheme() || systemTheme()); });

  /* ---------- Navigation sheet (small screens) ---------- */
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const navFocusables = [...(nav?.querySelectorAll("a, button") ?? [])];
  const sheetQuery = matchMedia("(max-width: 819px)");

  function setMenu(open, { returnFocus = false } = {}) {
    if (!menuToggle || !nav) return;
    const wasOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (open === wasOpen) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Menu";
    nav.classList.toggle("is-open", open);
    if (open) { Site.lockScroll(); navFocusables[0]?.focus(); }
    else { Site.unlockScroll(); if (returnFocus) menuToggle.focus(); }
  }
  Site.closeMenu = () => setMenu(false);
  menuToggle?.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
  nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", event => {
    if (menuToggle?.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") { setMenu(false, { returnFocus: true }); return; }
    if (event.key !== "Tab") return;
    // Cycle explicitly: the toggle follows the sheet in the DOM, so native order
    // would leave the sheet in both directions.
    const focusables = [menuToggle, ...navFocusables];
    const index = focusables.indexOf(document.activeElement);
    const next = index === -1 ? 0 : (index + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    event.preventDefault();
    focusables[next].focus();
  });
  sheetQuery.addEventListener?.("change", event => { if (!event.matches) setMenu(false); });
  // Only now can the toggle open the sheet, so only now may the sheet hide the links.
  if (menuToggle && nav) root.classList.add("nav-ready");
  root.classList.remove("nav-pending");

  /* ---------- Header state, scroll progress ---------- */
  const progress = document.querySelector("[data-scroll-progress]");
  const progressBar = progress?.querySelector("span");
  let scrollFrame = 0;
  function onScrollFrame() {
    scrollFrame = 0;
    header?.classList.toggle("is-scrolled", scrollY > 8);
    if (!progressBar) return;
    const max = Math.max(0, root.scrollHeight - innerHeight);
    const value = max <= 2 ? 0 : Math.min(1, Math.max(0, scrollY / max));
    progressBar.style.setProperty("--scroll-progress", value.toFixed(4));
  }
  const queueScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(onScrollFrame); };
  addEventListener("scroll", queueScroll, { passive: true });
  addEventListener("resize", queueScroll, { passive: true });
  queueScroll();

  /* ---------- Section awareness: homepage nav + HUD, case-study contents ---------- */
  const hud = document.querySelector("[data-hud]");
  const HUD_LABELS = { top: "software engineer", work: "selected work", experience: "experience", contact: "contact" };

  function sectionAwareness(links, { onChange, allowEmpty = false } = {}) {
    const targets = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
    if (!targets.length) return;
    let frame = 0;
    let current = null;
    const update = () => {
      frame = 0;
      const line = Math.min(240, innerHeight * .35);
      let next = allowEmpty ? null : targets[0];
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line * .5) next = target;
      }
      if (Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 2) next = targets[targets.length - 1];
      if (next === current) return;
      current = next;
      links.forEach(link => {
        const active = next && link.hash === `#${next.id}`;
        if (active) link.setAttribute("aria-current", link.closest(".case-toc") ? "location" : "true");
        else link.removeAttribute("aria-current");
      });
      onChange?.(next);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue, { passive: true });
    queue(); // first measurement after the browser's own first layout, not forced mid-script
  }

  const homeLinks = [...document.querySelectorAll("[data-section-link]")];
  if (homeLinks.length) {
    const top = document.getElementById("top");
    sectionAwareness(homeLinks, {
      allowEmpty: true,
      onChange: section => {
        if (!hud) return;
        const inHero = top && top.getBoundingClientRect().bottom > innerHeight * .4;
        hud.textContent = HUD_LABELS[inHero ? "top" : section?.id] || HUD_LABELS.top;
      }
    });
  }

  const toc = document.querySelector("[data-toc]");
  if (toc) {
    const syncToc = () => { if (desktopQuery.matches) toc.setAttribute("open", ""); };
    if (!desktopQuery.matches) toc.removeAttribute("open");
    desktopQuery.addEventListener?.("change", syncToc);
    sectionAwareness([...toc.querySelectorAll('a[href^="#"]')]);
    toc.querySelectorAll("a").forEach(link => link.addEventListener("click", () => { if (!desktopQuery.matches) toc.removeAttribute("open"); }));
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  if (reveals.length && "IntersectionObserver" in window && !motionQuery.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });
    // Read every position first, then write: interleaving the two forced a layout per element.
    const fold = innerHeight * .94;
    const tops = reveals.map(element => element.getBoundingClientRect().top);
    reveals.forEach((element, i) => {
      if (tops[i] < fold) element.classList.add("is-in");
      else observer.observe(element);
    });
    root.classList.add("reveal-ready");
    // A page opened on an anchor shows everything at once, so the browser scrolls to the
    // target's final position rather than its pre-reveal offset (16px lower).
    if (location.hash) reveals.forEach(element => element.classList.add("is-in"));
    // A hidden hash target must never stay invisible.
    addEventListener("hashchange", () => reveals.forEach(element => element.classList.add("is-in")));
  } else {
    reveals.forEach(element => element.classList.add("is-in"));
  }

  /* ---------- Case studies: immersive sequences ---------- */
  const immersives = [...document.querySelectorAll("[data-case-immersive]")];
  if (immersives.length && "IntersectionObserver" in window) {
    let observers = [];
    const setActive = (frame, steps, index) => {
      frame.dataset.active = String(index + 1);
      steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    };
    const enable = () => {
      root.classList.add("immersive-ready");
      immersives.forEach(section => {
        const frame = section.querySelector(".case-immersive-frame");
        const steps = [...section.querySelectorAll(".immersive-step")];
        if (!frame || !steps.length) return;
        setActive(frame, steps, 0);
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => { if (entry.isIntersecting) setActive(frame, steps, steps.indexOf(entry.target)); });
        }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
        steps.forEach(step => observer.observe(step));
        section.addEventListener("focusin", event => {
          const step = event.target.closest?.(".immersive-step");
          if (step) setActive(frame, steps, steps.indexOf(step));
        });
        observers.push(observer);
      });
    };
    const disable = () => {
      observers.forEach(observer => observer.disconnect());
      observers = [];
      root.classList.remove("immersive-ready");
      immersives.forEach(section => {
        section.querySelector(".case-immersive-frame")?.removeAttribute("data-active");
        section.querySelectorAll(".immersive-step").forEach(step => step.classList.remove("is-active"));
      });
    };
    const sync = () => { disable(); if (desktopQuery.matches) enable(); };
    desktopQuery.addEventListener?.("change", sync);
    sync();
  }

  /* ---------- Case studies: layer-cut rows light their plane ---------- */
  document.querySelectorAll("[data-cut]").forEach(cut => {
    const planes = [...cut.querySelectorAll("[data-plane]")];
    const rows = [...cut.querySelectorAll(".lc-row")];
    const light = index => {
      planes.forEach((plane, i) => plane.classList.toggle("is-active", i === index));
      rows.forEach((row, i) => row.classList.toggle("is-active", i === index));
    };
    rows.forEach((row, index) => {
      row.addEventListener("pointerenter", () => light(index));
      row.addEventListener("pointerleave", () => light(-1));
    });
  });

  /* ---------- Screenshot hotspots ---------- */
  const hotspotButtons = [...document.querySelectorAll("[data-hotspot]")];
  let lockedHotspot = null;
  const hotspotPanelFor = button => {
    const id = button?.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  };
  function hideHotspot(button) {
    const panel = hotspotPanelFor(button);
    button?.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
    if (lockedHotspot === button) lockedHotspot = null;
  }
  const hideAllHotspots = (except = null) => hotspotButtons.forEach(button => { if (button !== except) hideHotspot(button); });
  function showHotspot(button, { lock = false } = {}) {
    const panel = hotspotPanelFor(button);
    if (!panel) return;
    hideAllHotspots(button);
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    lockedHotspot = lock ? button : null;
  }
  hotspotButtons.forEach(button => {
    button.addEventListener("pointerenter", () => { if (finePointer.matches && !lockedHotspot) showHotspot(button); });
    button.addEventListener("pointerleave", () => { if (!lockedHotspot) hideHotspot(button); });
    button.addEventListener("focus", () => showHotspot(button));
    button.addEventListener("blur", () => { if (lockedHotspot !== button) hideHotspot(button); });
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (lockedHotspot === button) hideHotspot(button);
      else showHotspot(button, { lock: true });
    });
  });
  document.addEventListener("click", event => {
    if (!lockedHotspot || !(event.target instanceof Element)) return;
    if (event.target.closest("[data-hotspot], [data-hotspot-panel]")) return;
    hideHotspot(lockedHotspot);
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && lockedHotspot) hideHotspot(lockedHotspot); });

  /* ---------- Screenshot lightbox ---------- */
  const mediaDialog = document.querySelector("[data-media-dialog]");
  const mediaTriggers = [...document.querySelectorAll("[data-media-open]")];
  if (mediaDialog && mediaTriggers.length && typeof mediaDialog.showModal === "function") {
    const figure = mediaDialog.querySelector("[data-media-dialog-figure]");
    const image = mediaDialog.querySelector("[data-media-dialog-image]");
    const caption = mediaDialog.querySelector("[data-media-dialog-caption]");
    const closeButton = mediaDialog.querySelector("[data-media-close]");
    const prevButton = mediaDialog.querySelector("[data-media-prev]");
    const nextButton = mediaDialog.querySelector("[data-media-next]");
    const dialogHotspots = mediaDialog.querySelector("[data-media-dialog-hotspots]");
    const dialogHotspotPanel = mediaDialog.querySelector("[data-media-dialog-hotspot-panel]");
    let trigger = null;
    let index = -1;
    let request = 0;
    let closeTimer = 0;
    let lockedDialogHotspot = null;

    const waitForImage = () => (image.complete && image.naturalWidth) ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });

    function setGeometry(source) {
      figure.style.setProperty("--media-start-x", "0px");
      figure.style.setProperty("--media-start-y", "0px");
      figure.style.setProperty("--media-start-scale", ".985");
      if (!source || motionQuery.matches) return;
      const from = source.querySelector("img")?.getBoundingClientRect();
      const to = image.getBoundingClientRect();
      if (!from || !to.width || !to.height) return;
      figure.style.setProperty("--media-start-x", `${(from.left + from.width / 2 - (to.left + to.width / 2)).toFixed(2)}px`);
      figure.style.setProperty("--media-start-y", `${(from.top + from.height / 2 - (to.top + to.height / 2)).toFixed(2)}px`);
      figure.style.setProperty("--media-start-scale", Math.min(1.025, Math.max(.16, Math.min(from.width / to.width, from.height / to.height))).toFixed(4));
    }

    function hideDialogHotspot() {
      dialogHotspots?.querySelectorAll("button").forEach(button => button.setAttribute("aria-expanded", "false"));
      if (dialogHotspotPanel) { dialogHotspotPanel.hidden = true; dialogHotspotPanel.replaceChildren(); }
      lockedDialogHotspot = null;
    }
    function showDialogHotspot(button, hotspot, { lock = false } = {}) {
      dialogHotspots.querySelectorAll("button").forEach(item => item.setAttribute("aria-expanded", "false"));
      button.setAttribute("aria-expanded", "true");
      const title = document.createElement("strong");
      title.textContent = hotspot.title;
      const body = document.createElement("p");
      body.textContent = hotspot.body;
      dialogHotspotPanel.replaceChildren(title, body);
      dialogHotspotPanel.hidden = false;
      lockedDialogHotspot = lock ? button : null;
    }
    function renderDialogHotspots(source) {
      if (!dialogHotspots || !dialogHotspotPanel) return;
      hideDialogHotspot();
      dialogHotspots.replaceChildren();
      const hotspots = [...(source.closest("[data-hotspot-media]")?.querySelectorAll("[data-hotspot]") ?? [])].map(button => {
        const panel = hotspotPanelFor(button);
        return {
          label: button.getAttribute("aria-label") || "Screenshot detail",
          x: button.style.getPropertyValue("--hotspot-x") || "50%",
          y: button.style.getPropertyValue("--hotspot-y") || "50%",
          title: panel?.querySelector("strong")?.textContent.trim() || "Screenshot detail",
          body: panel?.querySelector("p")?.textContent.trim() || ""
        };
      }).filter(hotspot => hotspot.body);
      dialogHotspots.hidden = !hotspots.length;
      hotspots.forEach(hotspot => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "media-dialog-hotspot";
        button.style.setProperty("--hotspot-x", hotspot.x);
        button.style.setProperty("--hotspot-y", hotspot.y);
        button.setAttribute("aria-label", hotspot.label);
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", dialogHotspotPanel.id);
        button.addEventListener("pointerenter", () => { if (finePointer.matches && !lockedDialogHotspot) showDialogHotspot(button, hotspot); });
        button.addEventListener("pointerleave", () => { if (!lockedDialogHotspot) hideDialogHotspot(); });
        button.addEventListener("focus", () => showDialogHotspot(button, hotspot));
        button.addEventListener("click", event => {
          event.stopPropagation();
          if (lockedDialogHotspot === button) hideDialogHotspot();
          else showDialogHotspot(button, hotspot, { lock: true });
        });
        dialogHotspots.append(button);
      });
    }

    function render(nextIndex) {
      const source = mediaTriggers[nextIndex];
      const inline = source.querySelector("img");
      index = nextIndex;
      image.src = source.dataset.mediaSrc || source.href;
      image.alt = inline?.alt || "Enlarged project screenshot";
      if (inline?.getAttribute("width")) image.setAttribute("width", inline.getAttribute("width"));
      if (inline?.getAttribute("height")) image.setAttribute("height", inline.getAttribute("height"));
      caption.textContent = source.dataset.mediaCaption || "";
      renderDialogHotspots(source);
      const multiple = mediaTriggers.length > 1;
      prevButton.hidden = !multiple;
      nextButton.hidden = !multiple;
      return source;
    }

    async function open(nextIndex, source) {
      const id = ++request;
      render(nextIndex);
      trigger = trigger || source;
      clearTimeout(closeTimer);
      Site.closeMenu();
      hideAllHotspots();
      if (!mediaDialog.open) { mediaDialog.showModal(); Site.lockScroll(); }
      mediaDialog.classList.remove("is-visible");
      await waitForImage();
      if (id !== request || !mediaDialog.open) return;
      setGeometry(source);
      requestAnimationFrame(() => mediaDialog.classList.add("is-visible"));
      closeButton.focus();
    }

    function finishClose() {
      request += 1;
      hideDialogHotspot();
      mediaDialog.classList.remove("is-visible");
      if (mediaDialog.open) { mediaDialog.close(); Site.unlockScroll(); }
      trigger?.focus();
      trigger = null;
      index = -1;
    }
    function close() {
      if (!mediaDialog.open) return;
      mediaDialog.classList.remove("is-visible");
      if (motionQuery.matches) finishClose();
      else closeTimer = setTimeout(finishClose, 180);
    }
    const step = direction => {
      if (mediaTriggers.length < 2 || index < 0) return;
      const nextIndex = (index + direction + mediaTriggers.length) % mediaTriggers.length;
      open(nextIndex, mediaTriggers[nextIndex]);
    };

    document.addEventListener("click", event => {
      const source = event.target instanceof Element ? event.target.closest("[data-media-open]") : null;
      if (!source || !mediaTriggers.includes(source)) return;
      event.preventDefault();
      trigger = source;
      open(mediaTriggers.indexOf(source), source);
    });
    closeButton.addEventListener("click", close);
    prevButton.addEventListener("click", event => { event.stopPropagation(); step(-1); });
    nextButton.addEventListener("click", event => { event.stopPropagation(); step(1); });
    mediaDialog.addEventListener("click", event => {
      if (event.target === mediaDialog || event.target.matches?.("[data-media-dialog-frame]")) close();
    });
    mediaDialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
    mediaDialog.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    });
    addEventListener("pageshow", () => { if (mediaDialog.open) finishClose(); });
  }

  /* ---------- Copy to clipboard ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through to the legacy path */ }
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.append(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch { return false; }
  }
  document.querySelectorAll("[data-copy]").forEach(button => {
    const label = button.querySelector("[data-copy-label]");
    const defaultLabel = label?.textContent || "Copy";
    button.hidden = false;
    button.setAttribute("aria-label", `Copy ${button.dataset.copy}`);
    let timer = 0;
    button.addEventListener("click", async () => {
      const ok = await copyText(button.dataset.copy);
      clearTimeout(timer);
      button.classList.toggle("is-done", ok);
      if (label) label.textContent = ok ? "Copied" : "Select and copy";
      timer = setTimeout(() => { button.classList.remove("is-done"); if (label) label.textContent = defaultLabel; }, 1800);
    });
  });

  /* ---------- Modena clock, year ---------- */
  const clocks = [...document.querySelectorAll("[data-clock]")];
  if (clocks.length) {
    let format = null;
    try { format = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }); } catch { /* keep the static label */ }
    const tick = () => { if (format) { const text = format.format(new Date()); clocks.forEach(clock => { clock.textContent = text; }); } };
    tick();
    setInterval(tick, 30000);
  }
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Contact form ---------- */
  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    const STATE = { READY: "READY", VALIDATING: "VALIDATING", SENDING: "SENDING", RECEIVED: "RECEIVED", ERROR: "ERROR" };
    const mode = contactForm.dataset.contactMode || "mailto";
    const endpoint = (contactForm.dataset.contactEndpoint || "").trim();
    const email = contactForm.dataset.contactEmail || "";
    const timeoutMs = Math.max(3000, Number(contactForm.dataset.contactTimeout) || 8000);
    const statusText = contactForm.querySelector("[data-contact-status-text]");
    const submitButton = contactForm.querySelector("[data-contact-submit]");
    const submitText = contactForm.querySelector("[data-contact-submit-text]");
    const fallbackButton = contactForm.querySelector("[data-contact-mailfallback]");
    // Cloudflare Turnstile: production-only bot check, rendered only when a site key is
    // configured. Skipped on localhost so local development needs no checks.
    const turnstileKey = (contactForm.dataset.contactTurnstile || "").trim();
    const turnstileHost = contactForm.querySelector("[data-contact-turnstile-widget]");
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1", ""].includes(location.hostname) || location.protocol === "file:";
    const turnstileRequired = mode === "endpoint" && !isLocal && Boolean(turnstileKey) && Boolean(turnstileHost);
    let turnstileId = null;
    let lastValues = null;
    let state = STATE.READY;
    let lastMailto = 0;
    const fields = {
      name: contactForm.elements.namedItem("name"),
      email: contactForm.elements.namedItem("email"),
      message: contactForm.elements.namedItem("message")
    };
    const errorNodes = Object.fromEntries([...contactForm.querySelectorAll("[data-contact-error-for]")].map(node => [node.dataset.contactErrorFor, node]));
    const readyMessage = mode === "endpoint" ? "Ready to send your message." : "Ready to prepare an email draft.";
    contactForm.noValidate = true;

    const submitLabel = current => {
      if (mode !== "endpoint") return "Open email draft";
      if (current === STATE.SENDING) return "Sending…";
      if (current === STATE.RECEIVED) return "Message sent";
      if (current === STATE.ERROR) return "Try again";
      return "Send message";
    };
    function setState(next, message) {
      state = next;
      contactForm.dataset.contactState = next.toLowerCase();
      if (statusText && message) statusText.textContent = message;
      if (submitButton) submitButton.disabled = next === STATE.SENDING || mode === "disabled";
      if (submitText) submitText.textContent = submitLabel(next);
      if (fallbackButton) fallbackButton.hidden = true;
    }
    function setFieldError(name, message = "") {
      const field = fields[name];
      const node = errorNodes[name];
      if (field) { if (message) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid"); }
      const text = node?.querySelector("[data-contact-error-text]");
      if (!node || !text) return;
      text.textContent = message;
      node.hidden = !message;
    }
    const clearErrors = () => Object.keys(errorNodes).forEach(name => setFieldError(name));
    const values = () => ({
      name: fields.name?.value.trim() || "",
      email: fields.email?.value.trim() || "",
      enquiryType: (contactForm.elements.namedItem("enquiryType")?.value || "").trim(),
      message: fields.message?.value.trim() || ""
    });

    function validate() {
      setState(STATE.VALIDATING, "Checking the required fields.");
      clearErrors();
      const current = values();
      const min = Number(fields.message?.getAttribute("minlength")) || 20;
      const max = Number(fields.message?.getAttribute("maxlength")) || 2200;
      fields.name.value = current.name;
      fields.email.value = current.email;
      fields.message.value = current.message;
      const errors = [];
      if (!current.name) errors.push(["name", "Enter your name."]);
      if (!current.email) errors.push(["email", "Enter your email address."]);
      else if (!fields.email.validity.valid) errors.push(["email", "Use a valid email address, for example name@example.com."]);
      if (!current.message) errors.push(["message", "Write a message."]);
      else if (current.message.length < min) errors.push(["message", `Write at least ${min} characters — currently ${current.message.length}.`]);
      else if (current.message.length > max) errors.push(["message", `Keep the message under ${max} characters.`]);
      if (errors.length) {
        errors.forEach(([name, message]) => setFieldError(name, message));
        setState(STATE.ERROR, "Fix the highlighted fields. Your message is still here.");
        fields[errors[0][0]]?.focus();
        return null;
      }
      return current;
    }

    const mailtoUrl = current => {
      const subject = `Portfolio enquiry — ${current.enquiryType || "Portfolio message"}`;
      const body = `${current.message}\n\n${current.name}${current.email ? ` <${current.email}>` : ""}`;
      return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };
    function openMailto(current) {
      const now = Date.now();
      if (now - lastMailto < 1200) { setState(STATE.READY, "An email draft was already requested. If nothing opened, use the email address beside the form."); return; }
      lastMailto = now;
      setState(STATE.READY, "Opening your email application with a prepared draft. Review and send it there.");
      try { location.href = mailtoUrl(current); }
      catch { setState(STATE.ERROR, "The email draft could not open. Your message is still here; use the email address beside the form."); }
    }
    const resetTurnstile = () => {
      if (turnstileRequired && window.turnstile && turnstileId !== null) { try { window.turnstile.reset(turnstileId); } catch { /* widget gone */ } }
    };

    async function send(current) {
      const target = endpoint || contactForm.action;
      if (!target || target.startsWith("mailto:") || /(?:example\.com|your-|todo|placeholder)/i.test(target)) {
        lastValues = current;
        setState(STATE.ERROR, "The form endpoint is not configured. Your message is still here — open an email draft instead.");
        if (fallbackButton) fallbackButton.hidden = false;
        return;
      }
      let token = "";
      if (turnstileRequired) {
        token = (window.turnstile && turnstileId !== null) ? (window.turnstile.getResponse(turnstileId) || "") : "";
        if (!token) { setState(STATE.ERROR, "Complete the bot check below the form, then send again."); return; }
      }
      lastValues = current;
      const data = new FormData(contactForm);
      data.set("name", current.name);
      data.set("email", current.email);
      data.set("enquiryType", current.enquiryType);
      data.set("message", current.message);
      if (token) data.set("cf-turnstile-response", token);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      setState(STATE.SENDING, "Sending your message. Your details stay in the form until it arrives.");
      try {
        const response = await fetch(target, { method: "POST", body: data, signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("endpoint");
        contactForm.reset();
        clearErrors();
        resetTurnstile();
        setState(STATE.RECEIVED, "Message sent. I'll reply to the address you gave.");
      } catch (error) {
        resetTurnstile();
        setState(STATE.ERROR, error?.name === "AbortError"
          ? "The message timed out. Try again, or open a pre-filled email draft."
          : "The message could not be sent. Try again, or open a pre-filled email draft.");
        if (fallbackButton) fallbackButton.hidden = false;
      } finally {
        clearTimeout(timer);
      }
    }

    Object.entries(fields).forEach(([name, field]) => {
      field?.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") setFieldError(name);
        if (state === STATE.ERROR && Object.values(errorNodes).every(node => node.hidden)) setState(STATE.READY, readyMessage);
      });
    });
    contactForm.addEventListener("submit", event => {
      event.preventDefault();
      if (state === STATE.SENDING) return;
      const current = validate();
      if (!current) return;
      if (mode === "endpoint") send(current);
      else if (mode === "disabled") setState(STATE.ERROR, "The contact form is disabled. Use the email address beside the form.");
      else openMailto(current);
    });
    fallbackButton?.addEventListener("click", () => openMailto(lastValues || values()));

    if (turnstileRequired) {
      turnstileHost.hidden = false;
      window.__contactTurnstileRender = () => {
        if (!window.turnstile) return;
        try { turnstileId = window.turnstile.render(turnstileHost, { sitekey: turnstileKey, action: "contact", theme: root.dataset.theme === "light" ? "light" : "dark" }); }
        catch { /* the submit gate surfaces a clear message */ }
      };
      if (window.turnstile) window.__contactTurnstileRender();
      else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__contactTurnstileRender&render=explicit";
        script.async = true;
        document.head.append(script);
      }
    }
    setState(STATE.READY, readyMessage);
  }
})();
