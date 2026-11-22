/*
 * Build-time HTML components. Everything here renders to static markup, so the
 * content of every page is complete without JavaScript: the client scripts only
 * enhance what these functions already produced.
 */
import { siteConfig, featuredProjects, alsoProjects, caseStudyProjects } from "../site.config.mjs";

const { profile, layers: LAYERS } = siteConfig;

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const nn = (value) => String(value).padStart(2, "0");
// A dotted list ("React · Node.js") that never starts a line with its separator.
const dotted = (text) => esc(text).replaceAll(" · ", "&nbsp;· ");

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
  // Chrome Web Store: a storefront with the Chrome emblem in it, drawn in the same line style
  // as GitHub. A bag with a handle reads as a padlock at 16px; the awning does not.
  store: inlineIcon("store", '<path d="M3.5 7.5h17v11.7a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8z" /><path d="M5.4 3.2h13.2l1.9 4.3h-17z" /><circle cx="12" cy="14.4" r="4.6" /><circle cx="12" cy="14.4" r="1.6" /><path d="M12 12.87h4.29" /><path d="M13.33 15.17l-2.15 3.72" /><path d="M10.67 15.17 8.53 11.45" />'),
  // A window with its side panel open: what "Quick look" does to the page.
  panel: inlineIcon("panel", '<path d="M3.8 5h16.4v14H3.8z" /><path d="M13.8 5v14" /><path d="M16.2 9h1.6" /><path d="M16.2 12h1.6" />'),
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

/* What a status says about maturity, as a tone: shipped or public (ok), still moving
   (warn), experimental (accent), and settled but not public or not a product (muted). The
   words carry the meaning; the dot only groups them. */
const TONES = {
  "badge-production": "ok", "badge-deployed": "ok", "badge-published": "ok", "badge-public": "ok",
  "badge-development": "warn", "badge-experimental": "accent",
  "badge-commercial": "muted", "badge-academic": "muted", "badge-private": "muted"
};
const tone = (project) => TONES[project.statusClass] || "muted";

export function status(project) {
  return `<span class="status tone-${tone(project)}"><i class="dot" aria-hidden="true"></i>${esc(project.status)}</span>`;
}

/* Where the source lives, derived from `repository` so that publishing a repository is a
   one-field change: a public URL turns this into "Public on GitHub" and adds the action. */
export function sourceLabel(project) {
  return project.repository ? "Public on GitHub" : project.sourceNote || "Private repository";
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

/* The store action, in the same tile-and-label form as GitHub. Only Chrome Web Store
   listings are accepted, so the label cannot be wrong either. */
export function storeLink(project) {
  if (!project?.store) return "";
  if (!/^https:\/\/chromewebstore\.google\.com\/detail\/[^\s"<>]+$/.test(project.store)) throw new Error(`${project.shortTitle}: store is not a Chrome Web Store listing: ${project.store}`);
  return `<a class="gh-link store-link" href="${esc(project.store)}" target="_blank" rel="noopener noreferrer"><span class="gh-tile" aria-hidden="true">${icons.store}</span><span>Chrome Web Store</span><span class="sr-only"> listing for ${esc(project.shortTitle)} (opens in a new tab)</span>${icons.external}</a>`;
}

const projectByKey = (key) => {
  const project = siteConfig.projects[key];
  if (!project) throw new Error(`unknown project ${key}`);
  return { key, ...project };
};

export function picture(project, slot = "primary", { loading = "lazy", sizes = "", alt } = {}) {
  const src = project[`${slot}Image`];
  if (!src) return "";
  const avif = project[`${slot}ImageAvif`];
  const webp = project[`${slot}ImageWebp`];
  const sizesAttr = sizes ? ` sizes="${sizes}"` : "";
  return `<picture>${avif ? `<source srcset="${avif}" type="image/avif"${sizesAttr} />` : ""}${webp ? `<source srcset="${webp}" type="image/webp"${sizesAttr} />` : ""}<img src="${src}" width="${project[`${slot}ImageWidth`]}" height="${project[`${slot}ImageHeight`]}" loading="${loading}" decoding="async" alt="${esc(alt ?? project[`${slot}ImageAlt`])}" /></picture>`;
}

/* ---------- Site chrome ---------- */

export function header(mode = "home") {
  const home = mode === "home";
  const [, caseKey] = mode.split(":");
  const caseProject = caseKey ? siteConfig.projects[caseKey] : null;
  const href = (hash) => (home ? `#${hash}` : `index.html#${hash}`);
  const link = (hash, label) => `<a href="${href(hash)}"${home ? " data-section-link" : ""}${!home && caseProject && hash === "work" ? ' aria-current="true"' : ""}>${label}</a>`;
  const hud = caseProject ? `case study ${nn(caseProject.order ?? caseProject.also)} · ${esc(caseProject.shortTitle)}` : home ? "software engineer" : "route not found";
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

/* A featured system is drawn through its own socket. A layered "Also built" system (one
   with a case study) has no socket in the six, so its cut runs through the centre and no
   socket lights up. */
export function stack(selectedKey = featuredProjects[0].key) {
  const selected = featuredProjects.findIndex((project) => project.key === selectedKey);
  const project = selected >= 0 ? featuredProjects[selected] : projectByKey(selectedKey);
  const [bx, by] = selected >= 0 ? SOCKETS[selected] : [50, 50];
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

function dossier(project) {
  const system = project.system;
  const meta = [
    ["Role", project.meta?.role],
    ["Context", project.meta?.context || project.context],
    ["Status", project.status],
    ["Source", sourceLabel(project)]
  ].filter(([, value]) => value);
  const arch = `<div class="sf-block"><h4 class="sf-label">Architecture</h4><ol class="arch-chain">${system.architecture.map(([title, sub], i) => `<li><span class="arch-no">${nn(i + 1)}</span><strong>${esc(title)}</strong><span>${esc(sub)}</span></li>`).join("")}</ol></div>`;
  const record = system.decision
    ? `<div class="sf-record"><p class="sf-record-head"><span>Decision 01</span><span>Engineering trade-off</span></p><h4 class="sf-record-title">${esc(system.decision.title)}</h4><dl>${system.decision.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`
    : `<div class="sf-record"><p class="sf-record-head"><span>Flow</span><span>How it works</span></p><h4 class="sf-record-title">${esc(system.trace.title)}</h4><ol class="sf-trace">${system.trace.steps.map((step, i) => `<li><span>${nn(i + 1)}</span>${esc(step)}</li>`).join("")}</ol></div>`;
  return `<div class="sf-dossier" data-dossier>
            <p class="sf-headline">${esc(system.head)}</p>
            <p class="sf-intro">${esc(system.intro)}</p>
            <dl class="sf-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
            ${arch}
            ${record}
            <div class="sf-proof"><div class="proof-evidence"><h4 class="sf-label">Evidence</h4><p>${esc(system.evidence)}</p></div><div class="proof-boundary"><h4 class="sf-label">Not claimed</h4><p>${esc(system.boundary)}</p></div></div>
          </div>`;
}

/* What a quick look holds, in the order it shows it. */
function peekContents(project) {
  const parts = [project.primaryImage && "screenshot", "architecture", project.system.decision ? "key decision" : "how it works"].filter(Boolean);
  return parts.join(" · ").replace(/^./, (c) => c.toUpperCase());
}

/* The explorer's way into a quick look: the project's own screenshot as a preview, so a
   visitor sees there is one before opening it. Without a capture (confidential work) the
   card keeps its shape and says what the quick look holds instead. */
function peek(project) {
  const media = project.primaryImage
    ? `<span class="peek-media">${picture(project, "primary", { sizes: "136px", alt: "" })}</span>`
    : `<span class="peek-media is-empty">${icons.panel}</span>`;
  return `<button class="sf-peek" type="button" data-open-file="${project.key}" hidden>${media}<span class="peek-copy"><span class="peek-label">Quick look<span class="sr-only">: ${esc(project.shortTitle)},</span></span><span class="peek-sub">${dotted(peekContents(project))}</span></span><span class="peek-go" aria-hidden="true">→</span></button>`;
}

/* The screenshot, linked to its full-size file: the quick look shows it under the title, the
   list layout (no JavaScript) after the actions. */
function shot(project) {
  if (!project.primaryImage) return ""; // No capture (confidential or desktop-only work).
  return `<figure class="sf-shot"><a class="media-open" href="${project.primaryImage}" target="_blank" rel="noopener noreferrer">${picture(project, "primary", { sizes: "(min-width: 900px) 700px, 100vw" })}<span class="media-enlarge" aria-hidden="true">Full size ↗</span><span class="sr-only"> (full size, opens in a new tab)</span></a><figcaption>${esc(project.primaryImageCaption)}</figcaption></figure>`;
}

/* Two ways in, named for what they are: a quick look opens in place, beside the explorer; the
   full case study is its own page. */
function systemFile(project, featured) {
  const number = nn(featured ? project.order : project.also);
  const actions = [
    featured ? peek(project) : "",
    project.caseStudy ? `<a class="btn btn-primary" href="${project.caseStudy}">Full case study<span class="sr-only">: ${esc(project.shortTitle)}</span><span aria-hidden="true">→</span></a>` : "",
    storeLink(project),
    githubLink(project)
  ].join("");
  return `<section id="work-${project.key}" class="system-file${featured ? "" : " is-also"}" data-system="${project.key}" aria-labelledby="work-${project.key}-title">
          <header class="sf-head">
            <p class="sf-kicker"><span class="sf-no">${number}</span>${status(project)}</p>
            <h3 id="work-${project.key}-title" class="sf-title">${esc(project.shortTitle)}</h3>
            <p class="sf-category">${esc(project.category)}</p>
            <p class="sf-claim">${esc(project.lead)}</p>
            <p class="sf-tech">${dotted(project.tech)}</p>
          </header>
          <div class="sf-actions">${actions}</div>
          ${featured ? layerCut(project) : ""}
          ${shot(project)}
          ${dossier(project)}
        </section>`;
}

export function workbenchIndex() {
  return `<nav class="wb-index" aria-label="Systems">
          <p class="wb-head"><span>Systems</span><span class="wb-keys" aria-hidden="true">↑ ↓ to browse</span></p>
          <ol class="wb-list" data-wb-list>${featuredProjects.map(indexItem).join("")}</ol>
          <a class="wb-also-cue" href="#also-built"><span>Also built</span><span>${alsoProjects.length} more <span aria-hidden="true">↓</span></span></a>
        </nav>`;
}

/* "Also built": one ruled register below the explorer. Each row says what the work is (its
   status), what it does and what it is made with, and ends in the same actions in the same
   order: a quick look for every entry (without JavaScript, a jump to its case file), the full
   case study where there is one, then the public links. Inside the register those are the
   GitHub and Chrome Web Store marks alone, named for assistive technology and on hover; the
   explorer and the quick look spell them out. */
function iconLink(href, icon, label, project) {
  return `<a class="ab-icon" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${label}">${icon}<span class="sr-only">${label}: ${esc(project.shortTitle)} (opens in a new tab)</span></a>`;
}

function alsoRow(project) {
  githubLink(project); storeLink(project); // the same URL checks as every other link to them
  const actions = [
    `<a class="ab-action" href="#work-${project.key}" data-wb-also="${project.key}">Quick look<span class="sr-only">: ${esc(project.shortTitle)}</span></a>`,
    project.caseStudy ? `<a class="ab-action" href="${project.caseStudy}">Full case study<span class="sr-only">: ${esc(project.shortTitle)}</span><span aria-hidden="true">→</span></a>` : "",
    project.store ? iconLink(project.store, icons.store, "Chrome Web Store", project) : "",
    project.repository ? iconLink(project.repository, icons.github, "GitHub", project) : ""
  ].join("");
  return `<li class="ab-row">
            <p class="ab-status">${status(project)}</p>
            <div class="ab-main">
              <h4 class="ab-name">${esc(project.shortTitle)}</h4>
              <p class="ab-summary">${esc(project.summary || project.lead)}</p>
            </div>
            <p class="ab-tech">${dotted(project.tech)}</p>
            <div class="ab-links">${actions}</div>
          </li>`;
}

export function alsoBuilt() {
  return `<section id="also-built" class="also-built" aria-labelledby="also-built-title">
          <header class="ab-head">
            <h3 id="also-built-title" class="ab-title">Also built <span class="ab-count">${alsoProjects.length}</span></h3>
          </header>
          <ol class="ab-list">
          ${alsoProjects.map(alsoRow).join("\n          ")}
          </ol>
        </section>`;
}

export function workbenchStage() {
  const first = featuredProjects[0];
  return `<div class="wb-stage" data-wb-stage>
          <p class="stage-hud" aria-hidden="true"><span data-stage-fig>Fig. 01 — ${esc(first.shortTitle)}</span><span data-stage-sub>Cut through ${LAYERS.length} layers · ${esc(first.status)}</span></p>
          <div class="stage-scene" aria-hidden="true" data-stage-scene>${stack(first.key)}</div>
          <div class="stage-controls" data-stage-controls hidden>
            <p class="stage-hint" aria-hidden="true" data-stage-hint>Drag to orbit · hover to explode · click a layer for a quick look</p>
            <div class="layer-switch" role="group" aria-label="Highlight a layer">${LAYERS.map((layer, i) => `<button type="button" class="ls-btn" data-layer-btn="${i}" aria-pressed="${i === 0}" aria-label="${layer.code} ${layer.name}"><span>${layer.code}</span> <span class="ls-name">${layer.name}</span></button>`).join("")}</div>
            <div class="view-switch"><button type="button" class="vs-btn" data-explode aria-pressed="false">Explode</button><button type="button" class="vs-btn" data-reset-view>Reset view</button></div>
          </div>
        </div>`;
}

export function workbenchFiles() {
  return `<div class="wb-files" data-wb-files>
        ${featuredProjects.map((project) => systemFile(project, true)).join("\n        ")}
        ${alsoProjects.map((project) => systemFile(project, false)).join("\n        ")}
        </div>`;
}

export function drawer() {
  return `<dialog class="drawer" data-drawer aria-label="Quick look">
      <div class="drawer-bar">
        <p class="drawer-crumb" data-drawer-crumb>Quick look</p>
        <div class="drawer-nav">
          <button type="button" class="drawer-btn" data-drawer-prev aria-label="Previous project"><span aria-hidden="true">←</span> Prev</button>
          <button type="button" class="drawer-btn" data-drawer-next aria-label="Next project">Next <span aria-hidden="true">→</span></button>
          <button type="button" class="drawer-btn drawer-close" data-drawer-close aria-label="Close quick look">Esc <span aria-hidden="true">×</span></button>
        </div>
      </div>
      <div class="drawer-body" data-drawer-body></div>
    </dialog>`;
}

/* ---------- Case studies ---------- */

export function caseCut(key) {
  const full = projectByKey(key);
  if (!full.system?.layers) throw new Error(`case-cut: ${key} has no layer data`);
  const hud = typeof full.order === "number"
    ? `<span>Fig. ${nn(full.order)} — ${esc(full.shortTitle)}</span><span>Socket ${nn(full.order)} of ${featuredProjects.length}</span>`
    : `<span>Also built — ${esc(full.shortTitle)}</span><span>Cut through ${LAYERS.length} layers</span>`;
  return `<section class="case-cut" aria-labelledby="case-cut-title" data-cut>
        <div class="frame cut-grid">
          <div class="cut-visual" aria-hidden="true"><p class="stage-hud">${hud}</p><div class="stage-scene mini-scene">${stack(key)}</div></div>
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

/* The case index in a case study's eyebrow: its place among the six, or "Also built". */
export function caseIndex(key) {
  const project = projectByKey(key);
  const label = typeof project.order === "number" ? `${nn(project.order)} / ${esc(project.shortTitle)}` : `Also built / ${esc(project.shortTitle)}`;
  return `<span class="case-index">${label}</span>`;
}

/* The status fact: the maturity badge, then any public action. */
export function caseStatus(key) {
  const project = projectByKey(key);
  return `<span class="badge ${esc(project.statusClass)}">${esc(project.status)}</span>${storeLink(project)}${githubLink(project)}`;
}

/* The source fact: the GitHub action once the repository is public, its plain label until then. */
export function caseSource(key) {
  const project = projectByKey(key);
  return project.repository ? githubLink(project) : esc(sourceLabel(project));
}

/* ---------- Partial resolution ---------- */

const PARTIALS = {
  header: (arg) => header(arg || "home"),
  footer: (arg) => footer(arg),
  "wb-index": () => workbenchIndex(),
  "wb-stage": () => workbenchStage(),
  "wb-files": () => workbenchFiles(),
  "also-built": () => alsoBuilt(),
  drawer: () => drawer(),
  "case-cut": (arg) => caseCut(arg),
  "case-end": (arg) => caseEnd(arg),
  "case-index": (arg) => caseIndex(arg),
  "case-status": (arg) => caseStatus(arg),
  "case-source": (arg) => caseSource(arg),
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
