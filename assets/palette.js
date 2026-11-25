/* Command palette: Ctrl+K (Cmd+K on a Mac) or the Search button in the header. script.js loads
   this file on first use; this file fetches the index (dist/assets/search-index.json, made at
   build time from the published pages and site.config.mjs) the first time the palette opens.
   Search runs here, on the visitor's device: no service, no AI. Every action is one the site
   already offers elsewhere (theme switch, CV, email, its own pages and sections). */
(() => {
  const root = document.documentElement;
  const Site = window.Site || { lockScroll() {}, unlockScroll() {} };
  let index = null;
  let indexLoad = null;
  let ui = null;
  let results = [];
  let active = -1;
  let trigger = null;
  let announceTimer = 0;

  /* ---------- Matching ---------- */
  // Words as both the index and the query split them, so "C#" and ".NET" keep their meaning.
  const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = (value) => norm(value).match(/[a-z0-9#+]+/g) || [];
  // A light stem: "authentication" also finds "authenticated" (but not "authentic"), "deadlocks" finds "deadlock".
  const stem = (word) => (word.length > 5 ? word.replace(/(ions?|ated|ating|ings?|ed|es|s)$/, "") : word);
  // The one place where the site's words differ from the one a visitor may type: it speaks of
  // sign-ins, tokens, credentials and passwords. A result still has to contain one of these words.
  const RELATED = {
    authentication: ["sign", "signs", "password", "passwords", "token", "tokens", "credential", "credentials"],
    auth: ["sign", "password", "token", "credential"],
    login: ["sign", "password", "credential"]
  };
  const FIELDS = [["title", 12], ["tags", 7], ["heading", 5], ["meta", 4], ["project", 4], ["keywords", 6], ["text", 1]];

  // Words and normalised text are worked out once per item, not on every keystroke.
  function prepare(item) {
    item.fields = FIELDS.map(([name, weight]) => [weight, words(item[name])]);
    item.normText = norm(item.text);
    item.normTitle = norm(item.title);
    return item;
  }

  // How well one query word matches one item: a whole word beats the start of a word, which
  // beats the word's stem, which beats a related word. Body text counts each mention, a little.
  function matchWord(item, term) {
    const stemmed = stem(term);
    const related = RELATED[term] || [];
    let score = 0, whole = false;
    for (const [weight, list] of item.fields) {
      let hits = 0, level = 0;
      for (const word of list) {
        if (word === term) { level = Math.max(level, 3); hits += 1; whole = true; }
        else if (word.startsWith(term)) { level = Math.max(level, 1.5); hits += 1; }
        else if (stemmed !== term && word.startsWith(stemmed)) { level = Math.max(level, 1); hits += 1; }
        else if (related.includes(word)) { level = Math.max(level, 0.7); hits += 1; }
      }
      if (level) score += weight * level * (weight === 1 ? Math.min(hits, 6) / 2 : 1);
    }
    return { score, whole };
  }

  function search(query) {
    const terms = [...new Set(words(query))];
    const phrase = norm(query).trim();
    const pool = [...commands(), ...(index?.items || [])];
    let found = [];
    for (const item of pool) {
      let total = 0;
      const wholes = [];
      let all = true;
      for (const term of terms) {
        const match = matchWord(item, term);
        if (!match.score) { all = false; break; }
        total += match.score;
        wholes.push(match.whole);
      }
      if (!all) continue;
      if (item.normTitle.includes(phrase)) total += 25;
      found.push({ item, score: total, wholes });
    }
    // A short word means itself once something matches it whole: "Java" is Java, not JavaScript.
    terms.forEach((term, i) => {
      if (term.length <= 5 && found.some((result) => result.wholes[i])) found = found.filter((result) => result.wholes[i]);
    });
    return found.sort((a, b) => b.score - a.score).slice(0, 14).map((result) => result.item);
  }

  /* ---------- Actions ---------- */
  const email = () => document.querySelector('.nav-meta a[href^="mailto:"]')?.getAttribute("href").replace(/^mailto:/, "") || index?.profile.email || "";
  const resume = () => document.querySelector(".nav-cv")?.getAttribute("href") || index?.profile.resume || "";

  function commands() {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    const list = [
      { type: "command", id: "theme", title: `Switch to the ${next} theme`, keywords: "theme colour color dark light mode appearance", sub: "The same choice as the switch in the header, remembered on this device", run: () => { close({ restore: true }); document.querySelector(`[data-theme-choice="${next}"]`)?.click(); } },
      { type: "command", id: "cv", title: "Download the CV", keywords: "cv resume résumé pdf download curriculum", sub: "PDF", run: () => { const link = Object.assign(document.createElement("a"), { href: resume(), download: "" }); document.body.append(link); link.click(); link.remove(); close({ restore: true }); } },
      { type: "command", id: "email", title: "Copy the email address", keywords: "email mail copy contact address", sub: email(), run: copyEmail }
    ];
    return list.filter((command) => command.id !== "cv" || resume()).filter((command) => command.id !== "email" || email()).map(prepare);
  }

  function copyEmail() {
    const address = email();
    const done = (message) => { ui.status.textContent = message; };
    if (!navigator.clipboard?.writeText) return done(`Copying is not available here. The address is ${address}.`);
    navigator.clipboard.writeText(address).then(() => done(`Copied ${address}`), () => done(`Could not copy. The address is ${address}.`));
  }

  function go(url) {
    const target = new URL(url, location.href);
    close({ restore: false });
    if (target.pathname !== location.pathname) { location.assign(target.href); return; }
    if (!target.hash) { scrollTo({ top: 0 }); return; }
    if (location.hash === target.hash) document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView();
    else location.hash = target.hash;
  }

  function run(item) {
    if (!item) return;
    if (item.type === "command") item.run();
    else go(item.url);
  }

  /* ---------- Rendering ---------- */
  const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function mark(text, terms) {
    if (!terms.length) return esc(text);
    const pattern = new RegExp(`(?<![a-z0-9])(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")).join("|")})`, "gi");
    return esc(text).replace(pattern, "<mark>$1</mark>");
  }
  function snippet(item, terms) {
    const text = item.text, lower = item.normText ?? norm(text);
    const at = terms.map((term) => lower.search(new RegExp(`(?<![a-z0-9])${term.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")}`))).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (at === undefined) return "";
    const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 42)) + 1);
    const end = Math.min(text.length, at + 90);
    return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
  }
  const kindOf = (item) => item.type === "section" ? `${item.project} · ${item.no}` : item.type === "project" ? (item.caseStudy ? "case study" : "project") : item.type === "place" ? "homepage" : "action";
  const groupOf = (item) => ({ command: "Actions", project: "Projects", section: "Case study sections", place: "On the homepage" })[item.type];

  function defaults() {
    const places = (index?.items || []).filter((item) => item.type === "place" && ["/#work", "/#contact"].includes(item.url));
    const projects = (index?.items || []).filter((item) => item.type === "project");
    return [...places, ...projects, ...commands()];
  }

  function render(query) {
    const terms = [...new Set(words(query))];
    results = terms.length ? search(query) : defaults();
    // Grouped by kind, groups ordered by their best result.
    const groups = [];
    for (const item of results) {
      const name = groupOf(item);
      let group = groups.find((g) => g.name === name);
      if (!group) groups.push(group = { name, items: [] });
      group.items.push(item);
    }
    results = groups.flatMap((group) => group.items);
    let n = 0;
    ui.list.innerHTML = groups.map((group, g) => `<div class="pal-group" role="group" aria-labelledby="pal-g${g}"><p class="pal-group-name" id="pal-g${g}" role="presentation">${esc(group.name)}</p>${group.items.map((item) => {
      const i = n++;
      const sub = item.type === "section" ? (terms.length && !words(`${item.title} ${item.heading} ${item.tags}`).some((w) => terms.some((t) => w.startsWith(t))) ? snippet(item, terms) || item.heading : item.heading)
        : item.type === "place" ? snippet(item, terms) || item.text.slice(0, 90)
        : item.type === "project" ? item.meta : item.sub;
      const path = item.type === "command" ? "" : `<span class="pal-path" aria-hidden="true">${esc(item.url)}</span>`;
      return `<div class="pal-opt" role="option" id="pal-o${i}" data-i="${i}" aria-selected="false"><span class="pal-kind">${esc(kindOf(item))}</span><span class="pal-main"><span class="pal-title">${mark(item.title, terms)}</span>${sub ? `<span class="pal-sub">${mark(sub, terms)}</span>` : ""}</span>${path}</div>`;
    }).join("")}</div>`).join("");
    if (!results.length) {
      ui.list.innerHTML = `<p class="pal-empty">No matches for “${esc(query.trim())}”. Try a project, a technology such as Java or PostgreSQL, or a topic such as deadlock.</p>`;
    }
    ui.input.setAttribute("aria-expanded", String(results.length > 0));
    setActive(results.length ? 0 : -1);
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      ui.status.textContent = !terms.length ? "" : results.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : "No results";
    }, 250);
  }

  function setActive(i) {
    const options = ui.list.querySelectorAll(".pal-opt");
    if (active >= 0) options[active]?.setAttribute("aria-selected", "false");
    active = i;
    if (i < 0) { ui.input.removeAttribute("aria-activedescendant"); return; }
    options[i].setAttribute("aria-selected", "true");
    ui.input.setAttribute("aria-activedescendant", options[i].id);
    options[i].scrollIntoView({ block: "nearest" });
  }

  /* ---------- The dialog ---------- */
  function build() {
    const dialog = document.createElement("dialog");
    dialog.className = "palette";
    dialog.setAttribute("aria-label", "Search the portfolio");
    const icon = document.querySelector("[data-palette-open] svg")?.outerHTML || "";
    dialog.innerHTML = `<div class="pal-box">
        <div class="pal-query">${icon}<input class="pal-input" type="text" role="combobox" aria-label="Search projects, technologies and decisions" aria-controls="pal-list" aria-autocomplete="list" aria-expanded="false" placeholder="Search projects, technologies, decisions…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" /><button class="pal-close" type="button" aria-label="Close search">esc</button></div>
        <div class="pal-list" id="pal-list" role="listbox" aria-label="Results"></div>
        <div class="pal-foot"><span class="pal-keys" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> choose <kbd>↵</kbd> open <kbd>esc</kbd> close</span><span class="pal-status" role="status" aria-live="polite"></span></div>
      </div>`;
    document.body.append(dialog);
    const els = { dialog, input: dialog.querySelector(".pal-input"), list: dialog.querySelector(".pal-list"), status: dialog.querySelector(".pal-status") };
    els.input.addEventListener("input", () => render(els.input.value));
    els.input.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (results.length) setActive((active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        run(results[active]);
      }
    });
    els.list.addEventListener("click", (event) => {
      const option = event.target instanceof Element ? event.target.closest(".pal-opt") : null;
      if (option) run(results[Number(option.dataset.i)]);
    });
    els.list.addEventListener("pointermove", (event) => {
      const option = event.target instanceof Element ? event.target.closest(".pal-opt") : null;
      if (option && Number(option.dataset.i) !== active && event.pointerType === "mouse") setActive(Number(option.dataset.i));
    });
    dialog.querySelector(".pal-close").addEventListener("click", () => close({ restore: true }));
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close({ restore: true }); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close({ restore: true }); });
    addEventListener("pagehide", () => { if (dialog.open) close({ restore: false }); });
    return els;
  }

  function loadIndex() {
    indexLoad ||= fetch("/assets/search-index.json")
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((data) => { data.items.forEach(prepare); index = data; })
      .catch(() => { indexLoad = null; throw new Error("index"); });
    return indexLoad;
  }

  function open({ trigger: from } = {}) {
    ui ||= build();
    if (ui.dialog.open) { ui.input.focus(); ui.input.select(); return; }
    trigger = from instanceof HTMLElement ? from : document.activeElement;
    ui.input.value = "";
    ui.status.textContent = "";
    ui.dialog.showModal();
    Site.lockScroll();
    ui.input.focus();
    render("");
    if (!index) {
      ui.list.insertAdjacentHTML("afterbegin", '<p class="pal-loading">Loading the index…</p>');
      loadIndex().then(() => { if (ui.dialog.open) render(ui.input.value); }, () => {
        if (!ui.dialog.open) return;
        render(ui.input.value);
        ui.status.textContent = "The search index could not be loaded. The actions still work.";
      });
    }
  }

  function close({ restore }) {
    if (!ui?.dialog.open) return;
    ui.dialog.close();
    Site.unlockScroll();
    if (restore && trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  }

  window.Palette = { open, close: () => close({ restore: true }), preload: loadIndex };
})();
