# Gurmilan Singh portfolio

A framework-free static portfolio for a full-stack software engineer, with no runtime npm installation. GSAP and Three.js are self-hosted for optional motion and 3D enhancements. It uses semantic HTML, responsive CSS, a small progressive-enhancement script, and build-time configuration. No tracking is included.

## Run locally on Windows

1. Open PowerShell in this folder.
2. Install development dependencies: `npm ci --include=dev`
3. Build: `npm run build`
4. Run the HTML regression tests and site validation: `npm test`
5. Serve the production folder: `npx serve dist -l 4173`
6. Open `http://localhost:4173`

If Python is installed, `python -m http.server 4173 --directory dist` is an optional alternative. Python is not required for the project itself.

The root HTML files are source templates. Essential values are resolved into complete static HTML during the build; production content and navigation do not depend on JavaScript.

HTML comment removal and content word counts use the parse5 HTML parser at build and validation time. The deployed site has no npm runtime dependencies.

## Production deployment

Deploy the contents of `dist/` to any static host. Configure the host to use `404.html` for unknown routes.

## Configuration and key files

- `site.config.mjs`: profile, domain, project status, optional links/media
- `build.mjs`: template resolution, conservative HTML/CSS/JS optimization, SEO generation, static/media copy
- `index.html`, `erp-case-study.html`, `opssemble.html`, `gurmat-saanj.html`, `404.html`: source templates
- `Gurmilan_Singh_2026_CV.pdf`: public résumé
- `dist/`: deployable production build

**Live site:** https://gurmilansingh.com
