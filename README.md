# Gurmilan Singh portfolio

A framework-free static portfolio for a full-stack software engineer, with no runtime npm installation. GSAP and Three.js are self-hosted for optional motion and 3D enhancements. It uses semantic HTML, responsive CSS, a small progressive-enhancement script, and build-time configuration. No tracking is included.

## Run locally on Windows

1. Open PowerShell in this folder.
2. Build: `node build.mjs`
3. Validate: `node validate.mjs`
4. Serve the production folder: `npx serve dist -l 4173`
5. Open `http://localhost:4173`

If Python is installed, `python -m http.server 4173 --directory dist` is an optional alternative. Python is not required for the project itself.

The root HTML files are source templates. Essential values are resolved into complete static HTML during the build; production content and navigation do not depend on JavaScript.

## Production deployment

Deploy the contents of `dist/` to any static host. Configure the host to use `404.html` for unknown routes.

## Configuration and key files

- `site.config.mjs`: profile, domain, project status, optional links/media
- `build.mjs`: template resolution, conservative HTML/CSS/JS optimization, SEO generation, static/media copy
- `index.html`, `erp-case-study.html`, `opssemble.html`, `gurmat-saanj.html`, `404.html`: source templates
- `Gurmilan_Singh_2026_CV.pdf`: public résumé
- `dist/`: deployable production build

**Live site:** https://gurmilansingh.com
