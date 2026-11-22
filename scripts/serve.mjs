/*
 * Serves dist/ the way production does (Cloudflare static assets, default HTML handling):
 * pages at their clean URL (/flowbank-one serves flowbank-one.html), /page.html answered
 * with a 307 to /page (and /index.html to /), and 404.html with a 404 status for anything
 * else. Run it directly (`node scripts/serve.mjs`, PORT to change the port), or import
 * startServer() as the browser tests do.
 */
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf"
};

const readFile = (file) => fs.readFile(file).catch(() => null);

export function startServer({ root = DEFAULT_ROOT, port = 0, host = "127.0.0.1" } = {}) {
  const base = path.resolve(root);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");
      let rel;
      try { rel = decodeURIComponent(url.pathname); } catch { rel = "/__malformed__"; }
      const send = (status, file, body) => {
        res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(body);
      };
      // dist/_redirects first, as the host applies it before serving assets.
      const rules = ((await readFile(path.join(base, "_redirects"))) || "").toString().split("\n").map((line) => line.trim().split(/\s+/)).filter(([from]) => from && !from.startsWith("#"));
      const rule = rules.find(([from]) => from === rel);
      if (rule) { res.writeHead(Number(rule[2]) || 302, { Location: rule[1] }); res.end(); return; }
      // /page.html -> /page, /index.html -> /, keeping the query string.
      if (rel.endsWith(".html") && rel !== "/404.html") {
        const clean = rel === "/index.html" ? "/" : rel.slice(0, -".html".length);
        if (await readFile(path.join(base, rel))) { res.writeHead(307, { Location: `${clean}${url.search}` }); res.end(); return; }
      }
      const candidates = rel.endsWith("/") ? [`${rel}index.html`] : [rel, `${rel}.html`];
      for (const candidate of candidates) {
        const file = path.join(base, candidate);
        if (!file.startsWith(base)) break;
        const stat = await fs.stat(file).catch(() => null);
        if (!stat?.isFile()) continue;
        send(200, file, await readFile(file));
        return;
      }
      const notFound = path.join(base, "404.html");
      send(404, notFound, (await readFile(notFound)) || "not found");
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const server = await startServer({ port: Number(process.env.PORT) || 4173, host: "localhost" });
  console.log(`serving dist/ on http://localhost:${server.address().port}`);
}
