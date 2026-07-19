import { promises as fs } from "node:fs";
import path from "node:path";
import { siteConfig } from "./site.config.mjs";

const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "dist");
const HTML_FILES = ["index.html", "erp-case-study.html", "opssemble.html", "gurmat-saanj.html", "404.html"];
const FONT_FILES = [
  "assets/fonts/archivo-var.woff2",
  "assets/fonts/plex-mono-400.woff2",
  "assets/fonts/plex-mono-600.woff2",
  "assets/fonts/source-serif.woff2"
];
const VENDOR_FILES = [
  "assets/vendor/gsap.min.js",
  "assets/vendor/ScrollTrigger.min.js",
  "assets/vendor/three.min.js"
];
const COPY_FILES = [
  siteConfig.profile.resume,
  "_redirects",
  "assets/favicon.svg",
  "assets/social-preview.png",
  "assets/social-preview.svg",
  ...FONT_FILES,
  ...VENDOR_FILES,
  ...[
    siteConfig.projects.erp.primaryImage,
    siteConfig.projects.erp.secondaryImage,
    siteConfig.projects.opssemble.primaryImage,
    siteConfig.projects.opssemble.secondaryImage,
    siteConfig.projects.erp.primaryImageAvif,
    siteConfig.projects.erp.primaryImageWebp,
    siteConfig.projects.gurmat.primaryImage,
    siteConfig.projects.gurmat.primaryImageAvif,
    siteConfig.projects.gurmat.primaryImageWebp,
    siteConfig.projects.gurmat.secondaryImage,
    siteConfig.projects.gurmat.secondaryImageAvif,
    siteConfig.projects.gurmat.secondaryImageWebp,
    siteConfig.projects.gurmat.mobileImage,
    siteConfig.projects.gurmat.mobileImageAvif,
    siteConfig.projects.gurmat.mobileImageWebp,
    siteConfig.projects.gurmat.transferImage,
    siteConfig.projects.gurmat.transferImageAvif,
    siteConfig.projects.gurmat.transferImageWebp
  ].filter(Boolean)
];

function inlineIcon(name, body) {
  return `<svg class="inline-icon inline-icon-${name}" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const icons = {
  github: inlineIcon("github", '<path d="M9 19c-4.2 1.3-4.2-2.2-5.6-2.8" /><path d="M15 21v-3.4c0-1 .3-1.7.9-2.2 3-.4 5.8-1.5 5.8-6.4 0-1.4-.5-2.6-1.4-3.6.1-.4.5-1.8-.2-3.5 0 0-1.3-.4-3.9 1.4a13.4 13.4 0 0 0-7.1 0C6.5 1.5 5.2 1.9 5.2 1.9c-.7 1.7-.3 3.1-.2 3.5A5 5 0 0 0 3.6 9c0 4.9 2.8 6 5.8 6.4.6.5.9 1.2.9 2.2V21" />'),
  linkedin: inlineIcon("linkedin", '<path fill="currentColor" stroke="none" d="M5.15 9h3.05v9.15H5.15z" /><path fill="currentColor" stroke="none" d="M6.68 4.85a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z" /><path fill="currentColor" stroke="none" d="M10.05 9h2.92v1.25c.42-.72 1.34-1.5 2.78-1.5 2.98 0 3.53 1.96 3.53 4.5v4.9h-3.05v-4.34c0-1.04-.02-2.37-1.45-2.37-1.45 0-1.68 1.13-1.68 2.29v4.42h-3.05z" />'),
  email: inlineIcon("email", '<path d="M4 6.5h16v11H4z" /><path d="m4.8 7.2 7.2 5.5 7.2-5.5" />'),
  resume: inlineIcon("resume", '<path d="M7 3.8h6.8L18 8v12.2H7z" /><path d="M13.5 3.8v4.5H18" /><path d="M9.7 12.2h4.6" /><path d="M9.7 15.4h4.6" />'),
  external: inlineIcon("external", '<path d="M8 8h8v8" /><path d="M7.5 16.5 16 8" />'),
  send: inlineIcon("send", '<path d="m4 12 16-7-7 16-2.4-6.6L4 12z" /><path d="m10.6 14.4 4-4" />'),
  success: inlineIcon("success", '<path d="M20 6 9 17l-5-5" />'),
  error: inlineIcon("error", '<path d="M12 8v5" /><path d="M12 17h.01" /><path d="M4.8 4.8h14.4v14.4H4.8z" />'),
  shield: inlineIcon("shield", '<path d="M12 3.5 5.5 6.2v5c0 4.3 2.9 6.8 6.5 7.8 3.6-1 6.5-3.5 6.5-7.8v-5z" /><path d="m9.3 11.9 1.9 1.9 3.6-3.8" />'),
  craft: inlineIcon("craft", '<path d="M16.5 4.5 19.5 7.5 9 18l-4 1 1-4z" /><path d="m14 7 3 3" />'),
  ai: inlineIcon("ai", '<path d="M12 4.5 13.4 9 18 10.5 13.4 12 12 16.5 10.6 12 6 10.5 10.6 9z" /><path d="M18.5 4.5 19 6 20.5 6.5 19 7 18.5 8.5 18 7 16.5 6.5 18 6z" />')
};

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
  "icons.github": icons.github,
  "icons.linkedin": icons.linkedin,
  "icons.email": icons.email,
  "icons.resume": icons.resume,
  "icons.external": icons.external,
  "icons.send": icons.send,
  "icons.success": icons.success,
  "icons.error": icons.error,
  "icons.shield": icons.shield,
  "icons.craft": icons.craft,
  "icons.ai": icons.ai,
  "projects.erp.status": siteConfig.projects.erp.status,
  "projects.opssemble.status": siteConfig.projects.opssemble.status,
  "projects.opssemble.primaryImage": siteConfig.projects.opssemble.primaryImage,
  "projects.opssemble.secondaryImage": siteConfig.projects.opssemble.secondaryImage,
  "projects.opssemble.repository": siteConfig.projects.opssemble.repository,
  "projects.opssemble.demo": siteConfig.projects.opssemble.demo,
  "projects.gurmat.status": siteConfig.projects.gurmat.status,
  "projects.gurmat.primaryImage": siteConfig.projects.gurmat.primaryImage,
  "projects.gurmat.primaryImageAvif": siteConfig.projects.gurmat.primaryImageAvif,
  "projects.gurmat.primaryImageWebp": siteConfig.projects.gurmat.primaryImageWebp,
  "projects.gurmat.secondaryImage": siteConfig.projects.gurmat.secondaryImage,
  "projects.gurmat.secondaryImageAvif": siteConfig.projects.gurmat.secondaryImageAvif,
  "projects.gurmat.secondaryImageWebp": siteConfig.projects.gurmat.secondaryImageWebp,
  "projects.gurmat.mobileImage": siteConfig.projects.gurmat.mobileImage,
  "projects.gurmat.mobileImageAvif": siteConfig.projects.gurmat.mobileImageAvif,
  "projects.gurmat.mobileImageWebp": siteConfig.projects.gurmat.mobileImageWebp,
  "projects.gurmat.transferImage": siteConfig.projects.gurmat.transferImage,
  "projects.gurmat.transferImageAvif": siteConfig.projects.gurmat.transferImageAvif,
  "projects.gurmat.transferImageWebp": siteConfig.projects.gurmat.transferImageWebp,
  "projects.gurmat.repository": siteConfig.projects.gurmat.repository,
  "projects.gurmat.demo": siteConfig.projects.gurmat.demo,
  "projects.licenceManager.context": siteConfig.projects.licenceManager.context,
  "projects.azure.status": siteConfig.projects.azure.status
};

const conditionMap = {
  "projects.erp.primaryImage": siteConfig.projects.erp.primaryImage,
  "projects.erp.secondaryImage": siteConfig.projects.erp.secondaryImage,
  "projects.opssemble.primaryImage": siteConfig.projects.opssemble.primaryImage,
  "projects.opssemble.secondaryImage": siteConfig.projects.opssemble.secondaryImage,
  "projects.opssemble.repository": siteConfig.projects.opssemble.repository,
  "projects.opssemble.demo": siteConfig.projects.opssemble.demo,
  "projects.gurmat.primaryImage": siteConfig.projects.gurmat.primaryImage,
  "projects.gurmat.secondaryImage": siteConfig.projects.gurmat.secondaryImage,
  "projects.gurmat.mobileImage": siteConfig.projects.gurmat.mobileImage,
  "projects.gurmat.transferImage": siteConfig.projects.gurmat.transferImage,
  "projects.gurmat.repository": siteConfig.projects.gurmat.repository,
  "projects.gurmat.demo": siteConfig.projects.gurmat.demo,
  "projects.licenceManager.repository": siteConfig.projects.licenceManager.repository,
  "projects.azure.repository": siteConfig.projects.azure.repository
};

function renderTemplate(source, file) {
  let rendered = source;
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

function minifyHtml(source) {
  return source.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").trim();
}

function minifyCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim();
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
  for (const file of ["assets/script.js", "assets/scene.js"]) {
    const source = await fs.readFile(path.join(ROOT, file), "utf8").catch(() => null);
    if (source === null) continue;
    await fs.writeFile(path.join(OUT, file), minifyJs(source));
  }

  for (const file of HTML_FILES) {
    const template = await fs.readFile(path.join(ROOT, file), "utf8");
    const rendered = renderTemplate(template, file);
    await fs.writeFile(path.join(OUT, file), minifyHtml(rendered));
  }

  const domain = siteConfig.profile.domain.replace(/\/$/, "");
  await fs.writeFile(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
  await fs.writeFile(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${domain}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n  <url><loc>${domain}/erp-case-study.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n  <url><loc>${domain}/opssemble.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n  <url><loc>${domain}/gurmat-saanj.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>\n`);

  for (const file of COPY_FILES) await copyFile(file);
  console.log(`Built dist/: ${HTML_FILES.length} pages, config resolved, assets optimized, SEO files generated.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
