/*
 * The command palette's search index, made from what the site publishes and nothing else:
 *   - every project in the explorer, from site.config.mjs (name, category, summary, lead,
 *     focus and its technologies);
 *   - every section of every case study, read from the built page itself (its number, title,
 *     the headings inside it and its text);
 *   - the homepage's own places (Selected work, Also built, Experience, Contact).
 * So a result can only lead to something that exists, under the name it has on the page.
 * build.mjs writes it to dist/assets/search-index.json; assets/palette.js fetches it the first
 * time the palette opens.
 */
import { parse } from "parse5";

const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const classes = (node) => (attr(node, "class") || "").split(/\s+/);
const clean = (value) => value.replace(/\s+/g, " ").replace(/\s+([,.;:!?)])/g, "$1").trim();

function findAll(node, test, found = []) {
  if (test(node)) found.push(node);
  for (const child of node.childNodes || []) findAll(child, test, found);
  if (node.content) findAll(node.content, test, found);
  return found;
}

/* Visible text only: no scripts or data, nothing decorative (aria-hidden), and none of the
   simulations' live view, which repeats their transcript. */
function textOf(node, skip = () => false) {
  if (node.nodeName === "#text") return node.value;
  if (!node.tagName || ["script", "style", "template", "svg", "button", "input", "textarea", "select"].includes(node.tagName)) return "";
  if (attr(node, "aria-hidden") === "true" || attr(node, "hidden") !== undefined || classes(node).includes("sim-live") || skip(node)) return "";
  const inline = ["a", "span", "strong", "em", "code", "kbd", "b", "i", "abbr", "small", "sup", "sub", "mark"].includes(node.tagName);
  const inner = (node.childNodes || []).map((child) => textOf(child, skip)).join("");
  return inline ? inner : ` ${inner} `;
}

const first = (node, test) => findAll(node, test)[0];

function caseSections(html, url, project) {
  const document = parse(html);
  return findAll(document, (node) => node.tagName === "section" && classes(node).includes("case-section") && attr(node, "id")).map((section) => {
    const numberNode = first(section, (node) => classes(node).includes("case-section-no"));
    const heading = first(section, (node) => node.tagName === "h2");
    const [no, label] = clean(textOf(numberNode)).split(" / ");
    const inner = findAll(section, (node) => node.tagName === "h3").map((node) => clean(textOf(node)));
    return {
      type: "section",
      project: project.shortTitle || project.title,
      no,
      title: label,
      heading: clean(textOf(heading)),
      url: `${url}#${attr(section, "id")}`,
      tags: inner.join(" · "),
      text: clean(textOf(section, (node) => node === numberNode || node === heading))
    };
  });
}

function homePlaces(html, featured, also) {
  const document = parse(html);
  const byId = (id) => first(document, (node) => attr(node, "id") === id);
  // The explorer and the register are indexed project by project; as places they carry only
  // their heading and the names of what they hold.
  const places = [
    { id: "work", title: "Selected work", names: featured },
    // The explorer's Universe view (opened by its address): described here, since it is drawn
    // only when opened.
    { id: "work-universe", title: "Project Universe", text: `A 3D map of all ${featured.length + also.length} projects by engineering domain, with the technologies and engineering concerns they share. ${[...featured, ...also].map((project) => project.shortTitle).join(" · ")}` },
    { id: "also-built", title: "Also built", names: also },
    { id: "experience", title: "Experience" },
    { id: "contact", title: "Contact" }
  ];
  return places.map(({ id, title, names, text: given }) => {
    const node = byId(id);
    if (!node) throw new Error(`search index: the homepage has no #${id}`);
    const text = given || (names ? `${textOf(first(node, (child) => ["h2", "h3"].includes(child.tagName)) || { nodeName: "#text", value: "" })} ${names.map((project) => project.title).join(" · ")}` : textOf(node));
    return { type: "place", title, url: `/#${id}`, text: clean(text) };
  });
}

export function buildSearchIndex({ siteConfig, projects, pages, routeOf }) {
  const items = [];
  const home = pages.get("index.html");
  for (const project of projects) {
    const url = project.caseStudy ? routeOf(project.caseStudy) : `/#work-${project.key}`;
    items.push({
      type: "project",
      title: project.title,
      meta: project.category,
      url,
      caseStudy: Boolean(project.caseStudy),
      tags: project.tech,
      text: clean([project.summary, project.lead, project.meta?.focus, project.meta?.context, project.status].filter(Boolean).join(" "))
    });
    if (project.caseStudy) items.push(...caseSections(pages.get(project.caseStudy), url, project));
  }
  items.push(...homePlaces(home, projects.filter((project) => typeof project.order === "number"), projects.filter((project) => typeof project.also === "number")));
  return {
    profile: { name: siteConfig.profile.name, email: siteConfig.profile.email, resume: `/${siteConfig.profile.resume.replace(/^\//, "")}` },
    items
  };
}
