/*
 * One-time, dev-only image optimizer. Generates AVIF + WebP siblings for the
 * project screenshots so the site can serve them via <picture> with the
 * original PNG as a universal fallback. sharp is a devDependency only; nothing
 * in the shipped site or the build depends on it.
 *
 * Run: node scripts/optimize-images.mjs
 */
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

// Every PNG under assets/<project>/ is a source. Dropping a new screenshot in and
// re-running this is the whole workflow — no list to keep in sync.
const SOURCES = (await fs.readdir("assets", { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .flatMap((dir) => [dir.name])
  .reduce(async (acc, dir) => [
    ...(await acc),
    ...(await fs.readdir(path.join("assets", dir)))
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .map((file) => `assets/${dir}/${file}`)
  ], Promise.resolve([]));

for (const src of await SOURCES) {
  const buf = await fs.readFile(src);
  const base = src.replace(/\.png$/i, "");
  const avif = await sharp(buf).avif({ quality: 52, effort: 6 }).toBuffer();
  const webp = await sharp(buf).webp({ quality: 80, effort: 6 }).toBuffer();
  await fs.writeFile(`${base}.avif`, avif);
  await fs.writeFile(`${base}.webp`, webp);
  const png = (await fs.stat(src)).size;
  console.log(`${path.basename(src)}  png ${(png / 1024).toFixed(0)}KB -> avif ${(avif.length / 1024).toFixed(0)}KB · webp ${(webp.length / 1024).toFixed(0)}KB`);
}
console.log("done");
