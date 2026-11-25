/*
 * "Break it yourself": two scripted simulations, one on the FlowBank One case study (lock
 * order) and one on ProcBeacon's (PID reuse). Each is a sequence of steps taken from the
 * project's code and documents, never from a live system: no database, no process, no
 * request. The build renders everything from the data below:
 *
 *   - a written transcript, which is what a reader without JavaScript gets;
 *   - the live instrument, already drawn in its start state, so assets/sims.js only has to
 *     move it from step to step (nothing appears or resizes when the script arrives);
 *   - the steps as JSON for assets/sims.js.
 *
 * A step's `set` lists what changes; the state at step n is the start state with steps 1..n
 * applied, so going back is the same as going forward from the start. Keys name what they
 * drive: `data-text` elements show the value, `data-of` elements carry it as data-is, the
 * hook for their styling.
 */

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- FlowBank One: two crossed transfers and the lock order ----------
   Sources: AccountLockOrder and PostingService (backend/…/ledger/application), ADR-0005,
   LedgerConcurrencyIT (crossed transfers, lock timeout) and PERFORMANCE_REPORT §5.4. */

const lockStart = {
  "a.bal": "€100.00", "b.bal": "€100.00", "a.lock": "", "b.lock": "", "a.wait": "", "b.wait": "",
  wait: "", "t2.name": "T2", "t2.what": "B → A · €10.00",
  "res.committed": "0 of 2", "res.deadlocks": "0", "res.retries": "0", "res.answer": "—"
};

const lockOrder = {
  id: "lock-order",
  title: "Cross two transfers, and try to make them deadlock",
  note: "A replay of FlowBank's locking protocol, step by step, scripted from its code and tests. No database runs here and no money moves.",
  labels: { plan: "planned", hidden: "", granted: "granted", waiting: "waiting", done: "committed", cancelled: "40P01", undone: "rolled back", skipped: "not run", busy: "55P03", held: "held", logged: "error" },
  scenarios: [
    {
      id: "ordered", name: "In order", sub: "what FlowBank does",
      rows: {
        t1: [["1", "FOR UPDATE · A"], ["2", "FOR UPDATE · B"], ["3", "check · post · commit"]],
        t2: [["1", "FOR UPDATE · A"], ["2", "FOR UPDATE · B"], ["3", "check · post · commit"]]
      },
      start: { ...lockStart },
      steps: [
        { title: "Two transfers at once", say: "T1 moves €25.00 from A to B while T2 moves €10.00 from B to A. Each has to lock both accounts, and both plans start with A: one component, AccountLockOrder, sorts the two ids the same way for every transfer." },
        { title: "T1 locks A", say: "T1 locks A with SELECT … FOR UPDATE: one statement per account, in the order the component decided.", set: { "ordered.t1.1": "granted", "a.lock": "T1" } },
        { title: "T2 waits for A", say: "T2 asks for A as well, not for B, its own source. A is taken, so T2 waits, and it holds nothing that T1 still needs.", set: { "ordered.t2.1": "waiting", "a.wait": "T2", wait: "t2" } },
        { title: "T1 locks B", say: "T1 locks B. Nobody can be holding B while waiting for A, so this wait can never close into a cycle.", set: { "ordered.t1.2": "granted", "b.lock": "T1" } },
        { title: "T1 commits", say: "Under both locks T1 checks status and funds, writes the debit, the credit, the audit entry and the outbox event, and commits. The deferred trigger confirms the transfer balances, and both locks are released.", set: { "ordered.t1.3": "done", "a.lock": "", "b.lock": "", "a.bal": "€75.00", "b.bal": "€125.00", "res.committed": "1 of 2" } },
        { title: "T2 gets A", say: "T2's lock on A is granted, and PostgreSQL reads the row again before handing it over: T2 sees €75.00, the balance T1 just committed, never an older one.", set: { "ordered.t2.1": "granted", "a.lock": "T2", "a.wait": "", wait: "" } },
        { title: "T2 commits", say: "T2 locks B, posts and commits. Both transfers went through, one after the other, with no deadlock and no retry. The cost was T2's wait: it held a database connection throughout, which on a busy account becomes the pool contention the load test measured.", set: { "ordered.t2.2": "granted", "ordered.t2.3": "done", "a.lock": "", "a.bal": "€85.00", "b.bal": "€115.00", "res.committed": "2 of 2", "res.answer": "both posted" } }
      ],
      result: "Both transfers committed, T2 after T1: no deadlock, no retry. T2 paid with its wait."
    },
    {
      id: "crossed", name: "Out of order", sub: "what the rule prevents",
      rows: {
        t1: [["1", "FOR UPDATE · A"], ["2", "FOR UPDATE · B"], ["3", "check · post · commit"], ["4", "log: a lock order was violated"], ["5", "attempt 2 · lock · post · commit"]],
        t2: [["1", "FOR UPDATE · B"], ["2", "FOR UPDATE · A"], ["3", "check · post · commit"]]
      },
      start: { ...lockStart, "crossed.t1.4": "hidden", "crossed.t1.5": "hidden" },
      steps: [
        { title: "Each locks its source first", say: "The same two transfers, but each locks its own source account first: the order FlowBank's rule forbids. The plans already cross, T1 wants A then B, T2 wants B then A." },
        { title: "T1 locks A", say: "T1 locks A, its source.", set: { "crossed.t1.1": "granted", "a.lock": "T1" } },
        { title: "T2 locks B", say: "T2 locks B, its source. Each transaction now holds one of the two accounts.", set: { "crossed.t2.1": "granted", "b.lock": "T2" } },
        { title: "T1 waits for B", say: "T1 asks for B and waits, because T2 holds it.", set: { "crossed.t1.2": "waiting", "b.wait": "T1", wait: "t1" } },
        { title: "T2 waits for A: deadlock", say: "T2 asks for A and waits, because T1 holds it. Each now waits for the other, a cycle that neither can leave on its own.", set: { "crossed.t2.2": "waiting", "a.wait": "T2", wait: "cycle" } },
        { title: "PostgreSQL cancels T1", say: "PostgreSQL detects the deadlock and cancels one of the two transactions, here T1, with SQLSTATE 40P01. T1 is rolled back, its lock on A is released, and T2 gets A.", set: { "crossed.t1.1": "undone", "crossed.t1.2": "cancelled", "crossed.t1.3": "skipped", "crossed.t2.2": "granted", "a.lock": "T2", "a.wait": "", "b.wait": "", wait: "", "res.deadlocks": "1" } },
        { title: "T2 commits", say: "T2 posts and commits.", set: { "crossed.t2.3": "done", "a.lock": "", "b.lock": "", "a.bal": "€110.00", "b.bal": "€90.00", "res.committed": "1 of 2" } },
        { title: "FlowBank retries T1, once", say: "PostingService sees 40P01 in a transaction it owns, logs an error saying a lock order was violated, and runs T1 once more. Nothing is in the way now, so it commits. A second deadlock would not be retried: the request would fail.", set: { "crossed.t1.4": "logged", "crossed.t1.5": "done", "a.bal": "€85.00", "b.bal": "€115.00", "res.committed": "2 of 2", "res.retries": "1", "res.answer": "both posted" } }
      ],
      result: "Both committed in the end, but only after a deadlock, a rollback, a retry and an error in the log."
    },
    {
      id: "held", name: "Held too long", sub: "the limit on waiting",
      rows: {
        t1: [["1", "FOR UPDATE · A"], ["2", "check · post · commit"]],
        t2: [["1", "FOR UPDATE · A"], ["2", "keeps the lock"]]
      },
      start: { ...lockStart, "t2.name": "S", "t2.what": "another session, holding A", "a.lock": "S", "held.t2.1": "granted", "held.t2.2": "held", "res.committed": "0 of 1" },
      steps: [
        { title: "A is already locked", say: "T1 moves €25.00 from A to B, but another session, S, holds A and does not let go, as the integration test forces it. Every posting transaction first sets lock_timeout to 3 s for itself." },
        { title: "T1 waits for A", say: "T1 asks for A and waits. While it waits it holds a database connection, so the wait must have an end.", set: { "held.t1.1": "waiting", "a.wait": "T1", wait: "s" } },
        { title: "After 3 s: 55P03", say: "After 3 s PostgreSQL stops waiting with SQLSTATE 55P03, lock not available, and the whole transaction is rolled back. Nothing was written.", set: { "held.t1.1": "busy", "held.t1.2": "skipped", "a.wait": "", wait: "" } },
        { title: "503 ACCOUNT_BUSY", say: "FlowBank answers 503 ACCOUNT_BUSY. The client can retry with the same idempotency key, so the transfer can never be applied twice. In the load test the connection pool's 2 s limit came first, so requests queued for a connection rather than for the lock.", set: { "res.answer": "503 ACCOUNT_BUSY" } }
      ],
      result: "Nothing committed and nothing changed: a retryable 503 after 3 s, instead of a wait without end."
    }
  ]
};

/* ---------- ProcBeacon: a PID that changes owner ----------
   Sources: WindowsProcessControlService (Prepare, Validate, the one-shot Session),
   ProcessControlPolicy (preflight, protected names), ProcessConfirmationWindow and
   ProcessControlTests (reused PID, critical status, a session that cannot be replayed).
   Processes, PIDs, times and paths are invented. */

// Windows paths may break after any backslash, never inside a name.
const winPath = (path) => path.replaceAll("\\", "\\​");
const node = { "snap.name": "node.exe", "snap.pid": "18244", "snap.created": "09:41:07.312", "snap.path": winPath("C:\\Program Files\\nodejs\\node.exe"), "snap.note": "listening on 5173 · from the last refresh", "slot.pid": "PID 18244" };
// What Windows has under the PID at each moment: cards stacked in one place, so the panel
// keeps the height of its tallest card whichever one is showing.
const nodeCard = { name: "node.exe", created: "09:41:07.312", path: winPath("C:\\Program Files\\nodejs\\node.exe"), state: "running" };
const gates = ["preflight", "open", "pid", "created", "critical", "path", "confirm", "act", "exit", "once"];
const pidStart = {
  ...Object.fromEntries(gates.map((gate) => [`g.${gate}`, ""])),
  handle: "none", "handle.is": "", "m.pid": "", "m.created": "", "m.path": "",
  "res.sent": "—", "res.outcome": "—", "res.ended": "—", "res.naive": "—"
};
const unreached = (...names) => Object.fromEntries(names.map((name) => [`g.${name}`, "skip"]));

const pidReuse = {
  id: "pid-reuse",
  title: "Let Windows hand the PID to another program, then try to end it",
  note: "A replay of ProcBeacon's checks, step by step, scripted from its code and tests. The processes are invented: nothing on this page touches a real one.",
  labels: { "": "pending", pass: "pass", mismatch: "mismatch", block: "blocked", skip: "not reached", sent: "sent", exited: "exited", refused: "refused" },
  gates: [
    ["preflight", "Preflight, on the snapshot"],
    ["open", "Open a handle for the PID"],
    ["pid", "PID, read on the handle"],
    ["created", "Creation time, on the handle"],
    ["critical", "Critical or protected?"],
    ["path", "Full path, on the handle"],
    ["confirm", "Confirmation, acknowledged"],
    ["act", "Re-check, then terminate via the handle"],
    ["exit", "Exit, seen on the same handle"],
    ["once", "The same session, run again"]
  ],
  scenarios: [
    {
      id: "reused", name: "PID reused", sub: "the row now names another program",
      cards: {
        node: nodeCard,
        gone: { name: "—", created: "—", path: "—", state: "no process" },
        postgres: { name: "postgres.exe", created: "09:52:30.004", path: winPath("C:\\Program Files\\PostgreSQL\\18\\bin\\postgres.exe"), state: "running" }
      },
      start: { ...pidStart, ...node, occ: "node", slot: "same" },
      steps: [
        { title: "The row you selected", say: "ProcBeacon lists node.exe, the dev server on port 5173, as PID 18244, created at 09:41:07.312. The row is a snapshot from the last refresh, not a live link to the process." },
        { title: "The dev server exits", say: "Before you click, the dev server is stopped from its terminal. PID 18244 is free, and the row on screen has not changed.", set: { occ: "gone", slot: "empty" } },
        { title: "Windows reuses PID 18244", say: "Windows starts postgres.exe, a database server, and gives it PID 18244. The row still says node.exe.", set: { occ: "postgres", slot: "other" } },
        { title: "You click Force terminate", say: "Preflight passes: the snapshot has a PID and a creation time, the PID is not reserved, and node.exe is not a protected name.", set: { "g.preflight": "pass" } },
        { title: "A handle for PID 18244", say: "ProcBeacon opens a handle for PID 18244 and gets postgres.exe, the process that has the number now. Windows does not give a PID to another process while a handle to it is open.", set: { "g.open": "pass", handle: "open, on postgres.exe", "handle.is": "open" } },
        { title: "The creation time differs", say: "On that handle the PID matches, but the creation time is 09:52:30.004, not 09:41:07.312. Outcome: IdentityChanged. The handle is closed, no termination request is sent, and postgres.exe keeps running.", set: { "g.pid": "pass", "g.created": "mismatch", ...unreached("critical", "path", "confirm", "act", "exit", "once"), "m.pid": "match", "m.created": "mismatch", handle: "closed, nothing terminated", "handle.is": "closed", "res.sent": "none", "res.outcome": "IdentityChanged", "res.ended": "nothing", "res.naive": "postgres.exe" } }
      ],
      result: "Blocked as IdentityChanged before any termination request: the database server keeps running. A tool that trusted the PID alone would have targeted it."
    },
    {
      id: "same", name: "Same process", sub: "verified, ended, and only once",
      cards: { node: nodeCard, exited: { ...nodeCard, state: "exited" } },
      start: { ...pidStart, ...node, occ: "node", slot: "same" },
      steps: [
        { title: "Nothing has changed", say: "This time nothing happens between the refresh and the click: PID 18244 is still the dev server the row describes." },
        { title: "Preflight and a handle", say: "You click Force terminate. Preflight passes, and ProcBeacon opens a handle for PID 18244: the dev server itself.", set: { "g.preflight": "pass", "g.open": "pass", handle: "open, on node.exe", "handle.is": "open" } },
        { title: "Identity verified", say: "On the handle the PID, the creation time and the full path all match the snapshot, IsProcessCritical says no, and the name is not protected.", set: { "g.pid": "pass", "g.created": "pass", "g.critical": "pass", "g.path": "pass", "m.pid": "match", "m.created": "match", "m.path": "match" } },
        { title: "Confirmation", say: "The dialog names this exact process with its verified creation time and path, warns that unsaved data can be lost, and keeps Force terminate disabled until the risk is acknowledged.", set: { "g.confirm": "pass" } },
        { title: "Act, then verify the exit", say: "Identity is checked once more on the same handle, TerminateProcess goes through that handle, and ProcBeacon waits on it. The exit is confirmed within 2 s: Exited. Without that, the result would say the request was sent but not verified.", set: { "g.act": "sent", "g.exit": "exited", occ: "exited", slot: "empty", handle: "closed after the exit", "handle.is": "closed", "res.sent": "1, on the handle", "res.outcome": "Exited", "res.ended": "node.exe" } },
        { title: "The session is spent", say: "Running the same prepared session again is refused: it was used once, and another action needs a new confirmation. One confirmation can never end two processes.", set: { "g.once": "refused", "res.naive": "node.exe too" } }
      ],
      result: "Exited, confirmed on the handle that acted; the spent session refuses a second run."
    },
    {
      id: "critical", name: "Critical process", sub: "an ordinary name, a critical flag",
      start: {
        ...pidStart, "snap.name": "agent.exe", "snap.pid": "7316", "snap.created": "08:02:51.870", "snap.path": winPath("C:\\Program Files\\Example\\agent.exe"), "snap.note": "a background agent · from the last refresh", "slot.pid": "PID 7316",
        occ: "agent", slot: "same"
      },
      cards: { agent: { name: "agent.exe", created: "08:02:51.870", path: winPath("C:\\Program Files\\Example\\agent.exe"), state: "running, marked critical" } },
      steps: [
        { title: "An ordinary name", say: "agent.exe, a background agent, has a name that is not on ProcBeacon's protected list, so its row offers Force terminate like any other." },
        { title: "Preflight and a handle", say: "Preflight passes on the snapshot, and ProcBeacon opens a handle for PID 7316.", set: { "g.preflight": "pass", "g.open": "pass", handle: "open, on agent.exe", "handle.is": "open" } },
        { title: "Identity verified", say: "The PID and the creation time match on the handle: this is the process the row describes.", set: { "g.pid": "pass", "g.created": "pass", "m.pid": "match", "m.created": "match" } },
        { title: "IsProcessCritical: yes", say: "On the handle, IsProcessCritical reports the process as critical, and ProcBeacon refuses to act on a critical process. Outcome: Blocked, before any dialog and before any termination request.", set: { "g.critical": "block", ...unreached("path", "confirm", "act", "exit", "once"), slot: "critical", handle: "closed, nothing terminated", "handle.is": "closed", "res.sent": "none", "res.outcome": "Blocked", "res.ended": "nothing", "res.naive": "agent.exe, a critical process" } }
      ],
      result: "Blocked on the handle's critical flag, although the name looked harmless."
    }
  ]
};

/* ---------- Rendering ---------- */

const stateAt = (scenario, n) => scenario.steps.slice(1, n + 1).reduce((state, step) => ({ ...state, ...step.set }), { ...scenario.start });
const start = (sim) => stateAt(sim.scenarios[0], 0); // what the live view shows before anything is chosen
const text = (state, key, empty = "") => `data-text="${key}"${empty ? ` data-empty="${esc(empty)}"` : ""}>${esc(state[key] || empty)}`;
const of = (state, key) => `data-of="${key}" data-is="${esc(state[key] ?? "")}"`;
const chip = (sim, state, key) => `<span class="sim-chip" ${of(state, key)}>${esc(sim.labels[state[key] ?? ""] ?? state[key])}</span>`;
const forScenario = (sim, scenario) => `data-for="${scenario.id}"${scenario === sim.scenarios[0] ? "" : " hidden"}`;

function head(sim) {
  return `<div class="sim-head">
                <p class="artifact-label">break it yourself · simulation</p>
                <h3 id="sim-${sim.id}-title" class="sim-title">${esc(sim.title)}</h3>
                <p class="sim-note"><span class="sim-flag">Simulated</span>${esc(sim.note)}</p>
              </div>`;
}

/* The transcript: each scenario's steps and result, as plain reading. */
function transcript(sim) {
  return `<div class="sim-static">${sim.scenarios.map((scenario) => `
                <div class="sim-case">
                  <p class="sim-case-name"><strong>${esc(scenario.name)}</strong> <span>${esc(scenario.sub)}</span></p>
                  <p>${esc(scenario.steps[0].say)}</p>
                  <ol>${scenario.steps.slice(1).map((step) => `<li><strong>${esc(step.title)}.</strong> ${esc(step.say)}</li>`).join("")}</ol>
                  <p class="sim-case-end"><span>Result</span> ${esc(scenario.result)}</p>
                </div>`).join("")}
              </div>`;
}

function scenarioPicker(sim) {
  return `<fieldset class="sim-scenarios"><legend class="sr-only">Scenario</legend>${sim.scenarios.map((scenario, i) => `<label class="sim-scenario"><input type="radio" name="sim-${sim.id}" value="${scenario.id}"${i === 0 ? " checked" : ""} autocomplete="off"><span><strong>${esc(scenario.name)}</strong><em>${esc(scenario.sub)}</em></span></label>`).join("")}</fieldset>`;
}

/* Narration: every line of every scenario stacked in one cell, only the current one shown, so
   the cell is always as tall as its longest line. A screen reader hears each step through the
   live region instead. */
function story(sim) {
  return `<div class="sim-story" aria-hidden="true">${sim.scenarios.map((scenario, s) => scenario.steps.map((step, i) => `<p ${forScenario(sim, scenario)} data-line="${scenario.id}:${i}"${s === 0 && i === 0 ? ' class="is-now"' : ""}><strong>${esc(step.title)}.</strong> ${esc(step.say)}</p>`).join("")).join("")}</div>
              <p class="sr-only" aria-live="polite" data-say></p>`;
}

function controls(sim) {
  const rails = sim.scenarios.map((scenario) => `<ol class="sim-rail" ${forScenario(sim, scenario)} aria-label="Steps of ${esc(scenario.name)}">${scenario.steps.map((step, i) => `<li><button type="button" data-go="${i}" aria-label="${i ? `Step ${i}` : "Start"}: ${esc(step.title)}"${i === 0 ? ' aria-current="step"' : ""}>${i}</button></li>`).join("")}</ol>`).join("");
  const steps = sim.scenarios[0].steps.length - 1;
  return `<div class="sim-controls">
                <div class="sim-progress">${rails}<p class="sim-count" data-count>Start · ${steps} steps</p></div>
                <div class="sim-buttons">
                  <button type="button" class="sim-btn" data-act="reset">Reset</button>
                  <button type="button" class="sim-btn" data-act="back" aria-disabled="true">Back</button>
                  <button type="button" class="sim-btn" data-act="play">Play</button>
                  <button type="button" class="sim-btn sim-btn-step" data-act="next">Step</button>
                </div>
              </div>`;
}

/* Every value a result can take, in any scenario, stacked: the cell is as tall as the longest
   from the start, so the last step (where the long ones arrive) moves nothing. */
function result(sim, state, cells) {
  const valuesOf = (key) => [...new Set(sim.scenarios.flatMap((scenario) => scenario.steps.map((_, i) => stateAt(scenario, i)[key])))];
  return `<dl class="sim-result">${cells.map(([label, key]) => `<div><dt>${esc(label)}</dt><dd class="sim-variants">${valuesOf(key).map((value) => `<span data-when="${key}=${esc(value)}"${state[key] === value ? ' class="is-on"' : ""}>${esc(value)}</span>`).join("")}</dd></div>`).join("")}</dl>`;
}

function data(sim) {
  const json = JSON.stringify({ labels: sim.labels, scenarios: sim.scenarios.map(({ id, start: first, steps }) => ({ id, start: first, steps: steps.map(({ title, set }) => ({ title, set: set || {} })) })) });
  return `<script type="application/json" class="sim-data">${json.replace(/</g, "\\u003c")}</script>`;
}

function frame(sim, stage, cells) {
  const state = start(sim);
  return `<div class="sim" id="sim-${sim.id}" role="group" data-sim="${sim.id}" aria-labelledby="sim-${sim.id}-title" data-reveal>
              ${head(sim)}
              ${transcript(sim)}
              <div class="sim-live" hidden>
                ${scenarioPicker(sim)}
                ${stage(state)}
                ${story(sim)}
                ${controls(sim)}
                ${result(sim, state, cells)}
              </div>
              ${data(sim)}
            </div>`;
}

function lane(sim, state, laneId) {
  const name = laneId === "t1" ? `<strong>T1</strong><span>A → B · €25.00</span>` : `<strong ${text(state, "t2.name")}</strong><span ${text(state, "t2.what")}</span>`;
  const rows = sim.scenarios.map((scenario) => {
    const own = stateAt(scenario, 0);
    return `<ol class="sim-rows" ${forScenario(sim, scenario)}>${scenario.rows[laneId].map(([n, label]) => {
      const key = `${scenario.id}.${laneId}.${n}`;
      const value = { ...own, [key]: own[key] ?? "plan" };
      return `<li class="sim-row" ${of(value, key)}><code>${esc(label)}</code>${chip(sim, value, key)}</li>`;
    }).join("")}</ol>`;
  }).join("");
  return `<div class="sim-panel sim-lane" role="group" data-lane="${laneId}" aria-labelledby="sim-lane-${laneId}"><p class="sim-panel-head" id="sim-lane-${laneId}">${name}</p>${rows}</div>`;
}

/* Lane rows default to "planned": the start state only names rows that begin otherwise. */
for (const scenario of lockOrder.scenarios) {
  for (const [laneId, rows] of Object.entries(scenario.rows)) for (const [n] of rows) scenario.start[`${scenario.id}.${laneId}.${n}`] ??= "plan";
}

const waitSays = [["", "Nobody is waiting."], ["t2", "T2 waits for T1. No cycle."], ["t1", "T1 waits for T2."], ["s", "T1 waits for S."], ["cycle", "T1 waits for T2 and T2 waits for T1: a deadlock."]];

function lockStage(state) {
  const sim = lockOrder;
  const account = (key, name, id) => `<tr><th scope="row">${name} <span>${id}</span></th><td ${text(state, `${key}.bal`)}</td><td><span class="sim-holder" ${of(state, `${key}.lock`)} ${text(state, `${key}.lock`, "free")}</span></td><td><span class="sim-holder" ${of(state, `${key}.wait`)} ${text(state, `${key}.wait`, "—")}</span></td></tr>`;
  return `<div class="sim-stage sim-stage-lock">
                ${lane(sim, state, "t1")}
                <div class="sim-panel sim-accounts" role="group" aria-label="Accounts and locks">
                  <p class="sim-panel-head"><strong>Accounts</strong><span>rows in PostgreSQL</span></p>
                  <table class="sim-table"><colgroup><col><col><col><col></colgroup><thead><tr><th scope="col">Account</th><th scope="col">Balance</th><th scope="col">Lock</th><th scope="col">Waiting</th></tr></thead>
                    <tbody>${account("a", "A", "9b2e…")}${account("b", "B", "41c7…")}</tbody>
                    <tfoot><tr><th scope="row">A + B</th><td>€200.00</td><td colspan="2"></td></tr></tfoot>
                  </table>
                  <div class="sim-graph" ${of(state, "wait")}>
                    <svg viewBox="0 0 240 92" aria-hidden="true" focusable="false">
                      <defs><marker id="sim-lock-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="currentColor" /></marker></defs>
                      <path stroke="currentColor" class="sim-arc sim-arc-top" d="M60 34 C 100 6, 140 6, 180 34" marker-end="url(#sim-lock-arrow)" />
                      <path stroke="currentColor" class="sim-arc sim-arc-bottom" d="M180 58 C 140 86, 100 86, 60 58" marker-end="url(#sim-lock-arrow)" />
                      <rect class="sim-node sim-node-t1" x="16" y="30" width="44" height="32" /><text x="38" y="51">T1</text>
                      <rect class="sim-node sim-node-t2" x="180" y="30" width="44" height="32" /><text x="202" y="51" ${text(state, "t2.name")}</text>
                    </svg>
                    <div class="sim-variants">${waitSays.map(([value, say]) => `<p data-when="wait=${value}"${(state.wait || "") === value ? ' class="is-on"' : ""}>${esc(say)}</p>`).join("")}</div>
                  </div>
                  <p class="sim-fine">Why A first? UUID.compareTo reads 9b2e… as a negative number, so A sorts before B. PostgreSQL would put B first, which is why SQL never decides the order.</p>
                </div>
                ${lane(sim, state, "t2")}
              </div>`;
}

function pidStage(state) {
  const sim = pidReuse;
  const field = (label, key, match) => `<div${match ? ` ${of(state, match)}` : ""}><dt>${label}</dt><dd ${text(state, key)}</dd></div>`;
  return `<div class="sim-stage sim-stage-pid">
                <div class="sim-panel sim-snap" role="group" aria-label="What the row shows">
                  <p class="sim-panel-head"><strong>The row</strong><span>what ProcBeacon showed</span></p>
                  <dl class="sim-fields">${field("Process", "snap.name")}${field("PID", "snap.pid", "m.pid")}${field("Created", "snap.created", "m.created")}${field("Path", "snap.path", "m.path")}</dl>
                  <p class="sim-panel-foot" ${text(state, "snap.note")}</p>
                </div>
                <div class="sim-panel sim-slot" role="group" ${of(state, "slot")} aria-label="What Windows has now">
                  <p class="sim-panel-head"><strong ${text(state, "slot.pid")}</strong><span>in Windows, now</span></p>
                  <div class="sim-variants">${sim.scenarios.map((scenario) => Object.entries(scenario.cards).map(([id, card]) => {
                    const on = scenario === sim.scenarios[0] && state.occ === id;
                    const row = (label, value, match) => `<div${match ? ` ${of(state, match)}` : ""}><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
                    return `<dl class="sim-fields${on ? " is-on" : ""}" ${forScenario(sim, scenario)} data-when="occ=${id}">${row("Process", card.name)}${row("Created", card.created, "m.created")}${row("Path", card.path, "m.path")}${row("State", card.state)}</dl>`;
                  }).join("")).join("")}</div>
                  <p class="sim-handle" ${of(state, "handle.is")}><span>ProcBeacon's handle</span> <strong ${text(state, "handle")}</strong></p>
                </div>
                <div class="sim-panel sim-gates" role="group" aria-label="ProcBeacon's checks">
                  <p class="sim-panel-head"><strong>ProcBeacon</strong><span>checks, in order</span></p>
                  <ol class="sim-rows">${sim.gates.map(([id, label]) => `<li class="sim-row" ${of(state, `g.${id}`)}><span>${esc(label)}</span>${chip(sim, state, `g.${id}`)}</li>`).join("")}</ol>
                </div>
              </div>`;
}

export const sims = {
  "lock-order": () => frame(lockOrder, lockStage, [["Committed", "res.committed"], ["Deadlocks", "res.deadlocks"], ["Retries", "res.retries"], ["Answer", "res.answer"]]),
  "pid-reuse": () => frame(pidReuse, pidStage, [["Terminate requests", "res.sent"], ["Outcome", "res.outcome"], ["Ended", "res.ended"], ["Trusting the PID alone would target", "res.naive"]])
};

export const simData = { "lock-order": lockOrder, "pid-reuse": pidReuse };
