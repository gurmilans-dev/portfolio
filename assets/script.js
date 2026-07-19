document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");
const navigationLinks = [...(navigation?.querySelectorAll("a") ?? [])];
const navigationFocusables = [...(navigation?.querySelectorAll("a, button") ?? [])];
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const rootElement = document.documentElement;
let closeStaleMediaDialog = () => { document.body?.classList.remove("lightbox-open"); };
menuToggle?.setAttribute("aria-label", "Open navigation");

function syncMotionPreference() {
  rootElement.classList.toggle("motion-reduce", motionQuery.matches);
}

syncMotionPreference();
requestAnimationFrame(() => rootElement.classList.add("theme-transition-ready"));

function storedTheme() {
  try { return localStorage.getItem("portfolio-theme"); } catch { return null; }
}

function applyTheme(theme, persist = false) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle?.setAttribute("aria-pressed", String(dark));
  themeToggle?.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} mode`);
  if (themeLabel) themeLabel.textContent = dark ? "Light" : "Dark";
  if (themeColor) themeColor.content = dark ? "#141511" : "#f3efe5";
  if (persist) {
    try { localStorage.setItem("portfolio-theme", dark ? "dark" : "light"); } catch { /* Theme still applies. */ }
  }
}

applyTheme(document.documentElement.dataset.theme || (systemTheme.matches ? "dark" : "light"));
themeToggle?.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
systemTheme.addEventListener?.("change", event => { if (!storedTheme()) applyTheme(event.matches ? "dark" : "light"); });

const HERO_INTRO_KEY = "portfolio-hero-intro-v1";
const HERO_INTRO_REPLAY_PARAM = "replayIntro";
const HERO_INTRO_DURATION = 1080;
// Local QA: append ?replayIntro=1 or remove the session key above to replay the opening.
let heroIntroTimer = 0;
let finishHeroIntro = () => {};

function canUseHeroSession() {
  try {
    const testKey = `${HERO_INTRO_KEY}:test`;
    sessionStorage.setItem(testKey, "1");
    sessionStorage.removeItem(testKey);
    return true;
  } catch { return false; }
}

function heroIntroWasSeen() {
  try { return sessionStorage.getItem(HERO_INTRO_KEY) === "seen"; } catch { return true; }
}

function markHeroIntroSeen() {
  try {
    sessionStorage.setItem(HERO_INTRO_KEY, "seen");
    return true;
  } catch { return false; }
}

function shouldReplayHeroIntro() {
  try { return new URLSearchParams(location.search).get(HERO_INTRO_REPLAY_PARAM) === "1"; } catch { return false; }
}

(() => {
  const hero = document.querySelector("[data-hero-intro]");
  const storageReady = canUseHeroSession();
  const caseStudyPaths = ["erp-case-study.html", "opssemble.html", "gurmat-saanj.html"];

  if (!hero) {
    if (storageReady && caseStudyPaths.some(path => location.pathname.endsWith(path))) markHeroIntroSeen();
    return;
  }

  const root = document.documentElement;
  const heroStatusText = hero.querySelector(".hero-system-status-text");
  const setHeroStatusWidth = () => {
    if (!heroStatusText) return;
    const width = Math.ceil(heroStatusText.getBoundingClientRect().width + 1);
    heroStatusText.style.setProperty("--hero-status-width", `${width}px`);
  };

  finishHeroIntro = () => {
    clearTimeout(heroIntroTimer);
    root.classList.remove("hero-sequence-ready", "hero-sequence-running");
    root.classList.add("hero-sequence-complete");
    heroStatusText?.style.removeProperty("--hero-status-width");
  };

  if (!storageReady || motionQuery.matches || (!shouldReplayHeroIntro() && heroIntroWasSeen())) {
    finishHeroIntro();
    return;
  }

  if (!markHeroIntroSeen()) {
    finishHeroIntro();
    return;
  }

  root.classList.remove("hero-sequence-complete");
  setHeroStatusWidth();
  root.classList.add("hero-sequence-ready");
  requestAnimationFrame(() => {
    if (motionQuery.matches) {
      finishHeroIntro();
      return;
    }
    root.classList.add("hero-sequence-running");
    heroIntroTimer = setTimeout(finishHeroIntro, HERO_INTRO_DURATION);
  });
})();

motionQuery.addEventListener?.("change", event => {
  syncMotionPreference();
  if (event.matches) finishHeroIntro();
});

addEventListener("pageshow", event => {
  closeStaleMediaDialog();
  queueScrollProgress();
});

function closeMenu(returnFocus = false) {
  if (!menuToggle || !navigation) return;
  const wasOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  if (returnFocus && wasOpen) menuToggle.focus();
}

menuToggle?.addEventListener("click", () => {
  const opening = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(opening));
  menuToggle.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation");
  navigation?.classList.toggle("is-open", opening);
  document.body.classList.toggle("menu-open", opening);
  if (opening) navigationLinks[0]?.focus();
});
navigationLinks.forEach(link => link.addEventListener("click", () => closeMenu(false)));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu(true);
  if (event.key !== "Tab" || menuToggle?.getAttribute("aria-expanded") !== "true" || !navigationFocusables.length) return;
  const first = navigationFocusables[0];
  const last = navigationFocusables[navigationFocusables.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
addEventListener("resize", () => { if (innerWidth > 768) closeMenu(false); }, { passive: true });
addEventListener("scroll", () => header?.classList.toggle("is-scrolled", scrollY > 12), { passive: true });

const scrollProgress = document.querySelector("[data-scroll-progress]");
const scrollProgressBar = scrollProgress?.querySelector("[data-scroll-progress-bar]");
let scrollProgressFrame = 0;
function updateScrollProgress() {
  scrollProgressFrame = 0;
  if (!scrollProgress || !scrollProgressBar) return;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  if (maxScroll <= 2) {
    scrollProgress.hidden = true;
    scrollProgressBar.style.setProperty("--scroll-progress", "0");
    return;
  }
  const atBottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1;
  const progress = atBottom ? 1 : Math.min(1, Math.max(0, scrollY / maxScroll));
  scrollProgress.hidden = false;
  scrollProgressBar.style.setProperty("--scroll-progress", progress.toFixed(4));
}
function queueScrollProgress() {
  if (!scrollProgressFrame) scrollProgressFrame = requestAnimationFrame(updateScrollProgress);
}
if (scrollProgress) {
  addEventListener("scroll", queueScrollProgress, { passive: true });
  addEventListener("resize", queueScrollProgress, { passive: true });
  addEventListener("load", queueScrollProgress, { once: true });
  document.querySelectorAll("img").forEach(image => {
    if (!image.complete) image.addEventListener("load", queueScrollProgress, { once: true });
  });
  updateScrollProgress();
}

const toc = document.querySelector("[data-toc]");
if (toc && innerWidth <= 768) toc.removeAttribute("open");

const tocLinks = [...(toc?.querySelectorAll('a[href^="#"]') ?? [])];
const sections = tocLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);

const homeLinks = [...document.querySelectorAll("[data-section-link]")];
const homeSections = homeLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);

function setupSectionAwareness(links, observedSections, { allowEmpty = false } = {}) {
  if (!links.length || !observedSections.length) return;
  let awarenessFrame = 0;
  const setCurrent = section => {
    links.forEach(link => link.removeAttribute("aria-current"));
    if (!section) return;
    links.find(link => link.getAttribute("href") === `#${section.id}`)?.setAttribute("aria-current", "location");
  };
  const updateCurrent = () => {
    const threshold = Math.min(260, innerHeight * .35);
    const atBottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1;
    let current = allowEmpty ? null : observedSections[0];
    for (const section of observedSections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= threshold && rect.bottom > 0) current = section;
      else if (rect.top > threshold) break;
    }
    if (atBottom) current = observedSections[observedSections.length - 1];
    setCurrent(current);
    awarenessFrame = 0;
  };
  const queueCurrent = () => {
    if (!awarenessFrame) awarenessFrame = requestAnimationFrame(updateCurrent);
  };
  if ("IntersectionObserver" in window) {
    const awarenessObserver = new IntersectionObserver(queueCurrent, { rootMargin: "-18% 0px -62% 0px", threshold: [0, .01, .2, .6] });
    observedSections.forEach(section => awarenessObserver.observe(section));
    addEventListener("scroll", queueCurrent, { passive: true });
    addEventListener("resize", queueCurrent, { passive: true });
    queueCurrent();
    return;
  }
  addEventListener("scroll", queueCurrent, { passive: true });
  addEventListener("resize", queueCurrent, { passive: true });
  updateCurrent();
}

setupSectionAwareness(tocLinks, sections);
setupSectionAwareness(homeLinks, homeSections, { allowEmpty: true });

const reduceMotion = motionQuery.matches;
const revealGroups = [...document.querySelectorAll("[data-reveal-group]")];
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealGroups.forEach(group => group.classList.add("reveal-visible"));
} else {
  try {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .12 });
    revealGroups.forEach(group => {
      if (group.getBoundingClientRect().top < innerHeight * .92) group.classList.add("reveal-visible");
      else revealObserver.observe(group);
    });
    document.documentElement.classList.add("reveal-ready");
  } catch {
    revealGroups.forEach(group => group.classList.add("reveal-visible"));
  }
}

const connectorFlows = [...document.querySelectorAll("[data-connector-reveal]")];
if (reduceMotion || !("IntersectionObserver" in window)) {
  connectorFlows.forEach(flow => flow.classList.add("connectors-visible"));
} else {
  const connectorObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("connectors-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12%", threshold: .15 });
  document.documentElement.classList.add("connectors-ready");
  connectorFlows.forEach(flow => connectorObserver.observe(flow));
}

const caseImmersiveSections = [...document.querySelectorAll("[data-case-immersive]")];
if (caseImmersiveSections.length) {
  let immersiveProps = [];
  try {
    const immersiveDesktopQuery = matchMedia("(min-width: 1100px)");
    let immersiveEnabled = false;
    let immersiveFrame = 0;
    let immersiveNeedsAll = false;
    let immersiveObserver = null;
    let activeImmersiveSections = new Set();

    immersiveProps = [
      "--erp-fragment-opacity", "--erp-legacy-x", "--erp-legacy-y", "--erp-excel-x", "--erp-excel-y",
      "--erp-paper-x", "--erp-paper-y", "--erp-trail-x", "--erp-trail-y", "--erp-line-scale",
      "--erp-boundary-inset", "--erp-boundary-opacity", "--erp-core-scale", "--erp-core-opacity",
      "--erp-module-opacity", "--erp-maintenance-opacity", "--erp-maintenance-y",
      "--gurmat-recognition-opacity", "--gurmat-recognition-x", "--gurmat-shared-opacity",
      "--gurmat-shared-y", "--gurmat-branch-opacity", "--gurmat-branch-x", "--gurmat-branch-y",
      "--gurmat-local-opacity", "--gurmat-local-y", "--gurmat-transfer-opacity", "--gurmat-transfer-y",
      "--ops-structure-opacity", "--ops-structure-y", "--ops-line-scale",
      "--ops-boundary-inset", "--ops-boundary-opacity", "--ops-core-scale", "--ops-core-opacity",
      "--ops-rules-opacity", "--ops-exception-opacity", "--ops-exception-x",
      "--ops-qr-opacity", "--ops-qr-y", "--ops-records-opacity", "--ops-records-y"
    ];
    const clampImmersive = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const easeImmersive = value => 1 - Math.pow(1 - value, 3);
    const easeFirmImmersive = value => 1 - Math.pow(1 - value, 4);
    const rangedImmersive = (value, start, end, easing = easeImmersive) => easing(clampImmersive((value - start) / Math.max(.001, end - start)));

    function clearImmersiveVars(section) {
      immersiveProps.forEach(prop => section.style.removeProperty(prop));
    }

    function setErpImmersive(section, progress) {
      const consolidate = rangedImmersive(progress, .08, .36, easeFirmImmersive);
      const boundary = rangedImmersive(progress, .22, .52, easeFirmImmersive);
      const core = rangedImmersive(progress, .36, .62, easeImmersive);
      const modules = rangedImmersive(progress, .52, .78, easeImmersive);
      const maintenance = rangedImmersive(progress, .7, .95, easeImmersive);
      const scatter = 1 - consolidate;
      section.style.setProperty("--erp-fragment-opacity", (.5 + consolidate * .42).toFixed(3));
      section.style.setProperty("--erp-legacy-x", `${(-28 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-legacy-y", `${(-12 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-excel-x", `${(-12 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-excel-y", `${(14 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-paper-x", `${(13 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-paper-y", `${(-13 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-trail-x", `${(28 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-trail-y", `${(13 * scatter).toFixed(2)}px`);
      section.style.setProperty("--erp-line-scale", (.14 + consolidate * .86).toFixed(3));
      section.style.setProperty("--erp-boundary-inset", `${(24 * (1 - boundary)).toFixed(2)}px`);
      section.style.setProperty("--erp-boundary-opacity", (.22 + boundary * .78).toFixed(3));
      section.style.setProperty("--erp-core-scale", (.92 + core * .08).toFixed(4));
      section.style.setProperty("--erp-core-opacity", (.3 + core * .7).toFixed(3));
      section.style.setProperty("--erp-module-opacity", (.14 + modules * .86).toFixed(3));
      section.style.setProperty("--erp-maintenance-opacity", (.16 + maintenance * .84).toFixed(3));
      section.style.setProperty("--erp-maintenance-y", `${(22 * (1 - maintenance)).toFixed(2)}px`);
    }

    function setGurmatImmersive(section, progress) {
      const recognition = rangedImmersive(progress, .04, .28, easeImmersive);
      const shared = rangedImmersive(progress, .22, .44, easeFirmImmersive);
      const branch = rangedImmersive(progress, .38, .66, easeImmersive);
      const local = rangedImmersive(progress, .55, .77, easeImmersive);
      const transfer = rangedImmersive(progress, .7, .95, easeImmersive);
      section.style.setProperty("--gurmat-recognition-opacity", (.45 + recognition * .55).toFixed(3));
      section.style.setProperty("--gurmat-recognition-x", `${(-28 * (1 - recognition)).toFixed(2)}px`);
      section.style.setProperty("--gurmat-shared-opacity", (.26 + shared * .74).toFixed(3));
      section.style.setProperty("--gurmat-shared-y", `${(22 * (1 - shared)).toFixed(2)}px`);
      section.style.setProperty("--gurmat-branch-opacity", (.16 + branch * .84).toFixed(3));
      section.style.setProperty("--gurmat-branch-x", `${(18 * (1 - branch)).toFixed(2)}px`);
      section.style.setProperty("--gurmat-branch-y", `${(14 * (1 - branch)).toFixed(2)}px`);
      section.style.setProperty("--gurmat-local-opacity", (.16 + local * .84).toFixed(3));
      section.style.setProperty("--gurmat-local-y", `${(18 * (1 - local)).toFixed(2)}px`);
      section.style.setProperty("--gurmat-transfer-opacity", (.12 + transfer * .88).toFixed(3));
      section.style.setProperty("--gurmat-transfer-y", `${(22 * (1 - transfer)).toFixed(2)}px`);
    }

    function setOpssembleImmersive(section, progress) {
      const structure = rangedImmersive(progress, .04, .28, easeFirmImmersive);
      const boundary = rangedImmersive(progress, .18, .46, easeFirmImmersive);
      const core = rangedImmersive(progress, .32, .58, easeImmersive);
      const rules = rangedImmersive(progress, .44, .68, easeImmersive);
      const exception = rangedImmersive(progress, .56, .78, easeImmersive);
      const qr = rangedImmersive(progress, .68, .88, easeImmersive);
      const records = rangedImmersive(progress, .78, .97, easeImmersive);
      section.style.setProperty("--ops-structure-opacity", (.5 + structure * .5).toFixed(3));
      section.style.setProperty("--ops-structure-y", `${(16 * (1 - structure)).toFixed(2)}px`);
      section.style.setProperty("--ops-line-scale", (.14 + boundary * .86).toFixed(3));
      section.style.setProperty("--ops-boundary-inset", `${(24 * (1 - boundary)).toFixed(2)}px`);
      section.style.setProperty("--ops-boundary-opacity", (.22 + boundary * .78).toFixed(3));
      section.style.setProperty("--ops-core-scale", (.92 + core * .08).toFixed(4));
      section.style.setProperty("--ops-core-opacity", (.3 + core * .7).toFixed(3));
      section.style.setProperty("--ops-rules-opacity", (.14 + rules * .86).toFixed(3));
      section.style.setProperty("--ops-exception-opacity", (.16 + exception * .84).toFixed(3));
      section.style.setProperty("--ops-exception-x", `${(-22 * (1 - exception)).toFixed(2)}px`);
      section.style.setProperty("--ops-qr-opacity", (.14 + qr * .86).toFixed(3));
      section.style.setProperty("--ops-qr-y", `${(18 * (1 - qr)).toFixed(2)}px`);
      section.style.setProperty("--ops-records-opacity", (.16 + records * .84).toFixed(3));
      section.style.setProperty("--ops-records-y", `${(22 * (1 - records)).toFixed(2)}px`);
    }

    function setImmersiveVars(section) {
      if (motionQuery.matches || !immersiveDesktopQuery.matches) {
        clearImmersiveVars(section);
        return;
      }
      const rect = section.getBoundingClientRect();
      const start = innerHeight * .82;
      const distance = Math.max(1, rect.height - innerHeight * .34);
      const progress = clampImmersive((start - rect.top) / distance);
      if (section.dataset.caseVariant === "gurmat") setGurmatImmersive(section, progress);
      else if (section.dataset.caseVariant === "opssemble") setOpssembleImmersive(section, progress);
      else setErpImmersive(section, progress);
    }

    function updateImmersiveSections() {
      immersiveFrame = 0;
      if (!immersiveEnabled) return;
      const sections = immersiveNeedsAll ? caseImmersiveSections : activeImmersiveSections;
      immersiveNeedsAll = false;
      sections.forEach(section => setImmersiveVars(section));
    }

    function queueImmersiveSections(forceAll = false) {
      if (!immersiveEnabled) return;
      if (forceAll) immersiveNeedsAll = true;
      if (immersiveFrame || (!immersiveNeedsAll && !activeImmersiveSections.size)) return;
      immersiveFrame = requestAnimationFrame(updateImmersiveSections);
    }

    function handleImmersiveScroll() {
      queueImmersiveSections(false);
    }

    function handleImmersiveResize() {
      queueImmersiveSections(true);
    }

    function handleImmersiveFocusIn(event) {
      clearImmersiveVars(event.currentTarget);
    }

    function enterImmersive() {
      if (immersiveEnabled || motionQuery.matches || !immersiveDesktopQuery.matches || !("IntersectionObserver" in window)) return;
      immersiveEnabled = true;
      document.documentElement.classList.add("case-immersive-ready");
      immersiveObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) activeImmersiveSections.add(entry.target);
          else {
            setImmersiveVars(entry.target);
            activeImmersiveSections.delete(entry.target);
          }
        });
        if (activeImmersiveSections.size) queueImmersiveSections();
      }, { rootMargin: "42% 0px 42% 0px", threshold: 0 });
      caseImmersiveSections.forEach(section => {
        setImmersiveVars(section);
        immersiveObserver.observe(section);
        section.addEventListener("focusin", handleImmersiveFocusIn);
      });
      addEventListener("scroll", handleImmersiveScroll, { passive: true });
      addEventListener("resize", handleImmersiveResize, { passive: true });
    }

    function exitImmersive() {
      if (!immersiveEnabled) {
        caseImmersiveSections.forEach(clearImmersiveVars);
        return;
      }
      immersiveEnabled = false;
      cancelAnimationFrame(immersiveFrame);
      immersiveFrame = 0;
      activeImmersiveSections = new Set();
      immersiveObserver?.disconnect();
      immersiveObserver = null;
      removeEventListener("scroll", handleImmersiveScroll);
      removeEventListener("resize", handleImmersiveResize);
      caseImmersiveSections.forEach(section => {
        section.removeEventListener("focusin", handleImmersiveFocusIn);
        clearImmersiveVars(section);
      });
      document.documentElement.classList.remove("case-immersive-ready");
    }

    function syncImmersive() {
      if (motionQuery.matches || !immersiveDesktopQuery.matches || !("IntersectionObserver" in window)) exitImmersive();
      else enterImmersive();
    }

    motionQuery.addEventListener?.("change", syncImmersive);
    immersiveDesktopQuery.addEventListener?.("change", syncImmersive);
    syncImmersive();
  } catch {
    caseImmersiveSections.forEach(section => immersiveProps.forEach(prop => section.style.removeProperty(prop)));
    document.documentElement.classList.remove("case-immersive-ready");
  }
}

const hotspotButtons = [...document.querySelectorAll("[data-hotspot]")];
let lockedHotspot = null;

function hotspotPanelFor(button) {
  const id = button?.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
}

function hideHotspot(button) {
  const panel = hotspotPanelFor(button);
  button?.setAttribute("aria-expanded", "false");
  if (panel) panel.hidden = true;
  if (lockedHotspot === button) lockedHotspot = null;
}

function hideAllHotspots(except = null) {
  hotspotButtons.forEach(button => {
    if (button !== except) hideHotspot(button);
  });
}

function showHotspot(button, { lock = false } = {}) {
  const panel = hotspotPanelFor(button);
  if (!panel) return;
  hideAllHotspots(button);
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  lockedHotspot = lock ? button : null;
}

hotspotButtons.forEach(button => {
  button.addEventListener("pointerenter", () => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches && !lockedHotspot) showHotspot(button);
  });
  button.addEventListener("pointerleave", () => {
    if (!lockedHotspot) hideHotspot(button);
  });
  button.addEventListener("focus", () => showHotspot(button));
  button.addEventListener("blur", () => {
    if (lockedHotspot !== button) hideHotspot(button);
  });
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

const mediaDialog = document.querySelector("[data-media-dialog]");
const mediaDialogFrame = mediaDialog?.querySelector("[data-media-dialog-frame]");
const mediaDialogFigure = mediaDialog?.querySelector("[data-media-dialog-figure]");
const mediaDialogImageShell = mediaDialog?.querySelector("[data-media-dialog-image-shell]");
const mediaDialogImage = mediaDialog?.querySelector("[data-media-dialog-image]");
const mediaDialogCaption = mediaDialog?.querySelector("[data-media-dialog-caption]");
const mediaDialogClose = mediaDialog?.querySelector("[data-media-close]");
const mediaDialogPrev = mediaDialog?.querySelector("[data-media-prev]");
const mediaDialogNext = mediaDialog?.querySelector("[data-media-next]");
const mediaDialogHotspots = mediaDialog?.querySelector("[data-media-dialog-hotspots]");
const mediaDialogHotspotPanel = mediaDialog?.querySelector("[data-media-dialog-hotspot-panel]");
const mediaTriggers = [...document.querySelectorAll("[data-media-open]")];
const mediaTriggerIndex = new Map(mediaTriggers.map((trigger, index) => [trigger, index]));
const inertSiblings = new Map();
let mediaDialogTrigger = null;
let mediaDialogIndex = -1;
let mediaDialogCloseTimer = 0;
let mediaDialogRequest = 0;
let lockedDialogHotspot = null;

function setBackgroundHidden(hidden) {
  if (!mediaDialog || !document.body) return;
  [...document.body.children].forEach(child => {
    if (child === mediaDialog) return;
    if (hidden) {
      if (!inertSiblings.has(child)) {
        inertSiblings.set(child, {
          ariaHidden: child.getAttribute("aria-hidden"),
          inert: "inert" in child ? child.inert : false
        });
      }
      child.setAttribute("aria-hidden", "true");
      if ("inert" in child) child.inert = true;
      return;
    }
    const previous = inertSiblings.get(child);
    if (!previous) return;
    if (previous.ariaHidden === null) child.removeAttribute("aria-hidden");
    else child.setAttribute("aria-hidden", previous.ariaHidden);
    if ("inert" in child) child.inert = previous.inert;
    inertSiblings.delete(child);
  });
}

function waitForDialogImage() {
  if (!mediaDialogImage) return Promise.resolve();
  if (mediaDialogImage.complete && mediaDialogImage.naturalWidth) return Promise.resolve();
  return new Promise(resolve => {
    mediaDialogImage.addEventListener("load", resolve, { once: true });
    mediaDialogImage.addEventListener("error", resolve, { once: true });
  });
}

function setDialogGeometry(trigger) {
  if (!mediaDialogFigure || !mediaDialogImage) return;
  mediaDialogFigure.style.setProperty("--media-start-x", "0px");
  mediaDialogFigure.style.setProperty("--media-start-y", "0px");
  mediaDialogFigure.style.setProperty("--media-start-scale", ".985");
  if (!trigger || motionQuery.matches) return;
  const sourceImage = trigger.querySelector("img");
  const sourceRect = sourceImage?.getBoundingClientRect();
  const finalRect = mediaDialogImage.getBoundingClientRect();
  if (!sourceRect || !finalRect.width || !finalRect.height) return;
  const startX = sourceRect.left + sourceRect.width / 2 - (finalRect.left + finalRect.width / 2);
  const startY = sourceRect.top + sourceRect.height / 2 - (finalRect.top + finalRect.height / 2);
  const startScale = Math.min(1.025, Math.max(.16, Math.min(sourceRect.width / finalRect.width, sourceRect.height / finalRect.height)));
  mediaDialogFigure.style.setProperty("--media-start-x", `${startX.toFixed(2)}px`);
  mediaDialogFigure.style.setProperty("--media-start-y", `${startY.toFixed(2)}px`);
  mediaDialogFigure.style.setProperty("--media-start-scale", startScale.toFixed(4));
}

function collectTriggerHotspots(trigger) {
  const source = trigger?.closest("[data-hotspot-media]");
  if (!source) return [];
  return [...source.querySelectorAll("[data-hotspot]")].map(button => {
    const panel = hotspotPanelFor(button);
    return {
      label: button.getAttribute("aria-label") || "Screenshot detail",
      x: button.style.getPropertyValue("--hotspot-x") || "50%",
      y: button.style.getPropertyValue("--hotspot-y") || "50%",
      title: panel?.querySelector("strong")?.textContent.trim() || "Screenshot detail",
      body: panel?.querySelector("p")?.textContent.trim() || ""
    };
  }).filter(hotspot => hotspot.body);
}

function setDialogHotspot(button, hotspot, { lock = false } = {}) {
  if (!mediaDialogHotspotPanel || !mediaDialogHotspots) return;
  [...mediaDialogHotspots.querySelectorAll("[data-media-dialog-hotspot]")].forEach(item => item.setAttribute("aria-expanded", "false"));
  if (button) button.setAttribute("aria-expanded", "true");
  const title = document.createElement("strong");
  title.textContent = hotspot.title;
  const body = document.createElement("p");
  body.textContent = hotspot.body;
  mediaDialogHotspotPanel.replaceChildren(title, body);
  mediaDialogHotspotPanel.hidden = false;
  lockedDialogHotspot = lock ? button : null;
}

function hideDialogHotspot() {
  if (!mediaDialogHotspots || !mediaDialogHotspotPanel) return;
  [...mediaDialogHotspots.querySelectorAll("[data-media-dialog-hotspot]")].forEach(button => button.setAttribute("aria-expanded", "false"));
  mediaDialogHotspotPanel.hidden = true;
  mediaDialogHotspotPanel.replaceChildren();
  lockedDialogHotspot = null;
}

function renderDialogHotspots(trigger) {
  if (!mediaDialogHotspots || !mediaDialogHotspotPanel) return;
  hideDialogHotspot();
  mediaDialogHotspots.replaceChildren();
  const hotspots = collectTriggerHotspots(trigger);
  mediaDialogHotspots.hidden = !hotspots.length;
  if (!hotspots.length) return;
  hotspots.forEach(hotspot => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-dialog-hotspot";
    button.dataset.mediaDialogHotspot = "";
    button.style.setProperty("--hotspot-x", hotspot.x);
    button.style.setProperty("--hotspot-y", hotspot.y);
    button.setAttribute("aria-label", hotspot.label);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "media-dialog-hotspot-panel");
    button.addEventListener("pointerenter", () => {
      if (matchMedia("(hover: hover) and (pointer: fine)").matches && !lockedDialogHotspot) setDialogHotspot(button, hotspot);
    });
    button.addEventListener("pointerleave", () => {
      if (!lockedDialogHotspot) hideDialogHotspot();
    });
    button.addEventListener("focus", () => setDialogHotspot(button, hotspot));
    button.addEventListener("blur", () => {
      if (lockedDialogHotspot !== button) hideDialogHotspot();
    });
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (lockedDialogHotspot === button) hideDialogHotspot();
      else setDialogHotspot(button, hotspot, { lock: true });
    });
    mediaDialogHotspots.append(button);
  });
}

function updateMediaNav() {
  const hasMultiple = mediaTriggers.length > 1;
  mediaDialogPrev?.toggleAttribute("hidden", !hasMultiple);
  mediaDialogNext?.toggleAttribute("hidden", !hasMultiple);
}

function renderMedia(index) {
  const trigger = mediaTriggers[index];
  if (!trigger || !mediaDialogImage || !mediaDialogCaption) return null;
  const inlineImage = trigger.querySelector("img");
  mediaDialogIndex = index;
  mediaDialogImage.src = trigger.dataset.mediaSrc || trigger.href;
  mediaDialogImage.alt = inlineImage?.alt || "Enlarged project screenshot";
  if (inlineImage?.getAttribute("width")) mediaDialogImage.setAttribute("width", inlineImage.getAttribute("width"));
  if (inlineImage?.getAttribute("height")) mediaDialogImage.setAttribute("height", inlineImage.getAttribute("height"));
  mediaDialogCaption.textContent = trigger.dataset.mediaCaption || "";
  renderDialogHotspots(trigger);
  updateMediaNav();
  return trigger;
}

async function showMedia(index, sourceTrigger = mediaTriggers[index]) {
  if (!mediaDialog?.showModal || !mediaDialogImage || !mediaDialogCaption || !mediaDialogFigure) return;
  const requestId = ++mediaDialogRequest;
  const trigger = renderMedia(index);
  if (!trigger) return;
  mediaDialogTrigger = sourceTrigger || trigger;
  clearTimeout(mediaDialogCloseTimer);
  closeMenu(false);
  hideAllHotspots();
  setBackgroundHidden(true);
  document.body?.classList.add("lightbox-open");
  mediaDialog.classList.remove("is-visible");
  if (!mediaDialog.open) mediaDialog.showModal();
  await waitForDialogImage();
  if (requestId !== mediaDialogRequest || !mediaDialog.open) return;
  setDialogGeometry(sourceTrigger || trigger);
  requestAnimationFrame(() => mediaDialog.classList.add("is-visible"));
  mediaDialogClose?.focus();
}

function navigateMedia(direction) {
  if (mediaTriggers.length <= 1 || mediaDialogIndex < 0) return;
  const nextIndex = (mediaDialogIndex + direction + mediaTriggers.length) % mediaTriggers.length;
  showMedia(nextIndex, mediaTriggers[nextIndex]);
}

function finishMediaClose(returnFocus = true) {
  mediaDialogRequest += 1;
  clearTimeout(mediaDialogCloseTimer);
  hideDialogHotspot();
  mediaDialog?.classList.remove("is-visible");
  if (mediaDialog?.open) mediaDialog.close();
  document.body?.classList.remove("lightbox-open");
  setBackgroundHidden(false);
  mediaDialogFigure?.style.removeProperty("--media-start-x");
  mediaDialogFigure?.style.removeProperty("--media-start-y");
  mediaDialogFigure?.style.removeProperty("--media-start-scale");
  if (returnFocus) mediaDialogTrigger?.focus();
  mediaDialogTrigger = null;
  mediaDialogIndex = -1;
  queueScrollProgress();
}

function closeMediaDialog({ returnFocus = true, immediate = false } = {}) {
  if (!mediaDialog?.open) {
    document.body?.classList.remove("lightbox-open");
    setBackgroundHidden(false);
    mediaDialog?.classList.remove("is-visible");
    return;
  }
  if (immediate || motionQuery.matches) {
    finishMediaClose(returnFocus);
    return;
  }
  mediaDialog.classList.remove("is-visible");
  mediaDialogCloseTimer = setTimeout(() => finishMediaClose(returnFocus), 180);
}

closeStaleMediaDialog = () => closeMediaDialog({ returnFocus: false, immediate: true });

document.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest("[data-media-open]");
  if (!trigger || !mediaTriggerIndex.has(trigger)) return;
  if (!mediaDialog?.showModal || !mediaDialogImage || !mediaDialogCaption) return;
  event.preventDefault();
  showMedia(mediaTriggerIndex.get(trigger), trigger);
});
mediaDialogClose?.addEventListener("click", () => closeMediaDialog());
mediaDialogPrev?.addEventListener("click", event => { event.stopPropagation(); navigateMedia(-1); });
mediaDialogNext?.addEventListener("click", event => { event.stopPropagation(); navigateMedia(1); });
mediaDialog?.addEventListener("click", event => { if (event.target === mediaDialog) closeMediaDialog(); });
mediaDialog?.addEventListener("cancel", event => { event.preventDefault(); closeMediaDialog(); });
mediaDialog?.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    hideDialogHotspot();
    closeMediaDialog();
    return;
  }
  if (event.key === "ArrowLeft") { event.preventDefault(); navigateMedia(-1); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); navigateMedia(1); return; }
  if (event.key !== "Tab") return;
  const focusables = [...mediaDialog.querySelectorAll('a[href], button:not([disabled]):not([hidden]), textarea, input, select, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hasAttribute("hidden") && element.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
mediaDialog?.addEventListener("close", () => {
  document.body?.classList.remove("lightbox-open");
  setBackgroundHidden(false);
});
addEventListener("resize", () => {
  if (!mediaDialog?.open) return;
  setDialogGeometry(mediaDialogTrigger);
}, { passive: true });

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const CONTACT_STATE = {
    READY: "READY",
    VALIDATING: "VALIDATING",
    SENDING: "SENDING",
    RECEIVED: "RECEIVED",
    ERROR: "ERROR"
  };
  const contactMode = contactForm.dataset.contactMode || "mailto";
  const contactEndpoint = (contactForm.dataset.contactEndpoint || "").trim();
  const contactEmail = contactForm.dataset.contactEmail || "";
  const contactTimeout = Math.max(3000, Number(contactForm.dataset.contactTimeout) || 8000);
  const statusText = contactForm.querySelector("[data-contact-status-text]");
  const submitButton = contactForm.querySelector("[data-contact-submit]");
  const submitText = contactForm.querySelector("[data-contact-submit-text]");
  const mailFallbackButton = contactForm.querySelector("[data-contact-mailfallback]");
  // Cloudflare Turnstile: production-only bot check. Skipped on localhost so local
  // development has no checks; only renders when a site key is configured.
  const turnstileSiteKey = (contactForm.dataset.contactTurnstile || "").trim();
  const turnstileHost = contactForm.querySelector("[data-contact-turnstile-widget]");
  const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "::1", ""].includes(location.hostname) || location.protocol === "file:";
  const turnstileRequired = contactMode === "endpoint" && !isLocalHost && Boolean(turnstileSiteKey) && Boolean(turnstileHost);
  let turnstileWidgetId = null;
  let lastContactValues = null;
  const fields = {
    name: contactForm.elements.namedItem("name"),
    email: contactForm.elements.namedItem("email"),
    enquiryType: contactForm.elements.namedItem("enquiryType"),
    message: contactForm.elements.namedItem("message")
  };
  const errorNodes = [...contactForm.querySelectorAll("[data-contact-error-for]")].reduce((map, node) => {
    map[node.dataset.contactErrorFor] = node;
    return map;
  }, {});
  let currentContactState = CONTACT_STATE.READY;
  let lastMailtoRequest = 0;

  contactForm.noValidate = true;

  function contactSubmitLabel(state = currentContactState) {
    if (contactMode === "endpoint") {
      if (state === CONTACT_STATE.SENDING) return "Sending mail";
      if (state === CONTACT_STATE.RECEIVED) return "Message sent";
      if (state === CONTACT_STATE.ERROR) return "Try again";
      return "Send mail";
    }
    return "Open email draft";
  }

  function setContactState(state, message) {
    currentContactState = state;
    contactForm.dataset.contactState = state.toLowerCase();
    if (statusText && message) statusText.textContent = message;
    if (submitButton) submitButton.disabled = state === CONTACT_STATE.SENDING || contactMode === "disabled";
    if (submitText) submitText.textContent = contactSubmitLabel(state);
    // The mail-draft fallback only appears after a failed send; re-shown explicitly there.
    if (mailFallbackButton) mailFallbackButton.hidden = true;
  }

  function setFieldError(name, message = "") {
    const field = fields[name];
    const errorNode = errorNodes[name];
    const errorText = errorNode?.querySelector("[data-contact-error-text]");
    if (field) {
      if (message) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    }
    if (!errorNode || !errorText) return;
    errorText.textContent = message;
    errorNode.hidden = !message;
  }

  function clearContactErrors() {
    Object.keys(errorNodes).forEach(name => setFieldError(name));
  }

  function contactValues() {
    return {
      name: fields.name?.value.trim() || "",
      email: fields.email?.value.trim() || "",
      enquiryType: fields.enquiryType?.value.trim() || "",
      message: fields.message?.value.trim() || ""
    };
  }

  function validateContactFields() {
    setContactState(CONTACT_STATE.VALIDATING, "Checking the required fields.");
    clearContactErrors();
    const values = contactValues();
    const errors = [];
    const minMessage = Number(fields.message?.getAttribute("minlength")) || 20;
    const maxMessage = Number(fields.message?.getAttribute("maxlength")) || 2200;

    if (fields.name) fields.name.value = values.name;
    if (fields.email) fields.email.value = values.email;
    if (fields.message) fields.message.value = values.message;

    if (!values.name) errors.push(["name", "Please enter your name."]);
    if (!values.email) errors.push(["email", "Please enter your email address."]);
    else if (fields.email && !fields.email.validity.valid) errors.push(["email", "Use a valid email address, for example name@example.com."]);
    if (!values.message) errors.push(["message", "Please write a message."]);
    else if (values.message.length < minMessage) errors.push(["message", `Please write at least ${minMessage} characters.`]);
    else if (values.message.length > maxMessage) errors.push(["message", `Please keep the message under ${maxMessage} characters.`]);

    if (errors.length) {
      errors.forEach(([name, message]) => setFieldError(name, message));
      setContactState(CONTACT_STATE.ERROR, "Please fix the highlighted fields. Your message is still here.");
      fields[errors[0][0]]?.focus();
      return null;
    }

    return values;
  }

  function buildMailtoUrl(values) {
    const enquiry = values.enquiryType || "Portfolio message";
    const subject = `Portfolio enquiry — ${enquiry}`;
    return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(values.message)}`;
  }

  function openMailtoDraft(values) {
    const now = Date.now();
    if (now - lastMailtoRequest < 1200) {
      setContactState(CONTACT_STATE.READY, "An email draft was already requested. If nothing opened, use the direct email address beside the form.");
      return;
    }
    lastMailtoRequest = now;
    setContactState(CONTACT_STATE.READY, "Opening your email application with a prepared draft. Review and send it there.");
    try { location.href = buildMailtoUrl(values); }
    catch {
      setContactState(CONTACT_STATE.ERROR, "The email draft could not open. Your message is still here; use the direct email address beside the form.");
    }
  }

  function resetTurnstile() {
    if (turnstileRequired && window.turnstile && turnstileWidgetId !== null) {
      try { window.turnstile.reset(turnstileWidgetId); } catch { /* widget already gone */ }
    }
  }

  async function submitContactEndpoint(values) {
    const endpoint = contactEndpoint || contactForm.action;
    if (!endpoint || endpoint.startsWith("mailto:") || /(?:example\.com|your-|todo|placeholder)/i.test(endpoint)) {
      lastContactValues = values;
      setContactState(CONTACT_STATE.ERROR, "A form endpoint is not configured. Your message is still here — open a mail draft instead.");
      if (mailFallbackButton) mailFallbackButton.hidden = false;
      return;
    }

    let turnstileToken = "";
    if (turnstileRequired) {
      turnstileToken = (window.turnstile && turnstileWidgetId !== null) ? (window.turnstile.getResponse(turnstileWidgetId) || "") : "";
      if (!turnstileToken) {
        setContactState(CONTACT_STATE.ERROR, "Please complete the bot check below, then send again.");
        return;
      }
    }

    lastContactValues = values;
    const formData = new FormData(contactForm);
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("enquiryType", values.enquiryType);
    formData.set("message", values.message);
    if (turnstileToken) formData.set("cf-turnstile-response", turnstileToken);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), contactTimeout);
    setContactState(CONTACT_STATE.SENDING, "Sending your message. Your entered details remain visible.");

    try {
      const response = await fetch(endpoint, {
        method: contactForm.method || "POST",
        body: formData,
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("endpoint");
      contactForm.reset();
      clearContactErrors();
      resetTurnstile();
      setContactState(CONTACT_STATE.RECEIVED, "Message sent — thank you. I usually reply within 1-2 business days.");
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      resetTurnstile();
      setContactState(CONTACT_STATE.ERROR, timedOut
        ? "The message timed out. Try again, or open a pre-filled mail draft."
        : "The message could not be sent. Try again, or open a pre-filled mail draft.");
      if (mailFallbackButton) mailFallbackButton.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  Object.entries(fields).forEach(([name, field]) => {
    if (!field || name === "enquiryType") return;
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") setFieldError(name);
      if (currentContactState === CONTACT_STATE.ERROR && Object.values(errorNodes).every(node => node.hidden)) {
        setContactState(CONTACT_STATE.READY, contactMode === "endpoint" ? "Ready to send your message." : "Ready to prepare an email draft.");
      }
    });
  });

  contactForm.addEventListener("submit", event => {
    event.preventDefault();
    if (currentContactState === CONTACT_STATE.SENDING) return;
    const values = validateContactFields();
    if (!values) return;
    if (contactMode === "endpoint") {
      submitContactEndpoint(values);
      return;
    }
    if (contactMode === "disabled") {
      setContactState(CONTACT_STATE.ERROR, "The contact form is disabled. Please use the direct email address beside the form.");
      return;
    }
    openMailtoDraft(values);
  });

  // Error fallback: open a pre-filled email draft instead of retrying the endpoint.
  if (mailFallbackButton) {
    mailFallbackButton.addEventListener("click", () => {
      openMailtoDraft(lastContactValues || contactValues());
    });
  }

  // Production-only Cloudflare Turnstile (explicit render). No-op on localhost or
  // when no site key is configured, so local development stays check-free.
  function initContactTurnstile() {
    if (!turnstileRequired) return;
    turnstileHost.hidden = false;
    window.__contactTurnstileRender = () => {
      if (!window.turnstile) return;
      try {
        turnstileWidgetId = window.turnstile.render(turnstileHost, { sitekey: turnstileSiteKey, action: "contact", theme: "dark" });
      } catch { /* render failed; the submit gate will surface a clear message */ }
    };
    if (window.turnstile) { window.__contactTurnstileRender(); return; }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__contactTurnstileRender&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  initContactTurnstile();

  setContactState(CONTACT_STATE.READY, contactMode === "endpoint" ? "Ready to send your message." : "Ready to prepare an email draft.");
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
