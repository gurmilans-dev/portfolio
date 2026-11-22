# Gurmilan Singh portfolio

A framework-free static portfolio for a full-stack software engineer, with no runtime npm dependencies and no tracking.

The design treats every project as a cut through four layers — **L4 Interface, L3 Application, L2 Data, L1 Delivery**. On the homepage the six featured systems sit in an interactive CSS-3D stack: selecting a system draws a beam through its socket on every plane and shows its layer-by-layer file beside the stack. Each system then offers two ways in, named for what they are: a **Quick look** (a drawer, previewed by the project's own screenshot, that adds what the panel beside it does not show: the screenshot, the key decision and the evidence) and the **Full case study** (its own page). On phones and tablets the selected system's summary, screenshot preview and case study link come straight after the system tiles, and the stack follows them; the stack never stands between a choice and what was chosen. Work that does not have those four layers, or is smaller, earlier or still moving, is listed below the explorer in the **Also built** register and described with an architecture chain and a flow instead of invented layers. Every row ends in the same actions in the same order: Quick look, the full case study where there is one, then the Chrome Web Store listing and the GitHub repository, each named in words.

Each project shows two separate facts: its **status**, which is how far it has come (production, deployed, published, pilot preparation, in development, runs locally, experimental, commercial, academic), and its **source**, derived from `repository` ("Public source", "Private source" or "Confidential").

Every case study opens with its evidence: right under the title, a real screenshot (for the confidential platform, the before-and-after) beside the one or two verified results that matter most, each linked to the section that explains it. The four-layer cut sits in the architecture section, as a summary of what that section explains.

## Run locally on Windows

1. Open PowerShell in this folder.
2. Install development dependencies: `npm ci --include=dev`
3. Build: `npm run build`
4. Run the HTML regression tests and site validation: `npm test`
5. Run the browser tests: `npm run test:browser` (needs Chrome, Chromium or Edge; set `CHROME_PATH` if it is not in its usual place)
6. Serve the production folder: `npm run serve`, then open `http://localhost:4173`

`scripts/serve.mjs` serves `dist/` the way the host does: pages at clean URLs (`/flowbank-one`), `/page.html` answered with a 307 to the clean URL, `_redirects` applied, and `404.html` with a 404 status for anything else. Opening the built files directly from disk is not supported, because links are root-relative.

The root HTML files are source templates. Essential values and repeated markup are resolved into complete static HTML during the build; content and navigation never depend on JavaScript.

## How the pages are built

- `site.config.mjs` — profile, contact form, the four layers, and every project: copy, status, evidence, what is *not* claimed, layer summaries, architecture, decision record and images. This is the single source of truth for the workbench order and the case files.
- `scripts/components.mjs` — build-time partials (`{{> head-boot}}`, `{{> header home}}`, `{{> footer}}`, `{{> wb-index}}`, `{{> wb-stage}}`, `{{> wb-files}}`, `{{> also-built}}`, `{{> drawer}}`, `{{> case-cut key}}`, `{{> case-end key}}`, `{{> case-index key}}`, `{{> case-status key}}`, `{{> case-source key}}`, `{{> github-link key}}`) rendered from the config. `github-link` renders nothing unless the project has a public GitHub repository; `case-source` shows that link once it exists and the words "Private repository" until then.
- `build.mjs` — partial and token resolution, conservative CSS/JS minification, comment removal, sitemap and robots generation, static and media copy. It also turns every internal link and asset path into a root-relative, clean URL (`erp-case-study.html` becomes `/erp-case-study`, `index.html#work` becomes `/#work`): templates and `site.config.mjs` keep writing file names.
- `validate.mjs` — run by `npm test`: metadata, canonical URLs and the sitemap, links and fragments, unique ids, accessibility contracts, workbench order against the config, and the claim checks that keep every case study honest (no invented usage, deployment or technology).
- `scripts/browser.test.mjs` — run by `npm run test:browser` against the built site, in headless Chrome driven by `scripts/cdp.mjs` (no dependencies; Node 22+). It checks behaviour the validator cannot see: the small-screen menu with and without its script, focus after a quick look closes, `#work-` links (valid, unknown and malformed), the selected system's summary on narrow screens, the stage controls on short windows, Reset view, themes, internal links, the contact form against intercepted requests (nothing is sent), and the 404 page at a nested path.

## Publishing a private repository

FlowBank One, ProcBeacon, Orbit, Opssemble and Alfaaz have private repositories, so their `repository` field in `site.config.mjs` is empty and no GitHub action is rendered for them. When one becomes public:

1. Paste its `https://github.com/...` URL into that project's `repository` field.
2. Run `npm run build` and `npm test`.

The GitHub action then appears in its homepage file and quick look, in its case study's facts and on its "Also built" row, and every "Private repository" source line switches to "Public on GitHub". No markup changes are needed. `validate.mjs` refuses any GitHub link on the site that is not a configured `repository`, so a private URL cannot be published by accident — which is also why private URLs must never be written into the config.

## Client scripts

- `assets/script.js` (every page): colour theme switch, navigation sheet, section awareness, reveal-on-scroll, case-study sequences, screenshot hotspots and lightbox, contact form, copy-to-clipboard, the Modena clock. The small-screen menu is drawn as a sheet from the first paint (`.nav-pending`, set in `<head>`), but it only becomes the working menu once this script has wired it (`.nav-ready`); if the script is blocked or fails, the pending state is dropped at DOMContentLoaded and the plain links come back.
- `assets/workbench.js` (homepage): hero tilt, the systems tablist, the stack (orbit, explode, layer highlighting) and the quick-look drawer.

## Themes

Dark (graphite) and light (drafting film). A first visit follows the system setting; the Dark / Light switch in the header stores an explicit choice in `localStorage` under `portfolio-theme`, and a small inline script in every page's `<head>` applies it before the first paint. All colours are custom properties in `assets/styles.css`: the dark values sit on `:root`, the light values on `:root[data-theme="light"]`, repeated inside a `prefers-color-scheme: light` query so pages without JavaScript still follow the system. `validate.mjs` fails the build if the two light blocks differ or a colour token has no light value. In light mode the bright signal orange stays on filled surfaces (`--accent-fill`, with dark ink) while text and lines use a deeper orange (`--accent`) that clears 4.5:1.

The homepage's contact section and footer reverse figure and ground in both themes: a slightly deeper shade of the signal orange (`#ea7a2e`) becomes the ground, and the left column and footer line swap their text, line and accent tokens for graphite-ink tones that clear 4.5:1 on it (3:1 for control edges). The form keeps the reader's theme as a plate on the orange, on the same offset slab as the hero plates.

## Fallbacks

Without JavaScript the workbench is a plain list of every system with its full case file. Reduced-motion preferences disable the load sequence, the ambient drift, and the request/response trace and release pipeline in the hero figure, which then rests in its final state. The 3D stack is decorative and hidden from assistive technology; the same information is in the index and the layer files.

## Assets

- Fonts: Instrument Sans and JetBrains Mono, self-hosted as latin and latin-ext WOFF2 subsets. Both are licensed under the SIL Open Font License 1.1.
- Screenshots: `node scripts/optimize-images.mjs` regenerates AVIF and WebP siblings for every PNG under `assets/<project>/`.
- `assets/social-preview.svg` is the source for `social-preview.png` (1200×630), the homepage's preview and the confidential platform's.
- `node scripts/social-cards.mjs` regenerates each case study's own preview card in `assets/social/` from its primary screenshot (the project's `shareCard`). Run it after replacing a primary screenshot.

## Production deployment

Deploy the contents of `dist/` to any static host. Configure the host to use `404.html` for unknown routes. The site is built for the host's default HTML handling on Cloudflare (`wrangler.jsonc`): pages live at clean URLs and `/page.html` redirects to them, so canonicals, Open Graph URLs, the sitemap and every internal link use the clean URL. Old addresses go in `_redirects`, pointing straight at the clean URL so they take one hop.

**Live site:** https://gurmilansingh.com
