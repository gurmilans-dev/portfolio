import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { siteConfig, featuredProjects, alsoProjects, caseStudyProjects } from "./site.config.mjs";
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

// The host serves pages at clean URLs (/flowbank-one, / for the homepage) and redirects
// /page.html there, so the built pages must only ever link, and declare canonicals, that way.
const domain = siteConfig.profile.domain.replace(/\/$/, "");
const routeOf = (file) => (file === "index.html" ? "/" : `/${file.replace(/\.html$/, "")}`);
const fileOfRoute = (route) => {
  const rel = route.replace(/^\//, "");
  if (!rel) return "index.html";
  return pages.includes(`${rel}.html`) ? `${rel}.html` : rel;
};

for (const [file, html] of htmlByFile) {
  console.log(`INFO ${file}: ${countHtmlWords(html)} content words`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${file}: expected exactly one h1`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${file}: missing title`);
  if (file !== "404.html" && !/<meta name="description" content="[^"]+"/i.test(html)) fail(`${file}: missing meta description`);
  if (file !== "404.html") {
    for (const metadata of ["og:title", "og:description", "og:image", "twitter:title", "twitter:description", "twitter:image"]) {
      if (!new RegExp(`<meta (?:property|name)="${metadata}" content="[^"]+"`, "i").test(html)) fail(`${file}: missing ${metadata}`);
    }
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
    if (canonical !== `${domain}${routeOf(file)}`) fail(`${file}: canonical is ${canonical}, expected the clean URL ${domain}${routeOf(file)}`);
    if (ogUrl !== canonical) fail(`${file}: og:url (${ogUrl}) differs from the canonical URL`);
    for (const match of html.matchAll(/<meta (?:property|name)="(?:og|twitter):image" content="([^"]+)"/g)) {
      if (!match[1].startsWith(`${domain}/`)) { fail(`${file}: social image is not an absolute URL on the site: ${match[1]}`); continue; }
      if (!(await fs.stat(path.join(root, match[1].slice(domain.length + 1))).catch(() => null))) fail(`${file}: social image is missing from dist: ${match[1]}`);
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
    if (!href.startsWith("/") && !href.startsWith("#")) { fail(`${file}: internal link is not root-relative, so it breaks on the 404 page: ${href}`); continue; }
    if (/\.html(#|$)/.test(href)) fail(`${file}: internal link uses .html, which the host answers with a redirect: ${href}`);
    const [targetPath, fragment] = href.split("#");
    const targetFile = targetPath ? fileOfRoute(targetPath) : file;
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
// The headline may be reworded; it must still name the role, in a line short enough to lead.
const heroTitle = (home.match(/<h1 id="hero-title">([^<]+)<\/h1>/)?.[1] || "").trim();
if (!/software engineer/i.test(heroTitle) || heroTitle.split(/\s+/).length > 14) fail(`homepage: the hero headline must name the role in at most 14 words: "${heroTitle}"`);
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

// Workbench order has one source of truth: siteConfig.projects[].order, and .also for the
// "Also built" register. The index, the register, the case files and the stack must agree.
const configuredKeys = featuredProjects.map((project) => project.key).join(",");
const alsoConfigKeys = alsoProjects.map((project) => project.key).join(",");
const tabKeys = [...home.matchAll(/data-wb-tab="([^"]+)"/g)].map((match) => match[1]).join(",");
const alsoKeys = [...home.matchAll(/data-wb-also="([^"]+)"/g)].map((match) => match[1]).join(",");
const fileKeys = [...home.matchAll(/<section id="work-([^"]+)" class="system-file[^"]*" data-system="([^"]+)"/g)]
  .map((match) => (match[1] === match[2] ? match[1] : `MISMATCH:${match[1]}`)).join(",");
if (tabKeys !== configuredKeys) fail(`homepage: index order is [${tabKeys}], config order is [${configuredKeys}]`);
if (alsoKeys !== alsoConfigKeys) fail(`homepage: "Also built" order is [${alsoKeys}], config order is [${alsoConfigKeys}]`);
if (!home.includes('<section id="also-built" class="also-built"')) fail("homepage: the Also built register is missing");
// "Open case file" and "Read the case study" read as the same thing; the two ways in are named for what they are.
if (/Open case file|Read the case study/.test(home.slice(home.indexOf('<section id="work"'), home.indexOf('<section id="experience"')))) fail("homepage: an action still uses the old case file / case study labels");
if (fileKeys !== `${configuredKeys},${alsoConfigKeys}`) fail(`homepage: case files are [${fileKeys}], expected [${configuredKeys},${alsoConfigKeys}]`);
for (const project of [...featuredProjects, ...alsoProjects]) {
  if (!home.includes(`>${project.shortTitle}<`)) fail(`homepage: project title missing: ${project.shortTitle}`);
  // A quick look for every system: the six from the explorer panel, the rest from their register row.
  const quickLook = project.order ? `data-open-file="${project.key}" hidden` : `href="#work-${project.key}" data-wb-also="${project.key}">Quick look`;
  if (!home.includes(quickLook)) fail(`homepage: ${project.key} lacks a progressive "Quick look" control`);
  // Every case file is inspectable: a case study on this site, a public repository or store
  // listing, or — for private and confidential work — a source line that says so.
  for (const href of [project.caseStudy && routeOf(project.caseStudy), project.repository, project.store].filter(Boolean)) {
    if (!home.includes(`href="${href.replaceAll("&", "&amp;")}"`) && !home.includes(`href="${href}"`)) fail(`homepage: ${project.key} does not link to ${href}`);
  }
  const source = project.repository ? "Public on GitHub" : project.sourceNote || "Private repository";
  if (!home.includes(`<dt>Source</dt><dd>${source}</dd>`)) fail(`homepage: ${project.key} does not state its source (${source})`);
  if (!project.caseStudy && !project.repository && !project.store && !/^(Private|Confidential)/.test(source)) fail(`${project.key}: offers neither a case study, a public link, nor a stated reason`);
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
// Project Universe: the view switch and the map's shell are in the page only for workbench.js to
// reveal (hidden without JavaScript), and the built universe.js carries every project.
if ((home.match(/<div class="wb-mode" role="group" aria-label="Explorer view" data-wb-mode(?:="")? [^>]*\bhidden(?:="")?>/g) || []).length !== 1) fail("homepage: expected one explorer view switch, hidden until workbench.js reveals it");
if ((home.match(/<div class="universe" data-universe(?:="")? hidden(?:="")?>/g) || []).length !== 1) fail("homepage: expected one Universe shell, hidden until it is chosen");
{
  const universeJs = await fs.readFile(path.join(root, "assets/universe.js"), "utf8").catch(() => "");
  if (!universeJs || universeJs.includes("%UNIVERSE_DATA%")) fail("assets/universe.js: missing, or built without its data");
  for (const project of [...featuredProjects, ...alsoProjects]) if (!universeJs.includes(`"key":"${project.key}"`)) fail(`assets/universe.js: ${project.shortTitle} is missing from the universe`);
}
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
  "controlled pilot", "Server-Sent Events", "Not launched publicly"
]) {
  if (!opssemble.includes(required)) fail(`opssemble.html: missing implemented-behaviour evidence: ${required}`);
}
// A product being prepared for a pilot, not a launched service: no production or scale theatre.
if (/production-ready|enterprise-grade|battle-tested|% ?uptime|99\.\d|\d+[,\d]* (active )?users|customers/i.test(opssemble)) fail("opssemble.html: unsupported production, scale or usage claim");

// FlowBank One: a simulated bank. It must say so, and its load figures must carry their conditions.
const flowbank = htmlByFile.get("flowbank-one.html");
for (const required of ["No real money", "simulated", "not production capacity", "one laptop", "./mvnw verify", "PostgreSQL container", "exactly 100", "1,045", "open issue"]) {
  if (!flowbank.includes(required)) fail(`flowbank-one.html: missing verified evidence or its conditions: ${required}`);
}
if (/licensed bank|regulated bank|production-ready|in production use|real customers/i.test(flowbank)) fail("flowbank-one.html: implies a real or production banking service");
// ProcBeacon: packaged as a local, unsigned preview but not distributed; shown through fixture renders.
const procbeacon = htmlByFile.get("procbeacon.html");
for (const required of ["fixture", "438", "Release", "creation time", "not distributed", "unsigned", "IsProcessCritical", "TerminateProcess"]) {
  if (!procbeacon.includes(required)) fail(`procbeacon.html: missing verified evidence: ${required}`);
}
if (/available (on|in) the Microsoft Store|download (it|ProcBeacon)|installer is available/i.test(procbeacon)) fail("procbeacon.html: implies a distributed release that does not exist");

// Only configured public repositories may be linked: a private repository URL can never
// appear on the site, whatever page it is typed into.
const publicRepositories = new Set([siteConfig.profile.github, ...Object.values(siteConfig.projects).map((project) => project.repository).filter(Boolean)]);
for (const [file, html] of htmlByFile) {
  for (const match of html.matchAll(/href="(https:\/\/github\.com\/[^"]+)"/g)) {
    if (!publicRepositories.has(match[1].replace(/\/$/, ""))) fail(`${file}: links a GitHub URL that is not a configured public repository: ${match[1]}`);
  }
}
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
// Four screenshots open larger: in the lightbox, or (the operator workspace) in Inspect mode.
if ((gurmat.match(/data-media-open/g) || []).length + (gurmat.match(/data-inspect="/g) || []).length !== 4) fail("gurmat-saanj.html: expected four inspectable authentic screenshots");
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
// the layout. Derived from config: any <slot>Image with its <slot>Image{Avif,Webp,Width,Height}
// on any project, featured or not, is checked automatically.
const declaredImages = [];
for (const project of [...featuredProjects, ...alsoProjects]) {
  for (const [field, file] of Object.entries(project)) {
    const slot = /^([a-z]+)Image$/.exec(field)?.[1];
    if (!slot || !file) continue;
    declaredImages.push([file, project[`${slot}ImageWidth`], project[`${slot}ImageHeight`], `${project.key}.${slot}`]);
    for (const variant of ["Avif", "Webp"]) if (!project[`${slot}Image${variant}`]) fail(`${project.key}.${slot}: ${variant} variant is not configured`);
    // Gurmat Saanj writes its secondary alt texts in the page beside their hotspots.
    if (project.key !== "gurmat" && !project[`${slot}ImageAlt`]) fail(`${project.key}.${slot}: no alt text is configured`);
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
// Page transitions are opted into once, and only without a reduced-motion preference.
const transitionRules = productionCss.match(/@view-transition\{[^}]*\}/g) || [];
if (transitionRules.length !== 1 || !productionCss.includes("@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto;}}")) fail("motion: cross-document view transitions must be opted into once, inside a no-preference reduced-motion query");
// The contact trace is decoration beside the status line, never a second live region.
if (!/<ol class="form-trace" aria-hidden="true" data-contact-trace(?:="")? hidden(?:="")?>/.test(home)) fail("contact: the response trace must be hidden from assistive technology, and hidden until script.js shows it");
if (!productionCss.includes(".case-immersive-frame") || !productionJs.includes("[data-case-immersive]")) fail("motion: case-study immersive progress contract is missing");
// The workbench layout must only replace the plain list once its script is running, so
// a failed or blocked script still leaves every system readable.
if (!productionWorkbench.includes('classList.add("wb-ready")') || !productionCss.includes(".workbench-ready")) fail("workbench: the interactive layout is not gated on the running script");
if (/\.js\s+\.wb-files|\.js\s+\.system-file:not/.test(productionCss)) fail("workbench: case files are hidden by the early js class instead of the running script");
// The explorer may be drawn before workbench.js runs only under .wb-pending, which the head
// script drops at DOMContentLoaded unless workbench.js has taken over.
if (!/classList\.remove\("wb-pending"/.test(home) || !productionWorkbench.includes('classList.add("workbench-ready")')) fail("workbench: the pending explorer layout must fall back to the plain list when workbench.js does not run");
// Break it yourself: the two simulations are labelled as simulated, readable without
// JavaScript, drawn before their script runs (under .sim-pending, dropped at DOMContentLoaded
// unless sims.js took over), and their script loads only on the two pages that have one.
const productionSims = await fs.readFile(path.join(root, "assets/sims.js"), "utf8");
const simPages = { "flowbank-one.html": "lock-order", "procbeacon.html": "pid-reuse" };
if (!/classList\.remove\("sim-pending"/.test(home) || !productionSims.includes('classList.add("sims-ready")')) fail("sims: the pending live view must fall back to the transcript when sims.js does not run");
if (productionSims.length > 6000) fail(`sims: assets/sims.js is ${productionSims.length} bytes; keep the engine small, the data lives in the page`);
if (/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(productionSims)) fail("sims: the simulation engine must not talk to the network");
for (const [file, html] of htmlByFile) {
  const expected = simPages[file];
  const loads = html.includes('src="/assets/sims.js"');
  if (Boolean(expected) !== loads) fail(`${file}: sims.js must load only on the pages with a simulation`);
  const found = [...html.matchAll(/data-sim="([\w-]+)"/g)].map((match) => match[1]);
  if (found.join() !== (expected || "")) { fail(`${file}: expected simulation ${expected || "none"}, found ${found.join() || "none"}`); continue; }
  if (!expected) continue;
  const block = html.slice(html.indexOf(`data-sim="${expected}"`));
  if (!/<span class="sim-flag">Simulated<\/span>/.test(block.slice(0, 2000))) fail(`${file}: the simulation must say plainly that it is simulated`);
  if (!/<div class="sim-static">[\s\S]*?<ol>[\s\S]*?<li>/.test(block)) fail(`${file}: the simulation has no written transcript for readers without JavaScript`);
  if (!/<div class="sim-live" hidden(?:="")?>/.test(block)) fail(`${file}: the live simulation must stay hidden without JavaScript`);
  if (!/<p class="sr-only" aria-live="polite" data-say(?:="")?>/.test(block)) fail(`${file}: the simulation must announce its steps`);
  const json = block.match(/<script type="application\/json" class="sim-data">([\s\S]*?)<\/script>/)?.[1];
  try {
    const data = JSON.parse(json);
    if (!data.scenarios?.length || data.scenarios.some((scenario) => scenario.steps.length < 2)) fail(`${file}: simulation data without scenarios or steps`);
  } catch { fail(`${file}: the simulation's step data is not valid JSON`); }
}
// Inspect mode: inspect.js only where a screenshot has notes; every figure has its notes (a
// closed list, readable without JavaScript) and a button hidden until the script runs; every
// part lies inside its image.
if (!/classList\.remove\("inspect-pending"/.test(home)) fail("inspect: the pending Inspect button must be dropped when inspect.js does not run");
for (const [file, html] of htmlByFile) {
  const figures = [...html.matchAll(/data-inspect="([\w-]+)"/g)].map((match) => match[1]);
  if (Boolean(figures.length) !== html.includes('src="/assets/inspect.js"')) fail(`${file}: inspect.js must load exactly where a screenshot has Inspect notes`);
  for (const key of figures) {
    const bar = html.match(new RegExp(`<div class="inspect-bar" data-inspect-for="${key}"[\\s\\S]*?</details></div>`))?.[0];
    if (!bar) { fail(`${file}: the ${key} screenshot has no Inspect notes`); continue; }
    if (!/<button type="button" class="inspect-open" data-inspect-open(?:="")? aria-haspopup="dialog" hidden(?:="")?>/.test(bar)) fail(`${file}: the ${key} Inspect button must stay hidden without JavaScript`);
    if (!/<details class="inspect-notes">/.test(bar) || /<details class="inspect-notes" open/.test(bar)) fail(`${file}: the ${key} notes must be a closed <details> under the screenshot`);
    const boxes = [...bar.matchAll(/data-box="([\d. ]+)"/g)].map((match) => match[1].split(" ").map(Number));
    if (boxes.length < 2 || boxes.length > 5) fail(`${file}: the ${key} screenshot should explain a few parts (2 to 5), not ${boxes.length}`);
    if (boxes.some(([x, y, w, h]) => x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 100.01 || y + h > 100.01)) fail(`${file}: a ${key} part lies outside its screenshot`);
  }
}
// Command palette: palette.js is loaded by script.js on first use, never by a page; its index
// leads only to pages and ids that exist.
for (const [file, html] of htmlByFile) {
  if (html.includes("/assets/palette.js")) fail(`${file}: palette.js must not be loaded up front`);
  if (!/<button class="search-btn" type="button" data-palette-open(?:="")? aria-haspopup="dialog" hidden(?:="")?>/.test(html)) fail(`${file}: the header Search button is missing or visible without JavaScript`);
}
if (!productionJs.includes('"/assets/palette.js"')) fail("palette: script.js does not load assets/palette.js");
const searchIndex = JSON.parse(await fs.readFile(path.join(root, "assets/search-index.json"), "utf8").catch(() => "null"));
if (!searchIndex?.items?.length) fail("palette: dist/assets/search-index.json is missing or empty");
for (const item of searchIndex?.items || []) {
  const [route, hash] = item.url.split("#");
  const target = htmlByFile.get(fileOfRoute(route));
  if (!target) { fail(`palette: ${item.title} leads to ${item.url}, which is not a page`); continue; }
  if (hash && !target.includes(`id="${hash}"`)) fail(`palette: ${item.title} leads to #${hash}, which ${route} does not have`);
}
for (const project of [...featuredProjects, ...alsoProjects]) {
  if (!searchIndex?.items?.some((item) => item.type === "project" && item.title === project.title)) fail(`palette: ${project.title} is missing from the search index`);
}
if (await fs.stat(path.join(root, "assets/vendor")).catch(() => null)) fail("performance: unused vendor libraries are shipped");
for (const [file, html] of htmlByFile) {
  if (/gsap|three(\.min)?\.js|ScrollTrigger/i.test(html)) fail(`${file}: references a removed animation library`);
  if (!html.includes('href="/assets/styles.css"') || !html.includes('src="/assets/script.js"')) fail(`${file}: missing the shared stylesheet or script (root-relative, so the 404 page works at any depth)`);
  // The head script comes straight after the stylesheet. Being a script, it makes the parser
  // wait for styles.css before reading the body, so the page's view-transition opt-in is in
  // force before anything can ask for it (Chromium otherwise sometimes evaluates the arriving
  // page without it and abandons the transition). The theme is still set before the first
  // paint, which the stylesheet blocks anyway.
  const themeBoot = html.indexOf('localStorage.getItem("portfolio-theme")');
  const stylesheet = html.indexOf('<link rel="stylesheet" href="/assets/styles.css">');
  if (themeBoot === -1 || stylesheet === -1 || themeBoot < stylesheet || themeBoot > html.indexOf("</head>") || html.indexOf('name="theme-color"') > themeBoot || !/<link rel="stylesheet" href="\/assets\/styles\.css">\s*<script>\(function \(d\)/.test(html)) fail(`${file}: the head script must follow the stylesheet directly, after the theme-color meta and inside <head>`);
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
  const index = typeof project.order === "number" ? `${String(project.order).padStart(2, "0")} / ${project.shortTitle}` : `Also built / ${project.shortTitle}`;
  if (!html.includes(`>${index}<`)) fail(`${project.caseStudy}: case index does not match the configured order (${index})`);
}
if (!/\.media-dialog-hotspot\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/m.test(productionCss)) fail("accessibility: dialog hotspot targets must remain at least 44px square");
if (!/\.media-hotspot\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/m.test(productionCss)) fail("accessibility: screenshot hotspot targets must remain at least 44px square");

// The sitemap lists exactly the indexed pages, at the clean URLs they declare as canonical.
// The sitemap is generated into dist/, which is all the host publishes. A copy in the source
// folder is never published and only goes stale (an old one listed .html URLs).
if (await fs.stat(path.resolve("sitemap.xml")).catch(() => null)) fail("sitemap.xml: remove the copy in the source folder; the build generates dist/sitemap.xml from siteConfig.pages");
const sitemap = await fs.readFile(path.join(root, "sitemap.xml"), "utf8").catch(() => "");
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort().join(",");
const indexedUrls = siteConfig.pages.filter((page) => page.indexed).map((page) => `${domain}${routeOf(page.file)}`).sort().join(",");
if (sitemapLocs !== indexedUrls) fail(`sitemap.xml lists [${sitemapLocs}], expected the clean URLs [${indexedUrls}]`);
const redirects = await fs.readFile(path.join(root, "_redirects"), "utf8").catch(() => "");
for (const line of redirects.split("\n").filter((entry) => entry.trim() && !entry.startsWith("#"))) {
  const [, to] = line.trim().split(/\s+/);
  if (/\.html$/.test(to)) fail(`_redirects: ${line.trim()} points at a .html URL, which adds a second redirect`);
}

const resume = await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.pdf")).catch(() => null);
if (!resume || resume.size < 1000) fail("public PDF résumé missing or empty"); else pass(`public PDF résumé present (${resume.size} bytes)`);
if (await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.docx")).catch(() => null)) fail("source DOCX is exposed in production output");
if (failures) { console.error(`\n${failures} validation failure(s).`); process.exit(1); }
pass("templates resolved, placeholders hidden, links resolve, metadata present");
