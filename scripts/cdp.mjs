/*
 * A small Chrome DevTools Protocol driver for the browser tests, with no dependencies: it
 * starts a headless Chrome or Chromium and speaks CDP over Node's built-in WebSocket
 * (Node 22+). Input is dispatched as real mouse, touch and key events, so the tests exercise
 * what a visitor does rather than calling the page's functions.
 *
 * The browser is found through CHROME_PATH, or the usual install locations on Windows,
 * macOS and Linux (GitHub's Ubuntu runners ship Google Chrome).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findChrome() {
  const env = process.env;
  const candidates = [env.CHROME_PATH];
  if (process.platform === "win32") {
    for (const base of [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(path.join(base, "Google", "Chrome", "Application", "chrome.exe"), path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"));
    }
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium");
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser");
  }
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

export async function launchBrowser() {
  if (typeof WebSocket !== "function") throw new Error("The browser tests need Node 22 or newer (global WebSocket).");
  const executable = findChrome();
  if (!executable) throw new Error("No Chrome, Chromium or Edge found. Set CHROME_PATH to run the browser tests.");
  const profile = await mkdtemp(path.join(os.tmpdir(), "portfolio-browser-"));
  const args = [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--disable-extensions", "--disable-background-timer-throttling",
    // A desktop page is a desktop with a mouse, whatever the host has plugged in. Chrome takes
    // (hover) and (pointer) from the machine's input devices, so a CI runner with none reports
    // hover: none and pointer: none, and every hover-only style is off. These are Blink's own
    // values for a mouse (hover = 2, fine = 4). Pages opened with `mobile` still get touch
    // emulation, which overrides them with hover: none and pointer: coarse.
    "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4",
    ...(process.env.CI ? ["--no-sandbox"] : []), "about:blank"
  ];
  const child = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`Chrome did not start: ${output.slice(-400)}`)), 30000);
    child.stderr.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Chrome exited with ${code}: ${output.slice(-400)}`)); });
  });

  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  async function newPage({ width = 1440, height = 900, mobile = false, scheme, reducedMotion = false, javaScript = true } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    const events = [];
    const interceptors = [];
    const listener = (message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const handler = interceptors.find(({ pattern }) => pattern.test(request.url));
        const reply = handler ? handler.respond(request) : null;
        const answer = () => {
          if (!reply) call("Fetch.continueRequest", { requestId }).catch(() => {});
          else if (reply.fail) call("Fetch.failRequest", { requestId, errorReason: reply.fail }).catch(() => {});
          else call("Fetch.fulfillRequest", { requestId, responseCode: reply.status ?? 200, responseHeaders: Object.entries(reply.headers ?? { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }).map(([name, value]) => ({ name, value })), body: Buffer.from(reply.body ?? "").toString("base64") }).catch(() => {});
        };
        // A reply may be held back, to see what the page shows while a request is out.
        if (reply?.delay) setTimeout(answer, reply.delay); else answer();
        return;
      }
      events.push(message);
    };
    listeners.add(listener);
    await call("Page.enable");
    await call("Runtime.enable");
    await call("Log.enable");
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    if (mobile) await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    const features = [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }];
    if (scheme) features.push({ name: "prefers-color-scheme", value: scheme });
    await call("Emulation.setEmulatedMedia", { features });
    if (!javaScript) await call("Emulation.setScriptExecutionDisabled", { value: true });

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(`evaluate failed: ${exceptionDetails.exception?.description || exceptionDetails.text}\n${expression}`);
      return result.value;
    };
    const page = {
      call,
      evaluate,
      /* Every request whose URL matches `pattern` is answered by `respond(request)`:
         { status, body, headers } to fulfil it, { fail: "BlockedByClient" } to fail it, or
         null to let it through. Call before goto(). */
      async intercept(pattern, respond) {
        interceptors.push({ pattern, respond });
        await call("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
      },
      /* Runs before any page script on every document this tab loads. */
      async addInitScript(source) { await call("Page.addScriptToEvaluateOnNewDocument", { source }); },
      /* Slows (or restores) every animation, view transitions included, across navigations. */
      async animationRate(playbackRate) { await call("Animation.enable"); await call("Animation.setPlaybackRate", { playbackRate }); },
      async goto(url, { settle = 400 } = {}) {
        const from = events.length;
        const { errorText } = await call("Page.navigate", { url });
        if (errorText) throw new Error(`navigation to ${url} failed: ${errorText}`);
        const started = Date.now();
        while (!events.slice(from).some((event) => event.method === "Page.loadEventFired")) {
          if (Date.now() - started > 20000) throw new Error(`load timed out: ${url}`);
          await sleep(25);
        }
        await sleep(settle);
      },
      async waitFor(expression, { timeout = 4000, message } = {}) {
        const started = Date.now();
        for (;;) {
          if (await evaluate(expression)) return true;
          if (Date.now() - started > timeout) throw new Error(message || `timed out waiting for ${expression}`);
          await sleep(40);
        }
      },
      async key(key, { shift = false } = {}) {
        const codes = { Tab: 9, Enter: 13, Escape: 27, " ": 32, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
        const base = { key, code: key === " " ? "Space" : key, windowsVirtualKeyCode: codes[key], modifiers: shift ? 8 : 0 };
        await call("Input.dispatchKeyEvent", { type: "keyDown", ...base, ...(key === "Enter" ? { text: "\r" } : key === " " ? { text: " " } : {}) });
        await call("Input.dispatchKeyEvent", { type: "keyUp", ...base });
        await sleep(60);
      },
      async type(text) { await call("Input.insertText", { text }); },
      /* The centre of the first element matching `selector`, scrolled into view first. */
      async point(selector, { scroll = true } = {}) {
        // Waits until the element stops moving (a smooth scroll still running, a layout settling),
        // so the input lands where the element is, not where it was.
        const box = await evaluate(`(async () => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; ${scroll ? "el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });" : ""} const frame = () => new Promise((resolve) => requestAnimationFrame(resolve)); let last = null; for (let i = 0; i < 60; i++) { await frame(); const r = el.getBoundingClientRect(); const now = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; if (last && Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5) return now; last = now; } return last; })()`);
        if (!box) throw new Error(`no element matches ${selector}`);
        return box;
      },
      async click(selector, options) {
        const { x, y } = await page.point(selector, options);
        await call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
        await sleep(80);
      },
      /* Two presses in quick succession, as a real double-click sends them (detail 1, then 2). */
      async dblclick(selector, options) {
        const { x, y } = await page.point(selector, options);
        await call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        for (const clickCount of [1, 2]) {
          await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount });
          await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount });
        }
        await sleep(80);
      },
      async tap(selector, options) {
        const { x, y } = await page.point(selector, options);
        await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await sleep(120);
      },
      /* Every console message and browser log entry since the page opened (diagnostics). */
      messages() {
        return events.flatMap((event) => {
          if (event.method === "Runtime.consoleAPICalled") return [`${event.params.type}: ${event.params.args.map((arg) => arg.value ?? arg.description).join(" ")}`];
          if (event.method === "Log.entryAdded") return [`${event.params.entry.level} (${event.params.entry.source}): ${event.params.entry.text}`];
          if (event.method === "Runtime.exceptionThrown") return [`exception: ${event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text}`];
          return [];
        });
      },
      /* Uncaught exceptions and console errors since the page opened. */
      errors() {
        return events.flatMap((event) => {
          if (event.method === "Runtime.exceptionThrown") return [event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text];
          if (event.method === "Runtime.consoleAPICalled" && event.params.type === "error") return [event.params.args.map((arg) => arg.value ?? arg.description).join(" ")];
          if (event.method === "Log.entryAdded" && event.params.entry.level === "error" && !/net::ERR_BLOCKED_BY_CLIENT|status of 404/.test(event.params.entry.text)) return [`${event.params.entry.text} ${event.params.entry.url || ""}`];
          return [];
        });
      },
      async close() {
        listeners.delete(listener);
        await send("Target.closeTarget", { targetId }).catch(() => {});
      }
    };
    return page;
  }

  return {
    newPage,
    async close() {
      ws.close();
      child.kill();
      await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(3000)]);
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    }
  };
}
