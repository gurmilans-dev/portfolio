/*
 * workbench.js — homepage only.
 * Turns the static list of systems into the workbench: an index of tabs, a CSS-3D
 * stack with a cut through the selected system, a layer-by-layer file, and a
 * case-file drawer. Without this script every system and its full case file is
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
  const alsoLinks = [...bench.querySelectorAll("[data-wb-also]")];
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
    ? "Drag to orbit · hover to explode · click a layer to open its case file"
    : "Swipe sideways to orbit · tap a layer to highlight it";

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

  explodeButton?.addEventListener("click", () => {
    state.exploded = !state.exploded;
    stack?.classList.toggle("is-exploded", state.exploded);
    explodeButton.setAttribute("aria-pressed", String(state.exploded));
  });
  resetButton?.addEventListener("click", () => {
    state.rx = VIEW.rx;
    state.rz = VIEW.rz;
    applyView();
  });

  /* Stage: hover picks a layer, a socket picks a system, a click opens the case file,
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

  /* ---------- Case-file drawer ---------- */
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
    if (drawerCrumb) drawerCrumb.innerHTML = `Case file ${String(index + 1).padStart(2, "0")} / ${String(order.length).padStart(2, "0")}<span class="crumb-extra"> · ← → to move</span>`;
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

  function openFile(key, trigger) {
    if (!canDrawer || !fileFor(key)) return;
    clearTimeout(closeTimer);
    Site.closeMenu();
    mountFile(key);
    if (!drawer.open) {
      returnFocus = trigger || document.activeElement;
      drawer.showModal();
      Site.lockScroll();
      bench.classList.add("is-drawer-open");
      requestAnimationFrame(() => drawer.classList.add("is-visible"));
    }
    fileFor(key).querySelector(".sf-title")?.focus({ preventScroll: true });
  }

  function step(direction) {
    if (!openKey) return;
    const index = order.indexOf(openKey);
    openFile(order[(index + direction + order.length) % order.length]);
  }

  function finishClose() {
    restoreFile();
    alsoLinks.forEach(link => link.classList.remove("is-current"));
    if (drawer.open) drawer.close();
    Site.unlockScroll();
    const target = returnFocus;
    returnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!drawer?.open) return;
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
    // load, and closing then would undo a #work-<archive file> deep link the moment it opened.
    addEventListener("pageshow", event => { if (event.persisted && drawer.open) finishClose(); });
  }

  /* ---------- Deep links: #work-<system> selects or opens that system ---------- */
  function fromHash({ scroll = false } = {}) {
    const match = /^#work-(.+)$/.exec(location.hash);
    if (!match) return;
    const key = decodeURIComponent(match[1]);
    const index = featured.indexOf(key);
    if (index >= 0) select(index);
    else if (order.includes(key) && canDrawer) openFile(key);
    else return;
    if (scroll) document.getElementById("work")?.scrollIntoView({ block: "start" });
  }

  bench.classList.add("wb-ready");
  select(0);
  setLayer(0);
  applyView();
  fromHash({ scroll: true });
  addEventListener("hashchange", () => fromHash({ scroll: true }));
  root.classList.add("workbench-ready");
})();
