/*
 * Browser regression tests: the built site (dist/), served the way production serves it,
 * driven in headless Chrome with real input events. They cover behaviour the static
 * validator cannot see, starting with every defect found in review:
 *   - the small-screen menu when script.js fails to load, and without JavaScript;
 *   - focus after closing a quick look that moved to another system;
 *   - malformed #work- links;
 *   - the selected system's summary and case-study link on narrow screens;
 *   - stage controls on short desktop windows;
 * plus themes, internal links, the contact form (with intercepted requests, so nothing is
 * ever sent) and the 404 page at a nested path.
 *
 * Run `npm run build` first, then `npm run test:browser`. Set CHROME_PATH if Chrome,
 * Chromium or Edge is not in its usual place.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { launchBrowser } from "./cdp.mjs";
import { startServer } from "./serve.mjs";

const DIST = new URL("../dist/", import.meta.url);
let browser;
let server;
let base;

before(async () => {
  if (!existsSync(new URL("index.html", DIST))) throw new Error("dist/ is missing: run `npm run build` before the browser tests.");
  server = await startServer({ port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

/* Expressions evaluated in the page. */
const visible = (selector) => `(() => {
  const el = typeof ${JSON.stringify(selector)} === "string" ? document.querySelector(${JSON.stringify(selector)}) : null;
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > .05;
})()`;
const rect = (selector) => `(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height } : null; })()`;
const headerBottom = `document.querySelector("[data-header]").getBoundingClientRect().bottom`;
const focused = (selector) => `document.activeElement === document.querySelector(${JSON.stringify(selector)})`;

async function withPage(options, run) {
  const page = await browser.newPage(options);
  try { return await run(page); } finally { await page.close(); }
}

const PAGES = ["/", "/erp-case-study", "/flowbank-one", "/procbeacon", "/maintops", "/gurmat-saanj", "/opssemble", "/alfaaz"];

test("every page loads without script errors or horizontal overflow, in both themes", async () => {
  for (const scheme of ["dark", "light"]) {
    for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
      await withPage({ width, height, mobile, scheme }, async (page) => {
        for (const url of PAGES) {
          await page.goto(base + url);
          assert.equal(await page.evaluate("document.documentElement.dataset.theme"), scheme, `${url} follows the system ${scheme} theme`);
          const overflow = await page.evaluate("document.documentElement.scrollWidth - innerWidth");
          assert.ok(overflow <= 0, `${url} at ${width}px overflows horizontally by ${overflow}px`);
        }
        assert.deepEqual(page.errors(), [], `errors at ${width}px, ${scheme}`);
      });
    }
  }
});

test("small-screen menu: opens, keeps focus inside, closes with Escape", async () => {
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.documentElement.classList.contains("nav-ready")`);
    assert.ok(await page.evaluate(visible("[data-menu-toggle]")), "the menu button shows");
    assert.ok(!(await page.evaluate(visible("#site-navigation > a"))), "the links wait in the closed sheet");
    await page.tap("[data-menu-toggle]", { scroll: false });
    await page.waitFor(`document.querySelector("[data-nav]").classList.contains("is-open")`);
    await page.waitFor(visible("#site-navigation > a"));
    assert.ok(await page.evaluate(focused("#site-navigation > a")), "focus moves to the first link");
    for (let i = 0; i < 8; i++) {
      await page.key("Tab");
      assert.ok(await page.evaluate(`document.querySelector("[data-nav]").contains(document.activeElement) || document.activeElement.matches("[data-menu-toggle]")`), "Tab stays in the menu");
    }
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-nav]").classList.contains("is-open")`);
    assert.ok(await page.evaluate(focused("[data-menu-toggle]")), "focus returns to the menu button");
    assert.deepEqual(page.errors(), []);
  });
});

test("small-screen menu: the links stay reachable when script.js fails to load", async () => {
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.intercept(/\/assets\/script\.js$/, () => ({ fail: "BlockedByClient" }));
    await page.goto(`${base}/`);
    assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("nav-pending") || document.documentElement.classList.contains("nav-ready")`)), "the pending state is dropped");
    assert.ok(!(await page.evaluate(visible("[data-menu-toggle]"))), "no menu button that cannot open anything");
    for (const label of ["Work", "Experience", "Contact"]) {
      assert.ok(await page.evaluate(`[...document.querySelectorAll("#site-navigation > a")].some((a) => a.textContent.trim() === ${JSON.stringify(label)} && a.getBoundingClientRect().width > 0 && getComputedStyle(a).visibility === "visible" && a.getBoundingClientRect().right <= innerWidth)`), `${label} is visible`);
    }
  });
});

test("small-screen menu: plain links without JavaScript", async () => {
  await withPage({ width: 390, height: 844, mobile: true, javaScript: false }, async (page) => {
    await page.goto(`${base}/`);
    assert.ok(!(await page.evaluate(visible("[data-menu-toggle]"))));
    assert.ok(await page.evaluate(`[...document.querySelectorAll("#site-navigation > a")].filter((a) => a.getBoundingClientRect().width > 0 && getComputedStyle(a).visibility === "visible").length >= 4`));
  });
});

test("quick look: focus returns to the control that opened it", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click("#work-erp [data-open-file]");
    await page.waitFor(`document.querySelector("[data-drawer]").open && document.querySelector("[data-drawer]").contains(document.activeElement)`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("#work-erp [data-open-file]"), { message: "focus did not return to the Quick look button" });
  });
});

test("quick look: after moving to another system, focus lands on that system's tab", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click("#work-erp [data-open-file]");
    await page.waitFor(`document.querySelector("[data-drawer]").open`);
    await page.key("ArrowRight");
    await page.waitFor(`document.querySelector("[data-drawer-body] #work-flowbank") !== null`);
    // The control that opened the drawer now sits in a hidden panel.
    assert.ok(!(await page.evaluate(visible("#work-erp [data-open-file]"))));
    // Focus never reaches the page behind the open drawer.
    for (let i = 0; i < 12; i++) {
      await page.key("Tab");
      assert.ok(await page.evaluate(`document.activeElement === document.body || document.querySelector("[data-drawer]").contains(document.activeElement)`), "focus escaped the drawer");
    }
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("#tab-flowbank"), { message: "focus should land on the FlowBank One tab" });
    assert.ok(await page.evaluate(visible("#tab-flowbank")));
    assert.equal(await page.evaluate(`document.getElementById("tab-flowbank").getAttribute("aria-selected")`), "true");
  });
});

test("quick look from Also built: focus returns to the row's Quick look, still visible after moving on", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click(`[data-wb-also="esamarea"]`);
    await page.waitFor(`document.querySelector("[data-drawer-body] #work-esamarea") !== null`);
    await page.key("ArrowRight");
    await page.waitFor(`document.querySelector("[data-drawer-body] #work-azlune") !== null`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused(`[data-wb-also="esamarea"]`), { message: "focus should return to Esamarea's Quick look, which opened the drawer" });
  });
});

test("quick look opened by a link: closing it focuses the row of the system shown", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/#work-azlune`);
    await page.waitFor(`document.querySelector("[data-drawer]").open`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused(`[data-wb-also="azlune"]`), { message: "focus should land on Azlune's Quick look, not the page body" });
    // The page scrolls smoothly to the focused control.
    await page.waitFor(`(() => { const r = document.querySelector('[data-wb-also="azlune"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`, { message: "the focused control is not scrolled into view" });
  });
});

test("project links: valid, unknown and malformed #work- fragments", async () => {
  const cases = [
    ["#work-flowbank", { selected: "flowbank", drawer: null }],
    ["#work-esamarea", { selected: "erp", drawer: "esamarea" }],
    ["#work-not-a-project", { selected: "erp", drawer: null }],
    ["#work-%", { selected: "erp", drawer: null }],
    ["#work-%E0%A4%A", { selected: "erp", drawer: null }]
  ];
  for (const [hash, expected] of cases) {
    await withPage({ width: 1440, height: 900 }, async (page) => {
      await page.goto(`${base}/${hash}`);
      await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`, { message: `${hash}: the workbench did not start` });
      assert.deepEqual(page.errors(), [], `${hash} throws`);
      assert.equal(await page.evaluate(`document.querySelector('[role="tab"][aria-selected="true"]').dataset.wbTab`), expected.selected, `${hash}: selected system`);
      const open = await page.evaluate(`document.querySelector("[data-drawer]").open ? document.querySelector("[data-drawer-body] [data-system]")?.dataset.system : null`);
      assert.equal(open, expected.drawer, `${hash}: quick look`);
    });
  }
});

test("narrow screens: the chosen system's summary and case study link follow the choice", async () => {
  for (const [width, height, checkAction] of [[390, 844, true], [375, 667, true], [320, 568, false]]) {
    await withPage({ width, height, mobile: true }, async (page) => {
      await page.goto(`${base}/`);
      await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
      await page.evaluate(`document.getElementById("tab-procbeacon").scrollIntoView({ block: "start", behavior: "instant" })`);
      await page.tap("#tab-procbeacon", { scroll: false });
      await page.waitFor(`document.getElementById("tab-procbeacon").getAttribute("aria-selected") === "true"`);
      const limit = await page.evaluate("innerHeight");
      const title = await page.evaluate(rect("#work-procbeacon .sf-title"));
      assert.ok(title.bottom <= limit, `${width}×${height}: the title is ${Math.round(title.bottom - limit)}px below the screen`);
      if (checkAction) {
        const action = await page.evaluate(rect(`#work-procbeacon .sf-actions a[href="/procbeacon"]`));
        assert.ok(action && action.bottom <= limit, `${width}×${height}: the case study link is below the screen`);
        assert.ok(await page.evaluate(visible("#work-procbeacon [data-open-file]")), "the quick look shows");
      }
      // The stack comes after what was chosen, never between.
      assert.ok(await page.evaluate(`document.querySelector("[data-wb-stage]").getBoundingClientRect().top > document.getElementById("work-procbeacon").getBoundingClientRect().top`));
    });
  }
});

test("short windows: the stage controls can be brought fully into view", async () => {
  for (const [width, height] of [[1920, 540], [1280, 600], [1024, 600], [1440, 500], [1366, 768], [2560, 1440]]) {
    await withPage({ width, height }, async (page) => {
      await page.goto(`${base}/`);
      await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
      await page.evaluate(`(() => { const stage = document.querySelector("[data-wb-stage]"); scrollTo(0, stage.getBoundingClientRect().top + scrollY - ${headerBottom}); })()`);
      let fits = async () => {
        const controls = await page.evaluate(rect("[data-stage-controls]"));
        const top = await page.evaluate(headerBottom);
        return controls.top >= top - 1 && controls.bottom <= height + 1;
      };
      if (!(await fits())) {
        await page.evaluate(`document.querySelector("[data-stage-controls]").scrollIntoView({ block: "end", behavior: "instant" })`);
      }
      assert.ok(await fits(), `${width}×${height}: the stage controls cannot be fully shown`);
    });
  }
});

test("stage: Explode parts the floors further than the pointer over the stage does, and back", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/#work`);
    await page.waitFor(`document.documentElement.classList.contains("workbench-ready")`);
    const top = `document.querySelector('[data-stage-scene] .plane[data-plane="0"]').getBoundingClientRect().top`;
    // Until the floors have finished moving (their own transitions, not the stack's drift).
    const settled = () => page.waitFor(`document.querySelector("[data-stack]").getAnimations({ subtree: true }).every((animation) => !(animation instanceof CSSTransition) || animation.playState !== "running")`, { timeout: 4000 });
    // The button is only ever pressed with the pointer over the stage, which parts the floors a little.
    const { x, y } = await page.point("[data-explode]", { scroll: false });
    await page.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await page.evaluate(drawFrames);
    await settled();
    const hovered = await page.evaluate(top);
    await page.click("[data-explode]", { scroll: false });
    await page.evaluate(drawFrames);
    await settled();
    const exploded = await page.evaluate(top);
    assert.ok(hovered - exploded > 20, `pressing Explode lifts the top floor further: ${hovered.toFixed(1)}px -> ${exploded.toFixed(1)}px`);
    await page.click("[data-explode]", { scroll: false });
    await page.evaluate(drawFrames);
    await settled();
    assert.ok(Math.abs((await page.evaluate(top)) - hovered) < 1, "and pressing it again brings the floors back");
    assert.deepEqual(page.errors(), []);
  });
});

test("stage: Reset view restores the angle and closes the exploded stack", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click("[data-explode]");
    assert.equal(await page.evaluate(`document.querySelector("[data-explode]").getAttribute("aria-pressed")`), "true");
    // The stage where it is used: settled under the header (above that, on wide screens, the
    // hero's drawing is still turning into it, and the stage takes no input).
    await page.evaluate(`(() => { const stage = document.querySelector("[data-wb-stage]"); scrollTo({ top: stage.getBoundingClientRect().top + scrollY - ${headerBottom} + 1, behavior: "instant" }); })()`);
    const { x, y } = await page.point("[data-stage-scene]", { scroll: false });
    await page.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 6; step++) await page.call("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + step * 25, y: y + step * 6, button: "left", buttons: 1 });
    await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + 150, y: y + 36, button: "left", clickCount: 1 });
    assert.notEqual(await page.evaluate(`document.querySelector("[data-stack]").style.getPropertyValue("--rz")`), "-45.0deg", "dragging turns the stack");
    await page.click("[data-reset-view]");
    assert.equal(await page.evaluate(`document.querySelector("[data-stack]").style.getPropertyValue("--rz")`), "-45.0deg");
    assert.equal(await page.evaluate(`document.querySelector("[data-stack]").style.getPropertyValue("--rx")`), "58.0deg");
    assert.equal(await page.evaluate(`document.querySelector("[data-explode]").getAttribute("aria-pressed")`), "false");
    assert.ok(!(await page.evaluate(`document.querySelector("[data-stack]").classList.contains("is-exploded")`)));
  });
});

test("themes: a choice is applied, stored, and kept across pages and reloads", async () => {
  await withPage({ width: 1440, height: 900, scheme: "dark" }, async (page) => {
    await page.goto(`${base}/`);
    await page.click(`[data-theme-choice="light"]`, { scroll: false });
    await page.waitFor(`document.documentElement.dataset.theme === "light"`);
    assert.equal(await page.evaluate(`localStorage.getItem("portfolio-theme")`), "light");
    assert.equal(await page.evaluate(`document.querySelector('[data-theme-choice="light"]').getAttribute("aria-pressed")`), "true");
    await page.goto(`${base}/flowbank-one`);
    assert.equal(await page.evaluate("document.documentElement.dataset.theme"), "light");
    assert.equal(await page.evaluate(`document.querySelector('meta[name="theme-color"]').content`), "#f4f4f1");
    await page.click(`[data-theme-choice="dark"]`, { scroll: false });
    await page.waitFor(`document.documentElement.dataset.theme === "dark"`);
    await page.goto(`${base}/`);
    assert.equal(await page.evaluate("document.documentElement.dataset.theme"), "dark");
  });
});

test("internal links and assets resolve directly, without redirects", async () => {
  const urls = new Set();
  await withPage({ width: 1440, height: 900 }, async (page) => {
    for (const url of PAGES) {
      await page.goto(base + url, { settle: 100 });
      const found = await page.evaluate(`[...document.querySelectorAll('a[href^="/"], link[href^="/"], script[src^="/"], img[src^="/"], source[srcset^="/"]')].map((el) => (el.getAttribute("href") ?? el.getAttribute("src") ?? el.getAttribute("srcset")).split("#")[0]).filter(Boolean)`);
      found.forEach((href) => urls.add(href));
    }
    // A case study link, followed the way a visitor would.
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click(`#work-erp .sf-actions a[href="/erp-case-study"]`);
    await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete" && document.querySelector("h1") !== null`, { timeout: 8000 });
  });
  const failures = [];
  for (const url of urls) {
    const response = await fetch(base + url, { redirect: "manual" });
    if (response.status !== 200) failures.push(`${url} → ${response.status}`);
  }
  assert.deepEqual(failures, [], "internal URLs that do not answer 200");
  assert.ok(urls.size > 40, "the crawl found the site's links");
});

test("contact form: validation, a failed send with its fallback, then a sent message", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    const sent = [];
    let reply = { status: 500, body: "{}" };
    await page.intercept(/formspree\.io/, (request) => { sent.push(request.method); return reply; });
    await page.goto(`${base}/#contact`);
    await page.click("[data-contact-submit]");
    await page.waitFor(`document.querySelectorAll(".field-error:not([hidden])").length === 3`);
    assert.ok(await page.evaluate(focused("#contact-name")), "focus goes to the first invalid field");
    assert.equal(await page.evaluate(`document.querySelectorAll('[aria-invalid="true"]').length`), 3);
    assert.equal(sent.length, 0, "nothing is sent while fields are invalid");

    await page.click("#contact-name"); await page.type("Test Visitor");
    await page.click("#contact-email"); await page.type("visitor@example.com");
    await page.click("#contact-message"); await page.type("A test message, sent only to an intercepted endpoint.");
    await page.click("[data-contact-submit]");
    await page.waitFor(`document.querySelector("[data-contact-form]").dataset.contactState === "error"`);
    assert.ok(await page.evaluate(visible("[data-contact-mailfallback]")), "the email draft fallback appears");
    assert.equal(await page.evaluate(`document.getElementById("contact-message").value.length > 20`), true, "the message is kept");

    reply = { status: 200, body: JSON.stringify({ ok: true }) };
    await page.click("[data-contact-submit]");
    await page.waitFor(`document.querySelector("[data-contact-form]").dataset.contactState === "received"`);
    assert.equal(await page.evaluate(`document.getElementById("contact-message").value`), "", "the form is cleared after sending");
    assert.deepEqual(sent, ["POST", "POST"], "exactly the two submissions were intercepted");
  });
});

test("404: served at a nested path with its styles and working links", async () => {
  const response = await fetch(`${base}/an/old/deep/link`);
  assert.equal(response.status, 404);
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.goto(`${base}/an/old/deep/link`);
    assert.ok(await page.evaluate(`getComputedStyle(document.body).fontFamily.includes("Instrument Sans")`), "the stylesheet loads at a nested path");
    assert.ok(await page.evaluate(`document.querySelector('.not-found a[href="/#work"]') !== null`));
  });
  const redirect = await fetch(`${base}/flowbank-one.html`, { redirect: "manual" });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), "/flowbank-one");
  const sitemap = readFileSync(new URL("sitemap.xml", DIST), "utf8");
  assert.ok(!/\.html</.test(sitemap), "the sitemap lists clean URLs");
});

test("a preview server without clean URLs still reaches every case study", async () => {
  const plain = await startServer({ port: 0, cleanUrls: false });
  const origin = `http://127.0.0.1:${plain.address().port}`;
  try {
    await withPage({ width: 1440, height: 900 }, async (page) => {
      await page.goto(`${origin}/flowbank-one`);
      await page.waitFor(`location.pathname === "/flowbank-one.html" && document.readyState === "complete" && document.getElementById("case-title") !== null`, { timeout: 8000, message: "the 404 page did not forward to the case study" });
      // A genuine 404 stays a 404.
      await page.goto(`${origin}/no-such-page`, { settle: 600 });
      assert.equal(await page.evaluate("location.pathname"), "/no-such-page");
      assert.ok(await page.evaluate(`document.getElementById("not-found-title") !== null`));
    });
  } finally {
    await new Promise((resolve) => plain.close(resolve));
  }
});

test("Also built folds to one line, remembers it, and unfolds for links and quick looks", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(visible("[data-ab-toggle]"));
    assert.ok(await page.evaluate(visible("#also-built-list")), "open by default");
    await page.click("[data-ab-toggle]");
    assert.equal(await page.evaluate(`document.querySelector("[data-ab-toggle]").getAttribute("aria-expanded")`), "false");
    assert.ok(!(await page.evaluate(visible("#also-built-list"))), "the list folds");
    assert.ok(await page.evaluate(`document.querySelector("[data-ab-names]").textContent.includes("ToneQuill")`), "folded, it still names the entries");
    // Kept across a reload.
    await page.goto(`${base}/`);
    assert.ok(!(await page.evaluate(visible("#also-built-list"))), "the folded state is remembered");
  });
  // A quick look of an entry from a link (a new tab, so the folded state carries over):
  // closing it focuses the toggle, not a hidden row.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/#work-tonequill`);
    await page.waitFor(`document.querySelector("[data-drawer]").open`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("[data-ab-toggle]"), { message: "focus should land on the register toggle while it is folded" });
    // The page takes input again once the closing transition (where there is one) has ended.
    await page.waitFor(`!document.documentElement.classList.contains("vt-quick-look")`);
    // The pointer from the explorer unfolds it.
    await page.click(".wb-also-cue");
    await page.waitFor(visible("#also-built-list"), { message: "the Also built cue should unfold the register" });
    assert.equal(await page.evaluate(`localStorage.getItem("portfolio-also-built")`), "open");
  });
});

/* ---------- Page transitions (cross-document view transitions) and the contact response ---------- */

const ready = `document.querySelector("[data-workbench]")?.classList.contains("wb-ready")`;
// Every rendered element's view-transition-name, so duplicates (which cancel a transition) show up.
const transitionNames = `[...document.querySelectorAll("*")].filter((el) => el.getClientRects().length).map((el) => getComputedStyle(el).viewTransitionName).filter((name) => name && name !== "none")`;

/* How each page arrived: through a transition, or as a plain load. A navigation that should
   transition and does not is a failure, with no second attempt: the one intermittent cause seen
   (Chromium reading the arriving page before its stylesheet, and so without its opt-in) is fixed
   by the head script's place right after the stylesheet, which validate.mjs enforces. */
const recordTransitions = `addEventListener("pagereveal", (event) => { window.__revealed = event.viewTransition ? "transition" : "plain"; }, true);`;
async function throughTransition(page, attempt) {
  assert.ok(await attempt(), "the navigation should arrive through a view transition");
}

test("transition names are unique on every page, and name the right things", async () => {
  for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
    await withPage({ width, height, mobile }, async (page) => {
      for (const url of PAGES) {
        await page.goto(base + url, { settle: 200 });
        if (url === "/") await page.waitFor(ready);
        const names = await page.evaluate(transitionNames);
        assert.equal(new Set(names).size, names.length, `${url} at ${width}px has duplicate names: ${names}`);
      }
      await page.goto(`${base}/`);
      await page.waitFor(ready);
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector("#work-erp .sf-title")).viewTransitionName`), "vt-title-erp", "the panel's title is named");
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector("#work-flowbank .sf-title")).viewTransitionName`), "none", "a hidden panel is not");
      // With a quick look open, its title and screenshot carry the names, and still only once.
      await page.click("#work-erp [data-open-file]");
      await page.waitFor(`document.querySelector("[data-drawer]").open && !document.documentElement.classList.contains("vt-quick-look")`);
      const open = await page.evaluate(transitionNames);
      assert.equal(new Set(open).size, open.length, `duplicates with the quick look open: ${open}`);
      await page.goto(`${base}/flowbank-one`);
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".case-index")).viewTransitionName`), "vt-title-flowbank");
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.case-proof [data-vt="shot"]')).viewTransitionName`), "vt-shot-flowbank");
    });
  }
});

test("explorer to case study and back: a transition each way, history and selection intact", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript(recordTransitions);
    await throughTransition(page, async () => {
      await page.goto(`${base}/`);
      await page.waitFor(ready);
      await page.click("#tab-flowbank");
      await page.click(`#work-flowbank .sf-actions a[href="/flowbank-one"]`);
      await page.waitFor(`location.pathname === "/flowbank-one" && document.readyState === "complete"`, { timeout: 8000 });
      return page.evaluate(`document.documentElement.classList.contains("vt-arrive")`);
    });
    await page.waitFor(`getComputedStyle(document.querySelector(".case-index")).opacity === "1"`);
    // Back: the explorer, still on FlowBank One.
    await page.evaluate("history.back()");
    await page.waitFor(`location.pathname === "/" && document.readyState === "complete"`, { timeout: 8000 });
    await page.waitFor(`document.getElementById("tab-flowbank")?.getAttribute("aria-selected") === "true"`, { message: "the explorer should still show FlowBank One" });
    // Forward: the case study again.
    await page.evaluate("history.forward()");
    await page.waitFor(`location.pathname === "/flowbank-one" && document.readyState === "complete"`, { timeout: 8000 });
    assert.ok(await page.evaluate(`document.getElementById("case-title") !== null`));
    assert.deepEqual(page.errors(), []);
  });
});

test("case study pager: Next and Previous transition in their direction, and the explorer link returns to the same system", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript(recordTransitions);
    // One step through the pager, slowed so the transition's type can be read while it runs.
    const step = (from, control, to, type) => throughTransition(page, async () => {
      if (await page.evaluate("location.pathname") !== from) await page.goto(base + from);
      await page.animationRate(0.1);
      await page.click(control);
      await page.waitFor(`location.pathname === "${to}" && window.__revealed`, { timeout: 8000 });
      const typed = await page.evaluate(`window.__revealed === "transition" && document.documentElement.matches(":active-view-transition-type(${type})")`);
      await page.animationRate(1);
      await page.waitFor(`!document.documentElement.matches(":active-view-transition")`, { timeout: 4000 });
      if (await page.evaluate(`window.__revealed === "transition"`)) assert.ok(typed, `${control} should transition as ${type}`);
      return typed;
    });
    await page.goto(`${base}/flowbank-one`);
    await step("/flowbank-one", ".pager-next", "/procbeacon", "next");
    await step("/procbeacon", ".pager-prev", "/flowbank-one", "prev");
    // "Back to the explorer" lands on FlowBank One, at the explorer.
    await page.click(".pager-home");
    await page.waitFor(`location.pathname === "/" && ${ready}`, { timeout: 8000 });
    await page.waitFor(`document.getElementById("tab-flowbank").getAttribute("aria-selected") === "true"`, { message: "the explorer should open on FlowBank One" });
    assert.equal(await page.evaluate("location.hash"), "#work");
    assert.deepEqual(page.errors(), []);
  });
});

test("reduced motion: ordinary page loads and an ordinary quick look", async () => {
  await withPage({ width: 1440, height: 900, reducedMotion: true }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    await page.evaluate(`window.__vtSeen = false; new MutationObserver(() => { if (document.documentElement.classList.contains("vt-quick-look")) window.__vtSeen = true; }).observe(document.documentElement, { attributes: true }); 1`);
    await page.click("#work-erp [data-open-file]");
    await page.waitFor(`document.querySelector("[data-drawer]").open`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("#work-erp [data-open-file]"));
    assert.equal(await page.evaluate("window.__vtSeen"), false, "no view transition for the quick look");
    await page.click(`#work-erp .sf-actions a[href="/erp-case-study"]`);
    await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete"`, { timeout: 8000 });
    assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("vt-arrive")`)), "no cross-document transition");
  });
});

test("without the View Transitions API: the quick look works as before, focus included", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript(`delete Document.prototype.startViewTransition;`);
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    assert.equal(await page.evaluate(`typeof document.startViewTransition`), "undefined");
    await page.evaluate(`document.querySelector("#work-erp [data-open-file]").focus()`);
    await page.key("Enter");
    await page.waitFor(`document.querySelector("[data-drawer]").open && document.querySelector("[data-drawer]").contains(document.activeElement)`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("#work-erp [data-open-file]"));
    assert.deepEqual(page.errors(), []);
  });
});

test("keyboard and touch through the transitions", async () => {
  // Keyboard: a quick look opened with Enter keeps focus inside, and gives it back on Escape.
  await withPage({ width: 1024, height: 768 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    await page.evaluate(`document.querySelector("#work-erp [data-open-file]").focus()`);
    await page.key("Enter");
    await page.waitFor(`document.querySelector("[data-drawer]").open && document.querySelector("[data-drawer]").contains(document.activeElement)`);
    await page.waitFor(`!document.documentElement.classList.contains("vt-quick-look")`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open && !document.documentElement.classList.contains("vt-quick-look")`);
    await page.waitFor(focused("#work-erp [data-open-file]"));
    // Following a link with the keyboard moves to the next page as usual.
    await page.evaluate(`document.querySelector('#work-erp .sf-actions a[href="/erp-case-study"]').focus()`);
    await page.key("Enter");
    await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete"`, { timeout: 8000 });
  });
  // Touch: tap a system, tap its quick look and close it, then tap its case study.
  for (const [width, height] of [[390, 844], [600, 960], [834, 1112]]) {
    await withPage({ width, height, mobile: true }, async (page) => {
      await page.goto(`${base}/`);
      await page.waitFor(ready);
      await page.tap("#tab-maintops");
      await page.tap("#work-maintops [data-open-file]");
      await page.waitFor(`document.querySelector("[data-drawer]").open && !document.documentElement.classList.contains("vt-quick-look")`, { message: `${width}px: the quick look did not open` });
      await page.tap("[data-drawer-close]", { scroll: false });
      await page.waitFor(`!document.querySelector("[data-drawer]").open && !document.documentElement.classList.contains("vt-quick-look")`);
      await page.tap(`#work-maintops .sf-actions a[href="/maintops"]`);
      await page.waitFor(`location.pathname === "/maintops" && document.readyState === "complete"`, { timeout: 8000, message: `${width}px: the case study link did not navigate` });
      assert.deepEqual(page.errors(), [], `${width}px`);
    });
  }
});

test("no layout shift when a case study arrives through a transition", async () => {
  for (const [width, height, mobile] of [[390, 844, true], [768, 1024, true], [1440, 900, false]]) {
    await withPage({ width, height, mobile }, async (page) => {
      await page.goto(`${base}/`);
      await page.waitFor(ready);
      await page.evaluate(`document.querySelector('#work-erp .sf-actions a[href="/erp-case-study"]').click()`);
      await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete"`, { timeout: 8000 });
      await new Promise((resolve) => setTimeout(resolve, 900));
      const shift = await page.evaluate(`new Promise((resolve) => { let total = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => resolve(total), 50); })`);
      assert.ok(shift < 0.02, `${width}px: cumulative layout shift ${shift.toFixed(4)}`);
    });
  }
});

test("contact response: the trace follows the real request, and only a confirmed send reaches Received", async () => {
  for (const scheme of ["dark", "light"]) {
    await withPage({ width: 390, height: 844, mobile: true, scheme }, async (page) => {
      let reply = { status: 503, body: "{}" };
      await page.intercept(/formspree\.io/, () => reply);
      await page.goto(`${base}/#contact`);
      const state = `document.querySelector("[data-contact-form]").dataset`;
      // Fields are filled by focusing them and typing; the taps under test are on Send.
      const fill = async (selector, text) => { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await page.type(text); };
      const where = async () => page.evaluate(`JSON.stringify({ state: ${state}.contactState, failure: ${state}.contactFailure, status: document.querySelector("[data-contact-status-text]").textContent })`);
      assert.ok(await page.evaluate(visible("[data-contact-trace]")), "the trace shows with the endpoint configured");
      assert.equal(await page.evaluate(`document.querySelector("[data-contact-trace]").getAttribute("aria-hidden")`), "true", "the status line, not the trace, is what is announced");
      // Fields: stops at Check.
      await page.tap("[data-contact-submit]");
      await page.waitFor(`${state}.contactState === "error" && ${state}.contactFailure === "check"`);
      await fill("#contact-name", "Test Visitor");
      await fill("#contact-email", "visitor@example.com");
      await fill("#contact-message", "A test message, sent only to an intercepted endpoint.");
      // While the request is out: Sending, never Received.
      reply = { status: 200, body: JSON.stringify({ ok: true }), delay: 1500 };
      await page.tap("[data-contact-submit]");
      await page.waitFor(`${state}.contactState === "sending"`, { message: `never saw sending: ${await where()}` }).catch(async (error) => { throw new Error(`${error.message} / now ${await where()}`); });
      await new Promise((resolve) => setTimeout(resolve, 700));
      assert.equal(await page.evaluate(`${state}.contactState`), "sending", "still sending while the service has not answered");
      await page.waitFor(`${state}.contactState === "received"`, { timeout: 4000 });
      assert.match(await page.evaluate(`document.querySelector("[data-contact-status-text]").textContent`), /Message sent/);
      // A failed send stops at Send, offers the email draft, and keeps the message.
      await fill("#contact-name", "Test Visitor");
      assert.equal(await page.evaluate(`${state}.contactState`), "ready", "typing a new message starts the trace again");
      await fill("#contact-email", "visitor@example.com");
      await fill("#contact-message", "A second message, answered with a server error.");
      reply = { status: 503, body: "{}" };
      await page.tap("[data-contact-submit]");
      await page.waitFor(`${state}.contactState === "error" && ${state}.contactFailure === "send"`);
      assert.ok(await page.evaluate(visible("[data-contact-mailfallback]")));
      assert.ok(await page.evaluate(`document.getElementById("contact-message").value.length > 20`));
      // The browser logs the intercepted 503 itself; anything else would be a real error.
      assert.deepEqual(page.errors().filter((error) => !/formspree.io/.test(error)), []);
    });
  }
  // Reduced motion: no travelling packet, the same states.
  await withPage({ width: 1440, height: 900, reducedMotion: true }, async (page) => {
    await page.goto(`${base}/#contact`);
    assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".ft-packet")).display`), "none");
  });
  // Without JavaScript the trace stays hidden and the form posts as a plain form.
  await withPage({ width: 1440, height: 900, javaScript: false }, async (page) => {
    await page.goto(`${base}/#contact`);
    assert.ok(!(await page.evaluate(visible("[data-contact-trace]"))));
    assert.match(await page.evaluate(`document.querySelector("[data-contact-form]").getAttribute("action")`), /^https:\/\/formspree\.io\//);
  });
});

/* ---------- Reliability: first paint, and input during transitions ---------- */

// Layout shift across a page load, under a slow network and a slower CPU.
async function loadShift(page, url) {
  await page.call("Network.enable");
  await page.call("Network.setCacheDisabled", { cacheDisabled: true });
  await page.call("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: 0.75e6, uploadThroughput: 0.25e6 });
  await page.addInitScript(`window.__cls = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });`);
  await page.goto(url, { settle: 2000 });
  return page.evaluate("window.__cls");
}

test("the homepage does not shift while it loads, from the top or a deep link", async () => {
  for (const [width, height, mobile, cpu] of [[1440, 900, false, 1], [1280, 720, false, 2], [820, 1180, true, 4], [390, 844, true, 4]]) {
    for (const entry of ["/", "/#work", "/#contact"]) {
      await withPage({ width, height, mobile }, async (page) => {
        await page.call("Emulation.setCPUThrottlingRate", { rate: cpu });
        const shift = await loadShift(page, base + entry);
        assert.ok(shift < 0.05, `${width}x${height} ${entry}: cumulative layout shift ${shift.toFixed(4)}`);
      });
    }
  }
});

test("the explorer is drawn from the first frame, and falls back to the full list without its script", async () => {
  // First frame: before workbench.js runs, the explorer composition is already in place.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.intercept(/\/assets\/workbench\.js$/, () => ({ status: 200, body: "", headers: { "Content-Type": "text/javascript" }, delay: 1500 }));
    // Recorded on the first frames that have the explorer in them, long before workbench.js arrives.
    await page.addInitScript(`(function look() { const stage = document.querySelector("[data-wb-stage]"); if (!stage || !document.querySelector("#also-built")) return requestAnimationFrame(look); window.__first = { pending: document.documentElement.classList.contains("wb-pending"), files: [...document.querySelectorAll(".wb-files .system-file")].filter((file) => file.getClientRects().length).length, stage: stage.getClientRects().length > 0 }; })();`);
    await page.goto(`${base}/`, { settle: 100 });
    const first = await page.evaluate("window.__first");
    assert.ok(first?.pending, "pending while workbench.js is on its way");
    assert.equal(first.files, 1, "one case file on show");
    assert.ok(first.stage, "the stage is in place");
  });
  // No workbench.js at all: the plain list of every case file.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.intercept(/\/assets\/workbench\.js$/, () => ({ fail: "BlockedByClient" }));
    await page.goto(`${base}/`);
    assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("wb-pending")`)), "pending is dropped");
    assert.equal(await page.evaluate(`[...document.querySelectorAll(".wb-files .system-file")].filter((file) => file.getClientRects().length).length`), 13, "all thirteen case files are readable");
    assert.ok(!(await page.evaluate(visible("[data-wb-stage]"))), "no stage without its script");
    assert.ok(!(await page.evaluate(visible("#work-erp [data-open-file]"))), "no quick look button that would do nothing");
  });
});

test("a click during a transition reaches its target instead of being lost", async () => {
  // Same-document: the quick look is opening (slowed down) when Close is pressed.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    await page.animationRate(0.05);
    await page.click("#work-erp [data-open-file]");
    await page.waitFor(`document.documentElement.matches(":active-view-transition")`, { message: "the quick look should be opening through a transition" });
    await page.click("[data-drawer-close]", { scroll: false });
    await page.animationRate(1);
    await page.waitFor(`!document.querySelector("[data-drawer]").open`, { message: "the Close click during the transition was lost" });
    assert.deepEqual(page.errors(), []);
  });
  // Cross-document: a case study is arriving (slowed down) when its breadcrumb is pressed.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    await page.animationRate(0.05);
    await page.click(`#work-erp .sf-actions a[href="/erp-case-study"]`);
    // Chrome marks the arriving document's transition as active from the moment the navigation
    // commits, before its body is parsed, so wait for the breadcrumb itself too (still during
    // the transition, which the slowed animations keep running for seconds).
    await page.waitFor(`location.pathname === "/erp-case-study" && document.documentElement.matches(":active-view-transition") && !!document.querySelector('.breadcrumbs a[href="/"]')`, { timeout: 8000 });
    assert.ok(await page.evaluate(`document.documentElement.matches(":active-view-transition")`), "the breadcrumb is pressed while the case study is still arriving");
    await page.click(`.breadcrumbs a[href="/"]`, { scroll: false });
    await page.animationRate(1);
    await page.waitFor(`location.pathname === "/" && document.readyState === "complete"`, { timeout: 8000, message: "the breadcrumb click during the transition was lost" });
  });
});

test("double clicks and keys during transitions do nothing twice", async () => {
  await withPage({ width: 1024, height: 768 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(ready);
    // A double-click on the quick look card opens it once and leaves it open.
    await page.dblclick("#work-erp [data-open-file]");
    await new Promise((resolve) => setTimeout(resolve, 900));
    assert.ok(await page.evaluate(`document.querySelector("[data-drawer]").open`), "the drawer stays open after a double-click");
    assert.equal(await page.evaluate("location.pathname"), "/");
    // Escape while the closing or opening transition runs still closes it.
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    // A double-click on a case study link navigates once.
    const before = await page.evaluate("history.length");
    await page.dblclick(`#work-erp .sf-actions a[href="/erp-case-study"]`);
    await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete"`, { timeout: 8000 });
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(await page.evaluate("history.length"), before + 1, "one history entry for a double-click");
    // Back while the arrival transition is still running.
    await page.animationRate(0.05);
    await page.click(".pager-next");
    await page.waitFor(`location.pathname !== "/erp-case-study" && document.documentElement.matches(":active-view-transition")`, { timeout: 8000 });
    await page.evaluate("history.back()");
    await page.animationRate(1);
    await page.waitFor(`location.pathname === "/erp-case-study" && document.readyState === "complete"`, { timeout: 8000 });
    assert.deepEqual(page.errors(), []);
  });
});

/* ---------- Break it yourself: the FlowBank One and ProcBeacon simulations ---------- */

// Each scenario: how many steps it has, what it ends on, and one state on the way to check.
const SIMS = {
  "/flowbank-one": {
    ordered: { steps: 6, end: { "res.committed": "2 of 2", "res.deadlocks": "0", "res.retries": "0", "res.answer": "both posted", "a.bal": "€85.00", "b.bal": "€115.00" }, probe: [2, `document.querySelector(".sim-graph").dataset.is === "t2" && document.querySelector('[data-of="a.wait"]').dataset.is === "T2"`] },
    crossed: { steps: 7, end: { "res.committed": "2 of 2", "res.deadlocks": "1", "res.retries": "1", "res.answer": "both posted", "a.bal": "€85.00", "b.bal": "€115.00" }, probe: [4, `document.querySelector(".sim-graph").dataset.is === "cycle" && document.querySelector('[data-of="a.lock"]').dataset.is === "T1" && document.querySelector('[data-of="b.lock"]').dataset.is === "T2"`] },
    held: { steps: 3, end: { "res.committed": "0 of 1", "res.deadlocks": "0", "res.retries": "0", "res.answer": "503 ACCOUNT_BUSY", "a.bal": "€100.00", "b.bal": "€100.00" }, probe: [1, `document.querySelector('[data-of="a.lock"]').dataset.is === "S" && document.querySelector(".sim-graph").dataset.is === "s"`] }
  },
  "/procbeacon": {
    reused: { steps: 5, end: { "res.sent": "none", "res.outcome": "IdentityChanged", "res.ended": "nothing", "res.naive": "postgres.exe" }, probe: [5, `[...document.querySelectorAll('[data-of="m.created"][data-is="mismatch"]')].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility === "visible").length === 2 && document.querySelector('[data-of="g.act"]').dataset.is === "skip"`] },
    same: { steps: 5, end: { "res.sent": "1, on the handle", "res.outcome": "Exited", "res.ended": "node.exe", "res.naive": "node.exe too" }, probe: [4, `document.querySelector('[data-of="g.exit"]').dataset.is === "exited" && document.querySelector(".sim-slot").dataset.is === "empty"`] },
    critical: { steps: 3, end: { "res.sent": "none", "res.outcome": "Blocked", "res.ended": "nothing", "res.naive": "agent.exe, a critical process" }, probe: [3, `document.querySelector('[data-of="g.critical"]').dataset.is === "block" && document.querySelector('[data-of="g.confirm"]').dataset.is === "skip"`] }
  }
};
const simLive = `document.querySelector("[data-sim]")?.classList.contains("is-live")`;
// What the instrument shows now: scenario, step, counter, announcement and every bound value.
const simState = `(() => {
  const sim = document.querySelector("[data-sim]"), live = sim.querySelector(".sim-live");
  return { scenario: live.dataset.scenario, step: Number(live.dataset.step), count: sim.querySelector("[data-count]").textContent, say: sim.querySelector("[data-say]").textContent,
    values: Object.fromEntries([...[...sim.querySelectorAll(".sim-live [data-text]")].map((el) => [el.dataset.text, el]), ...[...sim.querySelectorAll(".sim-result .is-on")].map((el) => [el.dataset.when.split("=")[0], el])]
      .filter(([, el]) => !el.closest("[hidden]")).map(([key, el]) => [key, el.textContent])),
    states: [...sim.querySelectorAll(".sim-live [data-of]")].filter((el) => !el.closest("[hidden]")).map((el) => el.dataset.of + "=" + el.dataset.is).join("|") };
})()`;
const chooseScenario = (id) => `.sim-scenario:has(input[value="${id}"]) span`;

test("simulations: every scenario runs to its result, and Back, Reset and the step rail retrace it", async () => {
  for (const [url, scenarios] of Object.entries(SIMS)) {
    await withPage({ width: 1440, height: 900 }, async (page) => {
      await page.goto(base + url);
      await page.waitFor(simLive);
      for (const [id, { steps, end, probe }] of Object.entries(scenarios)) {
        await page.click(chooseScenario(id));
        const first = await page.evaluate(simState);
        assert.equal(first.scenario, id);
        assert.equal(first.step, 0, `${id} starts at its start state`);
        assert.equal(first.count, `Start · ${steps} steps`);
        if (id !== Object.keys(scenarios)[0]) assert.match(first.say, /^Start\. /, "choosing another scenario announces its start");
        for (let i = 1; i <= steps; i++) {
          await page.click('[data-act="next"]', { scroll: i === 1 });
          if (i === probe[0]) assert.ok(await page.evaluate(probe[1]), `${url} ${id}: the state at step ${i}`);
        }
        const last = await page.evaluate(simState);
        assert.equal(last.step, steps);
        assert.equal(last.count, `Step ${steps} of ${steps} · end`);
        assert.match(last.say, new RegExp(`^Step ${steps} of ${steps}\\. `));
        for (const [key, value] of Object.entries(end)) assert.equal(last.values[key], value, `${url} ${id}: ${key} at the end`);
        assert.deepEqual(await page.evaluate(`[...document.querySelectorAll(".sim-rail:not([hidden]) [aria-current]")].map((button) => button.dataset.go + "=" + button.getAttribute("aria-current"))`), [`${steps}=step`], "the rail marks the current step for assistive technology");
        await page.click('[data-act="next"]', { scroll: false });
        assert.equal((await page.evaluate(simState)).step, steps, "Step at the end does nothing");
        // Back undoes exactly one step: the same state the rail reaches directly from the start.
        await page.click('[data-act="back"]', { scroll: false });
        const back = await page.evaluate(simState);
        await page.click('[data-act="reset"]', { scroll: false });
        const reset = await page.evaluate(simState);
        assert.deepEqual({ ...reset, say: "" }, { ...first, say: "" }, "Reset returns to the start state");
        await page.click(`.sim-rail[data-for="${id}"] [data-go="${steps - 1}"]`, { scroll: false });
        const rail = await page.evaluate(simState);
        assert.deepEqual({ ...rail, say: "" }, { ...back, say: "" }, "Back and the rail reach the same state");
      }
      assert.deepEqual(page.errors(), []);
    });
  }
});

test("simulations: keyboard alone steps, jumps, plays and changes scenario, and focus stays put", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/flowbank-one`);
    await page.waitFor(simLive);
    const step = async () => (await page.evaluate(simState)).step;
    await page.evaluate(`document.querySelector('[data-act="next"]').scrollIntoView({ block: "center" }); document.querySelector('[data-act="next"]').focus()`);
    await page.key("Enter");
    assert.equal(await step(), 1, "Enter on Step");
    await page.key(" ");
    assert.equal(await step(), 2, "Space on Step");
    await page.key("ArrowRight");
    assert.equal(await step(), 3, "Arrow right");
    await page.key("ArrowLeft");
    assert.equal(await step(), 2, "Arrow left");
    await page.key("End");
    assert.equal(await step(), 6, "End");
    await page.key("Enter");
    assert.equal(await step(), 6, "Step at the end does nothing");
    assert.ok(await page.evaluate(focused('[data-act="next"]')), "the finished Step button keeps focus");
    await page.key("Home");
    assert.equal(await step(), 0, "Home");
    await page.evaluate(`document.querySelector('[data-act="back"]').focus()`);
    await page.key("Enter");
    assert.equal(await step(), 0);
    assert.ok(await page.evaluate(focused('[data-act="back"]')), "Back at the start keeps focus");
    await page.evaluate(`document.querySelector('.sim-rail[data-for="ordered"] [data-go="4"]').focus()`);
    await page.key("Enter");
    assert.equal(await step(), 4, "a step on the rail");
    // Play and Pause from the keyboard.
    await page.evaluate(`document.querySelector('[data-act="play"]').focus()`);
    await page.key("Enter");
    assert.equal(await page.evaluate(`document.querySelector('[data-act="play"]').textContent`), "Pause", "the button names what it will do next");
    await page.key("Enter");
    assert.equal(await page.evaluate(`document.querySelector('[data-act="play"]').textContent`), "Play");
    // Scenarios are a radio group: arrows move the choice, and the new scenario starts at its start.
    await page.evaluate(`document.querySelector('.sim-scenarios input[value="ordered"]').focus()`);
    await page.key("ArrowRight");
    const state = await page.evaluate(simState);
    assert.equal(state.scenario, "crossed");
    assert.equal(state.step, 0);
    assert.ok(await page.evaluate(`document.querySelector('.sim-scenarios input[value="crossed"]').checked`));
    assert.deepEqual(page.errors(), []);
  });
});

test("simulations: touch on a phone, and Play runs to the end without moving anything around it", async () => {
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.addInitScript(`window.__shifts = []; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shifts.push({ value: entry.value, input: entry.hadRecentInput, at: entry.startTime }); }).observe({ type: "layout-shift", buffered: true });`);
    await page.goto(`${base}/procbeacon`);
    await page.waitFor(simLive);
    for (let i = 0; i < 3; i++) await page.tap('[data-act="next"]', { scroll: i === 0 });
    assert.equal((await page.evaluate(simState)).step, 3);
    await page.tap('.sim-rail[data-for="reused"] [data-go="1"]');
    assert.equal((await page.evaluate(simState)).step, 1);
    await page.tap(chooseScenario("critical"));
    assert.equal((await page.evaluate(simState)).scenario, "critical");
    // Play: steps every 1.7 s on its own, stops at the end, and nothing on the page moves meanwhile.
    await page.tap('[data-act="play"]');
    const started = await page.evaluate("performance.now()");
    await page.waitFor(`(() => { const live = document.querySelector(".sim-live"); return live.dataset.step === "3" && document.querySelector('[data-act="play"]').textContent === "Play"; })()`, { timeout: 9000, message: "Play should reach the end and stop" });
    assert.equal(await page.evaluate(`document.querySelector('[data-act="play"]').textContent`), "Play");
    const moved = await page.evaluate(`window.__shifts.filter((shift) => shift.at > ${started} + 600 && !shift.input).reduce((sum, shift) => sum + shift.value, 0)`);
    assert.ok(moved < 0.001, `layout shift while playing: ${moved}`);
    assert.ok(await page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 0, "no horizontal overflow");
    assert.deepEqual(page.errors(), []);
  });
});

// Every scenario and step, at one width: the instrument never changes height while it steps,
// nothing pokes out of it, panels never overlap, and no label is cut short.
const simLayoutAudit = `(() => {
  const sim = document.querySelector("[data-sim]"), next = sim.nextElementSibling, issues = [];
  const radios = [...sim.querySelectorAll(".sim-scenarios input")];
  for (const radio of radios) {
    radio.click();
    let height = null;
    for (const button of sim.querySelectorAll('.sim-rail[data-for="' + radio.value + '"] button')) {
      button.click();
      const box = sim.getBoundingClientRect(), tag = radio.value + " step " + button.dataset.go;
      if (height === null) height = box.height;
      else if (Math.abs(box.height - height) > 0.5) issues.push(tag + ": height " + height + " became " + box.height);
      if (Math.abs(next.getBoundingClientRect().top - box.bottom) > 60) issues.push(tag + ": the next paragraph is not where it was");
      for (const el of sim.querySelectorAll(".sim-live *")) {
        if (!el.getClientRects().length) continue;
        const r = el.getBoundingClientRect();
        if (r.width && (r.left < box.left - 0.5 || r.right > box.right + 0.5)) { issues.push(tag + ": " + (el.className.baseVal ?? el.className) + " " + el.tagName + " sticks out"); break; }
      }
      const panels = [...sim.querySelectorAll(".sim-stage > .sim-panel")].map((panel) => panel.getBoundingClientRect());
      for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i], b = panels[j];
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) issues.push(tag + ": panels " + i + " and " + j + " overlap");
      }
      for (const el of sim.querySelectorAll(".sim-chip, .sim-btn, .sim-rail button, .sim-count, .sim-holder")) {
        if (el.getClientRects().length && el.scrollWidth > el.clientWidth + 1) issues.push(tag + ": '" + el.textContent + "' is cut short");
      }
    }
  }
  radios[0].click();
  return issues;
})()`;

test("simulations: the layout holds at every width, height and step, in both themes", async () => {
  const sizes = [[320, 640, true], [390, 844, true], [600, 960, true], [800, 1100, true], [1100, 800, false], [1440, 900, false], [2560, 1300, false], [1280, 600, false]];
  for (const [width, height, mobile] of sizes) {
    await withPage({ width, height, mobile, scheme: width === 600 || width === 1440 ? "light" : "dark" }, async (page) => {
      for (const url of Object.keys(SIMS)) {
        await page.goto(base + url);
        await page.waitFor(simLive);
        const issues = await page.evaluate(simLayoutAudit);
        assert.deepEqual(issues, [], `${url} at ${width}x${height}`);
        const overflow = await page.evaluate("document.documentElement.scrollWidth - innerWidth");
        assert.ok(overflow <= 0, `${url} at ${width}px overflows by ${overflow}px`);
      }
      assert.deepEqual(page.errors(), []);
    });
  }
});

// Contrast of every visible piece of text in the instrument against what is behind it.
const simContrast = `(() => {
  const rgb = (value) => { const parts = value.match(/[\\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }; };
  const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const behind = (el) => { for (let node = el; node; node = node.parentElement) { const bg = rgb(getComputedStyle(node).backgroundColor); if (bg.a >= 0.5) return bg; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const low = [];
  for (const el of document.querySelectorAll(".sim-live *")) {
    if (!el.getClientRects().length || el.closest('[aria-disabled="true"], svg, .sr-only') || getComputedStyle(el).visibility !== "visible") continue;
    if (![...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) continue;
    const value = ratio(lum(rgb(getComputedStyle(el).color)), lum(behind(el)));
    if (value < 4.5) low.push(el.textContent.trim().slice(0, 30) + " " + value.toFixed(2));
  }
  return low;
})()`;

test("simulations: text keeps its contrast in every state, in both themes", async () => {
  for (const scheme of ["dark", "light"]) {
    await withPage({ width: 1440, height: 900, scheme }, async (page) => {
      for (const [url, scenarios] of Object.entries(SIMS)) {
        await page.goto(base + url);
        await page.waitFor(simLive);
        await page.evaluate(`document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in")); 1`);
        for (const [id, { steps, probe }] of Object.entries(scenarios)) {
          for (const at of [0, probe[0], steps]) {
            await page.evaluate(`document.querySelector('.sim-scenarios input[value="${id}"]').click(); document.querySelector('.sim-rail[data-for="${id}"] [data-go="${at}"]').click(); 1`);
            await new Promise((resolve) => setTimeout(resolve, 400)); // colour transitions settle
            assert.deepEqual(await page.evaluate(simContrast), [], `${scheme} ${url} ${id} step ${at}`);
          }
        }
      }
    });
  }
});

test("simulations: without JavaScript, or without sims.js, the transcript is the content", async () => {
  await withPage({ width: 390, height: 844, mobile: true, javaScript: false }, async (page) => {
    for (const [url, counts] of [["/flowbank-one", [6, 7, 3]], ["/procbeacon", [5, 5, 3]]]) {
      await page.goto(base + url);
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".sim-static")).display`), "grid", `${url}: transcript shown`);
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".sim-live")).display`), "none", `${url}: live view hidden`);
      assert.deepEqual(await page.evaluate(`[...document.querySelectorAll(".sim-case ol")].map((ol) => ol.children.length)`), counts);
      assert.equal(await page.evaluate(`document.querySelector(".sim-flag").textContent`), "Simulated");
      assert.equal(await page.evaluate(`document.querySelectorAll(".sim-case-end").length`), 3, "every scenario states its result");
    }
  });
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.intercept(/\/assets\/sims\.js$/, () => ({ fail: "BlockedByClient" }));
    await page.goto(`${base}/procbeacon#sim-pid-reuse`);
    assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("sim-pending")`)), "the pending view is dropped");
    assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".sim-static")).display`), "grid");
    assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(".sim-live")).display`), "none");
  });
});

test("simulations: drawn from the first frame, so a slow sims.js moves nothing on a deep link", async () => {
  const engine = readFileSync(new URL("assets/sims.js", DIST), "utf8");
  for (const [width, height, mobile, cpu] of [[390, 844, true, 4], [1440, 900, false, 1]]) {
    for (const url of ["/flowbank-one#sim-lock-order", "/procbeacon#sim-pid-reuse", "/flowbank-one#ledger"]) {
      await withPage({ width, height, mobile }, async (page) => {
        await page.call("Emulation.setCPUThrottlingRate", { rate: cpu });
        await page.intercept(/\/assets\/sims\.js$/, () => ({ status: 200, body: engine, headers: { "Content-Type": "text/javascript" }, delay: 1200 }));
        const shift = await loadShift(page, base + url);
        assert.ok(shift < 0.05, `${width}px ${url}: cumulative layout shift ${shift.toFixed(4)}`);
        assert.ok(await page.evaluate(simLive), "the instrument took over once its script arrived");
      });
    }
  }
});

test("simulations: reduced motion stills the waiting pulse, and the state is the same either way", async () => {
  const running = `document.getAnimations().filter((animation) => animation.playState === "running" && animation.effect?.target?.closest?.(".sim")).length`;
  for (const reducedMotion of [false, true]) {
    await withPage({ width: 1440, height: 900, reducedMotion }, async (page) => {
      await page.goto(`${base}/flowbank-one#sim-lock-order`);
      await page.waitFor(simLive);
      await page.evaluate(`document.querySelector('.sim-rail[data-for="ordered"] [data-go="2"]').click(); 1`);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const count = await page.evaluate(running);
      if (reducedMotion) assert.equal(count, 0, "no animation runs with reduced motion");
      else assert.ok(count > 0, "the waiting pulse runs without a reduced-motion preference");
      assert.equal((await page.evaluate(simState)).values["a.wait"], "T2", "the state is the same either way");
    });
  }
});

test("simulations: sims.js loads only where there is one, and stepping makes no request", async () => {
  for (const url of PAGES) {
    const html = await (await fetch(base + url)).text();
    assert.equal(html.includes("/assets/sims.js"), url in SIMS, `${url}: sims.js ${url in SIMS ? "missing" : "loaded for nothing"}`);
  }
  await withPage({ width: 1440, height: 900 }, async (page) => {
    for (const url of Object.keys(SIMS)) {
      await page.goto(base + url);
      await page.waitFor(simLive);
      const before = await page.evaluate(`performance.getEntriesByType("resource").length`);
      await page.evaluate(simLayoutAudit);
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(await page.evaluate(`performance.getEntriesByType("resource").length`), before, `${url}: stepping through every scenario fetched something`);
    }
  });
});

/* ---------- Inspect mode: parts of a real screenshot, explained ---------- */

const INSPECT = {
  "/maintops": { title: "MaintOps · Supervisor dashboard", parts: ["SLA counters", "Needs immediate attention", "Recent activity", "Role and privilege"] },
  "/opssemble": { title: "Opssemble · Readiness view", parts: ["The event, and your role in it", "Areas, tasks and blockers", "The verdict and its score", "The rules applied"] },
  "/gurmat-saanj": { title: "Gurmat Saanj · Operator workspace", parts: ["Shabad and follow status", "The current line", "Display controls", "Projector preview"] }
};
const inspectorOpen = `document.querySelector("dialog.inspector")?.open === true`;
// What the inspector shows: its title, the selected part, the panel text, and whether the
// panel says exactly what the notes under the screenshot say for that part.
const inspectorState = `(() => {
  const dialog = document.querySelector("dialog.inspector");
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const selected = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const panelTitle = dialog.querySelector("[data-insp-part-title]").textContent;
  const notes = [...document.querySelectorAll(".inspect-part")].find((item) => item.querySelector(".inspect-part-title span:last-child").textContent === panelTitle);
  return { title: dialog.querySelector(".insp-title").textContent, tabs: tabs.length, selected, panelTitle, count: dialog.querySelector("[data-insp-count]").textContent,
    same: !!notes && notes.querySelector("dl").textContent === dialog.querySelector("[data-insp-notes] dl").textContent,
    zoom: dialog.querySelector("[data-insp-zoom]").getAttribute("aria-pressed"), focused: document.activeElement === tabs[selected] };
})()`;
// The selected part, after zooming, lies inside the stage (it can be read whole).
const partInStage = `(() => { const stage = document.querySelector("[data-insp-stage]").getBoundingClientRect(); const part = document.querySelector('.insp-part[aria-selected="true"]').getBoundingClientRect(); return part.left >= stage.left - 1 && part.right <= stage.right + 1 && part.top >= stage.top - 1 && part.bottom <= stage.bottom + 1; })()`;
const canvasScale = `Number(document.querySelector("[data-insp-canvas]").style.transform.match(/scale\\(([\\d.]+)\\)/)?.[1] || 1)`;

test("inspect mode: opens from its button and from the screenshot, explains each part, and closes back", async () => {
  for (const [url, spec] of Object.entries(INSPECT)) {
    await withPage({ width: 1440, height: 900 }, async (page) => {
      await page.goto(base + url);
      await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
      await page.click("[data-inspect-open]");
      await page.waitFor(inspectorOpen);
      let state = await page.evaluate(inspectorState);
      assert.equal(state.title, spec.title);
      assert.equal(state.tabs, spec.parts.length);
      assert.equal(state.selected, 0, "the first part is chosen on opening");
      assert.ok(state.focused, "focus is on the chosen part");
      assert.ok(await page.evaluate(`document.documentElement.classList.contains("is-locked")`), "the page behind does not scroll");
      for (let i = 0; i < spec.parts.length; i++) {
        await page.click(`.insp-part:nth-child(${i + 1})`);
        state = await page.evaluate(inspectorState);
        assert.equal(state.selected, i);
        assert.equal(state.panelTitle, spec.parts[i], `${url}: part ${i + 1}`);
        assert.equal(state.count, `Part ${i + 1} of ${spec.parts.length}`);
        assert.ok(state.same, `${url}: the inspector says what the notes say for ${spec.parts[i]}`);
      }
      await page.click("[data-insp-prev]");
      assert.equal((await page.evaluate(inspectorState)).selected, spec.parts.length - 2, "Previous part");
      await page.key("Escape");
      await page.waitFor(`!(${inspectorOpen})`);
      assert.ok(await page.evaluate(focused("[data-inspect-open]")), "focus returns to the Inspect button");
      assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("is-locked")`)), "the page scrolls again");
      assert.deepEqual(page.errors(), []);
    });
  }
  // Pointing at a part on the screenshot opens the inspector on that part.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/maintops`);
    await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
    assert.ok(await page.evaluate(`matchMedia("(hover: hover) and (pointer: fine)").matches`), "a desktop page has a mouse (the browser is launched with one; see launchBrowser)");
    const { x, y } = await page.point('[data-inspect] .inspect-hint[data-index="2"]');
    await page.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await page.waitFor(`getComputedStyle(document.querySelector(".inspect-hints")).opacity === "1"`, { message: "the parts outline themselves on hover" });
    await page.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    await page.waitFor(inspectorOpen);
    assert.equal((await page.evaluate(inspectorState)).panelTitle, "Recent activity", "the part under the pointer");
    assert.deepEqual(page.errors(), []);
  });
});

test("inspect mode: keyboard alone moves between parts, zooms, and reads the notes", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/opssemble`);
    await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
    await page.evaluate(`document.querySelector("[data-inspect-open]").focus()`);
    await page.key("Enter");
    await page.waitFor(inspectorOpen);
    const selected = async () => (await page.evaluate(inspectorState)).selected;
    await page.key("ArrowRight");
    assert.equal(await selected(), 1);
    assert.ok((await page.evaluate(inspectorState)).focused, "focus follows the chosen part");
    await page.key("End");
    assert.equal(await selected(), 3);
    await page.key("ArrowRight");
    assert.equal(await selected(), 0, "arrows wrap around");
    await page.key("Home");
    assert.equal(await selected(), 0);
    // Tab leaves the parts for the notes, as a tab panel.
    await page.key("Tab");
    assert.ok(await page.evaluate(`document.activeElement.getAttribute("role") === "tabpanel" && document.activeElement.getAttribute("aria-labelledby") === document.querySelector('[role="tab"][aria-selected="true"]').id`), "Tab reaches the explanation of the chosen part");
    // Zoom: the chosen part (the verdict, a third of the screen's width) fills the stage and
    // stays whole; off again, the whole screenshot.
    await page.evaluate(`document.querySelectorAll(".insp-part")[2].click()`);
    await page.evaluate(`document.querySelector("[data-insp-zoom]").focus()`);
    await page.key("Enter");
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal((await page.evaluate(inspectorState)).zoom, "true");
    assert.ok(await page.evaluate(canvasScale) > 1.5, "zoomed in");
    assert.ok(await page.evaluate(partInStage), "the zoomed part is entirely on the stage");
    await page.key("Enter");
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(await page.evaluate(canvasScale), 1, "zoomed out");
    assert.deepEqual(page.errors(), []);
  });
});

test("inspect mode: touch on a phone opens zoomed, steps through parts, and closes", async () => {
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.goto(`${base}/maintops`);
    await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
    await page.tap("[data-inspect-open]");
    await page.waitFor(inspectorOpen);
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal((await page.evaluate(inspectorState)).zoom, "true", "a phone opens zoomed to the part");
    assert.ok(await page.evaluate(partInStage), "and the part is whole on the stage");
    await page.tap("[data-insp-next]", { scroll: false });
    assert.equal((await page.evaluate(inspectorState)).selected, 1);
    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.ok(await page.evaluate(partInStage), "the next part is brought into view");
    assert.ok(await page.evaluate(`document.querySelector("[data-insp-next]").getBoundingClientRect().bottom <= innerHeight`), "the part navigation stays on screen");
    assert.ok(await page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 0, "no horizontal overflow");
    await page.tap("[data-insp-close]", { scroll: false });
    await page.waitFor(`!(${inspectorOpen})`);
    // A tap on the screenshot itself also opens the inspector.
    await page.tap("[data-inspect] .media-open");
    await page.waitFor(inspectorOpen);
    assert.deepEqual(page.errors(), []);
  });
});

test("inspect mode: the inspector fits every width and height, in both themes, and Back leaves nothing open", async () => {
  const sizes = [[320, 640, true], [390, 844, true], [600, 960, true], [800, 1100, true], [1100, 800, false], [1440, 900, false], [2560, 1300, false], [1280, 600, false]];
  for (const [width, height, mobile] of sizes) {
    await withPage({ width, height, mobile, scheme: width % 3 ? "dark" : "light" }, async (page) => {
      await page.goto(`${base}/opssemble`);
      await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
      await page.evaluate(`document.querySelector("[data-inspect-open]").click()`);
      await page.waitFor(inspectorOpen);
      for (let i = 0; i < 4; i++) {
        for (const zoom of [true, false]) {
          await page.evaluate(`(() => { document.querySelectorAll(".insp-part")[${i}].click(); const z = document.querySelector("[data-insp-zoom]"); if ((z.getAttribute("aria-pressed") === "true") !== ${zoom}) z.click(); })()`);
          await new Promise((resolve) => setTimeout(resolve, 560));
          const fit = await page.evaluate(`(() => { const box = (s) => document.querySelector(s).getBoundingClientRect(); const frame = box(".insp-frame"), stage = box("[data-insp-stage]"), panel = box(".insp-panel"), nav = box("[data-insp-next]");
            return { inside: frame.left >= -0.5 && frame.right <= innerWidth + 0.5 && frame.top >= -0.5 && frame.bottom <= innerHeight + 0.5, stage: stage.height > 120 && stage.width > 200, nav: nav.bottom <= innerHeight + 0.5 && nav.top >= panel.top - 0.5, overflow: document.documentElement.scrollWidth - innerWidth }; })()`);
          assert.ok(fit.inside && fit.stage && fit.nav && fit.overflow <= 0, `${width}x${height} part ${i + 1} zoom ${zoom}: ${JSON.stringify(fit)}`);
          if (zoom) assert.ok(await page.evaluate(partInStage), `${width}x${height}: part ${i + 1} is whole when zoomed`);
        }
      }
      // Leaving the page with the inspector open, then coming back: nothing is left open or locked.
      await page.evaluate(`location.assign("/maintops")`);
      await page.waitFor(`location.pathname === "/maintops" && document.readyState === "complete"`, { timeout: 8000 });
      await page.evaluate("history.back()");
      await page.waitFor(`location.pathname === "/opssemble" && document.readyState === "complete"`, { timeout: 8000 });
      assert.ok(!(await page.evaluate(`document.querySelector("dialog.inspector")?.open === true || document.documentElement.classList.contains("is-locked")`)), "back on the page, no inspector and no scroll lock");
      assert.deepEqual(page.errors(), []);
    });
  }
});

test("inspect mode: reduced motion, no JavaScript, and a slow inspect.js", async () => {
  await withPage({ width: 1440, height: 900, reducedMotion: true }, async (page) => {
    await page.goto(`${base}/gurmat-saanj`);
    await page.waitFor(`document.documentElement.classList.contains("inspect-ready")`);
    await page.evaluate(`document.querySelector("[data-inspect-open]").click()`);
    await page.waitFor(inspectorOpen);
    await page.evaluate(`document.querySelector("[data-insp-zoom]").click()`);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(await page.evaluate(`document.getAnimations().filter((animation) => animation.playState === "running").length`), 0, "nothing animates");
    assert.ok(await page.evaluate(canvasScale) > 1, "zoom still works, at once");
    assert.equal(await page.evaluate(`document.querySelectorAll(".insp-part").length`), 4, "all the information is there");
  });
  // A phone-width window, without touch emulation, so a plain mouse press opens the notes.
  await withPage({ width: 390, height: 844, javaScript: false }, async (page) => {
    for (const [url, spec] of Object.entries(INSPECT)) {
      await page.goto(base + url);
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector("[data-inspect-open]")).display`), "none", `${url}: no Inspect button without JavaScript`);
      assert.deepEqual(await page.evaluate(`[...document.querySelectorAll(".inspect-part .inspect-part-title span:last-child")].map((el) => el.textContent)`), spec.parts, `${url}: every note is in the page`);
      // A real click, at coordinates read directly: without scripts the page cannot run the
      // driver's usual frame-by-frame position check.
      const { x, y } = await page.evaluate(`(() => { const el = document.querySelector(".inspect-notes summary"); el.scrollIntoView({ block: "center", behavior: "instant" }); const r = el.getBoundingClientRect(); return { x: r.left + 12, y: r.top + r.height / 2 }; })()`);
      await page.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      assert.ok(await page.evaluate(`document.querySelector(".inspect-notes").open && document.querySelector(".inspect-part dd").getBoundingClientRect().height > 0`), `${url}: the notes open without JavaScript`);
      assert.match(await page.evaluate(`document.querySelector("[data-inspect] .media-open").getAttribute("href")`), /\.png$/, `${url}: the screenshot still links to its full size`);
    }
  });
  // The Inspect button is drawn from the first frame, so a late inspect.js moves nothing.
  const engine = readFileSync(new URL("assets/inspect.js", DIST), "utf8");
  for (const [width, height, mobile, cpu] of [[390, 844, true, 4], [1440, 900, false, 1]]) {
    for (const url of ["/maintops", "/opssemble", "/gurmat-saanj#pipeline"]) {
      await withPage({ width, height, mobile }, async (page) => {
        await page.call("Emulation.setCPUThrottlingRate", { rate: cpu });
        await page.intercept(/\/assets\/inspect\.js$/, () => ({ status: 200, body: engine, headers: { "Content-Type": "text/javascript" }, delay: 1200 }));
        const shift = await loadShift(page, base + url);
        assert.ok(shift < 0.05, `${width}px ${url}: cumulative layout shift ${shift.toFixed(4)}`);
        assert.ok(await page.evaluate(`document.documentElement.classList.contains("inspect-ready")`));
      });
    }
  }
});

/* ---------- Command palette ---------- */

const paletteOpen = `document.querySelector("dialog.palette")?.open === true`;
async function chord(page, key, modifiers) {
  const event = { key, code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers };
  await page.call("Input.dispatchKeyEvent", { type: "keyDown", ...event });
  await page.call("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  await new Promise((resolve) => setTimeout(resolve, 60));
}
const CTRL = 2, META = 4;
const paletteResults = `[...document.querySelectorAll(".pal-opt")].map((option) => ({ title: option.querySelector(".pal-title").textContent, kind: option.querySelector(".pal-kind").textContent, path: option.querySelector(".pal-path")?.textContent || "" }))`;
async function query(page, text) {
  await page.evaluate(`(() => { const input = document.querySelector(".pal-input"); input.value = ""; input.dispatchEvent(new Event("input")); })()`);
  await page.type(text);
  await page.waitFor(`!document.querySelector(".pal-loading")`);
  return page.evaluate(paletteResults);
}

test("command palette: Ctrl+K, Cmd+K and the Search button open it; Escape closes it and returns focus", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/maintops`);
    assert.ok(await page.evaluate(visible("[data-palette-open]")), "a visible Search control");
    assert.equal(await page.evaluate(`document.querySelector("[data-palette-open]").getAttribute("aria-keyshortcuts")`), "Control+K");
    await page.evaluate(`document.querySelector(".brand").focus()`);
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    assert.ok(await page.evaluate(focused(".pal-input")), "the query has focus");
    assert.ok(await page.evaluate(`document.documentElement.classList.contains("is-locked")`));
    await page.key("Escape");
    await page.waitFor(`!(${paletteOpen})`);
    assert.ok(await page.evaluate(focused(".brand")), "focus returns where it was");
    assert.ok(!(await page.evaluate(`document.documentElement.classList.contains("is-locked")`)));
    await chord(page, "k", META);
    await page.waitFor(paletteOpen);
    await page.click(".pal-close");
    await page.waitFor(`!(${paletteOpen})`);
    await page.click("[data-palette-open]");
    await page.waitFor(paletteOpen);
    await page.key("Escape");
    await page.waitFor(`!(${paletteOpen})`);
    assert.ok(await page.evaluate(focused("[data-palette-open]")), "focus returns to the Search control");
    // Other keys stay the page's: a plain K types nothing and opens nothing.
    await page.key("Tab");
    await chord(page, "k", 0);
    assert.ok(!(await page.evaluate(paletteOpen)));
    // Not over another dialog: with the inspector open, Ctrl+K is left alone.
    await page.evaluate(`document.querySelector("[data-inspect-open]").click()`);
    await page.waitFor(inspectorOpen);
    await chord(page, "k", CTRL);
    assert.ok(!(await page.evaluate(paletteOpen)), "the palette does not open over the inspector");
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: technologies, projects and topics lead to the right places, and nothing matches nonsense", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    const index = JSON.parse(readFileSync(new URL("assets/search-index.json", DIST), "utf8"));
    const techOf = (title) => index.items.find((item) => item.type === "project" && item.title === title)?.tags || "";
    let results = await query(page, "Java");
    assert.ok(results.some((r) => r.title === "FlowBank One"), "Java: FlowBank One");
    for (const r of results.filter((r) => /project|case study/.test(r.kind))) assert.match(techOf(r.title), /\bJava\b/, `Java must not list ${r.title} (${techOf(r.title)})`);
    results = await query(page, "Spring Boot");
    assert.equal(results[0].title, "FlowBank One");
    results = await query(page, "C#");
    assert.ok(results.some((r) => r.title === "ProcBeacon"), "C#: ProcBeacon");
    results = await query(page, "PostgreSQL");
    assert.equal(results[0].title, "FlowBank One");
    results = await query(page, "PID reuse");
    assert.deepEqual([results[0].title, results[0].path], ["Process safety", "/procbeacon#safety"]);
    results = await query(page, "Deadlock");
    assert.deepEqual([results[0].title, results[0].path], ["Ledger & concurrency", "/flowbank-one#ledger"]);
    results = await query(page, "SLA");
    assert.equal(results[0].path, "/maintops#lifecycle");
    results = await query(page, "Authentication");
    assert.ok(results.some((r) => r.path === "/flowbank-one#security"), "Authentication: FlowBank One's sessions and security");
    assert.ok(!results.some((r) => r.path === "/procbeacon#safety"), "and not ProcBeacon's process sessions");
    results = await query(page, "Gurmat Saanj");
    assert.deepEqual([results[0].title, results[0].path], ["Gurmat Saanj", "/gurmat-saanj"]);
    results = await query(page, "ProcBeacon");
    assert.equal(results[0].path, "/procbeacon");
    results = await query(page, "zzqx");
    assert.equal(results.length, 0);
    assert.match(await page.evaluate(`document.querySelector(".pal-empty").textContent`), /No matches for “zzqx”/);
    await page.waitFor(`document.querySelector(".pal-status").textContent === "No results"`, { message: "the empty result is announced" });
    // Every result in the index leads somewhere real (the validator checks every id too).
    for (const item of index.items) assert.match(item.url, /^\/[\w-]*(#[\w-]+)?$/, item.url);
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: opening results, across pages and on the same page, with keys and with the mouse", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await query(page, "PID reuse");
    await page.key("Enter");
    await page.waitFor(`location.pathname === "/procbeacon" && location.hash === "#safety" && document.readyState === "complete"`, { timeout: 8000 });
    await page.waitFor(`(() => { const r = document.getElementById("safety").getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })()`, { message: "the section is on screen" });
    // Same page: a section is reached in place.
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await query(page, "Ports attribution");
    await page.key("Enter");
    await page.waitFor(`location.pathname === "/procbeacon" && location.hash === "#attribution"`);
    assert.ok(!(await page.evaluate(paletteOpen)));
    // Arrow keys choose, Enter opens the chosen one; a project without a case study opens in the explorer.
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    const results = await query(page, "Esamarea");
    const target = results.findIndex((r) => r.path === "/#work-esamarea");
    assert.ok(target >= 0, "Esamarea leads to its place in the explorer");
    for (let i = 0; i < target; i++) await page.key("ArrowDown");
    assert.equal(await page.evaluate(`document.getElementById(document.querySelector(".pal-input").getAttribute("aria-activedescendant")).querySelector(".pal-path").textContent`), "/#work-esamarea");
    await page.key("Enter");
    await page.waitFor(`location.pathname === "/" && location.hash === "#work-esamarea" && document.readyState === "complete"`, { timeout: 8000 });
    // There, the explorer opens Esamarea's quick look; the palette waits for it to close.
    await page.waitFor(`document.querySelector("[data-drawer]")?.open === true`, { message: "Esamarea's quick look opens" });
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    // With the mouse.
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await query(page, "Opssemble");
    await page.click('.pal-opt:first-of-type');
    await page.waitFor(`location.pathname === "/opssemble" && document.readyState === "complete"`, { timeout: 8000 });
    // Back returns to the explorer at Esamarea (whose quick look the hash opens again); the
    // palette is not left open, and any scroll lock is the quick look's.
    await page.evaluate("history.back()");
    await page.waitFor(`location.pathname === "/" && document.readyState === "complete"`, { timeout: 8000 });
    assert.ok(!(await page.evaluate(`document.querySelector("dialog.palette")?.open === true`)), "no palette left open");
    assert.ok(await page.evaluate(`!document.documentElement.classList.contains("is-locked") || document.querySelector("[data-drawer]")?.open === true`), "no scroll lock without an open dialog");
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: actions switch the theme, copy the email address and download the CV", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    let cvRequests = 0;
    await page.intercept(/Gurmilan_Singh_2026_CV\.pdf$/, () => { cvRequests += 1; return { status: 200, body: "%PDF-1.4", headers: { "Content-Type": "application/pdf" } }; });
    await page.goto(`${base}/flowbank-one`);
    await page.call("Browser.grantPermissions", { origin: base, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }).catch(() => {});
    const before = await page.evaluate("document.documentElement.dataset.theme");
    const other = before === "dark" ? "light" : "dark";
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    const results = await query(page, "theme");
    assert.equal(results[0].title, `Switch to the ${other} theme`);
    await page.key("Enter");
    await page.waitFor(`document.documentElement.dataset.theme === "${other}"`);
    assert.equal(await page.evaluate(`localStorage.getItem("portfolio-theme")`), other, "the choice is stored, as with the switch");
    assert.ok(!(await page.evaluate(paletteOpen)));
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await query(page, "copy email");
    await page.key("Enter");
    await page.waitFor(`/Copied|Could not copy|not available/.test(document.querySelector(".pal-status").textContent)`);
    const status = await page.evaluate(`document.querySelector(".pal-status").textContent`);
    const email = await page.evaluate(`document.querySelector('.nav-meta a[href^="mailto:"]').getAttribute("href").slice(7)`);
    assert.ok(status.includes(email), "the status names the address either way");
    if (status.startsWith("Copied")) assert.equal(await page.evaluate("navigator.clipboard.readText()"), email);
    await query(page, "download CV");
    await page.key("Enter");
    for (let i = 0; i < 60 && !cvRequests; i++) await new Promise((resolve) => setTimeout(resolve, 60));
    assert.ok(cvRequests > 0, "the CV is downloaded");
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: a phone gets a full-height sheet that works by touch", async () => {
  await withPage({ width: 390, height: 844, mobile: true }, async (page) => {
    await page.goto(`${base}/`);
    await page.tap("[data-palette-open]", { scroll: false });
    await page.waitFor(paletteOpen);
    await page.waitFor(`!document.querySelector(".pal-loading")`);
    const box = await page.evaluate(`(() => { const r = document.querySelector("dialog.palette").getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
    assert.ok(box.w >= 389 && box.h >= 843, `the sheet fills the screen: ${JSON.stringify(box)}`);
    assert.ok(await page.evaluate(`[...document.querySelectorAll(".pal-opt")].every((option) => option.getBoundingClientRect().height >= 44)`), "results are comfortable touch targets");
    await page.type("maintops");
    await page.tap(".pal-opt:first-of-type", { scroll: false });
    await page.waitFor(`location.pathname === "/maintops" && document.readyState === "complete"`, { timeout: 8000 });
    assert.ok(await page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 0);
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: a combobox over a listbox, its choice and its count announced", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await query(page, "flowbank");
    const aria = await page.evaluate(`(() => { const input = document.querySelector(".pal-input"); const list = document.getElementById(input.getAttribute("aria-controls")); const active = document.getElementById(input.getAttribute("aria-activedescendant"));
      return { role: input.getAttribute("role"), name: input.getAttribute("aria-label"), list: list?.getAttribute("role"), expanded: input.getAttribute("aria-expanded"), activeRole: active?.getAttribute("role"), activeSelected: active?.getAttribute("aria-selected"), selectedCount: document.querySelectorAll('[role="option"][aria-selected="true"]').length, dialogName: document.querySelector("dialog.palette").getAttribute("aria-label"), groups: [...list.querySelectorAll('[role="group"]')].every((group) => document.getElementById(group.getAttribute("aria-labelledby"))) }; })()`);
    assert.deepEqual(aria, { role: "combobox", name: "Search projects, technologies and decisions", list: "listbox", expanded: "true", activeRole: "option", activeSelected: "true", selectedCount: 1, dialogName: "Search the portfolio", groups: true });
    const first = await page.evaluate(`document.querySelector(".pal-input").getAttribute("aria-activedescendant")`);
    await page.key("ArrowDown");
    assert.notEqual(await page.evaluate(`document.querySelector(".pal-input").getAttribute("aria-activedescendant")`), first, "Arrow down moves the choice");
    await page.waitFor(`/^\\d+ results?$/.test(document.querySelector(".pal-status").textContent)`, { message: "the count is announced" });
    assert.deepEqual(page.errors(), []);
  });
});

test("command palette: nothing loads before it is wanted, and a missing index leaves the actions working", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/opssemble`);
    const loaded = () => page.evaluate(`performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /palette\\.js|search-index\\.json/.test(name)).map((name) => name.split("/").pop())`);
    assert.deepEqual(await loaded(), [], "no palette code or index on page load");
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await page.waitFor(`!document.querySelector(".pal-loading")`);
    assert.deepEqual((await loaded()).sort(), ["palette.js", "search-index.json"]);
    await page.key("Escape");
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    assert.equal((await loaded()).length, 2, "opening again fetches nothing more");
  });
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.intercept(/search-index\.json$/, () => ({ status: 503, body: "", headers: { "Content-Type": "text/plain" } }));
    await page.goto(`${base}/`);
    await chord(page, "k", CTRL);
    await page.waitFor(paletteOpen);
    await page.waitFor(`/could not be loaded/.test(document.querySelector(".pal-status").textContent)`);
    const results = await query(page, "theme");
    assert.match(results[0].title, /Switch to the (light|dark) theme/, "the actions still work");
  });
});

test("command palette: the overlay fits every width and height, in both themes", async () => {
  const sizes = [[320, 640, true], [390, 844, true], [600, 960, true], [800, 1100, true], [1100, 800, false], [1440, 900, false], [2560, 1300, false], [1280, 600, false]];
  for (const [width, height, mobile] of sizes) {
    await withPage({ width, height, mobile, scheme: width % 3 ? "light" : "dark" }, async (page) => {
      await page.goto(`${base}/gurmat-saanj`);
      const header = await page.evaluate(`(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const search = r("[data-palette-open]"), brand = r(".brand"); return { oneRow: Math.abs(search.top - brand.top) < 20, inside: search.right <= innerWidth }; })()`);
      assert.ok(header.oneRow && header.inside, `${width}px: the Search control sits in the header row: ${JSON.stringify(header)}`);
      await page.evaluate(`document.querySelector("[data-palette-open]").click()`);
      await page.waitFor(paletteOpen);
      for (const text of ["", "security", "zzqx"]) {
        await query(page, text || " ");
        await page.waitFor(`document.querySelector("dialog.palette").getAnimations({ subtree: true }).every((animation) => animation.playState !== "running")`);
        const fit = await page.evaluate(`(() => { const box = (s) => document.querySelector(s).getBoundingClientRect(); const d = box("dialog.palette"), input = box(".pal-input"), foot = box(".pal-foot");
          return { inside: d.left >= -0.5 && d.right <= innerWidth + 0.5 && d.top >= -0.5 && d.bottom <= innerHeight + 0.5, input: input.width > 120 && input.top >= d.top, foot: foot.bottom <= d.bottom + 0.5, overflow: document.documentElement.scrollWidth - innerWidth, clipped: [...document.querySelectorAll(".pal-title")].some((el) => el.scrollWidth > el.clientWidth + 1) }; })()`);
        assert.ok(fit.inside && fit.input && fit.foot && fit.overflow <= 0 && !fit.clipped, `${width}x${height} "${text}": ${JSON.stringify(fit)}`);
      }
      assert.deepEqual(page.errors(), []);
    });
  }
  await withPage({ width: 1440, height: 900, javaScript: false }, async (page) => {
    await page.goto(`${base}/`);
    assert.equal(await page.evaluate(`getComputedStyle(document.querySelector("[data-palette-open]")).display`), "none", "no Search control without JavaScript");
  });
});

/* ---------- One stack, one story: the hero's drawing becomes the explorer's model ----------
   On wide screens a copy of the hero's four plates (aria-hidden, inert) turns into the stage's
   four floors with the scroll; narrower screens fold the drawing in place instead. */

const drawFrames = `new Promise((resolve) => { let n = 0; (function step() { if (++n > 3) resolve(true); else requestAnimationFrame(step); })(); })`;
// Scroll at once to y, then let the page draw three frames.
async function scrollToY(page, y) {
  await page.evaluate(`scrollTo({ top: ${y}, behavior: "instant" }); ${drawFrames}`);
}
// The stretch it runs over: from the first pixels of scroll to where the stage settles under the
// header, or where a link to #work lands, if that is earlier.
const morphRange = `(() => { const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY - document.querySelector("[data-header]").offsetHeight; const end = Math.min(top("[data-workbench]"), top("#work")) - 2; return { y0: Math.min(48, end / 6), y1: end }; })()`;
const morphState = `(() => { const opacity = (s) => { const el = document.querySelector(s); return el ? Number(getComputedStyle(el).opacity) : null; }; return { morphing: document.documentElement.classList.contains("is-morphing"), hero: opacity(".hero-figure"), model: opacity("[data-stage-scene]"), copy: opacity(".stack-morph"), caption: Number(document.querySelector(".hero-figure .fig-cap").style.opacity || 1) }; })()`;
const boxes = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })`;
const worstGap = (a, b) => Math.max(...a.flatMap((box, i) => box.map((value, k) => Math.abs(value - b[i][k]))));
const shifted = (list, dy) => list.map(([l, t, r, b]) => [l, t + dy, r, b + dy]);
const selectedSystem = `document.querySelector('[role="tab"][aria-selected="true"]').dataset.wbTab`;
// The active floor and the selected socket on each floor, in the stage or in the copy.
const floorsShown = (scope) => `[...document.querySelectorAll(${JSON.stringify(scope + " .plane")})].map((plane) => [plane.classList.contains("is-active"), plane.querySelector(".socket.is-sel")?.dataset.socket])`;
// A finger drag, as raw touch events (a synthetic scroll gesture does not scroll by touch in
// headless Chrome), repeated until the page has scrolled past `target` in that direction.
async function swipeTo(page, target) {
  const { width, height } = await page.evaluate("({ width: innerWidth, height: innerHeight })");
  const touch = (type, y) => page.call("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: Math.round(width / 2), y, id: 1 }] });
  const down = target > (await page.evaluate("scrollY"));
  for (let i = 0; i < 12; i++) {
    const y = await page.evaluate("scrollY");
    if (down ? y >= target : y <= target) break;
    const [from, to] = down ? [Math.round(height * .8), Math.round(height * .25)] : [Math.round(height * .25), Math.round(height * .8)];
    await touch("touchStart", from);
    for (let at = from; down ? at > to : at < to; at += down ? -12 : 12) { await touch("touchMove", at); await new Promise((resolve) => setTimeout(resolve, 8)); }
    await touch("touchEnd", to);
    await page.evaluate(drawFrames);
  }
}
async function readyToMorph(page) {
  await page.waitFor(`document.documentElement.classList.contains("workbench-ready") && !!document.querySelector(".stack-morph .morph-card > *")`, { timeout: 8000, message: "the copy was not built ahead of the scroll" });
  // The drawing's own entrance (its plates assemble on load) is over, so it holds still to be measured.
  await page.waitFor(`document.querySelector(".hero-figure").getAnimations({ subtree: true }).every((animation) => animation.effect.getComputedTiming().iterations === Infinity || animation.playState === "finished")`, { timeout: 8000 });
}
// Until the scroll position has stood still for ten frames (a link's landing included).
const scrollSettled = `new Promise((resolve) => { let last = -1, same = 0; (function step() { if (scrollY === last) same++; else { same = 0; last = scrollY; } if (same >= 10) resolve(true); else requestAnimationFrame(step); })(); })`;

test("hero to explorer: the drawing turns into the model with the scroll, both ways, and hands over exactly", async () => {
  for (const [width, height] of [[1440, 900], [1024, 768], [1280, 600], [2560, 1300]]) {
    await withPage({ width, height }, async (page) => {
      const at = `${width}×${height}`;
      await page.goto(`${base}/`);
      await readyToMorph(page);
      const range = await page.evaluate(morphRange);
      const y0 = Math.ceil(range.y0);
      const y1 = Math.floor(range.y1);
      // The copy is decoration: hidden from assistive technology, inert, nothing in it to focus or follow.
      assert.deepEqual(await page.evaluate(`(() => { const layer = document.querySelector(".stack-morph"); return [layer.getAttribute("aria-hidden"), layer.inert, layer.querySelectorAll("a, button, input, select, textarea, [tabindex], [id], [href]").length]; })()`), ["true", true, 0], `${at}: the copy is aria-hidden and inert, with nothing focusable`);
      let state = await page.evaluate(morphState);
      assert.ok(!state.morphing && state.hero === 1 && state.copy === 0, `${at}: at the top, the drawing as it is: ${JSON.stringify(state)}`);
      // Start: the copy's cards lie exactly where the drawing's plates were.
      await scrollToY(page, y0);
      assert.ok(!(await page.evaluate(morphState)).morphing, `${at}: not yet at ${y0}px`);
      const plates = await page.evaluate(boxes(".hero-stack > .plate"));
      await scrollToY(page, y0 + 1);
      state = await page.evaluate(morphState);
      assert.ok(state.morphing && state.hero === 0 && state.copy === 1, `${at}: running one pixel later: ${JSON.stringify(state)}`);
      const cards = shifted(await page.evaluate(boxes(".morph-face")), 1);
      assert.ok(worstGap(cards, plates) < 0.5, `${at}: the cards start ${worstGap(cards, plates).toFixed(2)}px off the plates`);
      // Middle: both real figures transparent, the copy in between, no sideways overflow.
      await scrollToY(page, Math.round((y0 + y1) / 2));
      state = await page.evaluate(morphState);
      assert.ok(state.morphing && state.hero === 0 && state.model === 0 && state.copy === 1, `${at}: half way: ${JSON.stringify(state)}`);
      assert.ok((await page.evaluate("document.documentElement.scrollWidth - innerWidth")) <= 0, `${at}: overflow half way`);
      // End: the copy's floors lie exactly where the stage's floors are, and the stage takes over.
      await scrollToY(page, y1 - 1);
      const floors = shifted(await page.evaluate(boxes(".stack-morph .plane")), -1);
      await scrollToY(page, y1 + 1);
      state = await page.evaluate(morphState);
      assert.ok(!state.morphing && state.model === 1 && state.copy === 0, `${at}: handed over at ${y1 + 1}px: ${JSON.stringify(state)}`);
      const model = shifted(await page.evaluate(boxes("[data-stage-scene] .plane")), 1);
      assert.ok(worstGap(floors, model) < 1, `${at}: the floors end ${worstGap(floors, model).toFixed(2)}px off the stage's floors`);
      // And back: it runs again on the way up, and the drawing is whole at the top.
      await scrollToY(page, Math.round((y0 + y1) / 2));
      assert.ok((await page.evaluate(morphState)).morphing, `${at}: runs again on the way back`);
      await scrollToY(page, 0);
      state = await page.evaluate(morphState);
      assert.ok(!state.morphing && state.hero === 1 && state.caption === 1, `${at}: back at the top: ${JSON.stringify(state)}`);
      assert.deepEqual(page.errors(), [], `${at}: errors`);
    });
  }
});

test("hero to explorer: a fast scroll or a jump lands where it lands, and a link to #work opens on the explorer", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await readyToMorph(page);
    const { y0, y1 } = await page.evaluate(morphRange);
    // A fast wheel scroll past the explorer's top, then straight back to the top.
    await page.call("Input.synthesizeScrollGesture", { x: 720, y: 450, yDistance: -Math.round(y1 + 400), speed: 8000, gestureSourceType: "mouse" });
    await page.evaluate(drawFrames);
    let state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.model === 1, `after a fast scroll down: ${JSON.stringify(state)}`);
    await page.call("Input.synthesizeScrollGesture", { x: 720, y: 450, yDistance: Math.round(y1 + 800), speed: 8000, gestureSourceType: "mouse" });
    await page.evaluate(drawFrames);
    state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.hero === 1 && (await page.evaluate("scrollY")) === 0, `after a fast scroll back up: ${JSON.stringify(state)}`);
    // Jumps: into the middle, then past the end within one frame.
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.ok((await page.evaluate(morphState)).morphing, "a jump into the middle lands in the middle");
    await page.evaluate(`scrollTo({ top: ${Math.round((y0 + y1) / 3)}, behavior: "instant" }); scrollTo({ top: ${Math.round(y1 + 300)}, behavior: "instant" }); ${drawFrames}`);
    state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.model === 1, `a jump past the end: ${JSON.stringify(state)}`);
    assert.deepEqual(page.errors(), []);
  });
  // Straight to the explorer: no transformation in the way, the explorer at the top of the window.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/#work`);
    await page.waitFor(`document.documentElement.classList.contains("workbench-ready")`);
    await page.evaluate(scrollSettled);
    const state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.model === 1, `#work: ${JSON.stringify(state)}`);
    const gap = await page.evaluate(`document.getElementById("work").getBoundingClientRect().top - ${headerBottom}`);
    assert.ok(Math.abs(gap) <= 2, `#work starts ${gap}px from the header`);
    await page.click("#tab-procbeacon");
    await page.waitFor(`${selectedSystem} === "procbeacon"`);
    assert.deepEqual(page.errors(), []);
  });
});

test("hero to explorer: after it, choosing a system and a quick look work; during it, the transparent model takes no input", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await readyToMorph(page);
    const { y0, y1 } = await page.evaluate(morphRange);
    // During: a real click on the transparent model's sockets or floors changes nothing.
    await scrollToY(page, Math.round(y0 + (y1 - y0) * .7));
    assert.ok((await page.evaluate(morphState)).morphing);
    const before = await page.evaluate(selectedSystem);
    const target = await page.evaluate(`(() => { const top = ${headerBottom}; const scene = document.querySelector("[data-stage-scene]"); for (const el of scene.querySelectorAll(".socket:not(.is-sel), .plane")) { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y > top + 4 && y < innerHeight - 4 && x > 0 && x < innerWidth && scene.contains(document.elementFromPoint(x, y))) return { x, y }; } return null; })()`);
    assert.ok(target, "a point on the transparent model is in view");
    await page.call("Input.dispatchMouseEvent", { type: "mouseMoved", x: target.x, y: target.y });
    await page.call("Input.dispatchMouseEvent", { type: "mousePressed", x: target.x, y: target.y, button: "left", buttons: 1, clickCount: 1 });
    await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", clickCount: 1 });
    await page.evaluate(drawFrames);
    assert.equal(await page.evaluate(selectedSystem), before, "the system did not change");
    assert.ok(!(await page.evaluate(`document.querySelector("[data-drawer]").open`)), "no quick look opened");
    // After: choose a system, the copy follows it, and its quick look opens and closes as ever.
    await scrollToY(page, Math.ceil(y1) + 1);
    await page.click("#tab-flowbank");
    await page.waitFor(`${selectedSystem} === "flowbank"`);
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.deepEqual(await page.evaluate(floorsShown(".stack-morph")), await page.evaluate(floorsShown("[data-stage-scene]")), "the copy shows the chosen system and layer");
    await scrollToY(page, Math.ceil(y1) + 1);
    await page.click("#work-flowbank [data-open-file]");
    await page.waitFor(`document.querySelector("[data-drawer]").open && document.querySelector("[data-drawer]").contains(document.activeElement)`);
    await page.key("Escape");
    await page.waitFor(`!document.querySelector("[data-drawer]").open`);
    await page.waitFor(focused("#work-flowbank [data-open-file]"), { message: "focus did not return to the Quick look button" });
    assert.deepEqual(page.errors(), []);
  });
});

test("hero to explorer: a deep link and Back keep the chosen system, and the copy shows it", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/#work-maintops`);
    await page.waitFor(`document.documentElement.classList.contains("workbench-ready") && ${selectedSystem} === "maintops"`);
    await scrollToY(page, 0);
    await readyToMorph(page);
    const { y0, y1 } = await page.evaluate(morphRange);
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.ok((await page.evaluate(morphState)).morphing);
    assert.deepEqual(await page.evaluate(floorsShown(".stack-morph")), await page.evaluate(floorsShown("[data-stage-scene]")), "the copy shows the linked system");
    // To a case study and Back: the same system, and the transformation runs again.
    await page.evaluate(`location.href = "/opssemble"`);
    await page.waitFor(`location.pathname === "/opssemble" && document.readyState === "complete"`, { timeout: 8000 });
    await page.evaluate("history.back()");
    await page.waitFor(`location.pathname === "/" && document.documentElement.classList.contains("workbench-ready")`, { timeout: 8000 });
    assert.equal(await page.evaluate(selectedSystem), "maintops", "Back keeps the chosen system");
    await scrollToY(page, 0);
    await readyToMorph(page);
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.ok((await page.evaluate(morphState)).morphing, "runs again after Back");
    assert.deepEqual(await page.evaluate(floorsShown(".stack-morph")), await page.evaluate(floorsShown("[data-stage-scene]")));
    assert.deepEqual(page.errors(), []);
  });
});

test("hero to explorer: reduced motion, no JavaScript, and missing browser APIs leave both figures as they are", async () => {
  const still = async (page, label, { scripts = true } = {}) => {
    const { y0, y1 } = await page.evaluate(morphRange);
    // Without page scripts no animation frame callback runs, so wait out a few frames instead.
    if (scripts) await scrollToY(page, Math.round((y0 + y1) / 2));
    else { await page.evaluate(`scrollTo({ top: ${Math.round((y0 + y1) / 2)}, behavior: "instant" })`); await new Promise((resolve) => setTimeout(resolve, 200)); }
    const state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.hero === 1 && state.model === 1 && state.copy === null && state.caption === 1, `${label}: ${JSON.stringify(state)}`);
  };
  await withPage({ width: 1440, height: 900, reducedMotion: true }, async (page) => {
    await page.goto(`${base}/`, { settle: 1500 });
    await still(page, "reduced motion");
    assert.deepEqual(page.errors(), []);
  });
  await withPage({ width: 1440, height: 900, javaScript: false }, async (page) => {
    await page.goto(`${base}/`);
    await still(page, "no JavaScript", { scripts: false });
  });
  // A browser without DOMMatrix: no copy, and the explorer works as before.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript("delete window.DOMMatrix;");
    await page.goto(`${base}/`, { settle: 1500 });
    await still(page, "without DOMMatrix");
    await page.click("#tab-flowbank");
    await page.waitFor(`${selectedSystem} === "flowbank"`);
    assert.deepEqual(page.errors(), []);
  });
  // Without requestIdleCallback or ResizeObserver it still runs (a timer builds the copy).
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript("delete window.requestIdleCallback; delete window.ResizeObserver;");
    await page.goto(`${base}/`);
    await readyToMorph(page);
    const { y0, y1 } = await page.evaluate(morphRange);
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.ok((await page.evaluate(morphState)).morphing, "runs without requestIdleCallback and ResizeObserver");
    assert.deepEqual(page.errors(), []);
  });
});

test("hero to explorer: where the browser lays the stage's floors on one plane, both figures stay as they are", async () => {
  // As Playwright's WebKit build does: it accepts preserve-3d, but draws the four floors in one
  // place, so the copy's floors would have nothing to land on. Here the stage's 3D is made flat.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript(`document.addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "[data-stage-scene] :is(.stack, .stack-spin, .plane) { transform-style: flat !important; }" })));`);
    await page.goto(`${base}/`);
    await page.waitFor(`document.documentElement.classList.contains("workbench-ready")`);
    assert.ok(await page.evaluate(`(() => { const tops = [...document.querySelectorAll("[data-stage-scene] .plane")].map((plane) => plane.getBoundingClientRect().top); return Math.max(...tops) - Math.min(...tops) < 1; })()`), "the floors are drawn in one place");
    const { y0, y1 } = await page.evaluate(morphRange);
    // Straight away (found out as the scroll starts), and on every pass after that.
    for (const pass of ["first", "second"]) {
      for (const y of [Math.round(y0 + 1), Math.round((y0 + y1) / 2), Math.round(y1 - 1)]) {
        await scrollToY(page, y);
        const state = await page.evaluate(morphState);
        assert.ok(!state.morphing && state.hero === 1 && state.model === 1 && state.caption === 1, `${pass} pass at ${y}px: ${JSON.stringify(state)}`);
      }
      await scrollToY(page, 0);
    }
    // The explorer works as ever.
    await scrollToY(page, Math.ceil(y1) + 1);
    await page.click("#tab-maintops");
    await page.waitFor(`${selectedSystem} === "maintops"`);
    assert.deepEqual(page.errors(), []);
  });
});

test("hero to explorer: the copy wears the theme; narrower and short windows fold the drawing in place instead, by touch too", async () => {
  for (const scheme of ["dark", "light"]) {
    await withPage({ width: 1440, height: 900, scheme }, async (page) => {
      await page.goto(`${base}/`);
      await readyToMorph(page);
      const { y0, y1 } = await page.evaluate(morphRange);
      await scrollToY(page, Math.round(y0 + (y1 - y0) * .1));
      const colours = (selector) => `(() => { const cs = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return [cs.backgroundColor, cs.borderTopColor]; })()`;
      assert.deepEqual(await page.evaluate(colours(".stack-morph .morph-face")), await page.evaluate(colours(".hero-stack > .plate")), `${scheme}: the cards are the plates' colours`);
      assert.deepEqual(await page.evaluate(colours(".stack-morph .plane:not(.is-active)")), await page.evaluate(colours("[data-stage-scene] .plane:not(.is-active)")), `${scheme}: the floors are the stage's colours`);
      assert.deepEqual(page.errors(), []);
    });
  }
  for (const [width, height, mobile] of [[320, 640, true], [390, 844, true], [600, 900, true], [820, 1180, true], [900, 1000, false], [1280, 540, false]]) {
    await withPage({ width, height, mobile }, async (page) => {
      const at = `${width}×${height}`;
      await page.goto(`${base}/`, { settle: 1200 });
      // The drawing folds as it leaves the window; the stage's floors close up as they arrive.
      const marks = await page.evaluate(`(() => { const fig = document.querySelector(".hero-figure").getBoundingClientRect(); const stage = document.querySelector("[data-wb-stage]").getBoundingClientRect(); const head = document.querySelector("[data-header]").offsetHeight; return { fold: Math.round(fig.top + scrollY + fig.height * .7 - head), settle: Math.round(stage.top + scrollY - innerHeight * .75) }; })()`);
      await scrollToY(page, marks.fold);
      assert.ok(await page.evaluate(`document.querySelector(".hero-figure").classList.contains("is-folding") && document.querySelector(".hero-figure").style.transform.startsWith("rotateX")`), `${at}: the drawing folds as it leaves`);
      await scrollToY(page, marks.settle);
      assert.ok(await page.evaluate(`document.querySelector("[data-wb-stage]").classList.contains("is-settling")`), `${at}: the stage's floors close up as they arrive`);
      await scrollToY(page, 0);
      assert.ok(!(await page.evaluate(`document.querySelector(".hero-figure").classList.contains("is-folding")`)), `${at}: unfolded at the top`);
      const state = await page.evaluate(morphState);
      assert.ok(!state.morphing && state.copy === null, `${at}: no copy here: ${JSON.stringify(state)}`);
      assert.ok((await page.evaluate("document.documentElement.scrollWidth - innerWidth")) <= 0, `${at}: overflow`);
      // By touch: swiping down the page folds it, swiping back to the top unfolds it.
      if (mobile) {
        await swipeTo(page, marks.fold);
        assert.ok(await page.evaluate(`document.querySelector(".hero-figure").classList.contains("is-folding")`), `${at}: a swipe folds it (scrolled to ${await page.evaluate("scrollY")}px of ${marks.fold}px)`);
        await swipeTo(page, 0);
        assert.ok(!(await page.evaluate(`document.querySelector(".hero-figure").classList.contains("is-folding")`)), `${at}: a swipe back unfolds it`);
      }
      assert.deepEqual(page.errors(), [], `${at}: errors`);
    });
  }
});

test("hero to explorer: nothing shifts while it runs, a keyboard visitor on a hero plate keeps the drawing, and a slow device keeps both figures", async () => {
  for (const [width, height, mobile] of [[1440, 900, false], [1024, 768, false], [390, 844, true]]) {
    await withPage({ width, height, mobile }, async (page) => {
      await page.addInitScript(`window.__cls = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });`);
      await page.goto(`${base}/`, { settle: 1200 });
      if (!mobile) await readyToMorph(page);
      const start = await page.evaluate("window.__cls");
      const { y1 } = await page.evaluate(morphRange);
      if (mobile) await swipeTo(page, Math.round(y1 + 200));
      else await page.call("Input.synthesizeScrollGesture", { x: Math.round(width / 2), y: Math.round(height / 2), yDistance: -Math.round(y1 + 200), speed: 1500, gestureSourceType: "mouse" });
      await page.evaluate(drawFrames);
      assert.ok((await page.evaluate("scrollY")) >= y1, `${width}×${height}: scrolled through`);
      const shift = (await page.evaluate("window.__cls")) - start;
      assert.ok(shift < 0.001, `${width}×${height}: layout shift during the scroll ${shift.toFixed(4)}`);
    });
  }
  // A keyboard visitor on a hero plate sees the drawing itself, wherever the page is.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await readyToMorph(page);
    const { y0, y1 } = await page.evaluate(morphRange);
    await scrollToY(page, Math.round((y0 + y1) / 2));
    assert.ok((await page.evaluate(morphState)).morphing);
    await page.evaluate(`document.querySelector(".hero-stack .plate-link").focus({ preventScroll: true }); ${drawFrames}`);
    let state = await page.evaluate(morphState);
    assert.ok(!state.morphing && state.hero === 1, `a focused plate keeps the drawing: ${JSON.stringify(state)}`);
    await page.evaluate(`document.activeElement.blur(); ${drawFrames}`);
    state = await page.evaluate(morphState);
    assert.ok(state.morphing, "it runs again when the plate loses focus");
  });
  // A device too slow to build the copy quickly (here, copying a plate's content is made slow):
  // the first pass goes by without the change, and so does every later one.
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.addInitScript(`(() => { const clone = Node.prototype.cloneNode; Node.prototype.cloneNode = function (deep) { if (this.parentElement?.closest?.(".hero-stack")) { const until = performance.now() + 25; while (performance.now() < until); } return clone.call(this, deep); }; })();`);
    await page.goto(`${base}/`, { settle: 100 });
    await page.waitFor(`document.documentElement.classList.contains("workbench-ready")`);
    const { y0, y1 } = await page.evaluate(morphRange);
    for (const wait of [0, 3500]) {
      await new Promise((resolve) => setTimeout(resolve, wait));
      await scrollToY(page, Math.round((y0 + y1) / 2));
      const state = await page.evaluate(morphState);
      assert.ok(!state.morphing && state.hero === 1 && state.model === 1 && state.caption === 1, `slow device, after ${wait}ms: ${JSON.stringify(state)}`);
      await scrollToY(page, 0);
    }
    assert.deepEqual(page.errors(), []);
  });
});
