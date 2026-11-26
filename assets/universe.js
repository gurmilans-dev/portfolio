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
  const STYLES = "%UNIVERSE_CSS%"; // assets/universe.css, minified
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
  // The camera's arrows, drawn rather than set in type: the curved ones are in few fonts, and the
  // browser's search for one that has them made the view's first layout three times as long.
  const icon = (d) => `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  const ICON = { left: icon("M12.5 10A4.5 4.5 0 0 0 3.5 10M1.5 8 3.5 10.5 5.5 8"), right: icon("M3.5 10A4.5 4.5 0 0 1 12.5 10M10.5 8 12.5 10.5 14.5 8"), up: icon("M8 13V3M4.5 6.5 8 3l3.5 3.5"), down: icon("M8 3v10M4.5 9.5 8 13l3.5-3.5") };

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
  // The drawing's hot path: one attribute, written only when its value changes (kept on the element).
  function attr(el, name, value) {
    const last = el.__uv || (el.__uv = {});
    if (last[name] !== value) { last[name] = value; el.setAttribute(name, value); }
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
    const view = { w: 0, h: 0, k: 1, oy: 0, narrow: false };
    const reduced = () => motion.matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let shown = false;
    let opened = false; // shown at least once
    let onScreen = true;
    let frame = 0;
    let last = 0;
    let dragging = false; // a drag on the map is under way
    let lean = false; // the lighter drawing, while the camera moves on a slow device

    // The view's styles, added once, before anything of it exists.
    if (!document.querySelector("style[data-uv-styles]")) {
      const style = document.createElement("style");
      style.setAttribute("data-uv-styles", "");
      style.textContent = STYLES;
      document.head.append(style);
    }
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
        <div class="uv-filters" role="group" aria-label="Show one domain">${[{ id: "all", name: "All" }, ...DATA.domains].map((domain) => `<button type="button" class="uv-chip" data-uv-filter="${domain.id}" data-domain="${domain.id}" aria-pressed="${domain.id === "all"}"><i class="uv-dot" aria-hidden="true"></i>${esc(domain.name)}</button>`).join("")}</div>
      </div>
      <div class="uv-hud"><p class="uv-count" data-uv-count></p><button type="button" class="uv-clear" data-uv-clear hidden>Clear highlight</button><p class="uv-cam" data-uv-cam aria-hidden="true"></p></div>
      <div class="uv-stage" data-uv-stage></div>
      <div class="uv-camera" role="group" aria-label="Camera">
        <button type="button" class="uv-cbtn" data-uv-turn="-1" aria-label="Orbit left">${ICON.left}</button>
        <button type="button" class="uv-cbtn" data-uv-turn="1" aria-label="Orbit right">${ICON.right}</button>
        <button type="button" class="uv-cbtn" data-uv-tilt="1" aria-label="View from higher">${ICON.up}</button>
        <button type="button" class="uv-cbtn" data-uv-tilt="-1" aria-label="View from lower">${ICON.down}</button>
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
    // The circular guides: the two inner ones in one path, the dashed outer one in another.
    const guideInner = svgEl("path", { class: "uv-guide" }, svg);
    const guideOuter = svgEl("path", { class: "uv-guide is-outer" }, svg);
    const SEGMENTS = 60; // a guide's segments: under a pixel from a true circle, even zoomed in
    const RING = Array.from({ length: SEGMENTS + 1 }, (_, j) => [Math.cos(j / SEGMENTS * Math.PI * 2), Math.sin(j / SEGMENTS * Math.PI * 2)]);
    const linkLayer = svgEl("g", { class: "uv-links" }, svg);
    const nodeLayer = svgEl("g", { class: "uv-nodes" }, svg);
    const labelLayer = svgEl("g", { class: "uv-labels" }, svg);
    const links = DATA.connections.map((link) => {
      const g = svgEl("g", { class: "uv-link" }, linkLayer);
      return { ...link, g, halo: svgEl("path", { class: "uv-halo" }, g), line: svgEl("path", { class: "uv-line" }, g), dot: null, run: null, ends: "" };
    });
    // A node: its stem and its foot on the ground, and its body (the selected project's glow and
    // dashed ring, the cube, the target under the pointer), moved as one by its transform. The
    // cube is drawn once, at the reference's size, and scaled with its distance; its edges keep
    // their width (non-scaling stroke).
    const CUBE = { left: "-8.5,-3.23 0,1.87 0,8.5 -8.5,3.4", right: "0,1.87 8.5,-3.23 8.5,3.4 0,8.5", top: "0,-8.5 8.5,-3.23 0,1.87 -8.5,-3.23" };
    const nodes = new Map(projects.map((project) => {
      const g = svgEl("g", { class: "uv-node", "data-key": project.key, "data-domain": project.domain }, nodeLayer);
      const stem = svgEl("path", { class: "uv-stem" }, g);
      const foot = svgEl("ellipse", { class: "uv-foot", rx: 10, ry: 3.5 }, g);
      const body = svgEl("g", { class: "uv-body" }, g);
      svgEl("circle", { class: "uv-halo-glow", r: 48 }, body);
      const ring = svgEl("circle", { class: "uv-ring", r: 23 }, body);
      const cube = svgEl("g", { class: "uv-cube" }, body);
      for (const face of ["left", "right", "top"]) svgEl("polygon", { class: `uv-face uv-${face}`, points: CUBE[face] }, cube);
      const hit = svgEl("circle", { class: "uv-hit" }, body);
      return [project.key, { g, stem, foot, body, ring, cube, hit }];
    }));
    // A label: its tag and name, moved as one by its transform, and the tie back to its node.
    const labels = new Map(projects.map((project) => {
      const g = svgEl("g", { class: "uv-label is-hidden", "data-key": project.key, "data-domain": project.domain }, labelLayer);
      const label = { g, tie: svgEl("path", { class: "uv-tie" }, g), tag: svgEl("rect", { class: "uv-tag", rx: 3, height: 22 }, g), text: svgEl("text", { class: "uv-name", x: 9 }, g), spot: -1 };
      label.text.textContent = project.name;
      return [project.key, label];
    }));
    let topLabel = null; // the label drawn last, over the others: the selected project's

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

    // The camera's rotation, worked out once a drawing; a point then projects with a few products.
    let cy = 1, sy = 0, cp = 1, sp = 0;
    function aim() { cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch); }
    function project3d(x, y, z) {
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const s = DEPTH / (DEPTH - z2) * cam.zoom * view.k;
      return { x: view.w / 2 + x1 * s, y: view.h / 2 + view.oy - y1 * s, z: z2, s };
    }
    function circle(radius) {
      let d = "";
      for (let j = 0; j < RING.length; j++) {
        const p = project3d(RING[j][0] * radius, GROUND, RING[j][1] * radius);
        d += `${j ? "L" : "M"}${r1(p.x)} ${r1(p.y)}`;
      }
      return d;
    }

    const isOut = (key) => state.filter !== "all" && byKey.get(key).domain !== state.filter;
    const litKeys = () => (state.lit ? sharing(state.lit.kind, state.lit.id) : null);
    let nodeOrder = "";
    let shownCam = "";

    // The drawing, from the camera as it is. Everything that moves is positioned by one attribute
    // each (a transform, or a path), written only when it changes; nothing is rebuilt, and only
    // the nodes whose depth order changed move in the document.
    function draw() {
      if (!shown || !view.w || !view.h) return;
      const W = view.w, H = view.h;
      aim();
      // The ground: a grid and three circular guides.
      let d = "";
      for (let k = -280; k <= 280; k += 40) {
        const a = project3d(k, GROUND, -260), b = project3d(k, GROUND, 260), c = project3d(-280, GROUND, k), e = project3d(280, GROUND, k);
        d += `M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}M${r1(c.x)} ${r1(c.y)}L${r1(e.x)} ${r1(e.y)}`;
      }
      attr(grid, "d", d);
      attr(guideInner, "d", circle(115) + circle(210));
      attr(guideOuter, "d", circle(280));

      const points = new Map(projects.map((project) => [project.key, project3d(project.position[0], project.position[1], project.position[2])]));
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
        const ends = [r1(from.x), r1(from.y), r1(to.x), r1(to.y)];
        const path = `M${ends[0]} ${ends[1]}L${ends[2]} ${ends[3]}`;
        attr(link.halo, "d", path);
        attr(link.line, "d", path);
        if (on) signal(link, reduced() ? null : ends);
      }

      // Nodes, far to near.
      const order = [...points.entries()].sort((a, b) => a[1].z - b[1].z).map(([key]) => key);
      const orderKey = order.join();
      if (orderKey !== nodeOrder) {
        let next = nodeLayer.firstChild;
        for (const key of order) {
          const g = nodes.get(key).g;
          if (g === next) next = next.nextSibling;
          else nodeLayer.insertBefore(g, next);
        }
        nodeOrder = orderKey;
      }
      const size = view.narrow ? .9 : 1;
      for (const project of projects) {
        const key = project.key;
        const node = nodes.get(key);
        const pt = points.get(key);
        const sel = key === state.selected;
        set(node.g, { class: `uv-node${sel ? " is-sel" : ""}${isOut(key) ? " is-out" : ""}${lit && lit.includes(key) ? " is-lit" : ""}` });
        const foot = project3d(project.position[0], GROUND, project.position[2]);
        const x = r1(pt.x), y = r1(pt.y), fx = r1(foot.x), fy = r1(foot.y);
        attr(node.stem, "d", `M${fx} ${fy}L${x} ${y}`);
        attr(node.foot, "transform", `translate(${fx} ${fy})`);
        attr(node.body, "transform", `translate(${x} ${y})`);
        const q = Math.round(size * clamp(pt.s, .7, 1.35) * 100) / 100;
        attr(node.cube, "transform", `scale(${q})`);
        attr(node.hit, "r", Math.round(Math.max(fine ? 15 : 22, 10 * q + 6)));
        if (sel) attr(node.ring, "r", r1(10 * q + 13));
      }

      // Labels: the selected project's first, then near to far, each where it overlaps no other
      // label and covers no other node (its last place first, so labels stay put as the map turns).
      // On narrow maps only the ones that matter are named (the selected project, its relationships,
      // a domain's few projects), and while highlighting, the highlighted ones.
      const related = new Set(relations(state.selected).map((link) => link.other));
      const placed = [];
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
          const bx = clamp(p.x + spots[i][0], 6, W - w - 6);
          const by = clamp(p.y + spots[i][1], 7, H - h - 7);
          if (placed.some((other) => bx < other.x + other.w + 3 && bx + w + 3 > other.x && by < other.y + other.h + 3 && by + h + 3 > other.y)) continue;
          let covers = false;
          for (const other of projects) {
            if (other.key === key || isOut(other.key)) continue;
            const q = points.get(other.key);
            if (q.x > bx - 6 && q.x < bx + w + 6 && q.y > by - 6 && q.y < by + h + 6) { covers = true; break; }
          }
          if (!covers) { box = { x: bx, y: by, w, h }; label.spot = i; break; }
        }
        if (!box) {
          if (!sel) { set(label.g, { class: "uv-label is-hidden" }); label.spot = -1; continue; }
          box = { x: clamp(p.x + 14, 6, W - w - 6), y: clamp(p.y - 29, 7, H - h - 7), w, h };
        }
        placed.push(box);
        const bx = r1(box.x), by = r1(box.y);
        set(label.g, { class: `uv-label${sel ? " is-sel" : ""}` });
        attr(label.g, "transform", `translate(${bx} ${by})`);
        attr(label.tie, "d", `M${r1(p.x - bx)} ${r1(p.y - by)}L${r1(clamp(p.x, bx, bx + w) - bx)} ${r1(clamp(p.y, by, by + h) - by)}`);
        attr(label.tag, "width", r1(w));
        attr(label.text, "y", sel ? 15 : 14.5);
      }
      // The selected project's label lies over the others (they never overlap one another).
      if (topLabel !== state.selected) { labelLayer.append(labels.get(state.selected).g); topLabel = state.selected; }

      const camera = `AZ ${((degrees(cam.yaw) % 360) + 360) % 360}° / EL ${degrees(cam.pitch)}°`;
      if (camera !== shownCam) { camText.textContent = camera; shownCam = camera; }
    }

    // A signal along one of the selected project's connections, outward: a dot the compositor
    // moves. When the camera moves, only its two ends change; it keeps its place in its run.
    const seen = () => shown && onScreen && !document.hidden;
    function signal(link, line) {
      if (!line || typeof signalLayer.animate !== "function") {
        if (link.dot) { link.run.cancel(); link.dot.remove(); link.dot = link.run = null; link.ends = ""; }
        return;
      }
      if (lean && link.dot) return; // hidden while the lighter drawing moves; aimed again when it stops
      const ends = line.join();
      if (ends === link.ends) return;
      link.ends = ends;
      const frames = [{ transform: `translate(${line[0]}px, ${line[1]}px)` }, { transform: `translate(${line[2]}px, ${line[3]}px)` }];
      if (link.dot) { link.run.effect.setKeyframes(frames); return; }
      link.dot = document.createElement("i");
      link.dot.className = "uv-signal";
      signalLayer.append(link.dot);
      link.run = link.dot.animate(frames, { duration: 2400, iterations: Infinity });
      if (!seen()) link.run.pause();
    }

    /* ---------- The camera ---------- */
    // A device that cannot redraw the whole map at about 30 frames a second while the camera moves
    // (measured on the camera's own frames) gets a lighter drawing while it moves, and only then:
    // dashed lines drawn solid and fainter, the signals waiting. On a capable device it never happens.
    let pace = 16.7; // ms a camera frame takes, smoothed
    let slow = false;
    function setLean(on) {
      if (on === lean) return;
      lean = on;
      stage.classList.toggle("is-lean", on);
    }
    function tick(time) {
      frame = 0;
      const ms = time - last;
      const dt = clamp(ms / 1000, .008, .064);
      last = time;
      pace = pace * .7 + Math.min(ms, 200) * .3;
      if (pace > 34) slow = true;
      const k = reduced() ? 1 : 1 - Math.exp(-dt / TAU);
      let moving = false;
      for (const name of ["yaw", "pitch", "zoom"]) {
        const gap = goal[name] - cam[name];
        if (Math.abs(gap) < .0015) cam[name] = goal[name];
        else { cam[name] += gap * k; moving = true; }
      }
      setLean(slow && moving);
      draw();
      if (moving && shown) frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (!shown) return;
      if (reduced() || !onScreen || document.hidden) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); setLean(false); draw(); return; }
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
      // Framing: in a map taller than the reference, the constellation is raised so that its
      // highest label stands about as far below the top as in the reference (14.5% of the
      // height), but never so far that the ground grid stops reaching the bottom edge. Worked out
      // from the opening camera, and kept as the map turns.
      view.oy = 0;
      const now = { ...cam };
      Object.assign(cam, HOME);
      aim();
      const top = Math.min(...projects.map((project) => project3d(project.position[0], project.position[1], project.position[2]).y)) - 45;
      const ground = Math.max(...[[-280, -260], [280, -260], [-280, 260], [280, 260]].map(([x, z]) => project3d(x, GROUND, z).y));
      Object.assign(cam, now);
      view.oy = Math.min(0, Math.max(view.h - ground, view.h * .145 - top));
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
      if (!on && frame) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); setLean(false); draw(); }
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
        if (frame) { cancelAnimationFrame(frame); frame = 0; Object.assign(cam, goal); setLean(false); }
      },
      select
    };
  }

  window.PortfolioUniverse = { mount };
})();
