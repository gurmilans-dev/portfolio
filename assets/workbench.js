/*
 * workbench.js — homepage only.
 * Turns the static list of systems into the workbench: an index of tabs, a CSS-3D
 * stack with a cut through the selected system, a layer-by-layer file, and a
 * quick-look drawer. Without this script every system and its full case file is
 * still on the page as plain, linked content. It also switches the explorer between its
 * two views, loading assets/universe.js the first time the Universe view is chosen.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  // universe.js lives beside this script (read now: currentScript is only set while it first runs).
  const universeSrc = new URL("universe.js", document.currentScript?.src || new URL("/assets/", location.href)).href;
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
      // Not while the drawing is transparent and a copy stands in for it (see the morph below).
      if (!finePointer.matches || motionQuery.matches || root.classList.contains("is-morphing")) return;
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
  let morph = null; // the hero-to-explorer transformation, set up below
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
    morph?.sync();
  }

  function select(index, { focus = false, remember = true } = {}) {
    state.selected = clamp(index, 0, featured.length - 1);
    const key = featured[state.selected];
    if (remember) { try { history.replaceState({ ...(history.state || {}), wbSystem: key }, ""); } catch { /* the selection still applies */ } }
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
    morph?.sync();
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
    morph?.sync();
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
    // While the drawing turns into the model (the morph below), the real model is transparent
    // and takes no input.
    const away = () => root.classList.contains("is-morphing");
    planes.forEach((plane, index) => {
      plane.addEventListener("pointerenter", () => { if (!drag && !away()) hoverLayer(index); });
      plane.addEventListener("click", event => {
        if (dragged || away()) return;
        const socket = event.target instanceof Element ? event.target.closest("[data-socket]") : null;
        if (socket) { select(Number(socket.dataset.socket)); return; }
        if (finePointer.matches && canDrawer) openFile(featured[state.selected], tabs[state.selected]);
        else setLayer(index);
      });
    });
    scene.addEventListener("pointerdown", event => {
      if (event.button !== 0 || away()) return;
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
  let openedAt = 0;
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
  function withTransition(update, { closing = false, after } = {}) {
    root.classList.add("vt-quick-look");
    root.classList.toggle("vt-closing", closing);
    let transition;
    try { transition = document.startViewTransition(update); } catch { root.classList.remove("vt-quick-look"); update(); after?.(); return; }
    window.__guardTransition?.(transition); // a click while it runs is carried through, not lost
    transition.ready.catch(() => {}); // skipped on purpose (a press, another transition): not an error
    transition.finished.finally(() => { root.classList.remove("vt-quick-look", "vt-closing"); after?.(); });
  }

  function openFile(key, trigger, { animate = true } = {}) {
    if (!canDrawer || !fileFor(key)) return;
    clearTimeout(closeTimer);
    Site.closeMenu();
    const opening = !drawer.open;
    const show = settled => {
      mountFile(key);
      if (opening) {
        openedAt = performance.now();
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

  function finishClose({ unlock = true } = {}) {
    const shownKey = openKey;
    restoreFile();
    alsoLinks.forEach(link => link.classList.remove("is-current"));
    if (drawer.open) drawer.close();
    if (unlock) Site.unlockScroll();
    const target = returnFocus;
    returnFocus = null;
    focusAfterClose(target, shownKey);
  }

  function closeDrawer() {
    if (!drawer?.open) return;
    if (morphing()) {
      clearTimeout(closeTimer);
      withTransition(() => { drawer.classList.remove("is-visible"); bench.classList.remove("is-drawer-open"); finishClose({ unlock: false }); }, { closing: true, after: () => Site.unlockScroll() });
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
      if (event.target !== drawer || event.detail > 1 || performance.now() - openedAt < 350) return;
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
    // A link changes view at once: a change between the views under way ends first.
    if (key === "universe" || index >= 0) universe?.settle();
    // #work-universe opens the Universe view; a link to one of the six systems shows its file,
    // in the Architecture view. Either way the address already says so.
    if (key === "universe") setView("universe", { address: false });
    else if (index >= 0) { setView("architecture", { address: false }); select(index); }
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

  /* ---------- One stack, one story ----------
     On wide screens the drawing does not just scroll away: it turns into the explorer's model,
     travelling to wherever the stage is (the middle column from 1280px, under the systems from
     960px). From the first few pixels of scroll until the model stands whole on the screen (see
     range() below), a copy of the four plates (aria-hidden, inert, never focusable or clickable)
     lies exactly over the drawing, and with the scroll each plate tips back, turns and squares
     into a floor until it lies exactly over the stage's own stack, which then takes over. The copy is built and the
     still parts of both figures measured while the page is idle (again after a resize); the
     start of the scroll only reads what can change from moment to moment (the drawing's lean,
     the model's angle). On scroll, in one animation frame, only transforms and opacity change,
     written on the few elements that move and only when they change, so a frame lays nothing
     out. The real figures stay in the page throughout, only transparent. Scrolling back plays
     it back; a fast scroll or a jump just lands where it lands. Reduced motion, narrower
     layouts, a focused hero plate and a device too slow for it keep the two figures as they are
     (narrower layouts fold the drawing in place instead, below). */
  morph = (() => {
    const heroVisual = document.querySelector("[data-hero-visual]");
    const heroPlates = heroStack ? [...heroStack.querySelectorAll(".hero-stack > .plate")] : [];
    const spin = stack?.querySelector(".stack-spin");
    const header = document.querySelector("[data-header]");
    // Without DOMMatrix (a very old browser) both figures simply stay as they are.
    if (!hero || !heroStack || !heroVisual || !stage || !scene || !stack || !spin || heroPlates.length !== planes.length || typeof DOMMatrix !== "function") return null;
    const wide = matchMedia("(min-width: 960px) and (min-height: 560px)");
    const num = value => parseFloat(value) || 0;

    // The layer for the copy, made the first time it is built (never, on a phone or with reduced
    // motion). In the stage, under its caption and controls: fixed to the window, it is not
    // clipped by the stage, and it paints above the stage's background but below everything written.
    let layer = null;
    let plates = [];
    function makeLayer() {
      layer = Object.assign(document.createElement("div"), { className: "stack-morph", inert: true });
      layer.setAttribute("aria-hidden", "true");
      plates = heroPlates.map((_, i) => {
        const plate = Object.assign(document.createElement("div"), { className: "morph-plate" });
        plate.style.zIndex = String(planes.length - i);
        plate.innerHTML = '<div class="morph-face"></div><div class="morph-card"></div><div class="plane"></div>';
        layer.append(plate);
        return plate;
      });
      stage.prepend(layer);
    }

    let geo = null;
    let span = null;
    let passed = false; // this pass through the range goes by without the change
    let active = false;
    let frame = 0;
    let focusHeld = false;
    let arriving = 0;

    // A layout box without the element's pose: drop the transform, read, put it back without a
    // transition (three style passes in one task, so nothing is ever painted flat).
    function unposed(el, flatClass, read) {
      el.classList.add("is-steady", flatClass);
      const value = read();
      el.classList.remove(flatClass);
      void el.offsetWidth;
      el.classList.remove("is-steady");
      return value;
    }

    // The copies: each card with the drawing's plate content, each floor with the stage's plane.
    // They are built while the page is idle (again after a resize or a new system), so the start
    // of the scroll only has to pose them, and a frame of scroll only moves and fades them.
    let parts = [];
    let built = null;
    // A device that cannot build the copy quickly will not move it smoothly either. The first
    // build (cloning, then the copy's first styles and layout) takes about 10 ms on an ordinary
    // laptop. Where it takes longer than about three frames, the copy is built once more a moment
    // later (warm, that is about half as long), and if that one is still slow, the figures stay
    // as they are, as with reduced motion. The decision falls before the scroll that needs it.
    const BUDGET = { first: 45, again: 30 };
    let builds = 0;
    let suspect = false;
    let slow = false;
    let bx = .5;
    let by = .5;
    function build() {
      const began = performance.now();
      if (!layer) makeLayer();
      // Every read first, then every write, so the browser lays the page out once. Sizes come
      // from the computed width and height (layout sizes, without any pose), so nothing in the
      // page is touched while it is idle.
      const gap = getComputedStyle(heroStack).getPropertyValue("--gap");
      const S = num(getComputedStyle(stack).width);
      const reads = heroPlates.map(real => {
        const cs = getComputedStyle(real);
        const list = real.querySelector(".plate-chips");
        return { w: num(cs.width), h: num(cs.height), padding: cs.padding, gap: cs.rowGap, list: list ? { x: list.offsetLeft, y: list.offsetTop } : null };
      });
      bx = num(stack.style.getPropertyValue("--bx")) / 100 || .5;
      by = num(stack.style.getPropertyValue("--by")) / 100 || .5;
      layer.style.setProperty("--s", `${S}px`);
      layer.style.setProperty("--morph-gap", gap);
      parts = heroPlates.map((real, i) => {
        const [face, card, plane] = plates[i].children;
        const { w, h } = reads[i];
        Object.assign(face.style, { width: `${w}px`, height: `${h}px` });
        Object.assign(card.style, { left: `${-w / 2}px`, top: `${-h / 2}px`, width: `${w}px`, padding: reads[i].padding, gap: reads[i].gap });
        card.replaceChildren(...[...real.children].filter(child => !child.classList.contains("plate-wire")).map(child => child.cloneNode(true)));
        card.querySelectorAll("a, [id]").forEach(el => { el.removeAttribute("id"); if (el.tagName === "A") el.replaceWith(Object.assign(document.createElement("span"), { className: el.className, innerHTML: el.innerHTML })); });
        const list = card.querySelector(".plate-chips");
        const chips = list && reads[i].list ? { el: list, ...reads[i].list } : null;
        plane.className = `plane${planes[i].classList.contains("is-active") ? " is-active" : ""}`;
        plane.innerHTML = planes[i].innerHTML;
        const detail = Object.assign(document.createElement("div"), { className: "morph-detail" });
        detail.append(...plane.querySelectorAll(".socket, .plane-tag"));
        plane.append(detail);
        return { face, plane, detail, chips, w, h, texts: [...card.children].filter(child => !child.classList.contains("plate-chips")) };
      });
      built = { S };
      // Already in the drawing's look, so the start of the scroll only has to pose the plates.
      const rest = looks(0);
      parts.forEach(part => shape(part, part.w, part.h, rest));
      dress();
      void layer.offsetWidth;
      const took = performance.now() - began;
      builds++;
      if (builds === 1) suspect = took > BUDGET.first;
      else if (builds === 2 && suspect) slow = took > BUDGET.again;
    }
    // Built for the figures as they are now (to within half a pixel)?
    const fits = () => built && Math.abs(built.S - geo.S) < .5 && geo.from.every((plate, i) => Math.abs(plate.w - parts[i].w) < .5 && Math.abs(plate.h - parts[i].h) < .5);
    // At the start, each card's face as the drawing shows it at that moment (a hovered plate is lit).
    function dress() {
      const faces = heroPlates.map(real => getComputedStyle(real)).map(cs => [cs.borderTopColor, cs.backgroundColor, cs.boxShadow]);
      parts.forEach(({ face }, i) => { put(face, "border-color", faces[i][0]); put(face, "background-color", faces[i][1]); put(face, "box-shadow", faces[i][2]); });
    }

    // A style is written only when its value changes, so a frame touches only what moves.
    const written = new WeakMap();
    function put(el, property, value) {
      let last = written.get(el);
      if (!last) written.set(el, last = {});
      if (last[property] === value) return;
      last[property] = value;
      el.style.setProperty(property, value);
    }

    // What the scroll does not change: the figures' layout boxes without their pose, both
    // perspectives, where the stage is. Measured while the page is idle, so the start of the
    // scroll does not have to, and again after a resize. Not while either figure is in a
    // transition (measuring sets it steady, which would cut the transition short), and not while
    // the stage is stuck under the header (its place in the page would read wrong).
    let still = null;
    // Whether this browser draws the stage's floors apart in depth. Some engines accept the
    // stack's preserve-3d (CSS.supports and the computed style both say so) but lay all four
    // floors on one plane; Playwright's WebKit build does. The copy's four floors could not land
    // on one, so there the change stands aside, and both figures stay as they are. Read from the
    // floors themselves, so it follows what the browser actually does, not what it claims.
    let flat = false;
    const inTransition = el => typeof CSSTransition === "function" && el.getAnimations?.({ subtree: true }).some(animation => animation instanceof CSSTransition);
    const settled = () => !inTransition(heroStack) && !inTransition(stack);
    function measureStill() {
      const x = scrollX;
      const y = scrollY;
      const visualBox = heroVisual.getBoundingClientRect();
      const visualStyle = getComputedStyle(heroVisual);
      const [vox, voy] = visualStyle.perspectiveOrigin.split(" ").map(num);
      const figStyle = getComputedStyle(heroStack);
      const [ftx = 0, fty = 0] = figStyle.translate === "none" ? [] : figStyle.translate.split(" ").map(num);
      const tilt = { x: num(figStyle.getPropertyValue("--tilt-x")), y: num(figStyle.getPropertyValue("--tilt-y")), z: num(figStyle.getPropertyValue("--tilt-z")) };
      const sceneBox = scene.getBoundingClientRect();
      const sceneStyle = getComputedStyle(scene);
      const [sox, soy] = sceneStyle.perspectiveOrigin.split(" ").map(num);
      const { fig, boxes } = unposed(heroStack, "is-measuring", () => ({ fig: heroStack.getBoundingClientRect(), boxes: heroPlates.map(plate => plate.getBoundingClientRect()) }));
      const stackBox = unposed(stack, "is-flat", () => stack.getBoundingClientRect());
      const S = stackBox.width;
      stack.classList.add("is-steady");
      const tops = planes.map(plane => plane.getBoundingClientRect().top);
      stack.classList.remove("is-steady");
      flat = Math.max(...tops) - Math.min(...tops) < Math.max(1, S * .01);
      still = {
        tilt, S,
        figure: { x: fig.left + ftx + fig.width / 2 + x, y: fig.top + fty + fig.height / 2 + y },
        plates: boxes.map(box => ({ x: box.left + box.width / 2 - fig.left - fig.width / 2, y: box.top + box.height / 2 - fig.top - fig.height / 2, w: box.width, h: box.height })),
        model: { x: stackBox.left + S / 2 + x, y: stackBox.top + S / 2 + y },
        P0: num(visualStyle.perspective), P1: num(sceneStyle.perspective),
        O0: { x: visualBox.left + vox + x, y: visualBox.top + voy + y },
        O1: { x: sceneBox.left + sox + x, y: sceneBox.top + soy + y }
      };
    }

    // What can change from one moment to the next, read in one go at the start: the lean the
    // pointer gives the drawing, a plate lifted under the pointer, the view the model is turned
    // to, the angle it has drifted to and the spacing of its floors.
    function measure() {
      if (!still) measureStill();
      const lifts = heroPlates.map(plate => {
        const cs = getComputedStyle(plate);
        const m = cs.transform === "none" ? new DOMMatrix() : new DOMMatrix(cs.transform);
        const [tx = 0, ty = 0, tz = 0] = cs.translate === "none" ? [] : cs.translate.split(" ").map(num);
        return { x: m.m41 + tx, y: m.m42 + ty, z: m.m43 + tz };
      });
      const stackStyle = getComputedStyle(stack);
      const rx = num(stackStyle.getPropertyValue("--rx")) || VIEW.rx;
      const rz = num(stackStyle.getPropertyValue("--rz")) || VIEW.rz;
      const turn = new DOMMatrix(getComputedStyle(spin).transform);
      const spun = Math.atan2(turn.b, turn.a) * 180 / Math.PI;
      const floors = planes.map(plane => new DOMMatrix(getComputedStyle(plane).transform).m43);
      const ax = still.tilt.x + num(heroStack.style.getPropertyValue("--lean-x"));
      const ay = still.tilt.y + num(heroStack.style.getPropertyValue("--lean-y"));
      const az = still.tilt.z;
      const R0 = new DOMMatrix(`rotateX(${ax}deg) rotateY(${ay}deg) rotateZ(${az}deg)`);
      const R1 = new DOMMatrix(`rotateX(${rx}deg) rotateZ(${rz}deg) rotateZ(${spun}deg)`);
      const { S, figure, model } = still;
      geo = {
        S, P0: still.P0, P1: still.P1, O0: still.O0, O1: still.O1,
        from: still.plates.map((plate, i) => {
          const d = R0.transformPoint({ x: plate.x + lifts[i].x, y: plate.y + lifts[i].y, z: lifts[i].z });
          return { x: figure.x + d.x, y: figure.y + d.y, z: d.z, ax, ay, az, w: plate.w, h: plate.h };
        }),
        to: floors.map(z => {
          const d = R1.transformPoint({ x: 0, y: 0, z });
          return { x: model.x + d.x, y: model.y + d.y, z: d.z, ax: rx, ay: 0, az: rz + spun, w: S, h: S };
        })
      };
    }

    // Each part of the change has its own stretch of the scroll: the plates turn first, then
    // square into floors; position and perspective follow the whole way.
    const stretch = (t, from, to) => { const u = Math.min(1, Math.max(0, (t - from) / (to - from))); return u * u * (3 - 2 * u); };
    // A linear ramp from 0 to 1 that starts at `from` and climbs at `rate` per unit of progress.
    const ramp = (t, from, rate) => Math.min(1, Math.max(0, (t - from) * rate)).toFixed(3);
    // The card's lines go first, its technologies drain into the selected system's socket, the
    // face gives way to the floor, and the floor's sockets and label come up last.
    const looks = t => ({
      standoff: (1 - ramp(t, 0, 8)).toFixed(3),
      text: (1 - ramp(t, .06, 4.5)).toFixed(3),
      drain: +ramp(t, .08, 2.6),
      chip: (1 - ramp(t, .3, 4)).toFixed(3),
      face: (1 - ramp(t, .3, 3.4)).toFixed(3),
      floor: ramp(t, .25, 3.4),
      detail: ramp(t, .6, 3)
    });
    // One plate's copy at a size between the card's and the floor's, and a look.
    function shape(part, w, h, { standoff, text, drain, chip, face, floor, detail }) {
      put(part.face, "transform", `translate(-50%, -50%) scale(${(w / part.w).toFixed(4)}, ${(h / part.h).toFixed(4)})`);
      put(part.face, "opacity", face);
      put(part.face, "--standoff", standoff);
      part.texts.forEach(el => put(el, "opacity", text));
      if (part.chips) {
        const { el, x, y } = part.chips;
        put(el, "opacity", chip);
        if (chip !== "0.000") {
          // The socket, in the list's own coordinates (the card stays the drawing's size), and
          // the list scaled about it.
          const sx = ((bx - .5) * w + part.w / 2 - x).toFixed(2);
          const sy = ((by - .5) * h + part.h / 2 - y).toFixed(2);
          put(el, "transform", drain ? `translate(${sx}px, ${sy}px) scale(${(1 - drain * .8).toFixed(3)}) translate(${-sx}px, ${-sy}px)` : "none");
        }
      }
      put(part.plane, "transform", `translate(-50%, -50%) scale(${(w / built.S).toFixed(4)}, ${(h / built.S).toFixed(4)})`);
      put(part.plane, "opacity", floor);
      put(part.detail, "opacity", detail);
    }
    // y and x are read before anything is written in the frame: reading the scroll offset after
    // a write makes the browser bring styles up to date first.
    function render(y, x) {
      if (!span) span = range();
      const t = Math.min(1, Math.max(0, (y - span.y0) / (span.y1 - span.y0)));
      const turn = stretch(t, 0, .75);
      const square = stretch(t, .3, 1);
      const p = stretch(t, 0, 1);
      const mix = (a, b, k = p) => a + (b - a) * k;
      const look = looks(t);
      put(layer, "perspective", `${mix(geo.P0, geo.P1).toFixed(1)}px`);
      put(layer, "perspective-origin", `${(mix(geo.O0.x, geo.O1.x) - x).toFixed(2)}px ${(mix(geo.O0.y, geo.O1.y) - y).toFixed(2)}px`);
      plates.forEach((plate, i) => {
        const a = geo.from[i];
        const b = geo.to[i];
        put(plate, "transform", `translate3d(${(mix(a.x, b.x) - x).toFixed(2)}px, ${(mix(a.y, b.y) - y).toFixed(2)}px, ${mix(a.z, b.z).toFixed(2)}px) rotateX(${mix(a.ax, b.ax, turn).toFixed(3)}deg) rotateY(${mix(a.ay, b.ay, turn).toFixed(3)}deg) rotateZ(${mix(a.az, b.az, turn).toFixed(3)}deg)`);
        shape(parts[i], mix(a.w, b.w, square), mix(a.h, b.h, square), look);
      });
    }

    // Where it runs: from the first few pixels of scroll until the model stands whole on the
    // screen, so it never looks finished while the copy still stands in for it. That is the later
    // of two points, both read from the page: where the model's lowest floor, as drawn, comes into
    // the window, and where the drawing's lowest plate has left it at the top (the drawing shows
    // again once the change is over, so by then it must be out of sight, header included). Never
    // later than where the workbench's top reaches the header and the stage settles, or where a
    // link to #work lands, if that is a little earlier (so "View work", the header's Work link and
    // project links always land on the stage itself). Ending earlier changes nothing at the
    // hand-over: the stage only sticks once the workbench reaches the header, so until then it
    // moves with the page, and the copy lands exactly where the model is at that moment.
    // The figures are read only where the page has them in place: not once the stage has stuck
    // under the header, nor while either is in a transition, unless the change is starting
    // (`now`); until then the stage's landing stands in (`rough`), and they are read again later.
    function range(now = false) {
      const top = (el) => el.getBoundingClientRect().top + scrollY - (header?.offsetHeight || 0);
      const work = document.getElementById("work");
      // Two pixels to spare, for a landing rounded down.
      const end = Math.min(top(bench), work ? top(work) : Infinity) - 2;
      const y0 = Math.min(48, end / 6);
      if (scrollY >= end || (!now && !settled())) return { y0, y1: end, end, rough: true };
      const lowest = (els) => Math.max(...[...els].map((el) => el.getBoundingClientRect().bottom)) + scrollY;
      const whole = lowest(scene.querySelectorAll(".plane, .plane-tag")) - innerHeight;
      const gone = lowest(heroPlates);
      return { y0, y1: Math.min(end, Math.max(whole, gone)), end, rough: false };
    }
    // Before it starts, the request trace and the caption leave the drawing over those first
    // pixels, so only the plates travel.
    const leadOut = [...heroStack.querySelectorAll(".plate-wire, .fig-cap")];
    // While the page is idle, the copies are built ahead of the scroll that needs them.
    let idle = 0;
    const later = "requestIdleCallback" in window ? fn => requestIdleCallback(fn, { timeout: 1500 }) : fn => setTimeout(fn, 300);
    function prepare(y) {
      // A resize may have just cleared the range; find it again.
      if (!span) span = range();
      if (idle || (built && (still || y >= span.y1))) return;
      idle = later(() => {
        idle = 0;
        if (active || !allowed()) return;
        if (!span) span = range();
        // The still parts first: measuring them also tells whether this browser draws the floors
        // apart at all, and if it does not, nothing needs building.
        const pending = !still && scrollY < span.y1;
        if (pending && settled()) measureStill();
        if (!allowed()) return;
        if (!built) build();
        // One slow build may be a cold start or a passing hiccup: build once more, a moment later.
        if (suspect && builds === 1) { built = null; idle = setTimeout(() => { idle = 0; if (!active && allowed()) prepare(scrollY); }, 250); return; }
        // Still in a transition (the stage settles for a moment after load, a plate may be
        // lifting under the pointer): measure once it is over.
        if (pending && !still) idle = setTimeout(() => { idle = 0; if (!active && allowed()) prepare(scrollY); }, 600);
      });
    }

    // In the Universe view the model is not there to land on: the drawing stays as it is.
    const allowed = () => wide.matches && !motionQuery.matches && !focusHeld && !slow && !flat && root.classList.contains("workbench-ready") && !bench.classList.contains("is-universe");

    function start() {
      // Not built ahead (a scroll straight after load): build now, and if that was slow, let this
      // pass go by without the change rather than run it badly (see BUDGET).
      if (!built) {
        build();
        if (suspect) return false;
      }
      // The stage's stack holds still while it is being stood in for, so it is found exactly
      // where the copy left it.
      stage.classList.add("is-held");
      measure();
      if (flat) { stage.classList.remove("is-held"); return false; }
      if (!fits()) build();
      dress();
      // The end, read afresh from the figures as they stand now (the drawing's lean, the angle
      // the model is held at, its floors' spacing).
      span = range(true);
      active = true;
      root.classList.add("is-morphing");
      return true;
    }
    function stop(y) {
      const landed = !!span && y >= span.y1;
      active = false;
      root.classList.remove("is-morphing");
      stage.classList.remove("is-held");
      if (landed) {
        clearTimeout(arriving);
        stack.classList.add("is-arriving");
        arriving = setTimeout(() => stack.classList.remove("is-arriving"), 800);
      }
    }

    /* Narrower layouts (the explorer's stage far below the selected system): the same gesture,
       in place. As the drawing leaves the screen its cards tip back and part into floors
       (.is-folding), and as the stage comes into view its floors close up from apart and the cut
       is drawn through them (.is-settling). Both follow the scroll and run backwards with it. */
    let folds = null;
    // The elements that move, written directly (the tilt and the floor spacing stay the CSS's own).
    const fading = [...heroStack.querySelectorAll(".hero-stack > .plate .plate-chips, .hero-stack > .plate .plate-title")];
    const beams = [...stack.querySelectorAll(".beam")];
    function pose(f, s) {
      put(heroStack, "transform", f ? `rotateX(calc(var(--tilt-x) + ${(f * 32).toFixed(2)}deg)) rotateY(calc(var(--tilt-y) * ${(1 - f).toFixed(3)})) rotateZ(calc(var(--tilt-z) - ${(f * 22).toFixed(2)}deg))` : "");
      heroPlates.forEach((plate, i) => put(plate, "transform", f ? `translateZ(${(1 + (3 - i) * f * 22).toFixed(2)}px)` : ""));
      fading.forEach(el => put(el, "opacity", f ? Math.max(0, 1 - f * 1.4).toFixed(3) : ""));
      planes.forEach(plane => put(plane, "transform", s ? `translateZ(calc(var(--z) * var(--gap) * ${(1 + (1 - s) * 1.1).toFixed(4)}))` : ""));
      beams.forEach(beam => put(beam, "scale", s ? `1 1 ${s.toFixed(3)}` : ""));
    }
    const stretchOf = (value, from, length) => Math.min(1, Math.max(0, (value - from) / length));
    function fold(y) {
      if (!folds) {
        const fig = unposed(heroStack, "is-measuring", () => heroStack.getBoundingClientRect());
        const box = stage.getBoundingClientRect();
        folds = { top: fig.top + y, height: fig.height, stage: box.top + y };
      }
      const headerH = header?.offsetHeight || 0;
      const f = stretchOf(y + headerH, folds.top + folds.height * .35, folds.height * .65);
      const s = stretchOf(y + innerHeight, folds.stage, innerHeight * .55);
      const settles = s > 0 && s < 1;
      heroStack.classList.toggle("is-folding", f > 0);
      stage.classList.toggle("is-settling", settles);
      pose(f > 0 ? f : 0, settles ? s : 0);
    }
    function unfold() {
      pose(0, 0);
      heroStack.classList.remove("is-folding");
      stage.classList.remove("is-settling");
    }

    function update() {
      frame = 0;
      // While the model turns into the Universe map, or back, it is that bridge's (universe.js).
      if (bench.classList.contains("is-bridging")) return;
      const y = scrollY;
      const x = scrollX;
      const calm = motionQuery.matches || !root.classList.contains("workbench-ready") || bench.classList.contains("is-universe");
      if (!wide.matches && !calm) fold(y);
      else unfold();
      if (!allowed()) {
        if (active) stop(0);
        leadOut.forEach(el => put(el, "opacity", ""));
        return;
      }
      if (!span || (span.rough && y < span.end)) span = range();
      const inside = () => y > span.y0 && y < span.y1;
      if (!inside()) passed = false;
      else if (!active && !passed) passed = !start();
      // (Starting reads the end afresh, so the scroll may already be past it.)
      if (active && !inside()) stop(y);
      // A pass that goes by without the change keeps the whole drawing.
      const lead = passed ? "" : (1 - Math.min(1, Math.max(0, y / span.y0))).toFixed(3);
      leadOut.forEach(el => put(el, "opacity", lead));
      if (active) render(y, x);
      else prepare(y);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const remeasure = () => { span = null; folds = null; built = null; still = null; if (active) { measure(); build(); dress(); } schedule(); };

    addEventListener("scroll", schedule, { passive: true });
    wide.addEventListener?.("change", remeasure);
    motionQuery.addEventListener?.("change", schedule);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(remeasure);
      observer.observe(hero);
      observer.observe(bench);
    }
    document.fonts?.ready.then(remeasure);
    // A keyboard visitor on a hero plate sees the drawing itself, wherever the page is.
    heroStack.addEventListener("focusin", () => { focusHeld = true; schedule(); });
    heroStack.addEventListener("focusout", () => { focusHeld = false; schedule(); });
    addEventListener("pagehide", () => { if (active) stop(0); });
    schedule();
    return {
      // A new system, layer or view while it runs: copy the floors again, and find the stack anew.
      sync() { built = null; if (active) { measure(); build(); dress(); render(scrollY, scrollX); } },
      // The explorer changed view: measure everything again (and stand aside in Universe).
      refresh: remeasure
    };
  })();

  /* ---------- Two views: Architecture and Universe ----------
     Architecture is the explorer above, exactly as it is. Universe is a 3D map of every project
     and what they share (assets/universe.js), loaded the first time it is chosen, or a moment
     before, when the pointer or focus reaches its button. Each view keeps its own state while the
     other is shown, so coming back to Architecture finds its system, layer and angle as they
     were; Universe first opens on the system selected here. While Universe is shown, the hero's
     drawing stays as it is (there is no model for it to turn into), and when Universe closes its
     camera and signals stop.
     Every page load starts on Architecture, unless its address ends in #work-universe (a direct
     link to Universe, which the command palette also offers). Choosing a view rewrites the address
     in place (#work-universe, or back to what it was before), with no new history entry and no
     scrolling, so the address can be shared and Back comes back to the view that was showing. */
  const viewSwitch = bench.querySelector("[data-wb-mode]");
  const viewButtons = [...(viewSwitch?.querySelectorAll("[data-wb-view]") ?? [])];
  const universeShell = bench.querySelector("[data-universe]");
  const UNIVERSE_HASH = "#work-universe";
  let hashBeforeUniverse = null; // the address's fragment before Universe took it
  let explorerView = "architecture";
  let universe = null;
  let universeLoad = null;
  function loadUniverse() {
    if (universeLoad) return universeLoad;
    universeLoad = new Promise((resolve, reject) => {
      if (window.PortfolioUniverse) { resolve(); return; }
      const script = document.createElement("script");
      script.src = universeSrc;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("universe.js did not load"));
      document.head.append(script);
    }).then(() => (universe = window.PortfolioUniverse.mount(universeShell, {
      quickLook: canDrawer,
      motion: motionQuery,
      // What the bridge between the two views needs from this side: the model's stage and which
      // system each socket is, this view's own parts beside it, a way to lay out either view (and
      // to measure this one for a moment), and whether something else is moving the model.
      architecture: {
        stage,
        featured,
        sides: [bench.querySelector(".wb-index"), filesWrap].filter(Boolean),
        layout: applyLayout,
        peek(measure) {
          bench.classList.remove("is-universe");
          universeShell.hidden = true;
          try { return measure(); } finally { universeShell.hidden = false; bench.classList.add("is-universe"); }
        },
        // While it runs, the hero's drawing does not turn into the model; afterwards it measures again.
        bridging(on) { bench.classList.toggle("is-bridging", on); if (!on) morph?.refresh(); },
        busy: () => root.classList.contains("is-morphing") || Boolean(drawer?.open)
      }
    })));
    universeLoad.catch(() => { universeLoad = null; }); // a later choice tries again
    return universeLoad;
  }
  // The address, rewritten in place for the view chosen (never a new entry, never a scroll).
  function rewriteAddress(on) {
    try {
      const url = new URL(location.href);
      if (on) {
        if (url.hash === UNIVERSE_HASH) return;
        hashBeforeUniverse = url.hash;
        url.hash = UNIVERSE_HASH;
      } else {
        if (url.hash !== UNIVERSE_HASH) return;
        url.hash = hashBeforeUniverse ?? "#work";
      }
      history.replaceState(history.state, "", url);
    } catch { /* the view still changes */ }
  }
  // A view's layout, at once: which of the explorer's parts are shown (the address and the switch
  // are setView's). The bridge between the views calls it too: as it starts on the way to
  // Universe, and as it ends on the way back.
  let layoutView = "architecture";
  function applyLayout(mode) {
    const on = mode === "universe";
    layoutView = mode;
    bench.classList.toggle("is-universe", on);
    root.classList.remove("wb-universe-pending");
    // Focus inside the view that closes would be lost: it moves to that view's switch button.
    if (!on && universeShell.contains(document.activeElement)) viewButtons.find(button => button.dataset.wbView === "architecture")?.focus({ preventScroll: true });
    universeShell.hidden = !on;
    if (on) {
      if (universe) universe.show({ initial: featured[state.selected] });
      else loadUniverse().then(view => { if (layoutView === "universe") view.show({ initial: featured[state.selected] }); }, () => setView("architecture"));
    } else universe?.hide();
    morph?.refresh();
  }
  // `address`: false when the address already says which view (a link, Back or Forward); such a
  // change is also `instant`. Otherwise, where it can, the model turns into the map, or back
  // (universe.js); a new choice midway turns it around.
  function setView(next, { address = true, instant = !address } = {}) {
    if (next === explorerView || !universeShell || !viewSwitch) return;
    explorerView = next;
    const on = next === "universe";
    const chosen = viewButtons.find(button => button.dataset.wbView === next);
    viewButtons.forEach(button => button.setAttribute("aria-pressed", String(button === chosen)));
    if (address) rewriteAddress(on);
    if (!on) hashBeforeUniverse = null;
    // Focus in a part of the view that goes would be lost: it moves to the button just chosen.
    const focused = document.activeElement;
    if (focused && bench.contains(focused) && !viewSwitch.contains(focused)) chosen?.focus({ preventScroll: true });
    if (universe?.transition(next, { instant })) return;
    // Universe on its way (the pointer reached its button a moment ago): wait for it a little, so
    // the model can still turn into it, rather than show its placeholder first.
    if (on && !universe && universeLoad && !instant) {
      let late = false;
      const timer = setTimeout(() => { late = true; if (explorerView === next && layoutView !== next) applyLayout(next); }, 300);
      universeLoad.then(view => {
        clearTimeout(timer);
        if (late || explorerView !== next || layoutView === next) return;
        if (!view.transition(next)) applyLayout(next);
      }, () => { clearTimeout(timer); if (!late && explorerView === next) applyLayout(next); });
      return;
    }
    applyLayout(next);
  }
  if (viewSwitch && universeShell) {
    viewSwitch.hidden = false;
    viewButtons.forEach(button => button.addEventListener("click", () => setView(button.dataset.wbView)));
    const universeButton = viewButtons.find(button => button.dataset.wbView === "universe");
    for (const type of ["pointerenter", "focus", "touchstart"]) universeButton?.addEventListener(type, () => loadUniverse().catch(() => {}), { once: true, passive: true });
  }

  bench.classList.add("wb-ready");
  select(0, { remember: false });
  // Back or Forward to this entry: the system it showed (a #work-<system> link still wins).
  const remembered = history.state?.wbSystem;
  const hashKey = keyFromHash(location.hash);
  if (remembered && (!hashKey || hashKey === "universe") && featured.includes(remembered)) select(featured.indexOf(remembered), { remember: false });
  selectFromHint();
  setLayer(0);
  applyView();
  fromHash({ scroll: true });
  addEventListener("hashchange", () => fromHash({ scroll: true }));
  root.classList.add("workbench-ready");
  root.classList.remove("wb-pending", "ab-folded");
})();
