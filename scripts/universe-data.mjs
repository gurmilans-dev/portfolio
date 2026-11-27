/*
 * universe-data.mjs — the data behind Project Universe, built from site.config.mjs.
 *
 * The universe block in the config adds only what the projects do not already say (domain,
 * place in the space, shared concepts, relationships); everything a visitor reads about a project
 * (its name, category, summary, technologies, status, destinations) comes from the project entry
 * itself. build.mjs writes the result into assets/universe.js, which loads only when a visitor
 * opens the Universe view. The checks below fail the build rather than let the map show a
 * project or a relationship the configuration cannot back.
 */
import { esc, githubLink, storeLink, sourceShort, status } from "./components.mjs";

// "Java 21" and "Java 17" are both Java; ".NET 10" is .NET.
const techName = (item) => item.replace(/^(Java|\.NET)\s+\d+$/, "$1").trim();

export function buildUniverseData({ siteConfig, projects, routeOf }) {
  const universe = siteConfig.universe;
  if (!universe) throw new Error("universe: missing from site.config.mjs");
  const domains = new Map(universe.domains.map((domain) => [domain.id, domain]));
  const concepts = universe.concepts;
  const keys = projects.map((project) => project.key);
  const fail = (message) => { throw new Error(`universe: ${message}`); };

  for (const key of Object.keys(universe.projects)) if (!keys.includes(key)) fail(`unknown project "${key}"`);
  const list = projects.map((project) => {
    const place = universe.projects[project.key];
    if (!place) fail(`"${project.key}" has no place in the universe`);
    if (!domains.has(place.domain)) fail(`"${project.key}" has an unknown domain "${place.domain}"`);
    if (!Array.isArray(place.position) || place.position.length !== 3 || !place.position.every(Number.isFinite)) fail(`"${project.key}" needs a position [x, y, z]`);
    for (const concept of place.concepts) if (!concepts[concept]) fail(`"${project.key}" has an unknown concept "${concept}"`);
    const conceptNames = place.concepts.map((id) => concepts[id].toLowerCase());
    // Technologies from the project's own list, then the further ones its repository shows in use
    // (`extraTech`); an entry that is one of its concepts is shown once, and none twice.
    const extra = project.extraTech ?? [];
    if (!Array.isArray(extra) || extra.some((item) => typeof item !== "string" || !item.trim() || item.includes(" · "))) fail(`"${project.key}" needs extraTech as a list of technology names`);
    const tech = [...new Set([...project.tech.split(" · "), ...extra].map(techName))].filter((item) => item && !conceptNames.includes(item.toLowerCase()));
    if (tech.length !== new Set(tech.map((item) => item.toLowerCase())).size) fail(`"${project.key}" lists a technology twice`);
    const caseStudy = project.caseStudy ? routeOf(project.caseStudy) : "";
    // The same destinations, in the same order and markup, as the project's file in the explorer.
    const links = [
      caseStudy ? `<a class="btn btn-primary" href="${esc(caseStudy)}">Full case study<span class="sr-only">: ${esc(project.shortTitle)}</span><span aria-hidden="true">→</span></a>` : "",
      storeLink(project),
      githubLink(project)
    ].join("");
    return {
      key: project.key,
      name: project.shortTitle,
      featured: typeof project.order === "number",
      category: project.category,
      summary: project.summary || project.lead,
      status: status(project),
      source: sourceShort(project),
      domain: place.domain,
      position: place.position,
      tech,
      concepts: place.concepts,
      links
    };
  });

  const seen = new Set();
  const connections = universe.connections.map(([a, b, label, detail]) => {
    if (!keys.includes(a) || !keys.includes(b) || a === b) fail(`connection ${a}–${b} must join two different projects`);
    const pair = [a, b].sort().join("|");
    if (seen.has(pair)) fail(`connection ${a}–${b} is listed twice`);
    seen.add(pair);
    if (!label || !detail || !/[.!?]$/.test(detail)) fail(`connection ${a}–${b} needs a label and a one-sentence explanation`);
    return { a, b, label, detail };
  });
  for (const key of keys) if (!connections.some((link) => link.a === key || link.b === key)) fail(`"${key}" has no relationship`);

  return { domains: universe.domains, concepts, projects: list, connections };
}
