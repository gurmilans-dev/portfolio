import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { siteConfig } from "./site.config.mjs";

const root = path.resolve("dist");
const pages = ["index.html", "erp-case-study.html", "opssemble.html", "gurmat-saanj.html", "404.html"];
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
const featuredOrder = ["Gurmat Saanj", "Opssemble", "Confidential Production Business Platform"].map((label) => home.indexOf(label));
if (featuredOrder.some((position) => position < 0) || featuredOrder.some((position, index) => index > 0 && position <= featuredOrder[index - 1])) fail("homepage: featured projects are not ordered ERP, Gurmat, Opssemble");
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
for (const file of ["erp-case-study.html", "opssemble.html", "gurmat-saanj.html"]) {
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
if ((home.match(/project-media-gurmat/g) || []).length !== 1) fail("homepage: expected one Gurmat primary visual");
if ((home.match(/project-opssemble/g) || []).length !== 1) fail("homepage: expected one Opssemble featured card");
if (!home.includes("Read Opssemble case study")) fail("homepage: Opssemble case-study link missing");
if (!home.includes("data-work-track")) fail("homepage: work rail track missing");
if ((home.match(/class="archive-entry"/g) || []).length !== 2) fail("homepage: expected two expandable additional-engineering entries");
if ((home.match(/<details class="archive-entry">\s*<summary>/g) || []).length !== 2) fail("homepage: additional-engineering entries must be native details/summary disclosures");
if (/WebSockets?|Socket\.IO|SignalR|server-sent events|peer-to-peer|WebRTC|event sourcing|distributed locking|message queues?|OAuth|JWT|session persistence|persistent accounts/i.test(gurmat)) fail("gurmat-saanj.html: unsupported networking or account technology is named");
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

for (const [file, width, height] of [
  ["assets/gurmat/gurmat-projector-output.png", 1902, 845],
  ["assets/gurmat/gurmat-main-workspace.png", 960, 817],
  ["assets/gurmat/gurmat-mobile-editor.png", 1290, 2320],
  ["assets/gurmat/gurmat-editor-transfer-request.png", 1290, 2320]
]) {
  const bytes = await fs.readFile(path.join(root, file)).catch(() => null);
  if (!bytes) { fail(`${file}: required Gurmat screenshot missing`); continue; }
  if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height) fail(`${file}: unexpected dimensions`);
}

for (const [file, expectedHash] of Object.entries({
  "Gurmilan_Singh_2026_CV.pdf": "A7D2CA546E4B4841E3D1679A51D42D112519B9F245CD6D6663DB4E47D02C7C63"
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
