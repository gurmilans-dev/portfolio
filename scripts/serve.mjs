import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("dist");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf"
};

createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel.endsWith("/")) rel += "index.html";
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
    let body = await fs.readFile(file).catch(() => null);
    if (body === null) { file = path.join(ROOT, "404.html"); body = await fs.readFile(file).catch(() => null); res.statusCode = body ? 404 : 500; }
    const type = TYPES[path.extname(file)] || "application/octet-stream";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-store");
    res.end(body || "not found");
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
}).listen(PORT, () => console.log(`serving dist/ on http://localhost:${PORT}`));
