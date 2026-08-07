import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { siteConfig, featuredProjects } from "./site.config.mjs";

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
  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const words = visible.trim().split(/\s+/).filter(Boolean).length;
  console.log(`INFO ${file}: ${words} visible words`);
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
if (!home.includes('aria-label="Full-stack developer and software engineer building for real operational needs."')) fail("homepage: full-stack hero statement is missing");
if (!home.includes("React · JavaScript · Node.js · SQL · C#/.NET")) fail("homepage: primary technology line is missing");
if (!home.includes('id="capabilities"') || home.includes('id="workflow"') || home.includes('id="skills"')) fail("homepage: capabilities must remain consolidated into one section");
if (!home.includes("Used in daily internal operations")) fail("homepage: approved ERP usage wording is missing");
// Featured order has one source of truth: siteConfig.projects[].order. Re-ranking the
// section is a config edit, and the homepage must agree with it.
const configuredKeys = featuredProjects.map((project) => project.key).join(",");
const renderedPanelKeys = [...home.matchAll(/data-work-panel="([^"]+)"/g)].map((match) => match[1]).join(",");
const renderedIndexKeys = [...home.matchAll(/href="#work-([^"]+)" data-work-index-link/g)].map((match) => match[1]).join(",");
if (renderedPanelKeys !== configuredKeys) fail(`homepage: panel order is [${renderedPanelKeys}], config order is [${configuredKeys}]`);
if (renderedIndexKeys !== configuredKeys) fail(`homepage: index order is [${renderedIndexKeys}], config order is [${configuredKeys}]`);
for (const project of featuredProjects) {
  if (!home.includes(`>${project.title}<`)) fail(`homepage: featured project title missing: ${project.title}`);
}
// Sticky-split contract: an index entry and a panel for every featured project, each
// index href resolving to its panel, and a case study reachable from each panel.
if ((home.match(/data-work-panel="/g) || []).length !== featuredProjects.length) fail(`homepage: expected ${featuredProjects.length} work panels`);
if ((home.match(/data-work-index-link/g) || []).length !== featuredProjects.length) fail(`homepage: expected ${featuredProjects.length} project index links`);
if (home.includes("data-work-track") || home.includes("data-rail-stage")) fail("homepage: the removed pinned rail markup is still present");
for (const project of featuredProjects) {
  if (!new RegExp(`<a href="#work-${project.key}" data-work-index-link`).test(home)) fail(`homepage: index link missing for ${project.key}`);
  if (!new RegExp(`id="work-${project.key}"[^>]*data-work-panel="${project.key}"`).test(home)) fail(`homepage: panel missing for ${project.key}`);
  if (!home.includes(`href="${project.caseStudy}"`)) fail(`homepage: ${project.key} panel does not link to its case study`);
  if (!pages.includes(project.caseStudy)) fail(`${project.key}: case study ${project.caseStudy} is not a registered page`);
}
const validContactModes = new Set(["endpoint", "mailto", "disabled"]);
const configuredContactMode = siteConfig.contactForm?.mode;
const configuredContactEndpoint = siteConfig.contactForm?.endpoint?.trim() || "";
if (!validContactModes.has(configuredContactMode)) fail(`contact form: invalid mode "${configuredContactMode}"`);
if (configuredContactEndpoint && /(?:example\.com|your-|todo|placeholder)/i.test(configuredContactEndpoint)) fail("contact form: placeholder endpoint configured");
if (configuredContactMode === "endpoint" && !configuredContactEndpoint) fail("contact form: endpoint mode requires a configured endpoint");
if (configuredContactMode !== "endpoint" && home.includes('data-contact-mode="endpoint"')) fail("contact form: rendered endpoint mode does not match configuration");
if (!home.includes('data-contact-form')) fail("homepage: contact form missing");
if (!home.includes('data-contact-status') || !home.includes('aria-live="polite"')) fail("homepage: contact form status live region missing");
if ((home.match(/aria-live="polite"/g) || []).length !== 1) fail("homepage: expected one polite live region for contact status");
for (const [field, type] of [["contact-name", "text"], ["contact-email", "email"], ["contact-message", "textarea"]]) {
  if (!new RegExp(`<label\\b[^>]*for=["']${field}["']`, "i").test(home)) fail(`homepage: label missing for ${field}`);
  const controlPattern = type === "textarea"
    ? new RegExp(`<textarea\\b[^>]*id=["']${field}["'][^>]*required`, "i")
    : new RegExp(`<input\\b[^>]*id=["']${field}["'][^>]*type=["']${type}["'][^>]*required`, "i");
  if (!controlPattern.test(home)) fail(`homepage: required contact field missing or misconfigured: ${field}`);
}
if (!/<select\b[^>]*id=["']contact-enquiry-type["'][^>]*name=["']enquiryType["']/i.test(home)) fail("homepage: optional enquiry type field missing");
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
for (const file of featuredProjects.map((project) => project.caseStudy)) {
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
if ((home.match(/class="archive-entry"/g) || []).length !== 2) fail("homepage: expected two expandable additional-engineering entries");
if ((home.match(/<details class="archive-entry">\s*<summary>/g) || []).length !== 2) fail("homepage: additional-engineering entries must be native details/summary disclosures");
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
if (/multi-hour|self-healing|three years|3\+? years/i.test(productionHtml)) fail("production HTML: an unsupported or stale claim is present");
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

for (const [file, expectedHash] of Object.entries({
  "Gurmilan_Singh_2026_CV.pdf": "DDD033DD39D87E311C1A713A17D179E31BEB9E7AC7DF436E2AE575319117D5EE"
})) {
  const bytes = await fs.readFile(path.resolve(file)).catch(() => null);
  const actualHash = bytes ? createHash("sha256").update(bytes).digest("hex").toUpperCase() : "";
  if (actualHash !== expectedHash) fail(`${file}: résumé source changed during this pass`);
}

const productionCss = await fs.readFile(path.join(root, "assets/styles.css"), "utf8");
const productionJs = await fs.readFile(path.join(root, "assets/script.js"), "utf8");
if (/\.js\s+\[data-connector-reveal\]/.test(productionCss)) fail("motion: connector preparation must not depend on the early js class");
if (!productionCss.includes(".reveal-ready [data-reveal-group]") || !productionJs.includes('classList.add("reveal-ready")')) fail("motion: progressive reveal preparation contract is missing");
if (!/prefers-reduced-motion\s*:\s*reduce/.test(productionJs) || !/prefers-reduced-motion\s*:\s*reduce/.test(productionCss)) fail("motion: reduced-motion handling is missing");
if (!productionCss.includes(".case-immersive-frame") || !productionJs.includes("[data-case-immersive]")) fail("motion: case-study immersive progress contract is missing");
if (!/\.media-dialog-hotspot\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/m.test(productionCss)) fail("accessibility: dialog hotspot targets must remain at least 44px square");

const resume = await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.pdf")).catch(() => null);
if (!resume || resume.size < 1000) fail("public PDF résumé missing or empty"); else pass(`public PDF résumé present (${resume.size} bytes)`);
if (await fs.stat(path.join(root, "Gurmilan_Singh_2026_CV.docx")).catch(() => null)) fail("source DOCX is exposed in production output");
if (failures) { console.error(`\n${failures} validation failure(s).`); process.exit(1); }
pass("templates resolved, placeholders hidden, links resolve, metadata present");
