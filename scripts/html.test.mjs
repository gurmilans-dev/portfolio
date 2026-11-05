import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "parse5";
import { countHtmlWords, removeHtmlComments } from "./html.mjs";

test("word counts exclude scripts and styles with browser-accepted end tags", () => {
  const html = '<p>One two</p><SCRIPT>not visible words</script ignored="yes"><style>not visible either</style ignored="yes"><p>three</p>';
  assert.equal(countHtmlWords(html), 3);
});

test("word counts keep similarly named elements and decode text entities", () => {
  const html = '<scripture>One&nbsp;two</scripture><style-guide>three&#32;four</style-guide>';
  assert.equal(countHtmlWords(html), 4);
});

test("word counts exclude comments, document metadata and inert templates", () => {
  const html = '<title>Page title</title><p>One two</p><!-- hidden words --!><template>inert words</template>';
  assert.equal(countHtmlWords(html), 2);
  assert.equal(countHtmlWords('<script>hidden</script>'), 0);
});

test("comment removal handles alternate endings and template contents", () => {
  const html = '<!-- first --!><p>Visible</p><template><!-- second --><span>Inert</span></template>';
  const document = parse(removeHtmlComments(html));
  function check(node) {
    assert.notEqual(node.nodeName, "#comment");
    for (const child of node.childNodes || []) check(child);
    if (node.content) check(node.content);
  }
  check(document);
  assert.equal(countHtmlWords(removeHtmlComments(html)), 1);
});

test("removing a comment cannot join surrounding text into an executable tag", () => {
  const document = parse(removeHtmlComments('<<!-- gap -->script>alert(1)</script>'));
  function check(node) {
    assert.notEqual(node.tagName, "script");
    for (const child of node.childNodes || []) check(child);
  }
  check(document);
});

test("comment removal preserves raw script text and preformatted whitespace", () => {
  const script = 'const marker = "<!-- keep -->"; const tags = ">   <";';
  const html = `<script>${script}</script><pre>  first\n    second  </pre><textarea>  third\n fourth </textarea>`;
  const result = removeHtmlComments(html);
  assert.ok(result.includes(`<script>${script}</script>`));
  assert.ok(result.includes('<pre>  first\n    second  </pre>'));
  assert.ok(result.includes('<textarea>  third\n fourth </textarea>'));
});
