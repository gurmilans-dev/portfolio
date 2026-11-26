/*
 * universe.js — Project Universe: every project as a node in one 3D space, and what they share.
 *
 * workbench.js loads this the first time a visitor opens the explorer's Universe view and mounts
 * it into the explorer's shell. The build writes the data in (scripts/universe-data.mjs, from
 * site.config.mjs): each project's name, category, summary, technologies, status and
 * destinations as the rest of the site states them, plus its domain, its place in the space and
 * the relationships drawn between projects, each with what the two projects share.
 *
 * The map is an SVG drawn with a perspective projection of real 3D coordinates (y is up; the
 * ground lies at y = -170): the camera orbits the origin (yaw), looks down at it (pitch) and
 * zooms. Everything (nodes, ground grid, guides, connections, labels) is projected from the same
 * camera, so the whole scene turns together. Its elements are made once and only their
 * attributes change. The camera eases toward where it was sent, measured in time, and the loop
 * stops as soon as it arrives: a still map runs no script. The signals travelling along the
 * selected project's connections are small dots under the drawing that the compositor moves
 * (Web Animations, transform only), so they never repaint it; they pause whenever the map cannot
 * be seen (closed, off screen, a hidden page) and are absent with reduced motion, which also
 * moves the camera at once.
 *
 * Every project is also in plain lists (a list beside the map on wide screens, a select on narrow
 * ones), with its details and relationships in words in the panel; the drawing itself is hidden
 * from assistive technology.
 */
(function () {
  "use strict";

  const DATA = "%UNIVERSE_DATA%";
  const NS = "http://www.w3.org/2000/svg";
  const GROUND = -170;
  const HOME = { yaw: .31, pitch: .42, zoom: 1 };
  const PITCH = [-.8, 1.15];
  const ZOOM = [.65, 1.55];
  const DEPTH = 850; // the camera's distance: perspective strength
  const TAU = .085; // s: the camera eases by about a fifth each 1/60 s

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const r1 = (value) => Math.round(value * 10) / 10;
  const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const degrees = (radians) => Math.round(radians * 180 / Math.PI);

  // An attribute is written only when its value changes.
  const written = new WeakMap();
  function set(el, attrs) {
    let last = written.get(el);
    if (!last) written.set(el, last = {});
    for (const name in attrs) {
      const value = String(attrs[name]);
      if (last[name] !== value) { last[name] = value; el.setAttribute(name, value); }
    }
  }
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const name in attrs) el.setAttribute(name, attrs[name]);
    if (parent) parent.append(el);
    return el;
  }

  function mount(shell, { quickLook = false, motion = matchMedia("(prefers-reduced-motion: reduce)") } = {}) {
    const projects = DATA.projects;
    const byKey = new Map(projects.map((project) => [project.key, project]));
    const domains = new Map(DATA.domains.map((domain) => [domain.id, domain]));
    // The lists' order: by domain, then as the site lists them.
    const listed = DATA.domains.flatMap((domain) => projects.filter((project) => project.domain === domain.id));
    const relations = (key) => DATA.connections.filter((link) => link.a === key || link.b === key).map((link) => ({ ...link, other: link.a === key ? link.b : link.a }));
    // Who shares a technology or a concern.
    const sharing = (kind, id) => projects.filter((project) => (kind === "tech" ? project.tech : project.concepts).includes(id)).map((project) => project.key);

    const state = { selected: listed[0].key, filter: "all", lit: null, all: false };
    const cam = { ...HOME };
    const goal = { ...HOME };
    const view = { w: 0, h: 0, k: 1, narrow: false };
    const reduced = () => motion.matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let shown = false;
    let opened = false; // shown at least once
    let onScreen = true;
    let frame = 0;
    let last = 0;
    let dragging = false; // a drag on the map is under way

    shell.querySelector("[data-uv-loading]")?.remove();

    /* ---------- The list beside the map (wide screens) ---------- */
    const index = document.createElement("nav");
    index.className = "uv-index";
    index.setAttribute("aria-label", "Projects in the universe");
    index.innerHTML = `<p class="wb-head"><span>All ${projects.length} projects</span><span class="wb-keys" aria-hidden="true">by domain</span></p><ol class="uv-groups">${DATA.domains.map((domain) => `<li class="uv-group" data-domain="${domain.id}"><p class="uv-group-name" id="uv-group-${domain.id}"><i class="uv-dot" aria-hidden="true"></i>${esc(domain.name)}</p><ul class="uv-items" aria-labelledby="uv-group-${domain.id}">${listed.filter((project) => project.domain === domain.id).map((project) => `<li><button type="button" class="uv-item" data-uv-key="${project.key}" aria-pressed="false">${esc(project.name)}</button></li>`).join("")}</ul></li>`).join("")}</ol>`;
    const items = new Map([...index.querySelectorAll("[data-uv-key]")].map((button) => [button.dataset.uvKey, button]));

    /* ---------- The map ---------- */
    const map = document.createElement("section");
    map.className = "uv-map";
    map.setAttribute("aria-label", "Project universe");
    map.innerHTML = `<div class="uv-bar">
        <label class="uv-jump"><span class="uv-k">Project</span><select data-uv-jump>${DATA.domains.map((domain) => `<optgroup label="${esc(domain.name)}">${listed.filter((project) => project.domain === domain.id).map((project) => `<option value="${project.key}">${esc(project.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        <div class="uv-filters" role="group" aria-label="Show one domain">${[{ id: "all", name: "All projects" }, ...DATA.domains].map((domain) => `<button type="button" class="uv-chip" data-uv-filter="${domain.id}" data-domain="${domain.id}" aria-pressed="${domain.id === "all"}"><i class="uv-dot" aria-hidden="true"></i>${esc(domain.name)}</button>`).join("")}</div>
      </div>
      <div class="uv-hud"><p class="uv-count" data-uv-count></p><button type="button" class="uv-clear" data-uv-clear hidden>Clear highlight</button><p class="uv-cam" data-uv-cam aria-hidden="true"></p></div>
      <div class="uv-stage" data-uv-stage></div>
      <div class="uv-camera" role="group" aria-label="Camera">
        <button type="button" class="uv-cbtn" data-uv-turn="-1" aria-label="Orbit left"><span aria-hidden="true">↶</span></button>
        <button type="button" class="uv-cbtn" data-uv-turn="1" aria-label="Orbit right"><span aria-hidden="true">↷</span></button>
        <button type="button" class="uv-cbtn" data-uv-tilt="1" aria-label="View from higher"><span aria-hidden="true">↑</span></button>
        <button type="button" class="uv-cbtn" data-uv-tilt="-1" aria-label="View from lower"><span aria-hidden="true">↓</span></button>
        <label class="uv-zoom"><span class="uv-k">Zoom</span><input type="range" min="${ZOOM[0] * 100}" max="${ZOOM[1] * 100}" step="1" value="100" data-uv-zoom></label>
        <button type="button" class="uv-cbtn uv-text" data-uv-all aria-pressed="false">All connections</button>
        <button type="button" class="uv-cbtn uv-text" data-uv-focus>Focus</button>
        <button type="button" class="uv-cbtn uv-text" data-uv-reset>Reset view</button>
      </div>
      <p class="uv-hint" aria-hidden="true">${fine ? "Drag to orbit · Ctrl + scroll to zoom · Click a project to see what it shares" : "Swipe sideways to orbit · Pinch to zoom · Tap a project to see what it shares"}</p>
      <p class="sr-only" aria-live="polite" data-uv-live></p>`;
    const $ = (selector) => map.querySelector(selector);
    const jump = $("[data-uv-jump]");
    const chips = [...map.querySelectorAll("[data-uv-filter]")];
    const allButton = $("[data-uv-all]");
    const count = $("[data-uv-count]");
    const clearButton = $("[data-uv-clear]");
    const camText = $("[data-uv-cam]");
    const stage = $("[data-uv-stage]");
    const zoomInput = $("[data-uv-zoom]");
    const live = $("[data-uv-live]");

    /* ---------- The panel ---------- */
    const panel = document.createElement("aside");
    panel.className = "uv-panel";
    panel.setAttribute("aria-labelledby", "uv-name");
    panel.innerHTML = `<p class="uv-kicker" data-uv-kicker></p>
      <h3 class="uv-title" id="uv-name" tabindex="-1" data-uv-name></h3>
      <p class="uv-meta" data-uv-meta></p>
      <p class="uv-summary" data-uv-summary></p>
      <div class="uv-actions" data-uv-actions></div>
      <p class="uv-k" id="uv-tech-k">Technologies</p>
      <div class="uv-tags" role="group" aria-labelledby="uv-tech-k" data-uv-tech></div>
      <p class="uv-k" id="uv-concern-k">Engineering concerns</p>
      <div class="uv-tags" role="group" aria-labelledby="uv-concern-k" data-uv-concerns></div>
      <p class="uv-k" id="uv-rel-k">Related projects</p>
      <ul class="uv-related" aria-labelledby="uv-rel-k" data-uv-related></ul>`;
    const P = (selector) => panel.querySelector(selector);
    const title = P("[data-uv-name]");

    shell.append(index, map, panel);

    /* ---------- The drawing ---------- */
    // The signals' layer lies under the drawing: nodes and labels pass over them, as lines do.
    const signalLayer = document.createElement("div");
    signalLayer.className = "uv-signals";
    signalLayer.setAttribute("aria-hidden", "true");
    stage.append(signalLayer);
    const svg = svgEl("svg", { class: "uv-svg", "aria-hidden": "true", focusable: "false" }, stage);
    const defs = svgEl("defs", null, svg);
    const glow = svgEl("radialGradient", { id: "uv-glow" }, defs);
    svgEl("stop", { offset: "0", class: "uv-glow-in" }, glow);
    svgEl("stop", { offset: "1", class: "uv-glow-out" }, glow);
    const grid = svgEl("path", { class: "uv-grid" }, svg);
    const guides = [115, 210, 280].map((radius, i) => ({ radius, el: svgEl("path", { class: `uv-guide${i === 2 ? " is-outer" : ""}` }, svg) }));
    const linkLayer = svgEl("g", { class: "uv-links" }, svg);
    const nodeLayer = svgEl("g", { class: "uv-nodes" }, svg);
    const labelLayer = svgEl("g", { class: "uv-labels" }, svg);
    const links = DATA.connections.map((link) => {
      const g = svgEl("g", { class: "uv-link" }, linkLayer);
      return { ...link, g, halo: svgEl("line", { class: "uv-halo" }, g), line: svgEl("line", { class: "uv-line" }, g), dot: null, run: null, ends: "" };
    });
    const nodes = new Map(projects.map((project) => {
      const g = svgEl("g", { class: "uv-node", "data-key": project.key, "data-domain": project.domain });
      return [project.key, {
        g,
        stem: svgEl("line", { class: "uv-stem" }, g),
        foot: svgEl("ellipse", { class: "uv-foot", rx: 10, ry: 3.5 }, g),
        glow: svgEl("circle", { class: "uv-halo-glow", r: 48 }, g),
        ring: svgEl("circle", { class: "uv-ring" }, g),
        left: svgEl("polygon", { class: "uv-face uv-left" }, g),
        right: svgEl("polygon", { class: "uv-face uv-right" }, g),
        top: svgEl("polygon", { class: "uv-face uv-top" }, g),
        hit: svgEl("circle", { class: "uv-hit" }, g)
      }];
    }));
    const labels = new Map(projects.map((project) => {
      const g = svgEl("g", { class: "uv-label", "data-key": project.key, "data-domain": project.domain }, labelLayer);
      const label = { g, tie: svgEl("line", { class: "uv-tie" }, g), tag: svgEl("rect", { class: "uv-tag", rx: 3, height: 22 }, g), text: svgEl("text", { class: "uv-name" }, g), spot: -1 };
      label.text.textContent = project.name;
      return [project.key, label];
    }));

    // A label's width, from the text as the page's monospace face sets it.
    const measure = document.createElement("canvas").getContext("2d");
    const widths = new Map();
    function textWidth(name, selected) {
      const id = `${selected ? 1 : 0}${name}`;
      if (!widths.has(id)) {
        const family = getComputedStyle(document.documentElement).getPropertyValue("--mono") || "monospace";
        measure.font = `${selected ? "600 11px" : "400 10px"} ${family}`;
        widths.set(id, measure.measureText(name).width || name.length * (selected ? 6.7 : 6.1));
      }
      return widths.get(id);
    }

    function project3d([x, y, z]) {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const s = DEPTH / (DEPTH - z2) * cam.zoom * view.k;
      return { x: view.w / 2 + x1 * s, y: view.h / 2 - y1 * s, z: z2, s };
    }

    const isOut = (key) => state.filter !== "all" && byKey.get(key).domain !== state.filter;
    const litKeys = () => (state.lit ? sharing(state.lit.kind, state.lit.id) : null);
    let nodeOrder = "";
    let labelOrder = "";

    function draw() {
      if (!shown || !view.w || !view.h) return;
      const W = view.w, H = view.h;
      // The ground: a grid and three circular guides.
      let d = "";
      for (let k = -280; k <= 280; k += 40) {
        const a = project3d([k, GROUND, -260]), b = project3d([k, GROUND, 260]), c = project3d([-280, GROUND, k]), e = project3d([280, GROUND, k]);
        d += `M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}M${r1(c.x)} ${r1(c.y)}L${r1(e.x)} ${r1(e.y)}`;
      }
      set(grid, { d });
      for (const { radius, el } of guides) {
        let path = "";
        for (let j = 0; j <= 72; j++) {
          const angle = j / 72 * Math.PI * 2;
          const p = project3d([Math.cos(angle) * radius, GROUND, Math.sin(angle) * radius]);
          path += `${j ? "L" : "M"}${r1(p.x)} ${r1(p.y)}`;
        }
        set(el, { d: path });
      }

      const points = new Map(projects.map((project) => [project.key, project3d(project.position)]));
      const lit = litKeys();
      set(svg, { class: `uv-svg${lit ? " is-lit" : ""}${dragging ? " is-dragging" : ""}` });

      // Connections: the selected project's, or every one; only between projects in view.
      for (const link of links) {
        const on = link.a === state.selected || link.b === state.selected;
        const visible = !isOut(link.a) && !isOut(link.b) && (on || state.all) && !lit;
        set(link.g, { class: `uv-link${on ? " is-on" : ""}${visible ? "" : " is-hidden"}` });
        if (!visible || !on) signal(link, null);
        if (!visible) continue;
        // The signal runs from the selected project outward.
        const from = points.get(on && link.b === state.selected ? link.b : link.a);
        const to = points.get(on && link.b === state.selected ? link.a : link.b);
        const line = { x1: r1(from.x), y1: r1(from.y), x2: r1(to.x), y2: r1(to.y) };
        set(link.halo, line);
        set(link.line, line);
        if (on) signal(link, reduced() ? null : line);
      }

      // Nodes, far to near.
      const order = [...points.entries()].sort((a, b) => a[1].z - b[1].z).map(([key]) => key);
      const orderKey = order.join();
      if (orderKey !== nodeOrder) { order.forEach((key) => nodeLayer.append(nodes.get(key).g)); nodeOrder = orderKey; }
      for (const project of projects) {
        const key = project.key;
        const node = nodes.get(key);
        const pt = points.get(key);
        const sel = key === state.selected;
        const out = isOut(key);
        set(node.g, { class: `uv-node${sel ? " is-sel" : ""}${out ? " is-out" : ""}${lit && lit.includes(key) ? " is-lit" : ""}` });
        const foot = project3d([project.position[0], GROUND, project.position[2]]);
        set(node.stem, { x1: r1(foot.x), y1: r1(foot.y), x2: r1(pt.x), y2: r1(pt.y) });
        set(node.foot, { cx: r1(foot.x), cy: r1(foot.y) });
        const r = (view.narrow ? 9 : 10) * clamp(pt.s, .7, 1.35);
        const s = r * .85;
        const top = [pt.x, pt.y - s], right = [pt.x + s, pt.y - s * .38], bottom = [pt.x, pt.y + s * .22], left = [pt.x - s, pt.y - s * .38];
        const down = ([x, y]) => [x, y + s * .78];
        const pts = (list) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
        set(node.left, { points: pts([left, bottom, down(bottom), down(left)]) });
        set(node.right, { points: pts([bottom, right, down(right), down(bottom)]) });
        set(node.top, { points: pts([top, right, bottom, left]) });
        if (sel) { set(node.glow, { cx: r1(pt.x), cy: r1(pt.y) }); set(node.ring, { cx: r1(pt.x), cy: r1(pt.y), r: r1(r + 13) }); }
        set(node.hit, { cx: r1(pt.x), cy: r1(pt.y), r: r1(Math.max(fine ? 15 : 22, r + 6)) });
      }

      // Labels: the selected project's first, then near to far, each where it overlaps no other
      // label and covers no other node (its last place first, so labels stay put as the map turns).
      // On narrow maps only the ones that matter are named (the selected project, its relationships,
      // a domain's few projects), and while highlighting, the highlighted ones.
      const related = new Set(relations(state.selected).map((link) => link.other));
      const placed = [];
      const drawnLabels = [];
      for (const key of [state.selected, ...order.slice().reverse().filter((other) => other !== state.selected)]) {
        const label = labels.get(key);
        const sel = key === state.selected;
        const p = points.get(key);
        const named = !isOut(key) && (sel || (lit ? lit.includes(key) : !view.narrow || related.has(key) || state.filter !== "all"));
        if (!named || (!sel && (p.x < 0 || p.x > W || p.y < 0 || p.y > H))) { set(label.g, { class: "uv-label is-hidden" }); label.spot = -1; continue; }
        const w = textWidth(byKey.get(key).name, sel) + 18;
        const h = 22;
        const spots = [[16, -28], [16, 8], [-w - 16, -28], [-w - 16, 8], [-w / 2, -45], [-w / 2, 22]];
        const tries = label.spot >= 0 ? [label.spot, ...spots.keys()].filter((i, n, all) => all.indexOf(i) === n) : [...spots.keys()];
        let box = null;
        for (const i of tries) {
          const candidate = { x: clamp(p.x + spots[i][0], 6, W - w - 6), y: clamp(p.y + spots[i][1], 7, H - h - 7), w, h };
          const overlaps = placed.some((other) => candidate.x < other.x + other.w + 3 && candidate.x + w + 3 > other.x && candidate.y < other.y + other.h + 3 && candidate.y + h + 3 > other.y);
          const covers = projects.some((other) => other.key !== key && !isOut(other.key) && (() => { const q = points.get(other.key); return q.x > candidate.x - 6 && q.x < candidate.x + w + 6 && q.y > candidate.y - 6 && q.y < candidate.y + h + 6; })());
          if (!overlaps && !covers) { box = candidate; label.spot = i; break; }
        }
        if (!box) {
          if (!sel) { set(label.g, { class: "uv-label is-hidden" }); label.spot = -1; continue; }
          box = { x: clamp(p.x + 14, 6, W - w - 6), y: clamp(p.y - 29, 7, H - h - 7), w, h };
        }
        placed.push(box);
        drawnLabels.push(key);
        set(label.g, { class: `uv-label${sel ? " is-sel" : ""}` });
        set(label.tie, { x1: r1(p.x), y1: r1(p.y), x2: r1(clamp(p.x, box.x, box.x + w)), y2: r1(clamp(p.y, box.y, box.y + h)) });
        set(label.tag, { x: r1(box.x), y: r1(box.y), width: r1(w) });
        set(label.text, { x: r1(box.x + 9), y: r1(box.y + (sel ? 15 : 14.5)) });
      }
      // Drawn in reverse, so the selected label lies on top.
      const labelKey = drawnLabels.join();
      if (labelKey !== labelOrder) { drawnLabels.slice().reverse().forEach((key) => labelLayer.append(labels.get(key).g)); labelOrder = labelKey; }

      camText.textContent = `AZ ${((degrees(cam.yaw) % 360) + 360) % 360}° / EL ${degrees(cam.pitch)}°`;
    }

    // A signal along one of the selected project's connections, outward: a dot the compositor
    // moves. When the camera moves, only its two ends change; it keeps its place in its run.
    const seen = () => shown && onScreen && !document.hidden;
    function signal(link, line) {
      if (!line || typeof signalLayer.animate !== "function") {
        if (link.dot) { link.run.cancel(); link.dot.remove(); link.dot = link.run = null; link.ends = ""; }
        return;
      }
      const ends = `${line.x1},${line.y1},${line.x2},${line.y2}`;
      if (ends === link.ends) return;
      link.ends = ends;
      const frames = [{ transform: `translate(${line.x1}px, ${line.y1}px)` }, { transform: `translate(${line.x2}px, ${line.y2}px)` }];
      if (link.dot) { link.run.effect.setKeyframes(frames); return; }
      link.dot = document.createElement("i");
      link.dot.className = "uv-signal";
      signalLayer.append(link.dot);
      link.run = link.dot.animate(frames, { duration: 2400, iterations: Infinity });
      if (!seen()) link.run.pause();
    }

    /* ---------- The camera ---------- */
    function tick(time) {
      frame = 0;
      const dt = clamp((time - last) / 1000, .008, .064);
      last = time;
      const k = reduced() ? 1 : 1 - Math.exp(-dt / TAU);
      let moving = false;
      for (const name of ["yaw", "pitch", "zoom"]) {
        const gap = goal[name] - cam[name];
        if (Math.abs(gap) < .0015) cam[name] = goal[name];
        else { cam[name] += gap * k; moving = true; }
      }
      draw();
      if (moving && shown) frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (!shown) return;
      if (reduced() || !onScreen || document.hidden) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); draw(); return; }
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    }
    function syncZoom() { zoomInput.value = String(Math.round(goal.zoom * 100)); }
    function turn(by) { goal.yaw += by; wake(); }
    function tilt(by) { goal.pitch = clamp(goal.pitch + by, PITCH[0], PITCH[1]); wake(); }
    function zoomTo(value) { goal.zoom = clamp(value, ZOOM[0], ZOOM[1]); syncZoom(); wake(); }
    // Focus: turn the selected project to the front, the shortest way round, and come a little closer.
    function focusSelected() {
      const [x, , z] = byKey.get(state.selected).position;
      const front = Math.atan2(x, z);
      goal.yaw = front + Math.PI * 2 * Math.round((goal.yaw - front) / (Math.PI * 2));
      goal.pitch = clamp(goal.pitch, .2, .7);
      zoomTo(Math.max(goal.zoom, 1.2));
    }

    /* ---------- What is selected, filtered and highlighted ---------- */
    function say(text) { live.textContent = ""; requestAnimationFrame(() => { live.textContent = text; }); }

    function renderPanel() {
      const project = byKey.get(state.selected);
      const domain = domains.get(project.domain);
      P("[data-uv-kicker]").innerHTML = `<i class="uv-dot" aria-hidden="true"></i><span>${esc(domain.name)}</span><span class="uv-sep" aria-hidden="true">·</span><span>${esc(project.category)}</span>`;
      P("[data-uv-kicker]").dataset.domain = project.domain;
      title.textContent = project.name;
      P("[data-uv-meta]").innerHTML = `${project.status}<span class="sf-source">${esc(project.source)}</span>`;
      P("[data-uv-summary]").textContent = project.summary;
      P("[data-uv-actions]").innerHTML = `${quickLook ? `<button type="button" class="btn uv-quick" data-open-file="${project.key}">Quick look<span class="sr-only">: ${esc(project.name)}</span></button>` : ""}${project.links}`;
      // A technology or concern another project shares can highlight them all; one that is this
      // project's alone is simply listed.
      const tag = (kind, id, name) => {
        const keys = sharing(kind, id);
        if (keys.length < 2) return `<span class="uv-tag-item">${esc(name)}</span>`;
        const on = state.lit && state.lit.kind === kind && state.lit.id === id;
        return `<button type="button" class="uv-tag-item is-shared" data-uv-lit="${kind}" data-uv-id="${esc(id)}" aria-pressed="${Boolean(on)}">${esc(name)}<span class="uv-n" aria-hidden="true">${keys.length}</span><span class="sr-only">, ${keys.length} projects</span></button>`;
      };
      P("[data-uv-tech]").innerHTML = project.tech.map((name) => tag("tech", name, name)).join("");
      P("[data-uv-concerns]").innerHTML = project.concepts.map((id) => tag("concept", id, DATA.concepts[id])).join("");
      P("[data-uv-related]").innerHTML = relations(project.key).map((link) => {
        const other = byKey.get(link.other);
        return `<li class="uv-rel" data-domain="${other.domain}"><button type="button" class="uv-rel-btn" data-uv-key="${other.key}"><span class="uv-rel-name"><i class="uv-dot" aria-hidden="true"></i>${esc(other.name)}</span><span class="uv-rel-why">${esc(link.label)}</span></button><p class="uv-rel-detail">${esc(link.detail)}</p></li>`;
      }).join("");
    }

    function sync() {
      for (const [key, button] of items) {
        button.setAttribute("aria-pressed", String(key === state.selected));
        button.classList.toggle("is-out", isOut(key));
      }
      jump.value = state.selected;
      chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.uvFilter === state.filter)));
      allButton.setAttribute("aria-pressed", String(state.all));
      const lit = litKeys();
      const visible = projects.filter((project) => !isOut(project.key)).length;
      count.textContent = lit
        ? `${state.lit.kind === "tech" ? state.lit.id : DATA.concepts[state.lit.id]} · ${lit.length} projects`
        : `${visible} ${visible === 1 ? "project" : "projects"} · 3D map`;
      clearButton.hidden = !lit;
      renderPanel();
      draw();
    }

    function select(key, { announce = false } = {}) {
      if (!byKey.has(key)) return;
      if (isOut(key)) state.filter = "all";
      if (key !== state.selected) state.lit = null;
      state.selected = key;
      sync();
      if (announce) {
        const project = byKey.get(key);
        const others = relations(key).map((link) => byKey.get(link.other).name);
        say(`${project.name} selected. Related: ${others.join(", ")}.`);
      }
    }

    function filterTo(id) {
      state.filter = id;
      state.lit = null;
      if (isOut(state.selected)) state.selected = listed.find((project) => !isOut(project.key)).key;
      sync();
      const visible = projects.filter((project) => !isOut(project.key)).length;
      say(id === "all" ? `All ${visible} projects shown.` : `${domains.get(id).name}: ${visible} projects shown. ${byKey.get(state.selected).name} selected.`);
    }

    function highlight(kind, id) {
      const same = state.lit && state.lit.kind === kind && state.lit.id === id;
      state.lit = same ? null : { kind, id };
      state.filter = "all";
      sync();
      if (state.lit) say(`${kind === "tech" ? id : DATA.concepts[id]}: ${sharing(kind, id).map((key) => byKey.get(key).name).join(", ")}.`);
      else say("Highlight cleared.");
    }

    /* ---------- Input ---------- */
    index.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-uv-key]") : null;
      if (button) select(button.dataset.uvKey);
    });
    jump.addEventListener("change", () => select(jump.value, { announce: true }));
    chips.forEach((chip) => chip.addEventListener("click", () => filterTo(chip.dataset.uvFilter)));
    allButton.addEventListener("click", () => { state.all = !state.all; sync(); });
    clearButton.addEventListener("click", () => { if (state.lit) highlight(state.lit.kind, state.lit.id); });
    map.querySelectorAll("[data-uv-turn]").forEach((button) => button.addEventListener("click", () => turn(Number(button.dataset.uvTurn) * .35)));
    map.querySelectorAll("[data-uv-tilt]").forEach((button) => button.addEventListener("click", () => tilt(Number(button.dataset.uvTilt) * .15)));
    zoomInput.addEventListener("input", () => zoomTo(Number(zoomInput.value) / 100));
    $("[data-uv-focus]").addEventListener("click", focusSelected);
    $("[data-uv-reset]").addEventListener("click", () => { Object.assign(goal, HOME); syncZoom(); wake(); });
    panel.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const lit = target?.closest("[data-uv-lit]");
      if (lit) { highlight(lit.dataset.uvLit, lit.dataset.uvId); P(`[data-uv-lit="${lit.dataset.uvLit}"][data-uv-id="${CSS.escape(lit.dataset.uvId)}"]`)?.focus(); return; }
      const other = target?.closest("[data-uv-key]");
      if (other) { select(other.dataset.uvKey, { announce: true }); title.focus({ preventScroll: true }); }
    });

    // On the map: a press without a drag selects the project under it; a drag orbits (sideways
    // only on touch, so a vertical swipe still scrolls the page); two fingers pinch to zoom, and
    // Ctrl (or ⌘) with the wheel or a trackpad pinch zooms. A plain wheel scrolls the page.
    const pointers = new Map();
    let drag = null;
    let pinch = null;
    const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    svg.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) { pinch = { d: spread(), zoom: goal.zoom }; drag = null; return; }
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: goal.yaw, pitch: goal.pitch, moved: false, touch: event.pointerType === "touch", key: event.target instanceof Element ? event.target.closest("[data-key]")?.getAttribute("data-key") : null };
    });
    svg.addEventListener("pointermove", (event) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pinch && pointers.size === 2) { zoomTo(pinch.zoom * spread() / pinch.d); return; }
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) {
        drag.moved = true;
        dragging = true;
        try { svg.setPointerCapture(event.pointerId); } catch { /* capture is a nicety */ }
      }
      if (!drag.moved) return;
      goal.yaw = drag.yaw + dx * .008;
      if (!drag.touch) goal.pitch = clamp(drag.pitch + dy * .006, PITCH[0], PITCH[1]);
      wake();
    });
    const release = (event) => {
      if (drag && event.type === "pointerup" && event.pointerId === drag.id && !drag.moved && drag.key) select(drag.key, { announce: true });
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!drag || event.pointerId === drag.id) { drag = null; if (dragging) { dragging = false; draw(); } }
    };
    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", release);
    svg.addEventListener("lostpointercapture", release);
    svg.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomTo(goal.zoom * Math.exp(-event.deltaY * .0025));
    }, { passive: false });

    /* ---------- Size and visibility ---------- */
    function fit(width, height) {
      view.w = Math.round(width);
      view.h = Math.round(height);
      view.narrow = view.w < 520;
      // The reference composition is 760 x 530; a narrow map is drawn a little larger for its width.
      view.k = view.narrow ? .68 * view.w / 440 : .93 * Math.min(view.w / 760, view.h / 530);
      set(svg, { viewBox: `0 0 ${view.w} ${view.h}` });
      draw();
    }
    if ("ResizeObserver" in window) new ResizeObserver(([entry]) => fit(entry.contentRect.width, entry.contentRect.height)).observe(stage);
    else addEventListener("resize", () => fit(stage.clientWidth, stage.clientHeight));
    // The signals run only while the map can be seen.
    function setLive() {
      const on = seen();
      shell.classList.toggle("is-live", on);
      for (const link of links) if (link.run) { if (on) link.run.play(); else link.run.pause(); }
      if (!on && frame) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); draw(); }
    }
    if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; setLive(); }).observe(map);
    document.addEventListener("visibilitychange", setLive);
    motion.addEventListener?.("change", wake);
    document.fonts?.ready.then(() => { widths.clear(); draw(); });

    return {
      // The first time, the map opens on `initial` (the system the visitor was looking at).
      show({ initial } = {}) {
        if (!opened && byKey.has(initial)) state.selected = initial;
        opened = true;
        shown = true;
        if (!view.w) fit(stage.clientWidth, stage.clientHeight);
        sync();
        setLive();
      },
      hide() {
        shown = false;
        setLive();
        if (frame) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); }
      },
      select
    };
  }

  window.PortfolioUniverse = { mount };
})();
