import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { siteConfig, featuredProjects, archiveProjects, caseStudyProjects } from "./site.config.mjs";
import { countHtmlWords } from "./scripts/html.mjs";

const root = path.resolve("dist");
const pages = siteConfig.pages.map((page) => page.file);
let failures = 0;

function fail(message) { failures += 1; console.error(`FAIL ${message}`); }
function pass(message) { console.log(`PASS ${message}`); }
function attrValue(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

const htmlByFile = new Map();
for (const file of pages) htmlByFile.set(file, await fs.readFile(path.join(root, file), "utf8"));

for (const [file, html] of htmlByFile) {
  console.log(`INFO ${file}: ${countHtmlWords(html)} content words`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${file}: expected exactly one h1`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${file}: missing title`);
  if (file !== "404.html" && !/<meta name="description" content="[^"]+"/i.test(html)) fail(`${file}: missing meta description`);
  if (file !== "404.html") {
    for (const metadata of ["og:title", "og:description", "og:image", "twitter:title", "twitter:description", "twitter:image"]) {
      if (!new RegExp(`<meta (?:property|name)="${metadata}" content="[^"]+"`, "i").test(html)) fail(`${file}: missing ${metadata}`);
    }
  }
  for (const [name, pattern] of [
    ["unresolved template token", /{{[^}]+}}/], ["public ADD placeholder", /\[ADD|ADD_REPO|ADD_VIDEO/i],
    ["DOCX reference", /\.docx/i], ["empty hash link", /href=["']#["']/i], ["coming-soon copy", /coming soon/i]
  ]) if (pattern.test(html)) fail(`${file}: ${name}`);

  const idValues = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const ids = new Set(idValues);
  if (ids.size !== idValues.length) fail(`${file}: duplicate id`);

  for (const match of html.matchAll(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi)) {
    const attrs = `${match[1]} ${match[3]}`;
    const href = match[2];
    if (/^https?:/i.test(href)) {
      if (!/target=["']_blank["']/i.test(attrs) || !/rel=["'][^"']*noopener[^"']*noreferrer/i.test(attrs)) fail(`${file}: external link lacks safe target/rel: ${href}`);
      continue;
    }
    if (/^(mailto:|tel:)/i.test(href)) continue;
    const [targetFileRaw, fragment] = href.split("#");
    const targetFile = targetFileRaw || file;
    if (!htmlByFile.has(targetFile) && !(await fs.stat(path.join(root, targetFile)).catch(() => null))) { fail(`${file}: missing internal target ${href}`); continue; }
    if (fragment) {
      const targetHtml = htmlByFile.get(targetFile);
      if (targetHtml && !new RegExp(`\\bid=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(targetHtml)) fail(`${file}: missing fragment target ${href}`);
    }
  }

  for (const match of html.matchAll(/<([a-z0-9]+)\b([^>]*\bdata-media-open\b[^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    if (!["a", "button"].includes(tag)) fail(`${file}: screenshot trigger is not keyboard-accessible: ${tag}`);
    if (tag === "a" && !/\bhref=["'][^"']+["']/i.test(attrs)) fail(`${file}: screenshot link trigger missing href`);
    if (tag === "button" && !/\btype=["']button["']/i.test(attrs)) fail(`${file}: screenshot button trigger should be type=button`);
    if (!/\baria-label=["'][^"']+["']/i.test(attrs)) fail(`${file}: screenshot trigger lacks explicit accessible name`);
  }

  for (const match of html.matchAll(/<dialog\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (!/\bdata-media-dialog\b/i.test(attrs)) continue;
    const labelledBy = attrValue(attrs, "aria-labelledby");
    const describedBy = attrValue(attrs, "aria-describedby");
    if (!/\brole=["']dialog["']/i.test(attrs)) fail(`${file}: media dialog missing role=dialog`);
    if (!/\baria-modal=["']true["']/i.test(attrs)) fail(`${file}: media dialog missing aria-modal=true`);
    if (!labelledBy || !ids.has(labelledBy)) fail(`${file}: media dialog aria-labelledby target missing`);
    if (!describedBy || !ids.has(describedBy)) fail(`${file}: media dialog aria-describedby target missing`);
    if (!/\bdata-media-dialog-image\b/i.test(html)) fail(`${file}: media dialog image target missing`);
    if (!/\bdata-media-dialog-hotspot-panel\b/i.test(html)) fail(`${file}: media dialog hotspot panel missing`);
  }

  for (const control of ["data-media-close", "data-media-prev", "data-media-next"]) {
    for (const match of html.matchAll(new RegExp(`<button\\b([^>]*\\b${control}\\b[^>]*)>`, "gi"))) {
      if (!/\baria-label=["'][^"']+["']/i.test(match[1])) fail(`${file}: lightbox control ${control} lacks accessible name`);
    }
  }

  for (const match of html.matchAll(/<button\b([^>]*\bdata-hotspot\b[^>]*)>/gi)) {
    const attrs = match[1];
    const target = attrValue(attrs, "aria-controls");
    if (!/\btype=["']button["']/i.test(attrs)) fail(`${file}: hotspot button should be type=button`);
    if (!/\baria-label=["'][^"']+["']/i.test(attrs)) fail(`${file}: hotspot button lacks aria-label`);
    if (!/\baria-expanded=["']false["']/i.test(attrs)) fail(`${file}: hotspot button missing initial aria-expanded=false`);
    if (!target || !ids.has(target)) fail(`${file}: hotspot button references missing panel`);
    else if (!new RegExp(`\\bid=["']${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*\\bdata-hotspot-panel\\b`, "i").test(html)) fail(`${file}: hotspot target is not marked as a hotspot panel`);
  }

  for (const match of html.matchAll(/<div\b([^>]*\bdata-hotspot-panel\b[^>]*)>([\s\S]*?)<\/div>/gi)) {
    const attrs = match[1];
    const body = match[2];
    if (!attrValue(attrs, "id")) fail(`${file}: hotspot panel missing id`);
    if (!/<strong\b[^>]*>[^<]+<\/strong>/i.test(body) || !/<p\b[^>]*>[^<]+<\/p>/i.test(body)) fail(`${file}: hotspot panel lacks readable title/body`);
  }
}

const home = htmlByFile.get("index.html");
if (!home.includes(">Full-stack developer and software engineer building for real operational needs.</h1>")) fail("homepage: full-stack hero statement is missing");
// Separators are bound to the preceding word with no-break spaces, so normalise them.
if (!home.replace(/&nbsp;| /g, " ").includes("React · JavaScript · TypeScript · Node.js · Java · SQL · C#/.NET")) fail("homepage: primary technology line is missing");
// Technical breadth is shown once, by the hero stack; technologies otherwise appear where
// the projects use them. #capabilities stays as an anchor on that stack, and no separate
// skills list or workflow section may return.
if (!/<div id="capabilities" class="hero-visual"/.test(home)) fail("homepage: #capabilities must point at the hero stack");
if (/id="(?:workflow|skills)"|class="cap-stack"/.test(home)) fail("homepage: a separate skills or workflow section has returned");
// Previously shared links point at these anchors; the redesign must keep them resolvable.
for (const anchor of ["top", "work", "experience", "about", "capabilities", "contact"]) {
  if (!home.includes(`id="${anchor}"`)) fail(`homepage: legacy anchor #${anchor} is missing`);
}
if (!home.includes("Used in daily internal operations")) fail("homepage: approved ERP usage wording is missing");
// FIG. 00: one plate per configured layer, each a named link into the workbench. The
// request/response trace is decorative only and runs from the interface down to the data
// layer; delivery is the base it ships on, so it has no lanes.
const heroFigure = home.match(/<figure class="hero-figure"[^>]*>\s*<figcaption class="fig-cap">[\s\S]*?<\/figure>/)?.[0] || "";
if (!heroFigure) fail("homepage: FIG. 00 must be a figure with a caption");
const heroLayerLinks = [...heroFigure.matchAll(/<a class="plate-link" href="#work" data-layer-link="(\d)">[^<]+<span class="sr-only">[^<]+<\/span><\/a>/g)].map((match) => match[1]).join("");
if (heroLayerLinks !== siteConfig.layers.map((_, i) => i).join("")) fail(`homepage: FIG. 00 needs one named layer link per configured layer, found [${heroLayerLinks}]`);
if ((heroFigure.match(/<span class="plate-wire" aria-hidden="true">/g) || []).length !== siteConfig.layers.length) fail("homepage: every FIG. 00 plate needs its decorative, aria-hidden wire layer");
for (const lane of ["req", "res"]) {
  const count = (heroFigure.match(new RegExp(`<span class="lane lane-${lane}"></span>`, "g")) || []).length;
  if (count !== siteConfig.layers.length - 1) fail(`homepage: FIG. 00 needs one ${lane} lane per hop from the interface to the data layer, found ${count}`);
}

// Workbench order has one source of truth: siteConfig.projects[].order, and .archive for
// the "Also" files. The index, the case files and the stack must all agree with it.
const configuredKeys = featuredProjects.map((project) => project.key).join(",");
const archiveKeys = archiveProjects.map((project) => project.key).join(",");
const tabKeys = [...home.matchAll(/data-wb-tab="([^"]+)"/g)].map((match) => match[1]).join(",");
const alsoKeys = [...home.matchAll(/data-wb-also="([^"]+)"/g)].map((match) => match[1]).join(",");
const fileKeys = [...home.matchAll(/<section id="work-([^"]+)" class="system-file[^"]*" data-system="([^"]+)"/g)]
  .map((match) => (match[1] === match[2] ? match[1] : `MISMATCH:${match[1]}`)).join(",");
if (tabKeys !== configuredKeys) fail(`homepage: index order is [${tabKeys}], config order is [${configuredKeys}]`);
if (alsoKeys !== archiveKeys) fail(`homepage: "Also" order is [${alsoKeys}], config order is [${archiveKeys}]`);
if (fileKeys !== `${configuredKeys},${archiveKeys}`) fail(`homepage: case files are [${fileKeys}], expected [${configuredKeys},${archiveKeys}]`);
for (const project of [...featuredProjects, ...archiveProjects]) {
  if (!home.includes(`>${project.shortTitle}<`)) fail(`homepage: project title missing: ${project.shortTitle}`);
  if (!home.includes(`data-open-file="${project.key}" hidden`)) fail(`homepage: ${project.key} lacks a progressive "Open case file" control`);
  // Every case file is inspectable: a case study on this site, a public repository, or —
  // for confidential and private work only — a "Not claimed" line that says it is private.
  const evidenceHref = project.caseStudy || project.repository;
  if (evidenceHref && !home.includes(`href="${evidenceHref}"`)) fail(`homepage: ${project.key} does not link to its case study or repository`);
  if (!evidenceHref && !/private|confidential/i.test(project.system?.boundary || "")) fail(`${project.key}: offers neither a case study, a repository, nor a stated reason`);
  if (project.caseStudy && !pages.includes(project.caseStudy)) fail(`${project.key}: case study ${project.caseStudy} is not a registered page`);
  if (!project.system?.evidence || !project.system?.boundary) fail(`${project.key}: a case file must state its evidence and what it does not claim`);
}
for (const project of featuredProjects) {
  if (!home.includes(`<a class="wb-item" href="#work-${project.key}" id="tab-${project.key}" data-wb-tab="${project.key}"`)) fail(`homepage: index link missing for ${project.key}`);
  const layers = project.system?.layers || [];
  if (layers.length !== siteConfig.layers.length || layers.some(([tag, text]) => !tag || !text)) fail(`${project.key}: needs one tag and one sentence for each of the ${siteConfig.layers.length} layers`);
}
const layerRows = (home.match(/class="lc-row"/g) || []).length;
if (layerRows !== featuredProjects.length * siteConfig.layers.length) fail(`homepage: expected ${featuredProjects.length * siteConfig.layers.length} layer rows, found ${layerRows}`);
if ((home.match(/data-wb-stage/g) || []).length !== 1) fail("homepage: expected exactly one workbench stage");
if ((home.match(/data-plane="/g) || []).length !== siteConfig.layers.length) fail("homepage: stage plane count does not match the configured layers");
if ((home.match(/data-socket="/g) || []).length !== siteConfig.layers.length * featuredProjects.length) fail("homepage: every plane needs one socket per featured system");
if ((home.match(/<dialog class="drawer" data-drawer/g) || []).length !== 1) fail("homepage: expected one case-file drawer");
if (!home.includes('<div class="stage-scene" aria-hidden="true"')) fail("homepage: the decorative stack must be hidden from assistive technology");
if (/live demo|public demo available|production-ready|enterprise-grade|battle-tested|% ?uptime|99\.\d|\d+[,\d]* (active )?users|customers|downloads/i.test(home)) fail("homepage: unsupported usage, availability or maturity claim");

const validContactModes = new Set(["endpoint", "mailto", "disabled"]);
const configuredContactMode = siteConfig.contactForm?.mode;
const configuredContactEndpoint = siteConfig.contactForm?.endpoint?.trim() || "";
if (!validContactModes.has(configuredContactMode)) fail(`contact form: invalid mode "${configuredContactMode}"`);
if (configuredContactEndpoint && /(?:example\.com|your-|todo|placeholder)/i.test(configuredContactEndpoint)) fail("contact form: placeholder endpoint configured");
if (configuredContactMode === "endpoint" && !configuredContactEndpoint) fail("contact form: endpoint mode requires a configured endpoint");
if (configuredContactMode !== "endpoint" && home.includes('data-contact-mode="endpoint"')) fail("contact form: rendered endpoint mode does not match configuration");
if (!home.includes("data-contact-form")) fail("homepage: contact form missing");
if (!home.includes("data-contact-status") || !home.includes('aria-live="polite"')) fail("homepage: contact form status live region missing");
if ((home.match(/aria-live="polite"/g) || []).length !== 1) fail("homepage: expected one polite live region for contact status");
for (const [field, type] of [["contact-name", "text"], ["contact-email", "email"], ["contact-message", "textarea"]]) {
  if (!new RegExp(`<label\\b[^>]*for=["']${field}["']`, "i").test(home)) fail(`homepage: label missing for ${field}`);
  const controlPattern = type === "textarea"
    ? new RegExp(`<textarea\\b[^>]*id=["']${field}["'][^>]*required`, "i")
    : new RegExp(`<input\\b[^>]*id=["']${field}["'][^>]*type=["']${type}["'][^>]*required`, "i");
  if (!controlPattern.test(home)) fail(`homepage: required contact field missing or misconfigured: ${field}`);
}
if ((home.match(/<input type="radio" id="enquiry-[a-z]+" name="enquiryType" value="[^"]+"/g) || []).length !== 4) fail("homepage: optional enquiry type options missing");
if (!/<fieldset class="enquiry">\s*<legend\b/.test(home)) fail("homepage: enquiry type options need a fieldset and legend");
for (const match of home.matchAll(/<input type="radio" id="([^"]+)"/g)) {
  if (!home.includes(`<label for="${match[1]}">`)) fail(`homepage: enquiry option ${match[1]} has no label`);
}
for (const [file, html] of htmlByFile) {
  for (const match of html.matchAll(/<a\b(?=[^>]*class=["'][^"']*link-with-icon)[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (!/<span\b[^>]*>[^<]+<\/span>/i.test(match[1])) fail(`${file}: icon link lacks accessible text`);
  }
  for (const match of html.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/gi)) {
    const attrs = match[1];
    const svg = match[0];
    if (!/aria-hidden=["']true["']/i.test(attrs)) fail(`${file}: inline SVG lacks aria-hidden=true`);
    if (!/focusable=["']false["']/i.test(attrs)) fail(`${file}: inline SVG lacks focusable=false`);
    if (!/currentColor/i.test(svg)) fail(`${file}: inline SVG does not inherit currentColor`);
  }
}
for (const file of featuredProjects.map((project) => project.caseStudy).filter(Boolean)) {
  const html = htmlByFile.get(file);
  if ((html.match(/class="decision-record\b/g) || []).length !== 1) fail(`${file}: expected exactly one decision record`);
}
if ((htmlByFile.get("erp-case-study.html").match(/class="technical-artifact\b/g) || []).length !== 1) fail("erp-case-study.html: expected exactly one permission artefact");
const erp = htmlByFile.get("erp-case-study.html");
if ((erp.match(/data-case-variant="erp"/g) || []).length !== 1) fail("erp-case-study.html: expected one ERP immersive system sequence");
for (const required of ["Authenticated permission boundary", "Shared relational source", "Release care"]) {
  if (!erp.includes(required)) fail(`erp-case-study.html: missing immersive ERP evidence: ${required}`);
}
// The ERP story is the application: no infrastructure wording belongs in it.
if (/VMware|subnett|routing|ESXi/i.test(erp)) fail("erp-case-study.html: infrastructure wording re-entered the ERP story");

const opssemble = htmlByFile.get("opssemble.html");
if ((opssemble.match(/data-case-variant="opssemble"/g) || []).length !== 1) fail("opssemble.html: expected one Opssemble immersive system sequence");
if ((opssemble.match(/class="technical-artifact\b/g) || []).length !== 1) fail("opssemble.html: expected exactly one token-lifecycle artefact");
for (const required of [
  "Server-side role boundary", "owner, coordinator, operator, viewer", "SHA-256", "HttpOnly",
  "no critical blockers", "university final project", "AI assistance", "revocable",
  "Active development", "core workflow implemented"
]) {
  if (!opssemble.includes(required)) fail(`opssemble.html: missing implemented-behaviour evidence: ${required}`);
}
// Tesina framing must stay honest: no production/scale theatre.
if (/production-ready|enterprise-grade|battle-tested|% ?uptime|99\.\d/i.test(opssemble)) fail("opssemble.html: unsupported production or scale claim");
if (!opssemble.includes("not a commercial production SaaS")) fail("opssemble.html: missing explicit tesina scope statement");
if ((htmlByFile.get("gurmat-saanj.html").match(/data-case-variant="gurmat"/g) || []).length !== 1) fail("gurmat-saanj.html: expected one Gurmat immersive live-system sequence");
if (htmlByFile.get("gurmat-saanj.html").includes("data-session-model")) fail("gurmat-saanj.html: old interactive state model remains");
if ((htmlByFile.get("gurmat-saanj.html").match(/class="technical-artifact\b/g) || []).length !== 0) fail("gurmat-saanj.html: redundant technical artefact remains beside the immersive sequence");
if (/hold current state|no-change fallback/i.test(htmlByFile.get("gurmat-saanj.html"))) fail("gurmat-saanj.html: unverified low-confidence fallback is public");
const gurmat = htmlByFile.get("gurmat-saanj.html");
for (const required of ["QR code or session code", "Multiple viewers · one editor", "Shared line, local display", "remains a viewer", "Keep known text and final selection under application control"]) {
  if (!gurmat.includes(required)) fail(`gurmat-saanj.html: missing confirmed multi-device evidence: ${required}`);
}
for (const required of ["Web Speech API", "Normalize + BaniDB", "Application result", "Viewer-local preferences", "mobile editor interface"]) {
  if (!gurmat.includes(required)) fail(`gurmat-saanj.html: missing immersive Gurmat evidence: ${required}`);
}
// Ollama was never integrated in Gurmat Saanj; no local-model claim may appear.
if (/ollama|local (model|AI|assistance|LLM)/i.test(gurmat)) fail("gurmat-saanj.html: unsupported local-model claim");
if (/TypeScript/i.test(gurmat)) fail("gurmat-saanj.html: TypeScript contradicts the confirmed JavaScript stack");
if ((gurmat.match(/data-media-open/g) || []).length !== 4) fail("gurmat-saanj.html: expected four inspectable authentic screenshots");
if ((gurmat.match(/loading="lazy"/g) || []).length < 5) fail("gurmat-saanj.html: evidence images must lazy-load below the fold");
if (/WebSockets?|Socket\.IO|SignalR|server-sent events|peer-to-peer|WebRTC|event sourcing|distributed locking|message queues?|OAuth|JWT|session persistence|persistent accounts/i.test(gurmat)) fail("gurmat-saanj.html: unsupported networking or account technology is named");
// MaintOps: the source is public but nothing is hosted. Nothing may imply otherwise.
const maintops = htmlByFile.get("maintops.html");
for (const required of [
  "not a security boundary", "until a supervisor accepts", "metadata only",
  "no hosted instance", "Prompt Guard", "academic evaluation and portfolio review"
]) {
  if (!maintops.includes(required)) fail(`maintops.html: missing verified evidence: ${required}`);
}
if (/live demo|public demo available|try it (live|now)|hosted at|deployed (at|to) https?:/i.test(maintops)) fail("maintops.html: implies a live deployment that does not exist");
if (/% ?uptime|99\.\d|availability of|\d+[,\d]* (active )?users|customers/i.test(maintops)) fail("maintops.html: unsupported usage or availability claim");

// Alfaaz: private repository, not deployed, and no automatic translation of writing.
const alfaaz = htmlByFile.get("alfaaz.html");
for (const required of [
  "never automatically translated", "HttpOnly", "private repository",
  "Not publicly deployed", "404"
]) {
  if (!alfaaz.includes(required)) fail(`alfaaz.html: missing verified evidence: ${required}`);
}
if (/TypeScript/i.test(alfaaz)) fail("alfaaz.html: TypeScript contradicts the project's JavaScript-only stack");
if (/live demo|public demo|open source|available on GitHub|try it (live|now)/i.test(alfaaz)) fail("alfaaz.html: implies public availability that does not exist");
if (/\d+[,\d]* (active )?users|customers|downloads/i.test(alfaaz)) fail("alfaaz.html: unsupported usage claim");

const productionHtml = [...htmlByFile.values()].join("\n");
const privateDataPatterns = [
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/,
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  /\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/,
  /\b(?:session|room|join)[-_ ]?(?:code|id)\s*[:=]\s*[a-z0-9-]{6,}\b/i
];
for (const pattern of privateDataPatterns) {
  if (pattern.test(productionHtml)) fail(`production HTML: possible private address or session identifier exposed (${pattern})`);
}
if (/multi-hour|self-healing/i.test(productionHtml)) fail("production HTML: an unsupported or stale claim is present");
if (/C#|\.NET|ASP\.NET|Entity Framework/i.test(erp)) fail("erp-case-study.html: C#/.NET must not be attributed to the React/Node ERP");

const notFound = htmlByFile.get("404.html");
if (!notFound.includes("data-menu-toggle") || !notFound.includes("data-nav") || !notFound.includes('aria-controls="site-navigation"')) fail("404.html: responsive navigation contract is incomplete");

// Every configured PNG is checked against the width/height the HTML declares for it,
// so a newly captured screenshot cannot ship with the wrong intrinsic size and shift
// the layout. Derived from config: adding a capture adds its check automatically.
const declaredImages = [];
for (const project of featuredProjects) {
  for (const slot of ["primary", "secondary", "mobile", "transfer"]) {
    const file = project[`${slot}Image`];
    if (!file) continue;
    declaredImages.push([file, project[`${slot}ImageWidth`], project[`${slot}ImageHeight`], `${project.key}.${slot}`]);
  }
}
if (!declaredImages.length) fail("config: no project imagery is configured at all");
for (const [file, width, height, label] of declaredImages) {
  if (!width || !height) { fail(`${label}: ${file} is configured without declared dimensions`); continue; }
  const bytes = await fs.readFile(path.join(root, file)).catch(() => null);
  if (!bytes) { fail(`${label}: configured image missing from dist: ${file}`); continue; }
  if (!file.endsWith(".png")) continue;
  if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height) fail(`${label}: ${file} is ${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}, config declares ${width}x${height}`);
}

// Update the approved checksum whenever the résumé is intentionally revised.
for (const [file, expectedHash] of Object.entries({
  "Gurmilan_Singh_2026_CV.pdf": "EE948379132FBCF73E59AE8EF86A2F2C62FDAD6DA9D3C26B871DF073D34626DE"
})) {
  const bytes = await fs.readFile(path.resolve(file)).catch(() => null);
  const actualHash = bytes ? createHash("sha256").update(bytes).digest("hex").toUpperCase() : "";
  if (actualHash !== expectedHash) fail(`${file}: résumé checksum does not match the approved PDF`);
}

const productionCss = await fs.readFile(path.join(root, "assets/styles.css"), "utf8");
const productionJs = await fs.readFile(path.join(root, "assets/script.js"), "utf8");
const productionWorkbench = await fs.readFile(path.join(root, "assets/workbench.js"), "utf8");
if (!productionCss.includes(".reveal-ready [data-reveal]") || !productionJs.includes('classList.add("reveal-ready")')) fail("motion: progressive reveal preparation contract is missing");
if (!/prefers-reduced-motion\s*:\s*reduce/.test(productionJs) || !/prefers-reduced-motion\s*:\s*reduce/.test(productionCss)) fail("motion: reduced-motion handling is missing");
if (!/prefers-reduced-motion\s*:\s*reduce/.test(productionWorkbench)) fail("motion: the workbench ignores reduced-motion preferences");
if (!productionCss.includes(".case-immersive-frame") || !productionJs.includes("[data-case-immersive]")) fail("motion: case-study immersive progress contract is missing");
// The workbench layout must only replace the plain list once its script is running, so
// a failed or blocked script still leaves every system readable.
if (!productionWorkbench.includes('classList.add("wb-ready")') || !productionCss.includes(".wb-ready")) fail("workbench: the interactive layout is not gated on the running script");
if (/\.js\s+\.wb-files|\.js\s+\.system-file:not/.test(productionCss)) fail("workbench: case files are hidden by the early js class instead of the running script");
if (await fs.stat(path.join(root, "assets/vendor")).catch(() => null)) fail("performance: unused vendor libraries are shipped");
for (const [file, html] of htmlByFile) {
  if (/gsap|three(\.min)?\.js|ScrollTrigger/i.test(html)) fail(`${file}: references a removed animation library`);
  if (!html.includes('href="assets/styles.css"') || !html.includes('src="assets/script.js"')) fail(`${file}: missing the shared stylesheet or script`);
  // The theme is resolved before the stylesheet loads, so no page paints in the wrong one.
  const themeBoot = html.indexOf('localStorage.getItem("portfolio-theme")');
  if (themeBoot === -1 || themeBoot > html.indexOf('href="assets/styles.css"') || html.indexOf('name="theme-color"') > themeBoot) fail(`${file}: the theme must be applied in <head>, after the theme-color meta and before the stylesheet`);
  const themeSwitch = html.match(/<div class="theme-switch" role="group" aria-label="[^"]+" data-theme-switch(?:="")? hidden(?:="")?>([\s\S]*?)<\/div>/);
  const choices = themeSwitch ? [...themeSwitch[1].matchAll(/<button class="ts-btn" type="button" data-theme-choice="(dark|light)" aria-pressed="(true|false)"[^>]*>[\s\S]*?<span class="sr-only">[^<]+<\/span><\/button>/g)].map((match) => match[1]).join(",") : "";
  if (choices !== "dark,light") fail(`${file}: header theme switch is missing, visible without JavaScript, or lacks named dark/light buttons`);
}
// Two themes, one vocabulary: the light theme redefines every colour the dark default
// declares, and the no-JavaScript copy (system preference) matches the scripted one.
const declarations = (block) => [...(block || "").matchAll(/(--[\w-]+|color-scheme):([^;}]+)/g)].map((match) => [match[1], match[2].trim()]);
const darkTokens = declarations(productionCss.match(/:root\{([^}]*)\}/)?.[1]);
const lightTokens = new Map(declarations(productionCss.match(/:root\[data-theme="light"\]\{([^}]*)\}/)?.[1]));
const systemLightTokens = new Map(declarations(productionCss.match(/:root:not\(\[data-theme\]\)\{([^}]*)\}/)?.[1]));
if (!lightTokens.size || lightTokens.get("color-scheme") !== "light") fail("theme: the light token block is missing or does not set color-scheme: light");
if (JSON.stringify([...lightTokens]) !== JSON.stringify([...systemLightTokens])) fail("theme: the system-preference light block differs from the scripted light theme");
const untranslated = darkTokens.filter(([name, value]) => /^(#|rgb)|^\d+ \d+ \d+$/.test(value) && !lightTokens.has(name)).map(([name]) => name);
if (untranslated.length) fail(`theme: colour tokens without a light value: ${untranslated.join(", ")}`);
if (!productionJs.includes('"portfolio-theme"') || !productionJs.includes("[data-theme-switch]")) fail("theme: script.js does not wire the saved theme and header switch");
for (const project of caseStudyProjects) {
  const html = htmlByFile.get(project.caseStudy);
  if ((html.match(/data-cut/g) || []).length !== 1) fail(`${project.caseStudy}: expected one layer-cut band`);
  if (!html.includes('class="frame case-pager"')) fail(`${project.caseStudy}: project pagination missing`);
  if (!html.includes(`>${String(project.order).padStart(2, "0")} / ${project.shortTitle}<`)) fail(`${project.caseStudy}: case index does not match the configured order`);
}
if (!/\.media-dialog-hotspot\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/m.test(productionCss)) fail("accessibility: dialog hotspot targets must remain at least 44px square");
if (!/\.media-hotspot\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/m.test(productionCss)) fail("accessibility: screenshot hotspot targets must remain at least 44px square");

const resume = await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.pdf")).catch(() => null);
if (!resume || resume.size < 1000) fail("public PDF résumé missing or empty"); else pass(`public PDF résumé present (${resume.size} bytes)`);
if (await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.docx")).catch(() => null)) fail("source DOCX is exposed in production output");
if (failures) { console.error(`\n${failures} validation failure(s).`); process.exit(1); }
pass("templates resolved, placeholders hidden, links resolve, metadata present");
