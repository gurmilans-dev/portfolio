# Gurmilan Singh portfolio

A framework-free static portfolio for a full-stack software engineer, with no runtime npm dependencies and no tracking.

The design treats every project as a cut through four layers — **L4 Interface, L3 Application, L2 Data, L1 Delivery**. On the homepage the six featured systems sit in an interactive CSS-3D stack: selecting a system draws a beam through its socket on every plane, and its layer-by-layer file opens in a case-file drawer. Each case study opens with the same cut for that one system.

## Run locally on Windows

1. Open PowerShell in this folder.
2. Install development dependencies: `npm ci --include=dev`
3. Build: `npm run build`
4. Run the HTML regression tests and site validation: `npm test`
5. Serve the production folder: `node scripts/serve.mjs` (or `npx serve dist -l 4173`)
6. Open `http://localhost:4173`

The root HTML files are source templates. Essential values and repeated markup are resolved into complete static HTML during the build; content and navigation never depend on JavaScript.

## How the pages are built

- `site.config.mjs` — profile, contact form, the four layers, and every project: copy, status, evidence, what is *not* claimed, layer summaries, architecture, decision record and images. This is the single source of truth for the workbench order and the case files.
- `scripts/components.mjs` — build-time partials (`{{> header home}}`, `{{> footer}}`, `{{> wb-index}}`, `{{> wb-stage}}`, `{{> wb-files}}`, `{{> drawer}}`, `{{> case-cut key}}`, `{{> case-end key}}`) rendered from the config.
- `build.mjs` — partial and token resolution, conservative CSS/JS minification, comment removal, sitemap and robots generation, static and media copy.
- `validate.mjs` — run by `npm test`: metadata, links and fragments, unique ids, accessibility contracts, workbench order against the config, and the claim checks that keep every case study honest (no invented usage, deployment or technology).

## Client scripts

- `assets/script.js` (every page): colour theme switch, navigation sheet, section awareness, reveal-on-scroll, case-study sequences, screenshot hotspots and lightbox, contact form, copy-to-clipboard, the Modena clock.
- `assets/workbench.js` (homepage): hero tilt, the systems tablist, the stack (orbit, explode, layer highlighting) and the case-file drawer.

## Themes

Dark (graphite) and light (drafting film). A first visit follows the system setting; the Dark / Light switch in the header stores an explicit choice in `localStorage` under `portfolio-theme`, and a small inline script in every page's `<head>` applies it before the first paint. All colours are custom properties in `assets/styles.css`: the dark values sit on `:root`, the light values on `:root[data-theme="light"]`, repeated inside a `prefers-color-scheme: light` query so pages without JavaScript still follow the system. `validate.mjs` fails the build if the two light blocks differ or a colour token has no light value. In light mode the bright signal orange stays on filled surfaces (`--accent-fill`, with dark ink) while text and lines use a deeper orange (`--accent`) that clears 4.5:1.

## Fallbacks

Without JavaScript the workbench is a plain list of every system with its full case file. Reduced-motion preferences disable the load sequence, the ambient drift, and the request/response trace and release pipeline in the hero figure, which then rests in its final state. The 3D stack is decorative and hidden from assistive technology; the same information is in the index and the layer files.

## Assets

- Fonts: Instrument Sans and JetBrains Mono, self-hosted as latin and latin-ext WOFF2 subsets. Both are licensed under the SIL Open Font License 1.1.
- Screenshots: `node scripts/optimize-images.mjs` regenerates AVIF and WebP siblings for every PNG under `assets/<project>/`.
- `assets/social-preview.svg` is the source for `social-preview.png` (1200×630).

## Production deployment

Deploy the contents of `dist/` to any static host. Configure the host to use `404.html` for unknown routes.

**Live site:** https://gurmilansingh.com
