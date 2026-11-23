/*
 * workbench.js — homepage only.
 * Turns the static list of systems into the workbench: an index of tabs, a CSS-3D
 * stack with a cut through the selected system, a layer-by-layer file, and a
 * quick-look drawer. Without this script every system and its full case file is
 * still on the page as plain, linked content.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const Site = window.Site || { lockScroll() {}, unlockScroll() {}, closeMenu() {} };
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ---------- Hero: the capability stack leans toward the pointer ---------- */
  const hero = document.querySelector("[data-hero]");
  const heroStack = document.querySelector("[data-hero-stack]");
  if (hero && heroStack) {
    let frame = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      frame = 0;
      // A lean of at most ±2.5° / ±3° on top of the resting pose set in the CSS: enough
      // parallax to show the depth, never as steep as a full turn toward the headline.
      heroStack.style.setProperty("--lean-x", `${(-ny * 5).toFixed(2)}deg`);
      heroStack.style.setProperty("--lean-y", `${(nx * 6).toFixed(2)}deg`);
    };
    hero.addEventListener("pointermove", event => {
      if (!finePointer.matches || motionQuery.matches) return;
      const rect = hero.getBoundingClientRect();
      nx = (event.clientX - rect.left) / rect.width - .5;
      ny = (event.clientY - rect.top) / rect.height - .5;
      if (!frame) frame = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerleave", () => {
      heroStack.style.removeProperty("--lean-x");
      heroStack.style.removeProperty("--lean-y");
    });
    // The request signal only runs while the figure is on screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => heroStack.classList.toggle("is-paused", !entry.isIntersecting)).observe(heroStack);
    }
  }

  /* ---------- Workbench ---------- */
  const bench = document.querySelector("[data-workbench]");
  if (!bench) return;

  const list = bench.querySelector("[data-wb-list]");
  const tabs = [...bench.querySelectorAll("[data-wb-tab]")];
  // "Also built" sits below the explorer, outside the bench; its files still live in it.
  const alsoLinks = [...document.querySelectorAll("[data-wb-also]")];
  const filesWrap = bench.querySelector("[data-wb-files]");
  const files = new Map([...bench.querySelectorAll("[data-system]")].map(file => [file.dataset.system, file]));
  const featured = tabs.map(tab => tab.dataset.wbTab);
  const order = [...featured, ...alsoLinks.map(link => link.dataset.wbAlso)];
  if (!tabs.length || !filesWrap) return;

  const stage = bench.querySelector("[data-wb-stage]");
  const scene = stage?.querySelector("[data-stage-scene]");
  const stack = stage?.querySelector("[data-stack]");
  const planes = [...(stage?.querySelectorAll("[data-plane]") ?? [])];
  const sockets = planes.map(plane => [...plane.querySelectorAll("[data-socket]")]);
  const tags = planes.map(plane => plane.querySelector("[data-plane-tag]"));
  const controls = stage?.querySelector("[data-stage-controls]");
  const layerButtons = [...(stage?.querySelectorAll("[data-layer-btn]") ?? [])];
  const explodeButton = stage?.querySelector("[data-explode]");
  const resetButton = stage?.querySelector("[data-reset-view]");
  const hint = stage?.querySelector("[data-stage-hint]");
  const fig = stage?.querySelector("[data-stage-fig]");
  const figSub = stage?.querySelector("[data-stage-sub]");

  const drawer = document.querySelector("[data-drawer]");
  const drawerBody = drawer?.querySelector("[data-drawer-body]");
  const drawerCrumb = drawer?.querySelector("[data-drawer-crumb]");
  const canDrawer = Boolean(drawer && drawerBody && typeof drawer.showModal === "function");

  const VIEW = { rx: 58, rz: -45 };
  const state = { selected: 0, layer: 0, rx: VIEW.rx, rz: VIEW.rz, exploded: false };

  const fileFor = key => files.get(key);
  const titleOf = key => fileFor(key)?.querySelector(".sf-title")?.textContent.trim() || key;
  const statusOf = key => fileFor(key)?.querySelector(".status")?.textContent.trim() || "";

  /* ARIA tabs over the existing anchor list. */
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "Systems");
  tabs.forEach(tab => {
    tab.parentElement?.setAttribute("role", "presentation");
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `work-${tab.dataset.wbTab}`);
    const file = fileFor(tab.dataset.wbTab);
    file?.setAttribute("role", "tabpanel");
    file?.setAttribute("aria-labelledby", tab.id);
  });
  if (canDrawer) bench.querySelectorAll("[data-open-file]").forEach(button => { button.hidden = false; });
  if (controls) controls.hidden = false;

  /* The stack is drawn in the free band between the caption and the controls. Their heights
     change with the layout (the hint hides on phones, the buttons wrap on narrow stages), so
     measure them instead of guessing; the CSS keeps static fallbacks for when this cannot run. */
  const hud = stage?.querySelector(".stage-hud");
  if (stage && hud && controls && "ResizeObserver" in window) {
    const fitBand = () => {
      const top = hud.offsetTop + hud.offsetHeight;
      const bottom = stage.clientHeight - controls.offsetTop;
      if (top > 0 && bottom > 0) {
        stage.style.setProperty("--band-top", `${Math.round(top + 8)}px`);
        stage.style.setProperty("--band-bottom", `${Math.round(bottom + 8)}px`);
      }
    };
    new ResizeObserver(() => requestAnimationFrame(fitBand)).observe(stage);
    new ResizeObserver(() => requestAnimationFrame(fitBand)).observe(controls);
  }
  if (hint) hint.textContent = finePointer.matches
    ? "Drag to turn the stack · click a layer for a quick look"
    : "Swipe sideways to turn the stack · tap a layer to highlight it";

  function syncRows() {
    document.querySelectorAll(".system-file .lc-row").forEach(row => {
      row.classList.toggle("is-active", Number(row.dataset.layer) === state.layer);
    });
  }

  function setLayer(index) {
    state.layer = clamp(index, 0, planes.length - 1);
    planes.forEach((plane, i) => plane.classList.toggle("is-active", i === state.layer));
    layerButtons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === state.layer)));
    syncRows();
  }

  function select(index, { focus = false } = {}) {
    state.selected = clamp(index, 0, featured.length - 1);
    const key = featured[state.selected];
    tabs.forEach((tab, i) => {
      const on = i === state.selected;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    featured.forEach((name, i) => fileFor(name)?.classList.toggle("is-current", i === state.selected));
    if (focus) tabs[state.selected].focus();

    const socket = sockets[0]?.[state.selected];
    if (stack && socket) {
      stack.style.setProperty("--bx", socket.style.getPropertyValue("--x"));
      stack.style.setProperty("--by", socket.style.getPropertyValue("--y"));
    }
    sockets.forEach(row => row.forEach((dot, i) => dot.classList.toggle("is-sel", i === state.selected)));
    const rows = [...(fileFor(key)?.querySelectorAll(".lc-row") ?? [])];
    tags.forEach((tag, li) => {
      if (!tag) return;
      tag.textContent = rows[li]?.dataset.tag || "";
      tag.style.setProperty("--x", stack.style.getPropertyValue("--bx"));
      tag.style.setProperty("--y", stack.style.getPropertyValue("--by"));
    });
    if (fig) fig.textContent = `Fig. ${String(state.selected + 1).padStart(2, "0")} — ${titleOf(key)}`;
    if (figSub) figSub.textContent = `Cut through ${planes.length} layers · ${statusOf(key)}`;
    syncRows();
  }

  function applyView() {
    if (!stack) return;
    stack.style.setProperty("--rx", `${state.rx.toFixed(1)}deg`);
    stack.style.setProperty("--rz", `${state.rz.toFixed(1)}deg`);
  }

  /* Tabs: click selects; arrows move; Home/End jump; Enter or Space opens the file. */
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", event => { event.preventDefault(); select(index); });
    tab.addEventListener("keydown", event => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (event.key in keys) {
        event.preventDefault();
        select((state.selected + keys[event.key] + featured.length) % featured.length, { focus: true });
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        select(event.key === "Home" ? 0 : featured.length - 1, { focus: true });
      } else if ((event.key === "Enter" || event.key === " ") && canDrawer) {
        event.preventDefault();
        openFile(featured[index], tab);
      }
    });
  });
  alsoLinks.forEach(link => link.addEventListener("click", event => {
    if (!canDrawer) return;
    event.preventDefault();
    openFile(link.dataset.wbAlso, link);
  }));

  /* Layer rows in the file, the layer switch, and hero plates all set the layer.
     Hover only previews a layer once the pointer has really moved since the last
     explicit choice: a hero plate link scrolls the page, and the row or plane that
     slides under a still cursor must not replace the layer that was just chosen. */
  let heldAt = null;
  const holdLayer = event => { heldAt = { x: event.clientX, y: event.clientY }; };
  const hoverLayer = index => { if (finePointer.matches && !heldAt) setLayer(index); };
  // Enter/over fire before the move that releases the hold, so preview what is under
  // the pointer at that moment.
  window.addEventListener("pointermove", event => {
    if (!heldAt || Math.abs(event.clientX - heldAt.x) + Math.abs(event.clientY - heldAt.y) <= 4) return;
    heldAt = null;
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest(".lc-row");
    const plane = target?.closest("[data-plane]");
    if (row && filesWrap.contains(row)) hoverLayer(Number(row.dataset.layer));
    else if (plane) hoverLayer([...planes].indexOf(plane));
  }, { passive: true });
  filesWrap.addEventListener("pointerover", event => {
    const row = event.target instanceof Element ? event.target.closest(".lc-row") : null;
    if (row) hoverLayer(Number(row.dataset.layer));
  });
  filesWrap.addEventListener("click", event => {
    const row = event.target instanceof Element ? event.target.closest(".lc-row") : null;
    if (row) setLayer(Number(row.dataset.layer));
  });
  layerButtons.forEach((button, index) => button.addEventListener("click", () => setLayer(index)));
  document.querySelectorAll("[data-layer-link]").forEach(link => link.addEventListener("click", event => {
    setLayer(Number(link.dataset.layerLink));
    holdLayer(event);
  }));

  function setExploded(on) {
    state.exploded = on;
    stack?.classList.toggle("is-exploded", on);
    explodeButton?.setAttribute("aria-pressed", String(on));
  }
  explodeButton?.addEventListener("click", () => setExploded(!state.exploded));
  // "Reset view" means the whole view: the resting angle and the closed stack. The selected
  // system and highlighted layer are choices, not view, so they stay.
  resetButton?.addEventListener("click", () => {
    state.rx = VIEW.rx;
    state.rz = VIEW.rz;
    applyView();
    setExploded(false);
  });

  /* Stage: hover picks a layer, a socket picks a system, a click opens its quick look,
     and a drag orbits. On touch, vertical swipes keep scrolling the page. */
  if (scene && stack) {
    let drag = null;
    let dragged = false;
    planes.forEach((plane, index) => {
      plane.addEventListener("pointerenter", () => { if (!drag) hoverLayer(index); });
      plane.addEventListener("click", event => {
        if (dragged) return;
        const socket = event.target instanceof Element ? event.target.closest("[data-socket]") : null;
        if (socket) { select(Number(socket.dataset.socket)); return; }
        if (finePointer.matches && canDrawer) openFile(featured[state.selected], tabs[state.selected]);
        else setLayer(index);
      });
    });
    scene.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      dragged = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rx: state.rx, rz: state.rz, touch: event.pointerType !== "mouse" };
    });
    scene.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!dragged && Math.abs(dx) + Math.abs(dy) > 5) {
        dragged = true;
        stack.classList.add("is-dragging");
        try { scene.setPointerCapture(drag.id); } catch { /* capture is a nicety */ }
      }
      if (!dragged) return;
      state.rz = drag.rz + dx * .3;
      if (!drag.touch) state.rx = clamp(drag.rx - dy * .25, 20, 80);
      applyView();
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      stack.classList.remove("is-dragging");
      setTimeout(() => { dragged = false; }, 0);
    };
    scene.addEventListener("pointerup", endDrag);
    scene.addEventListener("pointercancel", endDrag);
    scene.addEventListener("lostpointercapture", endDrag);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        stage.classList.toggle("is-offscreen", !entries[0].isIntersecting);
      }).observe(stage);
    }
  }

  /* ---------- "Also built": fold and unfold the register ----------
     Folded, the list is hidden and one line names every entry; links to the register
     unfold it, and the choice is kept for the next visit. */
  const register = document.querySelector("[data-ab]");
  const registerToggle = register?.querySelector("[data-ab-toggle]");
  const registerList = register?.querySelector("#also-built-list");
  const registerNames = register?.querySelector("[data-ab-names]");
  const REGISTER_KEY = "portfolio-also-built";
  function setRegister(open, { store = true } = {}) {
    if (!registerToggle || !registerList) return;
    registerList.hidden = !open;
    if (registerNames) registerNames.hidden = open;
    registerToggle.setAttribute("aria-expanded", String(open));
    const label = registerToggle.querySelector("[data-ab-toggle-label]");
    if (label) label.textContent = open ? "Hide" : `Show all ${alsoLinks.length}`;
    if (store) { try { localStorage.setItem(REGISTER_KEY, open ? "open" : "folded"); } catch { /* the choice still applies to this page */ } }
  }
  if (registerToggle && registerList) {
    let saved = null;
    try { saved = localStorage.getItem(REGISTER_KEY); } catch { /* no storage: start open */ }
    registerToggle.hidden = false;
    setRegister(saved !== "folded" || location.hash === "#also-built", { store: false });
    registerToggle.addEventListener("click", () => setRegister(registerList.hidden));
    document.querySelectorAll('a[href="#also-built"]').forEach(link => link.addEventListener("click", () => setRegister(true)));
  }

  /* ---------- Quick-look drawer ----------
     The drawer shows the system file itself, moved in from the explorer and put back on close. */
  let openKey = null;
  let placeholder = null;
  let returnFocus = null;
  let closeTimer = 0;

  function restoreFile() {
    if (!openKey || !placeholder) return;
    const file = fileFor(openKey);
    placeholder.replaceWith(file);
    file.querySelector(".sf-title")?.removeAttribute("tabindex");
    placeholder = null;
    openKey = null;
  }

  function mountFile(key) {
    restoreFile();
    const file = fileFor(key);
    if (!file) return;
    placeholder = document.createElement("div");
    placeholder.className = "sf-placeholder";
    placeholder.style.height = `${file.offsetHeight}px`;
    file.before(placeholder);
    drawerBody.replaceChildren(file);
    drawerBody.scrollTop = 0;
    openKey = key;
    const index = order.indexOf(key);
    if (drawerCrumb) drawerCrumb.innerHTML = `Quick look ${String(index + 1).padStart(2, "0")} / ${String(order.length).padStart(2, "0")}<span class="crumb-extra"> · ← → to move</span>`;
    const title = file.querySelector(".sf-title");
    if (title) {
      drawer.setAttribute("aria-labelledby", title.id);
      drawer.removeAttribute("aria-label");
      title.tabIndex = -1;
    }
    const featuredIndex = featured.indexOf(key);
    if (featuredIndex >= 0) select(featuredIndex);
    alsoLinks.forEach(link => link.classList.toggle("is-current", link.dataset.wbAlso === key));
    syncRows();
  }

  /* Opening or closing a quick look from the page is a view transition where the browser has
     them and motion is welcome: the panel's screenshot preview grows into the quick look's
     screenshot, the system's name moves with it, and the drawer slides in under them (the
     stylesheet names them). Anywhere else the drawer slides on its own CSS transition. */
  const canMorph = typeof document.startViewTransition === "function";
  const morphing = () => canMorph && !motionQuery.matches && document.visibilityState === "visible";
  function withTransition(update, { closing = false } = {}) {
    root.classList.add("vt-quick-look");
    root.classList.toggle("vt-closing", closing);
    let transition;
    try { transition = document.startViewTransition(update); } catch { root.classList.remove("vt-quick-look"); update(); return; }
    transition.finished.finally(() => root.classList.remove("vt-quick-look", "vt-closing"));
  }

  function openFile(key, trigger, { animate = true } = {}) {
    if (!canDrawer || !fileFor(key)) return;
    clearTimeout(closeTimer);
    Site.closeMenu();
    const opening = !drawer.open;
    const show = settled => {
      mountFile(key);
      if (opening) {
        returnFocus = trigger || document.activeElement;
        drawer.showModal();
        Site.lockScroll();
        bench.classList.add("is-drawer-open");
        if (settled) drawer.classList.add("is-visible");
        else requestAnimationFrame(() => drawer.classList.add("is-visible"));
      }
      fileFor(key).querySelector(".sf-title")?.focus({ preventScroll: true });
    };
    if (opening && animate && morphing()) withTransition(() => show(true));
    else show(false);
  }

  function step(direction) {
    if (!openKey) return;
    const index = order.indexOf(openKey);
    openFile(order[(index + direction + order.length) % order.length]);
  }

  /* Focus goes back to the control that opened the quick look. Moving to another system
     inside the drawer can hide that control (each system's panel shows only while it is
     selected), so fall back to the control that now stands for the system last shown:
     its tab for one of the six, its register row's "Quick look" for the rest. */
  const isUsable = element => element instanceof HTMLElement && element.isConnected
    && !element.closest("[hidden], [inert]") && !element.matches(":disabled")
    && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  function focusAfterClose(trigger, key) {
    if (isUsable(trigger) && trigger !== document.body) { trigger.focus({ preventScroll: true }); return; }
    const featuredIndex = featured.indexOf(key);
    const fallback = featuredIndex >= 0 ? tabs[featuredIndex] : alsoLinks.find(link => link.dataset.wbAlso === key);
    // The fallback may be off screen (a register row further down), so let focus scroll to it.
    // A folded register hides its rows, so its toggle stands in for them.
    if (isUsable(fallback)) fallback.focus();
    else if (featuredIndex < 0 && isUsable(registerToggle)) registerToggle.focus();
  }

  function finishClose() {
    const shownKey = openKey;
    restoreFile();
    alsoLinks.forEach(link => link.classList.remove("is-current"));
    if (drawer.open) drawer.close();
    Site.unlockScroll();
    const target = returnFocus;
    returnFocus = null;
    focusAfterClose(target, shownKey);
  }

  function closeDrawer() {
    if (!drawer?.open) return;
    if (morphing()) {
      clearTimeout(closeTimer);
      withTransition(() => { drawer.classList.remove("is-visible"); bench.classList.remove("is-drawer-open"); finishClose(); }, { closing: true });
      return;
    }
    drawer.classList.remove("is-visible");
    bench.classList.remove("is-drawer-open");
    if (motionQuery.matches) finishClose();
    else closeTimer = setTimeout(finishClose, 420);
  }

  if (canDrawer) {
    bench.addEventListener("click", event => {
      const button = event.target instanceof Element ? event.target.closest("[data-open-file]") : null;
      if (button) openFile(button.dataset.openFile, button);
    });
    drawer.querySelector("[data-drawer-close]")?.addEventListener("click", closeDrawer);
    drawer.querySelector("[data-drawer-prev]")?.addEventListener("click", () => step(-1));
    drawer.querySelector("[data-drawer-next]")?.addEventListener("click", () => step(1));
    drawer.addEventListener("cancel", event => { event.preventDefault(); closeDrawer(); });
    drawer.addEventListener("click", event => {
      if (event.target !== drawer) return;
      const rect = drawer.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) closeDrawer();
    });
    drawer.addEventListener("keydown", event => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    });
    // Only a page restored from the back/forward cache: pageshow also fires on every normal
    // load, and closing then would undo a #work-<"Also built" file> deep link the moment it opened.
    addEventListener("pageshow", event => { if (event.persisted && drawer.open) finishClose(); });
  }

  /* ---------- Deep links: #work-<system> selects or opens that system ---------- */
  /* A hand-edited or truncated link (#work-%, #work-%E0%A4) must not stop the workbench from
     starting, and an unknown key changes nothing. */
  function keyFromHash(hash) {
    const match = /^#work-(.+)$/.exec(hash);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
  }

  function fromHash({ scroll = false } = {}) {
    const key = keyFromHash(location.hash);
    if (!key) return;
    const index = featured.indexOf(key);
    if (index >= 0) select(index);
    else if (order.includes(key) && canDrawer) openFile(key, null, { animate: false });
    else return;
    if (scroll) document.getElementById("work")?.scrollIntoView({ block: "start" });
  }

  /* "Back to the explorer" from a case study shows the system the visitor came from (a hint
     the case page leaves for a plain click; a #work-<system> link still wins). */
  function selectFromHint() {
    if (keyFromHash(location.hash)) return;
    let hint = null;
    try { hint = JSON.parse(sessionStorage.getItem("wb-select") || "null"); sessionStorage.removeItem("wb-select"); } catch { return; }
    const index = hint && Date.now() - hint.t < 8000 ? featured.indexOf(hint.key) : -1;
    if (index >= 0) select(index);
  }

  bench.classList.add("wb-ready");
  select(0);
  selectFromHint();
  setLayer(0);
  applyView();
  fromHash({ scroll: true });
  addEventListener("hashchange", () => fromHash({ scroll: true }));
  root.classList.add("workbench-ready");
})();
