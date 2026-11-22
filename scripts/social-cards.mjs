/*
 * Social preview cards for the case studies: each one is the project's own primary
 * screenshot, cropped from the top into a 1200×630 card on the site's graphite ground with
 * its orange signal bar. Nothing is drawn or invented: the card is the real capture, framed.
 * Work without a capture (the confidential platform) keeps the site's default preview.
 *
 * Run `node scripts/social-cards.mjs` after replacing a primary screenshot; it writes the
 * PNG named in each project's `shareCard`, and the build ships it like any project image.
 */
import sharp from "sharp";
import path from "node:path";
import { siteConfig } from "../site.config.mjs";

const WIDTH = 1200;
const HEIGHT = 630;
const INSET = 48;
const TOP = 64;
const BAR = 8;
const shotWidth = WIDTH - INSET * 2;
const shotHeight = HEIGHT - TOP - INSET;

for (const [key, project] of Object.entries(siteConfig.projects)) {
  if (!project.shareCard) continue;
  if (!project.primaryImage) throw new Error(`${key}: shareCard needs a primaryImage to frame`);
  const shot = await sharp(project.primaryImage).resize(shotWidth - 2, shotHeight - 2, { fit: "cover", position: "top" }).png().toBuffer();
  const frame = await sharp({ create: { width: shotWidth, height: shotHeight, channels: 3, background: "#2c2d31" } })
    .composite([{ input: shot, left: 1, top: 1 }]).png().toBuffer();
  const bar = await sharp({ create: { width: WIDTH, height: BAR, channels: 3, background: "#fa8a3c" } }).png().toBuffer();
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#0c0d0f" } })
    .composite([{ input: bar, left: 0, top: 0 }, { input: frame, left: INSET, top: TOP }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.resolve(project.shareCard));
  console.log(`${project.shareCard} from ${project.primaryImage}`);
}
