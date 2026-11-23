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
- `scripts/components.mjs` — build-time partials (`{{> head-boot}}`, `{{> header home}}`, `{{> footer}}`, `{{> wb-index}}`, `{{> wb-stage}}`, `{{> wb-files}}`, `{{> also-built}}`, `{{> drawer}}`, `{{> case-cut key}}`, `{{> case-end key}}`, `{{> case-index key}}`, `{{> case-status key}}`, `{{> case-source key}}`, `{{> github-link key}}`, `{{> sim id}}`) rendered from the config. `github-link` renders nothing unless the project has a public GitHub repository; `case-source` shows that link once it exists and the words "Private repository" until then.
- `scripts/sims.mjs` — the two simulations' scenarios and steps, and the markup made from them (see below).
- `build.mjs` — partial and token resolution, conservative CSS/JS minification, comment removal, sitemap and robots generation, static and media copy. It also turns every internal link and asset path into a root-relative, clean URL (`erp-case-study.html` becomes `/erp-case-study`, `index.html#work` becomes `/#work`): templates and `site.config.mjs` keep writing file names.
- `validate.mjs` — run by `npm test`: metadata, canonical URLs and the sitemap, links and fragments, unique ids, accessibility contracts, workbench order against the config, and the claim checks that keep every case study honest (no invented usage, deployment or technology).
- `scripts/browser.test.mjs` — run by `npm run test:browser` against the built site, in headless Chrome driven by `scripts/cdp.mjs` (no dependencies; Node 22+). It checks behaviour the validator cannot see: the small-screen menu with and without its script, focus after a quick look closes, `#work-` links (valid, unknown and malformed), the selected system's summary on narrow screens, the stage controls on short windows, Reset view, themes, internal links, the contact form against intercepted requests (nothing is sent), the 404 page at a nested path, layout shift while pages load, input during transitions, and every path through the two simulations (keyboard, touch, every width and step, both themes, contrast, reduced motion, without JavaScript, a slow or blocked `sims.js`).

## Publishing a private repository

FlowBank One, ProcBeacon, Orbit, Opssemble and Alfaaz have private repositories, so their `repository` field in `site.config.mjs` is empty and no GitHub action is rendered for them. When one becomes public:

1. Paste its `https://github.com/...` URL into that project's `repository` field.
2. Run `npm run build` and `npm test`.

The GitHub action then appears in its homepage file and quick look, in its case study's facts and on its "Also built" row, and every "Private repository" source line switches to "Public on GitHub". No markup changes are needed. `validate.mjs` refuses any GitHub link on the site that is not a configured `repository`, so a private URL cannot be published by accident — which is also why private URLs must never be written into the config.

## Client scripts

- `assets/script.js` (every page): colour theme switch, navigation sheet, section awareness, reveal-on-scroll, case-study sequences, screenshot hotspots and lightbox, contact form, copy-to-clipboard, the Modena clock. The small-screen menu is drawn as a sheet from the first paint (`.nav-pending`, set in `<head>`), but it only becomes the working menu once this script has wired it (`.nav-ready`); if the script is blocked or fails, the pending state is dropped at DOMContentLoaded and the plain links come back.
- `assets/workbench.js` (homepage): hero tilt, the systems tablist, the stack (orbit, explode, layer highlighting) and the quick-look drawer.
- `assets/sims.js` (FlowBank One and ProcBeacon case studies only, about 5 KB): steps the simulations. It never talks to the network, a database or a process.

The inline head script follows the stylesheet link directly, on every page. Being a script, it makes the parser wait for `styles.css` before reading the body, so a page's view-transition opt-in is in force before anything can ask for it: Chromium otherwise sometimes evaluated an arriving page without it and abandoned the transition (reproduced in Chrome under Playwright in about half of the explorer-to-case-study trips, none after the move). Rendering waits for the stylesheet anyway, so the theme is still applied before the first paint. `validate.mjs` keeps the order.

## Break it yourself: the two simulations

The FlowBank One case study (Ledger & concurrency) and the ProcBeacon case study (Process safety) each carry a small instrument labelled as a simulation, beside the decision record it puts to the test:

- **FlowBank One, lock order:** two crossed transfers, in FlowBank's order, out of order (the deadlock the rule prevents, PostgreSQL's `40P01` and FlowBank's single retry), and a lock held past `lock_timeout` (`55P03`, `503 ACCOUNT_BUSY`). Taken from `AccountLockOrder`, `PostingService`, ADR-0005, `LedgerConcurrencyIT` and the performance report.
- **ProcBeacon, PID reuse:** a PID that passes to another program between the refresh and the click (blocked as `IdentityChanged` on the handle), the same process ended and verified on its handle (the session then refuses a second run), and a critical process with an ordinary name. Taken from `WindowsProcessControlService`, `ProcessControlPolicy`, the confirmation window and `ProcessControlTests`. The processes, PIDs, times and paths are invented.

`scripts/sims.mjs` holds the steps, and the build renders three things from them: a written transcript (what a reader without JavaScript gets, and what prints), the live instrument already drawn in its start state, and the steps as JSON for `assets/sims.js`. The live view is shown from the first paint under `.sim-pending` (dropped at DOMContentLoaded unless `sims.js` took over), so nothing moves when the script arrives, and nothing changes size while it steps: lines of different length are stacked in one cell. Step, Back, Reset, Play and the step rail are buttons; arrow keys, Home and End step while focus is on the controls; each step is announced through a polite live region.

## Transitions and the contact response

Moving between pages uses the browser's own cross-document view transitions (`@view-transition` in `assets/styles.css`), opted into only when the visitor has no reduced-motion preference. A project's name and its primary screenshot carry one transition name per project (`vt-title-<key>`, `vt-shot-<key>`), so they travel from the explorer's panel to the case study's eyebrow and evidence band, from a case study's pager card to the next case study, and back; the header stays in place and the rest of the page crossfades. Previous/Next in the case-study pager and history Back/Forward add a short sideways drift. The inline head script (`headBoot` in `scripts/components.mjs`) handles arrival: it marks the page so load animations do not replay underneath, adds the direction, and only lets elements that are on screen travel. Opening and closing a quick look is a same-document view transition where `document.startViewTransition` exists: the panel's preview grows into the drawer's screenshot as the drawer slides in. Browsers without view transitions, and reduced motion, get ordinary navigation and the drawer's own slide; nothing waits on a transition.

The contact form's footer shows its states as a small lane in the marks of the hero's request trace: Check, Send, Received. It mirrors the status line (which stays the only live region and the source of truth), moves only while a request is out, and reaches Received only after the form service answers with success. Without JavaScript it stays hidden and the form posts normally.

## Themes

Dark (graphite) and light (drafting film). A first visit follows the system setting; the Dark / Light switch in the header stores an explicit choice in `localStorage` under `portfolio-theme`, and a small inline script in every page's `<head>` applies it before the first paint. All colours are custom properties in `assets/styles.css`: the dark values sit on `:root`, the light values on `:root[data-theme="light"]`, repeated inside a `prefers-color-scheme: light` query so pages without JavaScript still follow the system. `validate.mjs` fails the build if the two light blocks differ or a colour token has no light value. In light mode the bright signal orange stays on filled surfaces (`--accent-fill`, with dark ink) while text and lines use a deeper orange (`--accent`) that clears 4.5:1.

The homepage's contact section and footer reverse figure and ground in both themes: a slightly deeper shade of the signal orange (`#ea7a2e`) becomes the ground, and the left column and footer line swap their text, line and accent tokens for graphite-ink tones that clear 4.5:1 on it (3:1 for control edges). The form keeps the reader's theme as a plate on the orange, on the same offset slab as the hero plates.

## Fallbacks

Without JavaScript the workbench is a plain list of every system with its full case file, and each simulation is its written transcript. Reduced-motion preferences disable the load sequence, the ambient drift, and the request/response trace and release pipeline in the hero figure, which then rests in its final state. The 3D stack is decorative and hidden from assistive technology; the same information is in the index and the layer files.

## Assets

- Fonts: Instrument Sans and JetBrains Mono, self-hosted as latin and latin-ext WOFF2 subsets. Both are licensed under the SIL Open Font License 1.1.
- Screenshots: `node scripts/optimize-images.mjs` regenerates AVIF and WebP siblings for every PNG under `assets/<project>/`.
- `assets/social-preview.svg` is the source for `social-preview.png` (1200×630), the homepage's preview and the confidential platform's.
- `node scripts/social-cards.mjs` regenerates each case study's own preview card in `assets/social/` from its primary screenshot (the project's `shareCard`). Run it after replacing a primary screenshot.

## Production deployment

Deploy the contents of `dist/` to any static host. Configure the host to use `404.html` for unknown routes. The site is built for the host's default HTML handling on Cloudflare (`wrangler.jsonc`): pages live at clean URLs and `/page.html` redirects to them, so canonicals, Open Graph URLs, the sitemap and every internal link use the clean URL. Old addresses go in `_redirects`, pointing straight at the clean URL so they take one hop.

**Live site:** https://gurmilansingh.com
