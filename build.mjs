import { promises as fs } from "node:fs";
import path from "node:path";
import { siteConfig } from "./site.config.mjs";
import { removeHtmlComments } from "./scripts/html.mjs";
import { icons, renderPartials } from "./scripts/components.mjs";

const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "dist");
const HTML_FILES = siteConfig.pages.map((page) => page.file);

/* Project records carry ~20 fields each across thirteen projects, so the projects branch
   — and only that branch — is flattened into dotted template keys. Repeated markup
   (site chrome, the workbench, case files, layer cuts, pagination) is rendered by the
   partials in scripts/components.mjs from the same config, so it cannot drift from it.
   profile.*, contactForm.* and icons.* stay written out below, where being explicit
   still costs nothing. */
function flatten(value, prefix, out = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const dotted = `${prefix}.${key}`;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) flatten(entry, dotted, out);
    else out[dotted] = entry ?? "";
  }
  return out;
}

const projectTokens = flatten(siteConfig.projects, "projects");
const IMAGE_PATH = /^assets\/.+\.(png|avif|webp|svg|jpe?g)$/i;

const FONT_FILES = [
  "assets/fonts/instrument-sans-latin.woff2",
  "assets/fonts/instrument-sans-latin-ext.woff2",
  "assets/fonts/jetbrains-mono-latin.woff2",
  "assets/fonts/jetbrains-mono-latin-ext.woff2"
];
// Client scripts, minified on build. script.js runs on every page; workbench.js only on
// the homepage. Neither is required to read any page.
const SCRIPT_FILES = ["assets/script.js", "assets/workbench.js"];
const COPY_FILES = [
  siteConfig.profile.resume,
  "_redirects",
  "assets/favicon.svg",
  "assets/social-preview.png",
  "assets/social-preview.svg",
  ...FONT_FILES,
  // Every configured project image ships automatically; an empty slot copies nothing.
  ...[...new Set(Object.values(projectTokens).filter((value) => typeof value === "string" && IMAGE_PATH.test(value)))]
];

const contactForm = siteConfig.contactForm;
const contactFormMode = contactForm.mode;
const contactFormEndpoint = contactForm.endpoint.trim();
const contactFormAction = contactFormMode === "endpoint" && contactFormEndpoint ? contactFormEndpoint : `mailto:${siteConfig.profile.email}`;
const contactFormMethod = "post";
const contactFormEnctype = contactFormMode === "endpoint" ? "multipart/form-data" : "text/plain";

const tokenMap = {
  "profile.name": siteConfig.profile.name,
  "profile.role": siteConfig.profile.role,
  "profile.employmentTitle": siteConfig.profile.employmentTitle,
  "profile.employer": siteConfig.profile.employer,
  "profile.positioning": siteConfig.profile.positioning,
  "profile.experience": siteConfig.profile.experience,
  "profile.employmentPeriod": siteConfig.profile.employmentPeriod,
  "profile.graduation": siteConfig.profile.graduation,
  "profile.location": siteConfig.profile.location,
  "profile.employerLocation": siteConfig.profile.employerLocation,
  "profile.resume": siteConfig.profile.resume,
  "profile.email": siteConfig.profile.email,
  "profile.github": siteConfig.profile.github,
  "profile.linkedin": siteConfig.profile.linkedin,
  "profile.domain": siteConfig.profile.domain,
  "contactForm.mode": contactFormMode,
  "contactForm.endpoint": contactFormEndpoint,
  "contactForm.action": contactFormAction,
  "contactForm.method": contactFormMethod,
  "contactForm.enctype": contactFormEnctype,
  "contactForm.timeoutMs": contactForm.timeoutMs,
  "contactForm.turnstileSiteKey": (contactForm.turnstileSiteKey || "").trim(),
  "contactForm.messageMinLength": contactForm.messageMinLength,
  "contactForm.messageMaxLength": contactForm.messageMaxLength,
  // Every icon is available to templates as {{icons.<name>}}.
  ...Object.fromEntries(Object.entries(icons).map(([name, svg]) => [`icons.${name}`, svg])),
  ...projectTokens
};

// {{#if x}} only needs truthiness, so the same flattened project map serves both.
const conditionMap = projectTokens;

function renderTemplate(source, file) {
  let rendered = renderPartials(source, file);
  for (const [key, value] of Object.entries(conditionMap)) {
    const pattern = new RegExp(`{{#if ${key.replaceAll(".", "\\.")}}}([\\s\\S]*?){{/if}}`, "g");
    rendered = rendered.replace(pattern, value ? "$1" : "");
  }
  for (const [key, value] of Object.entries(tokenMap)) {
    rendered = rendered.replaceAll(`{{${key}}}`, String(value));
  }
  const unresolved = [...rendered.matchAll(/{{[^}]+}}/g)].map((match) => match[0]);
  if (unresolved.length) throw new Error(`${file}: unresolved template tokens: ${unresolved.join(", ")}`);
  return rendered;
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,])\s*/g, "$1")
    // Only the space AFTER a colon may go. Stripping the space *before* one silently
    // turns a descendant selector like `.page-alfaaz :is(...)` into the compound
    // `.page-alfaaz:is(...)`, which matches nothing.
    .replace(/:\s+/g, ":")
    .trim();
}

function minifyJs(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\n\s*\n/g, "\n").trim();
}

async function copyFile(rel) {
  const source = path.join(ROOT, rel);
  const destination = path.join(OUT, rel);
  await fs.access(source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function build() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(path.join(OUT, "assets"), { recursive: true });

  const css = await fs.readFile(path.join(ROOT, "assets/styles.css"), "utf8");
  await fs.writeFile(path.join(OUT, "assets/styles.css"), minifyCss(css));
  for (const file of SCRIPT_FILES) {
    const source = await fs.readFile(path.join(ROOT, file), "utf8");
    await fs.writeFile(path.join(OUT, file), minifyJs(source));
  }

  for (const file of HTML_FILES) {
    const template = await fs.readFile(path.join(ROOT, file), "utf8");
    const rendered = renderTemplate(template, file);
    await fs.writeFile(path.join(OUT, file), removeHtmlComments(rendered));
  }

  const domain = siteConfig.profile.domain.replace(/\/$/, "");
  await fs.writeFile(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
  // Sitemap follows siteConfig.pages, so a new page cannot be silently left unindexed.
  const sitemapUrls = siteConfig.pages
    .filter((page) => page.indexed)
    .map((page) => `  <url><loc>${domain}/${page.file === "index.html" ? "" : page.file}</loc><changefreq>monthly</changefreq><priority>${page.priority}</priority></url>`)
    .join("\n");
  await fs.writeFile(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`);

  for (const file of COPY_FILES) await copyFile(file);
  console.log(`Built dist/: ${HTML_FILES.length} pages, config resolved, assets optimized, SEO files generated.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
