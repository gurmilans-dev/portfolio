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

test("stage: Reset view restores the angle and closes the exploded stack", async () => {
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.goto(`${base}/`);
    await page.waitFor(`document.querySelector("[data-workbench]").classList.contains("wb-ready")`);
    await page.click("[data-explode]");
    assert.equal(await page.evaluate(`document.querySelector("[data-explode]").getAttribute("aria-pressed")`), "true");
    const { x, y } = await page.point("[data-stage-scene]");
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
