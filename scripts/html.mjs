import { parse, serialize } from "parse5";

// These helpers process the site's own templates; they do not sanitize untrusted HTML.
export function removeHtmlComments(source) {
  const document = parse(source);
  function visit(node) {
    if (node.childNodes) {
      node.childNodes = node.childNodes.filter((child) => child.nodeName !== "#comment");
      for (const child of node.childNodes) visit(child);
    }
    if (node.content) visit(node.content); // Inert <template> contents have their own tree.
  }
  visit(document);
  // Preserve text whitespace, including preformatted content and inline scripts.
  return serialize(document).trim();
}

export function countHtmlWords(source) {
  const text = [];
  function visit(node) {
    if (["head", "script", "style", "template"].includes(node.tagName)) return;
    if (node.nodeName === "#text") text.push(node.value);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(source));
  return text.join(" ").trim().split(/\s+/u).filter(Boolean).length;
}
