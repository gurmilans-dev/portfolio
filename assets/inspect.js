/* Inspect mode: a few parts of a real screenshot, each explained (`inspect` in site.config.mjs).
   The build renders every note under the figure as a closed list, readable without
   JavaScript; this opens the screenshot in an inspector where a part can be picked, read and
   zoomed into. The parts are tabs over the image and the explanation is their panel. */
(() => {
  const root = document.documentElement;
  const figures = [...document.querySelectorAll("[data-inspect]")];
  const Site = window.Site || { lockScroll() {}, unlockScroll() {} };
  let ui = null;
  let open = null; // { parts, index, zoom, trigger, ratio }

  // A figure's notes and button: inside it, or anywhere on the page with the same key.
  const barOf = (figure) => figure.querySelector(".inspect-bar") || document.querySelector(`.inspect-bar[data-inspect-for="${figure.dataset.inspect}"]`);
  const partsOf = (figure) => [...barOf(figure).querySelectorAll(".inspect-part")].map((item) => ({
    item,
    title: item.querySelector(".inspect-part-title span:last-child").textContent,
    box: item.dataset.box.split(" ").map(Number)
  }));
  const place = (el, [x, y, w, h]) => Object.assign(el.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
  const nn = (n) => String(n).padStart(2, "0");

  function build(icon) {
    const dialog = document.createElement("dialog");
    dialog.className = "inspector";
    dialog.setAttribute("aria-labelledby", "insp-title");
    dialog.innerHTML = `<div class="insp-frame">
        <header class="insp-head">
          <p class="insp-kicker" aria-hidden="true">${icon}<span>Inspect</span></p>
          <h2 id="insp-title" class="insp-title"></h2>
          <div class="insp-tools">
            <button type="button" class="insp-tool" data-insp-zoom aria-pressed="false">Zoom to part</button>
            <a class="insp-tool" data-insp-original target="_blank" rel="noopener noreferrer">Full size<span class="sr-only"> (opens in a new tab)</span></a>
            <button type="button" class="insp-close" data-insp-close aria-label="Close the inspector"><span aria-hidden="true">&times;</span></button>
          </div>
        </header>
        <div class="insp-stage" data-insp-stage>
          <div class="insp-canvas" data-insp-canvas><img data-insp-image alt="" /><div class="insp-parts" role="tablist" aria-label="Parts of the screen" data-insp-parts></div></div>
        </div>
        <section class="insp-panel" id="insp-panel" role="tabpanel" tabindex="0">
          <p class="insp-count" data-insp-count></p>
          <h3 class="insp-part-title" data-insp-part-title></h3>
          <div class="insp-notes" data-insp-notes></div>
          <div class="insp-nav"><button type="button" class="insp-step" data-insp-prev>Previous part</button><button type="button" class="insp-step" data-insp-next>Next part</button></div>
        </section>
        <p class="sr-only" aria-live="polite" data-insp-say></p>
      </div>`;
    document.body.append(dialog);
    const get = (name) => dialog.querySelector(`[data-insp-${name}]`);
    const els = { dialog, stage: get("stage"), canvas: get("canvas"), image: get("image"), parts: get("parts"), title: dialog.querySelector(".insp-title"), count: get("count"), partTitle: get("part-title"), notes: get("notes"), say: get("say"), zoom: get("zoom"), original: get("original"), prev: get("prev"), next: get("next"), panel: dialog.querySelector(".insp-panel") };

    // Closing (Escape, the close button, the backdrop) releases the page and returns focus.
    // It also runs at once on pagehide: the close event would only fire once a page restored
    // from the back/forward cache wakes up, leaving it locked until then.
    const closed = ({ restore = true } = {}) => {
      if (!open) return;
      dialog.classList.remove("is-open");
      Site.unlockScroll();
      const trigger = open.trigger;
      open = null;
      if (restore && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    els.zoom.addEventListener("click", () => { open.zoom = !open.zoom; els.zoom.setAttribute("aria-pressed", String(open.zoom)); layout(); });
    // Every way out closes at once and gives focus back in the same moment; the close event
    // (queued, and later in some browsers) is only the fallback.
    const shut = () => { dialog.close(); closed(); };
    get("close").addEventListener("click", () => shut());
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); shut(); });
    els.prev.addEventListener("click", () => select(open.index - 1, { announce: true }));
    els.next.addEventListener("click", () => select(open.index + 1, { announce: true }));
    // A click on the backdrop (outside the frame) closes, like the Escape key.
    dialog.addEventListener("click", (event) => { if (event.target === dialog) shut(); });
    dialog.addEventListener("close", () => closed());
    // Tabs: arrows move between parts, Home and End to either end, focus following the choice.
    els.parts.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      const to = step ? open.index + step : event.key === "Home" ? 0 : event.key === "End" ? open.parts.length - 1 : null;
      if (to === null || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      select((to + open.parts.length) % open.parts.length, { focus: true });
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (open) layout(); }).observe(els.stage);
    addEventListener("pagehide", () => { if (dialog.open) { dialog.close(); closed({ restore: false }); } });
    return els;
  }

  /* Fit the screenshot to the stage; with Zoom on, scale it so the chosen part fills the stage,
     centred, without leaving an empty margin where the image could cover it. */
  function layout() {
    const { stage, canvas } = ui;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const cw = Math.min(W, H * open.ratio), ch = cw / open.ratio;
    const left = (W - cw) / 2, top = (H - ch) / 2;
    let z = 1, tx = 0, ty = 0;
    if (open.zoom) {
      const [x, y, w, h] = open.parts[open.index].box.map((v) => v / 100);
      z = Math.max(1, Math.min(4, Math.min((W * 0.9) / (w * cw), (H * 0.86) / (h * ch))));
      const fit = (size, offset, centre, scaled) => scaled <= size ? (size - scaled) / 2 - offset : Math.min(-offset, Math.max(size - offset - scaled, size / 2 - offset - centre));
      tx = fit(W, left, (x + w / 2) * cw * z, cw * z);
      ty = fit(H, top, (y + h / 2) * ch * z, ch * z);
    }
    Object.assign(canvas.style, { width: `${cw}px`, height: `${ch}px`, left: `${left}px`, top: `${top}px`, transform: `translate(${tx}px, ${ty}px) scale(${z})` });
    canvas.style.setProperty("--z", z);
  }

  function select(index, { focus = false, announce = false } = {}) {
    const count = open.parts.length;
    open.index = Math.max(0, Math.min(count - 1, index));
    const part = open.parts[open.index];
    [...ui.parts.children].forEach((tab, i) => {
      const on = i === open.index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    ui.panel.setAttribute("aria-labelledby", ui.parts.children[open.index].id);
    ui.count.textContent = `Part ${open.index + 1} of ${count}`;
    ui.partTitle.textContent = part.title;
    ui.notes.replaceChildren(part.item.querySelector("dl").cloneNode(true));
    ui.panel.scrollTop = 0;
    ui.prev.setAttribute("aria-disabled", String(open.index === 0));
    ui.next.setAttribute("aria-disabled", String(open.index === count - 1));
    if (focus) ui.parts.children[open.index].focus();
    if (announce) ui.say.textContent = `Part ${open.index + 1} of ${count}: ${part.title}.`;
    layout();
  }

  function show(figure, index, trigger) {
    const button = barOf(figure).querySelector("[data-inspect-open]");
    ui ||= build(button.querySelector("svg").outerHTML);
    const inline = figure.querySelector(".media-open img") || figure.querySelector("img");
    const parts = partsOf(figure);
    open = { parts, index: 0, zoom: false, trigger, ratio: (Number(inline.getAttribute("width")) || inline.naturalWidth) / (Number(inline.getAttribute("height")) || inline.naturalHeight) };
    ui.title.textContent = barOf(figure).dataset.title;
    ui.image.src = inline.currentSrc || inline.src;
    ui.image.alt = inline.alt;
    ui.original.href = figure.querySelector(".media-open")?.getAttribute("href") || inline.src;
    ui.zoom.setAttribute("aria-pressed", "false");
    ui.say.textContent = "";
    ui.parts.replaceChildren(...parts.map((part, i) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "insp-part";
      tab.id = `insp-part-${i}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "insp-panel");
      tab.innerHTML = `<span class="insp-part-no" aria-hidden="true">${nn(i + 1)}</span><span class="sr-only">${i + 1}. ${part.title}</span>`;
      place(tab, part.box);
      tab.classList.toggle("is-top", part.box[1] < 4);
      tab.addEventListener("click", () => select(i));
      return tab;
    }));
    ui.dialog.showModal();
    Site.lockScroll();
    // On a narrow stage the whole screenshot is too small to read, so it opens zoomed to the
    // part; Zoom to part turns that off to show the whole screen.
    open.zoom = ui.stage.clientWidth < 600;
    ui.zoom.setAttribute("aria-pressed", String(open.zoom));
    requestAnimationFrame(() => ui.dialog.classList.add("is-open"));
    select(index, { focus: true });
  }

  figures.forEach((figure) => {
    const button = barOf(figure)?.querySelector("[data-inspect-open]");
    if (!button) return;
    button.hidden = false;
    button.addEventListener("click", () => show(figure, 0, button));
    // On the page: a pointer click on the screenshot opens the inspector (at the part under
    // it, where the outlines show on hover). Keyboard activation and new-tab clicks keep the
    // link's own meaning, the full-size image.
    const link = figure.querySelector(".media-open");
    if (!link) return;
    const hints = document.createElement("span");
    hints.className = "inspect-hints";
    hints.setAttribute("aria-hidden", "true");
    partsOf(figure).forEach((part, i) => {
      const hint = document.createElement("span");
      hint.className = "inspect-hint";
      hint.dataset.index = String(i);
      hint.innerHTML = `<span>${nn(i + 1)}</span>`;
      place(hint, part.box);
      hint.classList.toggle("is-top", part.box[1] < 4);
      hints.append(hint);
    });
    link.append(hints);
    const label = link.querySelector(".media-enlarge");
    if (label && /full size/i.test(label.textContent)) label.textContent = "Inspect";
    link.addEventListener("click", (event) => {
      if (event.detail === 0 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const hint = event.target instanceof Element ? event.target.closest(".inspect-hint") : null;
      show(figure, hint ? Number(hint.dataset.index) : 0, button);
    });
  });

  root.classList.add("inspect-ready");
  root.classList.remove("inspect-pending");
})();
