/*
 * Build-time HTML components. Everything here renders to static markup, so the
 * content of every page is complete without JavaScript: the client scripts only
 * enhance what these functions already produced.
 */
import { siteConfig, featuredProjects, archiveProjects, caseStudyProjects } from "../site.config.mjs";

const { profile, layers: LAYERS } = siteConfig;

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const nn = (value) => String(value).padStart(2, "0");

function inlineIcon(name, body) {
  return `<svg class="icon icon-${name}" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/* One line style: 24-unit grid, 1.8 stroke, round caps. Email, GitHub, résumé, external
   and send are the shapes from the current gurmilansingh.com; LinkedIn is redrawn in line
   (the live one is filled), and pin and download are drawn to the same grid. */
export const icons = {
  email: inlineIcon("email", '<path d="M4 6.5h16v11H4z" /><path d="m4.8 7.2 7.2 5.5 7.2-5.5" />'),
  github: inlineIcon("github", '<path d="M9 19c-4.2 1.3-4.2-2.2-5.6-2.8" /><path d="M15 21v-3.4c0-1 .3-1.7.9-2.2 3-.4 5.8-1.5 5.8-6.4 0-1.4-.5-2.6-1.4-3.6.1-.4.5-1.8-.2-3.5 0 0-1.3-.4-3.9 1.4a13.4 13.4 0 0 0-7.1 0C6.5 1.5 5.2 1.9 5.2 1.9c-.7 1.7-.3 3.1-.2 3.5A5 5 0 0 0 3.6 9c0 4.9 2.8 6 5.8 6.4.6.5.9 1.2.9 2.2V21" />'),
  linkedin: inlineIcon("linkedin", '<path d="M7 10.2v7.3" /><path d="M7 6.7v.01" /><path d="M11 17.5v-7.3" /><path d="M11 13.6c0-2 1.3-3.4 3-3.4s3 1.4 3 3.4v3.9" />'),
  resume: inlineIcon("resume", '<path d="M7 3.8h6.8L18 8v12.2H7z" /><path d="M13.5 3.8v4.5H18" /><path d="M9.7 12.2h4.6" /><path d="M9.7 15.4h4.6" />'),
  pin: inlineIcon("pin", '<path d="M12 20.6s-6-5.6-6-10.4a6 6 0 0 1 12 0c0 4.8-6 10.4-6 10.4z" /><circle cx="12" cy="10.2" r="2.1" />'),
  external: inlineIcon("external", '<path d="M8 8h8v8" /><path d="M7.5 16.5 16 8" />'),
  download: inlineIcon("download", '<path d="M12 4.5V15" /><path d="m7.5 10.8 4.5 4.5 4.5-4.5" /><path d="M5.5 19.5h13" />'),
  send: inlineIcon("send", '<path d="m4 12 16-7-7 16-2.4-6.6L4 12z" /><path d="m10.6 14.4 4-4" />'),
  success: inlineIcon("success", '<path d="M20 6 9 17l-5-5" />'),
  error: inlineIcon("error", '<path d="M12 8v5" /><path d="M12 17h.01" /><path d="M4.8 4.8h14.4v14.4H4.8z" />'),
  copy: inlineIcon("copy", '<path d="M8.5 8.5h11v11h-11z" /><path d="M15.5 8.5v-4h-11v11h4" />'),
  moon: inlineIcon("moon", '<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z" />'),
  sun: inlineIcon("sun", '<circle cx="12" cy="12" r="3.8" /><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" />')
};

/* Six fixed sockets on each 360-unit plane, as percentages, in index order. */
const SOCKETS = [[70, 100], [180, 100], [290, 100], [70, 250], [180, 250], [290, 250]]
  .map(([x, y]) => [+(x / 3.6).toFixed(2), +(y / 3.6).toFixed(2)]);
if (featuredProjects.length > SOCKETS.length) {
  throw new Error(`The stack has ${SOCKETS.length} sockets but ${featuredProjects.length} featured projects are configured.`);
}

const TONES = { "badge-public": "ok", "badge-deployed": "ok", "badge-production": "ok", "badge-academic": "warn", "badge-private": "muted" };
const tone = (project) => TONES[project.statusClass] || "muted";

export function status(project) {
  return `<span class="status tone-${tone(project)}"><i class="dot" aria-hidden="true"></i>${esc(project.status)}</span>`;
}

const NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';

/* The GitHub action, wherever a project links to its source: the contact section's tile
   and glyph, the label, and a quiet outward arrow. It renders nothing unless the project
   has a public repository (private ones keep `repository: ""`), and the build fails if a
   repository is not on GitHub, so the label can never be wrong. The accessible name
   starts with the visible label and says which project it belongs to. */
export function githubLink(project) {
  if (!project?.repository) return "";
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(project.repository)) throw new Error(`${project.shortTitle}: repository is not a GitHub repository URL: ${project.repository}`);
  return `<a class="gh-link" href="${esc(project.repository)}" target="_blank" rel="noopener noreferrer"><span class="gh-tile" aria-hidden="true">${icons.github}</span><span>GitHub</span><span class="sr-only"> repository for ${esc(project.shortTitle)} (opens in a new tab)</span>${icons.external}</a>`;
}

export function picture(project, slot = "primary", { loading = "lazy", sizes = "" } = {}) {
  const src = project[`${slot}Image`];
  if (!src) return "";
  const avif = project[`${slot}ImageAvif`];
  const webp = project[`${slot}ImageWebp`];
  const sizesAttr = sizes ? ` sizes="${sizes}"` : "";
  return `<picture>${avif ? `<source srcset="${avif}" type="image/avif"${sizesAttr} />` : ""}${webp ? `<source srcset="${webp}" type="image/webp"${sizesAttr} />` : ""}<img src="${src}" width="${project[`${slot}ImageWidth`]}" height="${project[`${slot}ImageHeight`]}" loading="${loading}" decoding="async" alt="${esc(project[`${slot}ImageAlt`])}" /></picture>`;
}

/* ---------- Site chrome ---------- */

export function header(mode = "home") {
  const home = mode === "home";
  const [, caseKey] = mode.split(":");
  const caseProject = caseKey ? siteConfig.projects[caseKey] : null;
  const href = (hash) => (home ? `#${hash}` : `index.html#${hash}`);
  const link = (hash, label) => `<a href="${href(hash)}"${home ? " data-section-link" : ""}${!home && caseProject && hash === "work" ? ' aria-current="true"' : ""}>${label}</a>`;
  const hud = caseProject ? `case file ${nn(caseProject.order)} · ${esc(caseProject.shortTitle)}` : home ? "full-stack developer" : "route not found";
  return `<header class="site-header" data-header>
      <div class="header-inner">
        <a class="brand" href="${home ? "#top" : "index.html"}"><span class="brand-mark" aria-hidden="true">GS</span><span class="brand-name">${esc(profile.name)}</span><span class="sr-only">, ${home ? "back to top" : "home"}</span></a>
        <p class="header-hud" aria-hidden="true"><span data-hud>${hud}</span><span class="hud-sep">/</span><span>${featuredProjects.length} systems × ${LAYERS.length} layers</span></p>
        <nav id="site-navigation" class="site-nav" aria-label="Primary navigation" data-nav>
          ${link("work", "Work")}${link("experience", "Profile")}${link("contact", "Contact")}
          <a class="nav-cv" href="${profile.resume}" target="_blank" rel="noopener noreferrer">${icons.resume}<span>CV</span><span class="sr-only"> (PDF, opens in a new tab)</span>${icons.external}</a>
          <p class="nav-meta"><a href="mailto:${profile.email}">${profile.email}</a><span>${esc(profile.location)}</span></p>
        </nav>
        <div class="theme-switch" role="group" aria-label="Colour theme" data-theme-switch hidden><button class="ts-btn" type="button" data-theme-choice="dark" aria-pressed="true" title="Dark theme">${icons.moon}<span class="sr-only">Dark theme</span></button><button class="ts-btn" type="button" data-theme-choice="light" aria-pressed="false" title="Light theme">${icons.sun}<span class="sr-only">Light theme</span></button></div>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" data-menu-toggle><span class="sr-only">Menu</span><span class="menu-bars" aria-hidden="true"><i></i><i></i></span></button>
      </div>
    </header>`;
}

/* One quiet line. The homepage ends on its contact section, so its footer repeats none of
   it and stays on that section's orange ground (is-end); other pages have no contact
   section and keep three icon links on the normal ground. */
export function footer(mode = "") {
  const links = mode === "home" ? "" : `<ul class="footer-links" aria-label="Contact">
          <li><a href="mailto:${profile.email}" title="Email">${icons.email}<span class="sr-only">Email ${profile.email}</span></a></li>
          <li><a href="${esc(profile.github)}" target="_blank" rel="noopener noreferrer" title="GitHub">${icons.github}<span class="sr-only">GitHub${NEW_TAB}</span></a></li>
          <li><a href="${esc(profile.linkedin)}" target="_blank" rel="noopener noreferrer" title="LinkedIn">${icons.linkedin}<span class="sr-only">LinkedIn${NEW_TAB}</span></a></li>
        </ul>`;
  return `<footer class="site-footer${mode === "home" ? " is-end" : ""}">
      <div class="frame footer-base">
        <p>© <span data-year>2026</span> ${esc(profile.name)}</p>
        <p class="footer-note">Hand-built static site. No frameworks, no tracking.</p>
        ${links}<a class="footer-top" href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </div>
    </footer>`;
}

/* ---------- The stack ---------- */

export function stack(selectedKey = featuredProjects[0].key) {
  const selected = Math.max(0, featuredProjects.findIndex((project) => project.key === selectedKey));
  const project = featuredProjects[selected];
  const [bx, by] = SOCKETS[selected];
  const planes = LAYERS.map((layer, li) => {
    const dots = SOCKETS.slice(0, featuredProjects.length)
      .map(([x, y], i) => `<span class="socket${i === selected ? " is-sel" : ""}" data-socket="${i}" style="--x:${x}%;--y:${y}%"></span>`)
      .join("");
    return `<div class="plane" data-plane="${li}" style="--z:${LAYERS.length - 1 - li}"><span class="plane-label">${layer.code} ${layer.name}</span>${dots}<span class="plane-tag" data-plane-tag style="--x:${bx}%;--y:${by}%">${esc(project.system.layers[li][0])}</span></div>`;
  }).join("");
  return `<div class="stack-shift" data-stack-shift><div class="stack" data-stack style="--bx:${bx}%;--by:${by}%"><div class="stack-spin">${planes}<div class="beam" data-beam><i class="packet"></i></div></div></div></div>`;
}

function layerCut(project, { interactive = false } = {}) {
  return `<ol class="layer-cut" aria-label="${esc(project.shortTitle)}, layer by layer">${project.system.layers.map(([tag, text], i) => `<li class="lc-row" data-layer="${i}" data-tag="${esc(tag)}"><p class="lc-code"><span>${LAYERS[i].code}</span> ${LAYERS[i].name}</p><div class="lc-body"><p class="lc-tag">${esc(tag)}</p><p class="lc-text">${esc(text)}</p></div></li>`).join("")}</ol>`;
}

/* ---------- Workbench (homepage) ---------- */

function indexItem(project) {
  return `<li><a class="wb-item" href="#work-${project.key}" id="tab-${project.key}" data-wb-tab="${project.key}"><span class="wi-no">${nn(project.order)}</span><span class="wi-name">${esc(project.shortTitle)}</span>${status(project)}</a></li>`;
}

function alsoItem(project) {
  return `<li><a class="wb-also-item" href="#work-${project.key}" data-wb-also="${project.key}"><span class="wi-no">${nn(project.archive)}</span><span class="wi-name">${esc(project.shortTitle)}</span><span class="wi-stack">${esc(project.tech.split(" · ").slice(0, 2).join(" · "))}</span></a></li>`;
}

function dossier(project) {
  const system = project.system;
  const meta = [
    ["Role", project.meta?.role],
    ["Context", project.meta?.context || project.context],
    ["Status", project.status],
    ["Stack", project.tech]
  ].filter(([, value]) => value);
  const shot = project.primaryImage
    ? `<figure class="sf-shot">${picture(project, "primary", { sizes: "(min-width: 900px) 680px, 100vw" })}<figcaption>${esc(project.primaryImageCaption)}</figcaption></figure>`
    : ""; // No capture (confidential or desktop-only work): the file goes straight to the architecture.
  const arch = `<div class="sf-block"><h4 class="sf-label">Architecture</h4><ol class="arch-chain">${system.architecture.map(([title, sub], i) => `<li><span class="arch-no">${nn(i + 1)}</span><strong>${esc(title)}</strong><span>${esc(sub)}</span></li>`).join("")}</ol></div>`;
  const record = system.decision
    ? `<div class="sf-record"><p class="sf-record-head"><span>Decision 01</span><span>Engineering trade-off</span></p><h4 class="sf-record-title">${esc(system.decision.title)}</h4><dl>${system.decision.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`
    : `<div class="sf-record"><p class="sf-record-head"><span>Flow</span><span>How it works</span></p><h4 class="sf-record-title">${esc(system.trace.title)}</h4><ol class="sf-trace">${system.trace.steps.map((step, i) => `<li><span>${nn(i + 1)}</span>${esc(step)}</li>`).join("")}</ol></div>`;
  return `<div class="sf-dossier" data-dossier>
            <p class="sf-headline">${esc(system.head)}</p>
            <p class="sf-intro">${esc(system.intro)}</p>
            <dl class="sf-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
            ${shot}
            ${arch}
            ${record}
            <div class="sf-proof"><div class="proof-evidence"><h4 class="sf-label">Evidence</h4><p>${esc(system.evidence)}</p></div><div class="proof-boundary"><h4 class="sf-label">Not claimed</h4><p>${esc(system.boundary)}</p></div></div>
          </div>`;
}

function systemFile(project, featured) {
  const number = nn(featured ? project.order : project.archive);
  const actions = [
    `<button class="btn btn-primary" type="button" data-open-file="${project.key}" hidden>Open case file<span aria-hidden="true">→</span></button>`,
    project.caseStudy ? `<a class="btn btn-line" href="${project.caseStudy}">Read the case study<span aria-hidden="true">→</span></a>` : "",
    githubLink(project)
  ].join("");
  return `<section id="work-${project.key}" class="system-file${featured ? "" : " is-also"}" data-system="${project.key}" aria-labelledby="work-${project.key}-title">
          <header class="sf-head">
            <p class="sf-kicker"><span class="sf-no">${number}</span>${status(project)}</p>
            <h3 id="work-${project.key}-title" class="sf-title">${esc(project.shortTitle)}</h3>
            <p class="sf-category">${esc(project.category)}</p>
            <p class="sf-claim">${esc(project.lead)}</p>
            <p class="sf-tech">${esc(project.tech)}</p>
          </header>
          ${featured ? layerCut(project) : ""}
          <div class="sf-actions">${actions}</div>
          ${dossier(project)}
        </section>`;
}

export function workbenchIndex() {
  return `<nav class="wb-index" aria-label="Systems">
          <p class="wb-head"><span>Systems</span><span class="wb-keys" aria-hidden="true">↑ ↓ to browse</span></p>
          <ol class="wb-list" data-wb-list>${featuredProjects.map(indexItem).join("")}</ol>
          <p class="wb-head wb-head-also"><span>Also</span><span>${archiveProjects.length} more</span></p>
          <ul class="wb-also" data-wb-also-list>${archiveProjects.map(alsoItem).join("")}</ul>
        </nav>`;
}

export function workbenchStage() {
  const first = featuredProjects[0];
  return `<div class="wb-stage" data-wb-stage>
          <p class="stage-hud" aria-hidden="true"><span data-stage-fig>Fig. 01 — ${esc(first.shortTitle)}</span><span data-stage-sub>Cut through ${LAYERS.length} layers · ${esc(first.status)}</span></p>
          <div class="stage-scene" aria-hidden="true" data-stage-scene>${stack(first.key)}</div>
          <div class="stage-controls" data-stage-controls hidden>
            <p class="stage-hint" aria-hidden="true" data-stage-hint>Drag to orbit · hover to explode · click a layer to open its case file</p>
            <div class="layer-switch" role="group" aria-label="Highlight a layer">${LAYERS.map((layer, i) => `<button type="button" class="ls-btn" data-layer-btn="${i}" aria-pressed="${i === 0}" aria-label="${layer.code} ${layer.name}"><span>${layer.code}</span> <span class="ls-name">${layer.name}</span></button>`).join("")}</div>
            <div class="view-switch"><button type="button" class="vs-btn" data-explode aria-pressed="false">Explode</button><button type="button" class="vs-btn" data-reset-view>Reset view</button></div>
          </div>
        </div>`;
}

export function workbenchFiles() {
  return `<div class="wb-files" data-wb-files>
        ${featuredProjects.map((project) => systemFile(project, true)).join("\n        ")}
        ${archiveProjects.map((project) => systemFile(project, false)).join("\n        ")}
        </div>`;
}

export function drawer() {
  return `<dialog class="drawer" data-drawer aria-label="Case file">
      <div class="drawer-bar">
        <p class="drawer-crumb" data-drawer-crumb>Case file</p>
        <div class="drawer-nav">
          <button type="button" class="drawer-btn" data-drawer-prev aria-label="Previous case file"><span aria-hidden="true">←</span> Prev</button>
          <button type="button" class="drawer-btn" data-drawer-next aria-label="Next case file">Next <span aria-hidden="true">→</span></button>
          <button type="button" class="drawer-btn drawer-close" data-drawer-close aria-label="Close case file">Esc <span aria-hidden="true">×</span></button>
        </div>
      </div>
      <div class="drawer-body" data-drawer-body></div>
    </dialog>`;
}

/* ---------- Case studies ---------- */

export function caseCut(key) {
  const project = siteConfig.projects[key];
  if (!project?.system?.layers) throw new Error(`case-cut: ${key} has no layer data`);
  const full = featuredProjects.find((entry) => entry.key === key);
  return `<section class="case-cut" aria-labelledby="case-cut-title" data-cut>
        <div class="frame cut-grid">
          <div class="cut-visual" aria-hidden="true"><p class="stage-hud"><span>Fig. ${nn(full.order)} — ${esc(full.shortTitle)}</span><span>Socket ${nn(full.order)} of ${featuredProjects.length}</span></p><div class="stage-scene mini-scene">${stack(key)}</div></div>
          <div class="cut-copy">
            <p class="label">Layer cut</p>
            <h2 id="case-cut-title" class="cut-title">${esc(full.shortTitle)}, cut through ${LAYERS.length} layers.</h2>
            ${layerCut(full)}
          </div>
        </div>
      </section>`;
}

export function caseEnd(key) {
  const index = caseStudyProjects.findIndex((project) => project.key === key);
  if (index < 0) throw new Error(`case-end: ${key} is not a case study`);
  const prev = caseStudyProjects[(index - 1 + caseStudyProjects.length) % caseStudyProjects.length];
  const next = caseStudyProjects[(index + 1) % caseStudyProjects.length];
  const current = caseStudyProjects[index];
  const card = (project, dir, cls) => `<a class="pager-card ${cls}" href="${project.caseStudy}"><span class="pager-dir">${dir}</span><strong>${esc(project.shortTitle)}</strong><span>${esc(project.category)}</span></a>`;
  const subject = encodeURIComponent(`About ${current.shortTitle}`);
  return `<section class="case-end" aria-labelledby="case-end-title">
        <div class="frame case-end-grid">
          <div class="case-end-copy"><p class="label">Discuss this work</p><h2 id="case-end-title" class="case-end-title">Questions about ${esc(current.shortTitle)}, or a role where this experience fits?</h2></div>
          <div class="case-end-actions"><a class="btn btn-primary" href="mailto:${profile.email}?subject=${subject}">Email me about ${esc(current.shortTitle)}<span aria-hidden="true">→</span></a><a class="btn btn-line" href="${profile.resume}" target="_blank" rel="noopener noreferrer" download>Download CV<span class="sr-only"> (PDF)</span><span aria-hidden="true">↓</span></a></div>
        </div>
        <nav class="frame case-pager" aria-label="Project navigation">
          ${card(prev, "<span aria-hidden=\"true\">←</span> Previous system", "pager-prev")}
          <a class="pager-card pager-home" href="index.html#work"><span class="pager-dir">All systems</span><strong>Selected work</strong><span>${featuredProjects.length} systems × ${LAYERS.length} layers</span></a>
          ${card(next, "Next system <span aria-hidden=\"true\">→</span>", "pager-next")}
        </nav>
      </section>`;
}

/* ---------- Partial resolution ---------- */

const PARTIALS = {
  header: (arg) => header(arg || "home"),
  footer: (arg) => footer(arg),
  "wb-index": () => workbenchIndex(),
  "wb-stage": () => workbenchStage(),
  "wb-files": () => workbenchFiles(),
  drawer: () => drawer(),
  "case-cut": (arg) => caseCut(arg),
  "case-end": (arg) => caseEnd(arg),
  "github-link": (key) => {
    const project = siteConfig.projects[key];
    if (!project) throw new Error(`github-link: unknown project ${key}`);
    return githubLink(project);
  }
};

export function renderPartials(source, file) {
  return source.replace(/{{>\s*([\w-]+)(?:\s+([\w:-]+))?\s*}}/g, (match, name, arg) => {
    const partial = PARTIALS[name];
    if (!partial) throw new Error(`${file}: unknown partial ${match}`);
    return partial(arg);
  });
}
