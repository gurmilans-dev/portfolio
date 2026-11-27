export const siteConfig = {
  profile: {
    name: "Gurmilan Singh",
    role: "Software Engineer & Full-Stack Developer",
    employmentTitle: "Software Developer",
    employer: "Phema S.r.l.",
    positioning: "I build production business software, full-stack applications, transactional backends and developer tools, from the interface down to the data and its tests.",
    experience: "3+ years of commercial software development",
    employmentPeriod: "September 2023 – Present",
    graduation: "Expected December 2026",
    location: "Modena, Italy",
    employerLocation: "Modena province, Italy",
    resume: "Gurmilan_Singh_2026_CV.pdf",
    email: "gurmilans01@gmail.com",
    github: "https://github.com/gurmilans-dev",
    linkedin: "https://www.linkedin.com/in/gurmilan-singh-017b28284",
    domain: "https://gurmilansingh.com"
  },
  // Page registration drives HTML_FILES and sitemap.xml in build.mjs. Adding a page
  // here is the only step required to get it built, validated, and indexed.
  pages: [
    { file: "index.html", priority: "1.0", indexed: true },
    { file: "erp-case-study.html", priority: "0.8", indexed: true },
    { file: "flowbank-one.html", priority: "0.8", indexed: true },
    { file: "procbeacon.html", priority: "0.8", indexed: true },
    { file: "maintops.html", priority: "0.8", indexed: true },
    { file: "gurmat-saanj.html", priority: "0.8", indexed: true },
    { file: "opssemble.html", priority: "0.8", indexed: true },
    { file: "alfaaz.html", priority: "0.7", indexed: true },
    { file: "404.html", indexed: false }
  ],
  contactForm: {
    mode: "endpoint",
    endpoint: "https://formspree.io/f/xreweqnr",
    // Cloudflare Turnstile site key — the bot check renders in PRODUCTION only
    // (skipped on localhost). Empty = no Turnstile until you paste your widget's
    // site key here (Cloudflare dashboard -> Turnstile).
    turnstileSiteKey: "",
    timeoutMs: 8000,
    messageMinLength: 20,
    messageMaxLength: 2200
  },
  // The four layers every featured system is cut through, top to bottom. The homepage
  // stack, each case file and each case study's layer cut all read their order from here.
  // Systems that do not have these layers (an extension, a modem) are not forced into
  // them: "Also built" files describe them with an architecture chain and a flow instead.
  layers: [
    { code: "L4", name: "Interface" },
    { code: "L3", name: "Application" },
    { code: "L2", name: "Data" },
    { code: "L1", name: "Delivery" }
  ],
  // Featured work. `order` decides the position in the workbench index and stack and is
  // the single place to re-rank the section — validate.mjs asserts the homepage matches.
  // "Also built" entries have `also` instead of `order`; it sets their position there.
  //
  // `system.layers` holds one [tag, sentence] pair per layer, in `layers` order. Every
  // sentence must be supported by the project's own case study or repository: these
  // summaries are evidence, not marketing copy.
  //
  // `extraTech` lists further technologies the project's repository shows in real use, beyond
  // the short `tech` line on its card (which stays as it is). Project Universe lists them with
  // the rest and highlights the ones another project shares, and search finds the project by
  // them; they are never shown on the cards. Each needs repository evidence, named in the
  // comment above it: an installed package is not evidence.
  //
  // Repository visibility is one field. `repository: ""` means the source is not public:
  // no GitHub action is rendered anywhere and the source reads "Private repository" (or
  // `sourceNote`). When a repository is made public, paste its https://github.com/... URL
  // into `repository` and rebuild: the GitHub action appears on the homepage file, the
  // case study and the "Also built" row, and the source line updates by itself. Never put
  // the URL of a private repository here — this file is published with the site's source.
  //
  // Image slots may stay empty: a case file without `primaryImage` simply shows no capture.
  // Never point these at invented or mocked-up interface art.
  projects: {
    erp: {
      order: 1,
      title: "Confidential Production Business Platform",
      shortTitle: "Business Platform",
      category: "Commercial software · Production",
      lead: "Internal business software used in daily company operations, built around shared records and role-based access.",
      tech: "React · Node.js · Relational data",
      status: "Production",
      statusClass: "badge-production",
      caseStudy: "erp-case-study.html",
      repository: "",
      sourceNote: "Confidential",
      demo: "",
      meta: {
        role: "Primary developer",
        context: "Internal business software",
        focus: "Operations · permissions · releases",
        evidence: "In daily internal use · confidential source and interface"
      },
      system: {
        head: "Replacing a legacy system, spreadsheets and paper hand-offs with one platform.",
        intro: "I am the primary developer of a full-stack system used in daily internal operations. It replaced a legacy system, separately maintained spreadsheets and paper hand-offs with one application.",
        layers: [
          ["Role-scoped screens", "Responsive screens expose only the modules and actions relevant to the authenticated user."],
          ["Server-side roles", "The API validates access and input, and applies business rules before reading or writing data."],
          ["One relational source", "One relational source for business records, time, scheduling, administration and reporting."],
          ["Daily production use", "In daily internal use. Reproduce with the user, change, release, verify, support."]
        ],
        architecture: [
          ["Product interface", "Responsive product workflows"],
          ["Application API", "Validation + role checks"],
          ["Relational database", "Connected records"]
        ],
        decision: {
          title: "Authorize modules and actions by authenticated role",
          rows: [
            ["Context", "Different responsibilities need different access."],
            ["Decision", "Authorization stays on the server: a user's role decides which modules and actions they can reach."],
            ["Result", "The interface only mirrors what the API already enforces."],
            ["Trade-off", "Every new feature has to carry its own permission rule."]
          ]
        },
        evidence: "Used in daily internal operations. Behaviour is protected by input validation, relevant automated regression checks, manual verification and direct user feedback.",
        boundary: "Source, interface, datasets and operational figures are confidential. Test counts and coverage are not published."
      },
      // Confidential: no screenshots exist and none will be fabricated.
      primaryImage: "",
      primaryImageAvif: "",
      primaryImageWebp: "",
      primaryImageWidth: 0,
      primaryImageHeight: 0,
      primaryImageAlt: "",
      primaryImageCaption: ""
    },
    flowbank: {
      order: 2,
      title: "FlowBank One",
      shortTitle: "FlowBank One",
      category: "Simulated banking platform · Java",
      lead: "A simulated digital bank built to learn transactional systems properly: a double-entry ledger, transfers that cannot be applied twice, rotating sessions, and load tests that check the books afterwards.",
      summary: "Simulated bank: double-entry ledger, idempotent transfers, measured under load.",
      tech: "Java 21 · Spring Boot · PostgreSQL · React · TypeScript",
      // infra/compose.yaml (PostgreSQL; Prometheus and Grafana in an `observability` profile),
      // backend/src/test/.../PostgresTestConfiguration.java (Testcontainers), db/migration (Flyway),
      // ModularityTest.java (Spring Modulith), micrometer-registry-prometheus with
      // infra/observability/prometheus/prometheus.yml and grafana/dashboards/*.json,
      // .github/workflows/ci.yml, frontend/e2e/*.spec.ts (Playwright).
      extraTech: ["Docker Compose", "Testcontainers", "Flyway", "Spring Modulith", "Micrometer", "Prometheus", "Grafana", "GitHub Actions", "Playwright"],
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "flowbank-one.html",
      shareCard: "assets/social/flowbank-one.png", // scripts/social-cards.mjs
      // Private for now. Paste the public GitHub URL here when the repository is published.
      repository: "",
      demo: "",
      meta: {
        role: "Sole developer",
        context: "Learning project · simulated bank",
        focus: "Ledger · concurrency · idempotency",
        evidence: "355 backend tests · measured load tests"
      },
      system: {
        head: "Every transfer is a debit and a credit, and a retry never moves money twice.",
        intro: "No real money and no real bank: every account is fictitious. Each transfer is a debit and a credit committed together or not at all, and the system is tested under concurrency and load to prove the books still balance.",
        layers: [
          ["Four-step transfer", "React and TypeScript. The access token lives only in memory; a double click sends one request, and a transfer with no answer is checked by its key, never resent."],
          ["Modular monolith", "Spring Boot with eight modules whose boundaries a Spring Modulith test enforces. Paths that lock two accounts lock them in one fixed order, so crossed transfers do not deadlock on them."],
          ["Double-entry ledger", "PostgreSQL. A deferred constraint trigger rejects any transfer whose debits and credits differ; the application can insert ledger rows but never rewrite them."],
          ["355 tests · k6 · metrics", "144 unit and 211 integration tests against a real PostgreSQL container, k6 load tests followed by twelve accounting checks, and local Prometheus metrics in two Grafana dashboards."]
        ],
        architecture: [
          ["React SPA", "Token in memory · 4-step transfer"],
          ["Spring Boot", "8 modules · idempotency · ordered locks"],
          ["PostgreSQL", "Double-entry ledger · outbox · audit"]
        ],
        decision: {
          title: "Lock accounts in one global order",
          rows: [
            ["Constraint", "Two transfers between the same accounts in opposite directions each lock one account and wait for the other."],
            ["Decision", "One component decides the lock order for every path that locks more than one account, and SQL never decides it."],
            ["Result", "1,800 crossed transfers between two accounts in the load test, with no deadlock."],
            ["Trade-off", "Writers to one busy account queue behind each other; the load test showed that queue holding pool connections, an open issue."]
          ]
        },
        evidence: "144 unit and 211 integration tests pass with ./mvnw verify, the integration tests against a real PostgreSQL container. Load-tested with k6 on a laptop: 600 concurrent €1 withdrawals from a €100 account accept exactly 100.",
        boundary: "A simulated bank built for learning: no real money, no regulated service and no production deployment. Load figures come from one laptop and are not production capacity."
      },
      primaryImage: "assets/flowbank/flowbank-dashboard.png",
      primaryImageAvif: "assets/flowbank/flowbank-dashboard.avif",
      primaryImageWebp: "assets/flowbank/flowbank-dashboard.webp",
      primaryImageWidth: 1440,
      primaryImageHeight: 900,
      primaryImageAlt: "FlowBank One dashboard for the demo user Giulia: available balance, money in and out this month, spending by category and the latest movements",
      primaryImageCaption: "The demo user's dashboard, running locally with generated history: balance, money in and out this month, spending by category and the latest movements. The interface is Italian.",
      statementImage: "assets/flowbank/flowbank-statement.png",
      statementImageAvif: "assets/flowbank/flowbank-statement.avif",
      statementImageWebp: "assets/flowbank/flowbank-statement.webp",
      statementImageWidth: 1440,
      statementImageHeight: 900,
      statementImageAlt: "FlowBank One statement as a ledger: each movement shows its entry number, date, description, category, amount and the balance after it",
      statementImageCaption: "The statement reads straight from the ledger: each row carries its entry number and the balance after it.",
      transferImage: "assets/flowbank/flowbank-transfer-check.png",
      transferImageAvif: "assets/flowbank/flowbank-transfer-check.avif",
      transferImageWebp: "assets/flowbank/flowbank-transfer-check.webp",
      transferImageWidth: 1440,
      transferImageHeight: 900,
      transferImageAlt: "Second of four transfer steps: the payee shown by first name and initial only, with amount, source account, available balance and balance after the transfer",
      transferImageCaption: "Step two of four: the payee is confirmed by a masked name before anything is sent.",
      analyticsImage: "assets/flowbank/flowbank-analytics.png",
      analyticsImageAvif: "assets/flowbank/flowbank-analytics.avif",
      analyticsImageWebp: "assets/flowbank/flowbank-analytics.webp",
      analyticsImageWidth: 1440,
      analyticsImageHeight: 700,
      analyticsImageAlt: "Spending analysis: monthly total, payments, spending by category and money in and out over six months",
      analyticsImageCaption: "Spending analysis, computed from a projection that the transactional outbox keeps up to date.",
      mobileImage: "assets/flowbank/flowbank-mobile-dashboard.png",
      mobileImageAvif: "assets/flowbank/flowbank-mobile-dashboard.avif",
      mobileImageWebp: "assets/flowbank/flowbank-mobile-dashboard.webp",
      mobileImageWidth: 780,
      mobileImageHeight: 1688,
      mobileImageAlt: "FlowBank One dashboard on a phone, with the bottom navigation bar",
      mobileImageCaption: "The same dashboard on a phone.",
      // From the repository's docs/assets/screenshots/grafana-technical.webp, cropped below Grafana's
      // toolbar (its environment selector and its link to the other dashboard); otherwise unchanged.
      grafanaImage: "assets/flowbank/flowbank-grafana-technical.png",
      grafanaImageAvif: "assets/flowbank/flowbank-grafana-technical.avif",
      grafanaImageWebp: "assets/flowbank/flowbank-grafana-technical.webp",
      grafanaImageWidth: 1440,
      grafanaImageHeight: 944,
      grafanaImageAlt: "FlowBank One's technical Grafana dashboard, labelled in Italian: one reachable instance, requests per second, a 0% share of server errors and p95 latency, then requests by outcome, latency percentiles, error responses by status and p95 latency per endpoint",
      grafanaImageCaption: "The technical dashboard during a local run with simulated traffic, built from the backend's Prometheus metrics. The figures are not production benchmarks. The interface is Italian."
    },
    procbeacon: {
      order: 3,
      title: "ProcBeacon",
      shortTitle: "ProcBeacon",
      category: "Windows developer tool · C#/.NET",
      lead: "A Windows desktop tool that connects ports, processes and project folders for developers, and only stops a process after re-verifying exactly which process it is.",
      summary: "Windows tool linking ports, processes and projects, with verified process actions.",
      tech: "C# · .NET 10 · WPF · Win32 APIs",
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "procbeacon.html",
      shareCard: "assets/social/procbeacon.png", // scripts/social-cards.mjs
      // Private for now. Paste the public GitHub URL here when the repository is published.
      repository: "",
      demo: "",
      meta: {
        role: "Sole developer",
        context: "Personal developer tool",
        focus: "Process identity · native APIs · safety",
        evidence: "438 automated tests · Release build"
      },
      system: {
        head: "Which process owns this port, and is it safe to stop?",
        intro: "Port conflicts and orphaned dev servers are a daily nuisance on Windows. ProcBeacon reads the system's own tables, links what it finds to the project folders you register, and checks a process's identity again before it ends it.",
        layers: [
          ["Four-area WPF app", "Workspaces, Ports, Processes and System, with one search across services, PIDs and ports. MVVM view models drive every view."],
          ["Identity before action", "One shared monitor feeds every area. A process is its PID plus its creation time, re-checked on the same handle before anything is ended."],
          ["Native sources", "TCP and UDP tables from IP Helper, process facts from kernel32, command lines from WMI, counters from PDH. Local registries are saved by atomic file replacement."],
          ["438 tests · preview build", "438 automated tests pass in a Release build, with native checks against fixture processes the tests start themselves. Packaged as a local, unsigned preview."]
        ],
        architecture: [
          ["WPF app", "MVVM · four areas · search"],
          ["Core", "Rules · attribution · one monitor"],
          ["Windows layer", "IP Helper · kernel32 · PDH"]
        ],
        decision: {
          title: "Identify a process by PID and creation time, on one handle",
          rows: [
            ["Constraint", "Windows reuses process IDs: the PID on screen can belong to a different program by the time you act."],
            ["Decision", "Open a handle first, then compare PID, creation time and executable path with the confirmed snapshot on that same handle."],
            ["Result", "A changed identity, a critical or protected process, or ProcBeacon itself is refused before any termination request is sent."],
            ["Trade-off", "A process that cannot be opened or read is never offered an action, even when ending it would be harmless."]
          ]
        },
        evidence: "438 automated tests pass in a Release build (21 November 2026): 69 core, 108 Windows-layer and 261 application tests, the native ones against fixture processes the tests start and end themselves.",
        boundary: "Packaged locally as an unsigned 0.1.0-preview.1, Setup and ZIP, but not distributed: clean-machine install tests, the usability review, a licence and approval to publish are still pending. The interface is Italian."
      },
      primaryImage: "assets/procbeacon/procbeacon-ports.png",
      primaryImageAvif: "assets/procbeacon/procbeacon-ports.avif",
      primaryImageWebp: "assets/procbeacon/procbeacon-ports.webp",
      primaryImageWidth: 1404,
      primaryImageHeight: 841,
      primaryImageAlt: "ProcBeacon Ports view: TCP and UDP endpoints with owning PID and process, and an inspector for an exact local-port lookup with details, timeline and local verification tabs",
      primaryImageCaption: "Port 5173 looked up exactly: both endpoints on it, the owning node process attributed as “Inferito” (inferred), and a note that a missing row does not prove the port is free. Rendered from the application's own WPF views with fixture data; the interface is Italian.",
      processesImage: "assets/procbeacon/procbeacon-processes.png",
      processesImageAvif: "assets/procbeacon/procbeacon-processes.avif",
      processesImageWebp: "assets/procbeacon/procbeacon-processes.webp",
      processesImageWidth: 1404,
      processesImageHeight: 300,
      processesImageAlt: "ProcBeacon Processes table: Node.js processes with CPU, working set, endpoint count, runtime and the workspace each is attributed to, marked inferred or unknown",
      processesImageCaption: "Processes carry their runtime and an attribution that says how it was reached: inferred, or unknown.",
      dialogImage: "assets/procbeacon/procbeacon-terminate-dialog.png",
      dialogImageAvif: "assets/procbeacon/procbeacon-terminate-dialog.avif",
      dialogImageWebp: "assets/procbeacon/procbeacon-terminate-dialog.webp",
      dialogImageWidth: 504,
      dialogImageHeight: 401,
      dialogImageAlt: "Force-terminate confirmation dialog showing the fixture process name, PID, verified creation time and path, a data-loss warning, and a disabled terminate button until the risk box is ticked",
      dialogImageCaption: "Ending a process: verified creation time and path, a stated risk, and a button that stays disabled until the risk is acknowledged."
    },
    maintops: {
      order: 4,
      title: "MaintOps",
      shortTitle: "MaintOps",
      category: "Maintenance operations platform",
      lead: "A full-stack system for handling maintenance work from request and triage through assignment, execution, SLA tracking, resolution and reporting, with optional AI suggestions that change nothing until a person accepts them.",
      tech: "React · Fastify · MySQL",
      // backend/src/modules/ai/provider/groq.client.js (the public repository).
      extraTech: ["Groq"],
      // Maturity only; whether the source is public is shown beside it ("Public source").
      status: "Runs locally",
      statusClass: "badge-local",
      caseStudy: "maintops.html",
      shareCard: "assets/social/maintops.png", // scripts/social-cards.mjs
      repository: "https://github.com/gurmilans-dev/maintops-public",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "Single organization",
        focus: "Workflow · SLA · authorization · bounded AI",
        evidence: "Public repository · frontend and backend test suites"
      },
      system: {
        head: "Who owns this fault, and is it late?",
        intro: "A requester reports a fault, a supervisor triages and assigns it, a technician does the work, and SLA cycles record whether the targets were met. The source is public; there is no hosted instance.",
        layers: [
          ["Role workspaces", "React SPA with role-specific workspaces. Frontend guards improve navigation; they are not the security boundary."],
          ["Authz in transaction", "Fastify API. Services own authorization and run it inside the same transaction as the state change."],
          ["Append-only events", "MySQL. Lifecycle changes write immutable events, SLA policies are versioned, and sessions are normalized to UTC."],
          ["Public · tested", "Public repository. Backend cases, 20 of them for the AI path, run on the native Node test runner; the frontend is covered with Vitest and Testing Library."]
        ],
        architecture: [
          ["React SPA", "Role-specific workspaces"],
          ["Fastify API", "Validation · authorization · bounded AI"],
          ["MySQL", "Records · SLA state · audit history"]
        ],
        decision: {
          title: "Put authorization in the service layer, beside the transaction",
          rows: [
            ["Constraint", "Four privilege combinations act on the same ticket from different screens."],
            ["Decision", "Services own authorization and run it inside the same transaction as the state change."],
            ["Result", "An unauthorized write cannot half-apply, and the interface can only reflect what the server already enforces."],
            ["Trade-off", "Every new transition needs its own authorization rule and its own test."]
          ]
        },
        evidence: "Public repository. Backend cases on the native Node test runner; frontend covered with Vitest and Testing Library.",
        boundary: "No hosted instance or public demo. No user counts, uptime or availability figures, because it has not been operated in production."
      },
      primaryImage: "assets/maintops/maintops-supervisor-queue.png",
      primaryImageAvif: "assets/maintops/maintops-supervisor-queue.avif",
      primaryImageWebp: "assets/maintops/maintops-supervisor-queue.webp",
      primaryImageWidth: 1905,
      primaryImageHeight: 831,
      // Inspect mode (assets/inspect.js): a few parts of a real screenshot, each explained.
      // Boxes are [x, y, width, height] in the image's own pixels. Every statement is taken
      // from the project's source: here SupervisorDashboard, SupervisorOperationsTables,
      // sla.constants and sla.repository, userPresentation, and the case study's own claims.
      inspect: {
        image: "primary",
        title: "Supervisor dashboard",
        parts: [
          {
            id: "sla", box: [276, 156, 1606, 166], title: "SLA counters",
            does: "Counts active requests by SLA state, beside the triage and priority totals: one request has breached its target, none is at risk.",
            behind: "SLA state is computed in SQL from the ticket's current SLA cycle: at risk once 75% of a target's time has passed, breached at 100%. Every cycle has two targets, time to start work and time to resolution.",
            matters: "A supervisor sees late work before anyone reports it, without opening tickets one by one.",
            decision: "Targets come from versioned SLA policies, and a reopened ticket starts a new numbered cycle instead of rewriting the old one."
          },
          {
            id: "attention", box: [276, 335, 796, 155], title: "Needs immediate attention",
            does: "Up to four open requests that need coordination now, with location, priority, SLA state, age, assignee and a Triage action.",
            behind: "A request appears here when it is at risk, breached, high priority or on hold. This one has breached and has no technician yet.",
            matters: "Exceptions come to the supervisor instead of waiting to be found in the queue.",
            terms: [["Climatizzatore sala 204 non raffredda", "The air conditioner in room 204 is not cooling"], ["7 ore fa", "7 hours ago"]]
          },
          {
            id: "activity", box: [1488, 504, 394, 309], title: "Recent activity",
            does: "The latest lifecycle updates across operations: a technician assigned, requests created, and how long ago.",
            behind: "Each line is a recorded ticket event. Lifecycle changes run inside database transactions and write immutable events, so a ticket's history is appended to, never overwritten.",
            matters: "What happened to a request can be read back in order, and the record does not change afterwards.",
            terms: [["Condizionatore non funzionante – Sala riunioni B1", "Air conditioner not working, meeting room B1"], ["2 minuti fa", "2 minutes ago"]]
          },
          {
            id: "role", box: [1632, 2, 252, 44], title: "Role and privilege",
            does: "Who is signed in: the Supervisor role, followed by Account administrator.",
            behind: "Account administrator is a flag on the account, added to the label when it is set. It is a privilege, not a fourth role, and it is what puts Users, SLA Policies and the Audit Log in the menu.",
            matters: "The menu only reflects it. Whether a request is allowed is decided by the API, not by the interface."
          }
        ]
      },
      primaryImageAlt: "MaintOps supervisor dashboard showing SLA breach and at-risk counts, an unassigned request queue, current team workload and backlog aging",
      primaryImageCaption: "The supervisor dashboard on the synthetic demo database: SLA breaches and tickets at risk, the unassigned queue, team workload and backlog age."
    },
    gurmat: {
      order: 5,
      title: "Gurmat Saanj",
      shortTitle: "Gurmat Saanj",
      category: "Real-time shared reading system",
      lead: "A deployed system that follows live Punjabi recitation, matches recognized phrases against known Gurbani, and holds a projector and connected viewers on the same line.",
      tech: "React · Node.js · Web Speech API · Transformers.js · BaniDB",
      // frontend/src/services/semanticSearch.js (onnxruntime-web, WebAssembly backend).
      extraTech: ["ONNX Runtime"],
      status: "Deployed",
      statusClass: "badge-deployed",
      caseStudy: "gurmat-saanj.html",
      shareCard: "assets/social/gurmat-saanj.png", // scripts/social-cards.mjs
      repository: "https://github.com/gurmilans-dev/gurmatsaanj",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "Community application",
        focus: "Speech matching · shared session state",
        evidence: "Deployed · used at a local Gurdwara"
      },
      system: {
        head: "Following live Gurbani recitation, line by line.",
        intro: "Built for live use at a local Gurdwara: Gurmat Saanj follows Punjabi recitation while one editor coordinates the projector and Sangat viewers read on their own devices, joining by QR or session code.",
        layers: [
          ["Projector + phones", "Projector, editor and phone viewers. Font, size, language and translation stay local to each device."],
          ["Speech → match", "Kirtan and Katha modes: Web Speech output is normalized, matched and scored against BaniDB. Editor control transfers only on approval."],
          ["Known text only", "Known BaniDB text only. Raw transcript text never reaches the display."],
          ["Deployed · in use", "Deployed and in active use at a local Gurdwara. 447 automated tests; phones pair with expiring codes and their own device tokens."]
        ],
        architecture: [
          ["React interface", "Projector · editor · viewers"],
          ["Node.js + Express", "Matching · pairing · session"],
          ["BaniDB", "Known Gurbani text"]
        ],
        decision: {
          title: "Keep known text and final selection under application control",
          rows: [
            ["Context", "Recognition can be noisy; known lines can be textually close."],
            ["Decision", "Fuzzy scores and confidence handling narrow BaniDB candidates before anything reaches the display."],
            ["Reason", "Known text and projector authority remain in the application."],
            ["Trade-off", "Uncertain input sometimes holds rather than advances."]
          ]
        },
        evidence: "Deployed and in active use at a local Gurdwara, coordinating a shared projector with connected personal reading. 447 automated tests pass across the backend and frontend.",
        boundary: "No accuracy, latency, threshold or scalability figure is published without controlled measurement. Speech recognition availability depends on the browser."
      },
      primaryImage: "assets/gurmat/gurmat-projector-output.png",
      primaryImageAvif: "assets/gurmat/gurmat-projector-output.avif",
      primaryImageWebp: "assets/gurmat/gurmat-projector-output.webp",
      primaryImageWidth: 1902,
      primaryImageHeight: 845,
      primaryImageAlt: "Gurmat Saanj projector output showing a Gurbani line with transliteration and English translation",
      primaryImageCaption: "Projector output during a shared reading session.",
      secondaryImage: "assets/gurmat/gurmat-main-workspace.png",
      secondaryImageAvif: "assets/gurmat/gurmat-main-workspace.avif",
      secondaryImageWebp: "assets/gurmat/gurmat-main-workspace.webp",
      secondaryImageWidth: 960,
      secondaryImageHeight: 817,
      // Sources: ShabadPage (status text, mic, display toggles), useFollowHold (the hold),
      // AppContext (what is sent to the projector) and ProjectorMiniPreview.
      inspect: {
        image: "secondary",
        title: "Operator workspace",
        parts: [
          {
            id: "status", box: [13, 0, 894, 105], title: "Shabad and follow status",
            does: "The shabad on screen, with its writer, granth and ang, and the state of live following: here, Paused - waiting for kirtan.",
            behind: "While the mic listens, the transcript is matched against the shabad's lines. After 2.5 seconds without a confident match, during spoken explanation or an interlude, the line is held rather than guessed; a confident match resumes following at once.",
            matters: "The room does not see the display jump to a wrong line because the singing stopped.",
            decision: "Slow to pause, quick to resume, and a manual lock by the operator always wins.",
            terms: [["Ang 711", "page 711 of the granth"], ["Kirtan", "sung recitation"]]
          },
          {
            id: "line", box: [13, 520, 895, 92], title: "The current line",
            does: "Line 2 of the shabad, highlighted, with its transliteration and English translation beneath it.",
            behind: "This is the line the application selected. Recognition only proposes candidates; the application decides which known line becomes current, and raw transcript text never reaches the display.",
            matters: "Operator, projector and viewers all follow this one selected line."
          },
          {
            id: "display", box: [353, 115, 297, 285], title: "Display controls",
            does: "Reader or prose layout; transliteration, English, Punjabi and Larivaar toggles; size, spacing and a projector focus mode.",
            behind: "The transliteration, English, Punjabi and Larivaar settings are part of the state sent to the projector. Larivaar shows Gurmukhi without spaces between words, as in the traditional form.",
            matters: "The operator sets what the room reads from the same screen used to follow the line. Viewers on their own phones keep their own preferences."
          },
          {
            id: "preview", box: [570, 678, 358, 139], title: "Projector preview",
            does: "A small, live view of what the projector is showing, which can be minimised.",
            behind: "It is the projector page itself, loaded in a frame and scaled down, not a second drawing of it.",
            matters: "What the operator checks is exactly what the room sees."
          }
        ]
      },
      mobileImage: "assets/gurmat/gurmat-mobile-editor.png",
      mobileImageAvif: "assets/gurmat/gurmat-mobile-editor.avif",
      mobileImageWebp: "assets/gurmat/gurmat-mobile-editor.webp",
      mobileImageWidth: 1290,
      mobileImageHeight: 2320,
      transferImage: "assets/gurmat/gurmat-editor-transfer-request.png",
      transferImageAvif: "assets/gurmat/gurmat-editor-transfer-request.avif",
      transferImageWebp: "assets/gurmat/gurmat-editor-transfer-request.webp",
      transferImageWidth: 1290,
      transferImageHeight: 2320
    },
    opssemble: {
      order: 6,
      title: "Opssemble",
      shortTitle: "Opssemble",
      category: "Event operations platform",
      lead: "A full-stack product for live events: areas, tasks and exceptions roll up into readiness, every write is checked against the caller's event role, and on-site staff get scoped access through revocable QR codes.",
      tech: "React · Fastify · MySQL · Server-Sent Events",
      // backend/src/modules/ai/providers/groqProvider.js and ollamaProvider.js, compose.e2e.yml and
      // deploy/staging/compose.yml, .github/workflows/ci.yml and deploy-staging.yml,
      // playwright.config.js with e2e/critical/*.spec.js.
      extraTech: ["Groq", "Ollama", "Docker Compose", "GitHub Actions", "Playwright"],
      status: "Pilot preparation",
      statusClass: "badge-development",
      caseStudy: "opssemble.html",
      shareCard: "assets/social/opssemble.png", // scripts/social-cards.mjs
      repository: "",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "University project, grown into a product",
        focus: "Event roles · live updates · scoped access · optional AI",
        evidence: "483 unit tests · recorded release checks"
      },
      system: {
        head: "Which parts of an event aren't ready, and why.",
        intro: "Opssemble began as my university final project and grew into a product being hardened for a controlled pilot. Areas hold tasks, problems become tracked exceptions with severity, and readiness is computed from what is still open.",
        layers: [
          ["Readiness dashboard", "React and MUI. Readiness, blockers and open exceptions per area, a mobile My Shift queue, and QR area workspaces for on-site staff."],
          ["Role on every write", "Fastify feature modules. Owner, coordinator, operator and viewer are checked server-side on every write; event-scoped Server-Sent Events push changes live."],
          ["Hashed tokens", "MySQL with migrations. QR, verification and reset tokens are stored only as SHA-256 hashes; evidence photos are re-encoded without metadata and served after authorization."],
          ["Release gate", "CI builds one release artefact and runs the critical browser journeys against it in Chromium and WebKit before it can be promoted. 149 frontend and 334 backend unit tests pass. Not launched."]
        ],
        architecture: [
          ["React + MUI", "Dashboard · My Shift · QR areas"],
          ["Fastify API", "Event roles · live updates · AI guardrails"],
          ["MySQL", "Migrations · hashed tokens · audit"]
        ],
        decision: {
          title: "Authorize every write against the caller's event role",
          rows: [
            ["Constraint", "Four roles act on the same event from different devices, some of them guests with a QR code."],
            ["Decision", "Role checks live in the API beside input validation, for members and scoped guest sessions alike."],
            ["Result", "The interface reflects permissions that the server already enforces."],
            ["Trade-off", "Every new write endpoint requires an authorization rule and test."]
          ]
        },
        evidence: "149 frontend unit tests and 334 backend tests pass (21 November 2026; ten MySQL integration tests run separately). A local validation of the packaged release on 4 October 2026 passed 24 critical browser journeys; it was not a live deployment.",
        boundary: "Not launched publicly: it is being prepared for a controlled pilot, so no load, uptime or usage figures exist. The interface shown is Italian."
      },
      primaryImage: "assets/opssemble/opssemble-dashboard.png",
      primaryImageAvif: "assets/opssemble/opssemble-dashboard.avif",
      primaryImageWebp: "assets/opssemble/opssemble-dashboard.webp",
      primaryImageWidth: 1900,
      primaryImageHeight: 984,
      primaryImageAlt: "Opssemble event dashboard showing a 45 per cent readiness score, blocking tasks, open exceptions and a per-area readiness summary",
      primaryImageCaption: "Screenshot from the running application: event readiness, blocking tasks and open exceptions. The interface is Italian.",
      readinessImage: "assets/opssemble/opssemble-readiness.png",
      readinessImageAvif: "assets/opssemble/opssemble-readiness.avif",
      readinessImageWebp: "assets/opssemble/opssemble-readiness.webp",
      readinessImageWidth: 1600,
      readinessImageHeight: 1000,
      // Sources: readiness.service (status, reason, score, rules), the readiness components
      // and the Italian locale, and the event_members table. The interface is Italian, so
      // each part translates what it shows.
      inspect: {
        image: "readiness",
        title: "Readiness view",
        lang: "it",
        parts: [
          {
            id: "event", box: [300, 108, 1290, 154], title: "The event, and your role in it",
            does: "The selected event, Sagra di San Rocco on 12 September 2026 in Vignola, with its status, its owner and the signed-in user's role on it.",
            behind: "Access is scoped to each event: a member holds a role on that event (coordinator, operator or viewer), stored per event and checked by the API.",
            matters: "The same person can coordinate one event and only view another.",
            terms: [["Attivo", "Active"], ["Proprietario", "Owner"], ["Coordinatore", "Coordinator"], ["Apri dettagli", "Open details"]]
          },
          {
            id: "summary", box: [312, 282, 1265, 413], title: "Areas, tasks and blockers",
            does: "The event's areas by readiness, tasks completed, active blockers and open critical exceptions.",
            behind: "Each area gets its own readiness from its tasks and exceptions, and the server returns these counts with the event's verdict.",
            matters: "They show where the event is stuck: here one blocked area, one blocked task and one critical exception still open.",
            terms: [["Aree pronte · in corso · bloccate · non iniziate", "Areas ready · in progress · blocked · not started"], ["Task completati", "Tasks completed"], ["Blocchi attivi · 1 task bloccato", "Active blockers · 1 blocked task"], ["Eccezioni critiche · 2 aperte totali", "Critical exceptions · 2 open in total"]]
          },
          {
            id: "verdict", box: [300, 735, 575, 230], title: "The verdict and its score",
            does: "The overall readiness, Blocked, with its reason in one sentence and a score.",
            behind: "Status, reason and score come from the server. An open critical exception or a blocked task blocks readiness; the score drops for each of them and for open high-severity work, and only a Ready event can reach 100%.",
            matters: "The status says what has to happen next. A score on its own would not.",
            decision: "Readiness is computed on the server from tasks and exceptions, not set by hand.",
            terms: [["Readiness complessiva", "Overall readiness"], ["Bloccato", "Blocked"], ["Un'eccezione critica aperta sul Palco blocca la preparazione dell'evento", "An open critical exception on the Stage blocks the event's preparation"], ["punteggio", "score"]]
          },
          {
            id: "rules", box: [885, 780, 695, 178], title: "The rules applied",
            does: "The rules behind the verdict, listed beside it.",
            behind: "They match what the server computes: an open critical exception or a blocked task blocks; unfinished high or critical tasks keep the event in preparation; Ready needs every task done and no open critical or high exception. The score loses 35 per critical exception, 25 per blocked task, 10 per unfinished high or critical task and 5 per high exception, each capped.",
            matters: "A coordinator can check why an event is blocked instead of trusting a number.",
            terms: [["Regole applicate", "Applied rules"], ["Un'eccezione critica aperta blocca l'evento", "An open critical exception blocks the event"], ["Un'attività bloccata blocca l'evento", "A blocked task blocks the event"], ["Pronto solo con tutte le attività completate…", "Ready only with every task complete…"]]
          }
        ]
      },
      readinessImageAlt: "Opssemble readiness view: areas ready, in progress and blocked, completed tasks, active blockers, and the applied rules that make the event blocked",
      readinessImageCaption: "The readiness view of a fixture event: one area blocked, two of six tasks done, and a 62% score marked “Bloccato” (blocked). Beside it, the rules that decided it, starting with “a critical open exception blocks the event”. Captured by the project's screenshot script; the interface is Italian.",
      qrImage: "assets/opssemble/opssemble-qr-area-mobile.png",
      qrImageAvif: "assets/opssemble/opssemble-qr-area-mobile.avif",
      qrImageWebp: "assets/opssemble/opssemble-qr-area-mobile.webp",
      qrImageWidth: 780,
      qrImageHeight: 1688,
      qrImageAlt: "Opssemble QR area workspace on a phone: one area's live tasks, an evidence request and a button to report a problem",
      qrImageCaption: "What a QR code opens on a phone: one area, its tasks and its problems, nothing else."
    },
    // "Also built": smaller, earlier or in-progress work. No `order`, so these stay out of
    // the stack; `also` sets their position. `status` says how far each has come (its
    // maturity); whether the source is public is derived from `repository` and shown beside it.
    esamarea: {
      also: 7,
      title: "Esamarea",
      shortTitle: "Esamarea",
      category: "Study planning application",
      lead: "A study planner that splits one weekly availability budget across every active exam, and records study sessions on a timer the server owns rather than the browser.",
      summary: "Study planner sharing one weekly budget across exams, with server-owned timers.",
      tech: "React · TypeScript · Express · Prisma · MySQL",
      // server/src/swagger.ts (OpenAPI 3.0.3, served by Swagger UI), docker-compose.yml (MySQL),
      // .github/workflows/ci.yml (quality, test and e2e jobs), client/playwright.config.ts.
      extraTech: ["OpenAPI", "Docker Compose", "GitHub Actions", "Playwright"],
      status: "Runs locally",
      statusClass: "badge-local",
      caseStudy: "",
      repository: "https://github.com/gurmilans-dev/esamarea",
      demo: "",
      meta: {
        role: "Full-stack developer",
        context: "Open source · MIT",
        focus: "Deterministic planning · server-owned timers",
        evidence: "Public repository · MIT · unit, API and end-to-end tests"
      },
      system: {
        head: "One weekly budget, shared across every exam.",
        intro: "Every active exam draws on the same weekly hours, so the plan shows available against planned time, flags the exams at risk and marks overloaded days. Study sessions are timed by the server.",
        architecture: [
          ["React + TypeScript", "Shared-capacity plan"],
          ["Express API", "Server-owned timers"],
          ["Prisma + MySQL", "Exams · sessions"]
        ],
        decision: {
          title: "Let the server own the timer",
          rows: [
            ["Decision", "Study sessions are recorded on a timer rebuilt from server timestamps, so a refresh, a background tab or an API restart does not change the time."],
            ["Planning", "Deterministic: one weekly availability budget is distributed across every active exam."]
          ]
        },
        evidence: "Public repository under MIT. The REST API is described by an OpenAPI 3 document served with Swagger UI, and requests are validated with Zod. GitHub Actions runs lint and build checks, unit and API tests against a MySQL service container, and Playwright end-to-end tests.",
        boundary: "No usage figures are claimed; the public repository is the evidence. The interface is Italian."
      },
      primaryImage: "assets/esamarea/esamarea-shared-plan.png",
      primaryImageAvif: "assets/esamarea/esamarea-shared-plan.avif",
      primaryImageWebp: "assets/esamarea/esamarea-shared-plan.webp",
      primaryImageWidth: 1440,
      primaryImageHeight: 950,
      primaryImageAlt: "Esamarea shared-capacity plan showing available against planned hours, the number of exams at risk, overall progress and per-day capacity marked as overloaded",
      primaryImageCaption: "One weekly availability budget, distributed across active exams. The interface is Italian."
    },
    azlune: {
      also: 8,
      title: "Azlune — Developer New Tab",
      shortTitle: "Azlune",
      category: "Chrome extension · published",
      lead: "A keyboard-first new tab for developers: search with site prefixes, pinned links, local developer tools, a focus timer, tasks and notes, in English or Italian.",
      summary: "Keyboard-first new tab for developers, published on the Chrome Web Store.",
      tech: "JavaScript · Manifest V3 · Chrome extension APIs",
      status: "Published",
      statusClass: "badge-published",
      caseStudy: "",
      repository: "https://github.com/gurmilans-dev/azlune",
      store: "https://chromewebstore.google.com/detail/azlune-%E2%80%94-developer-new-ta/ldbogcfeebljmofeaiepancponembche",
      demo: "",
      meta: { role: "Sole developer", context: "Chrome Web Store · MIT" },
      system: {
        head: "A new tab that keeps your work on the machine.",
        intro: "Azlune replaces Chrome's new tab page. Everything it stores stays in the browser, its developer tools run locally, and online search suggestions only start after you grant that permission yourself.",
        architecture: [
          ["New tab page", "Search · links · focus · tasks · notes"],
          ["Local modules", "Command palette · storage · two languages"],
          ["Service worker", "Alarms → focus-timer notifications"]
        ],
        trace: {
          title: "From the search box",
          steps: [
            "A prefix such as gh, npm or mdn sends the query to that site",
            "A tool keyword runs locally: UUID, Base64, JWT decoding, SHA-256, cron, HTTP status codes",
            "Online suggestions start only after the user grants that site's permission"
          ]
        },
        evidence: "Published on the Chrome Web Store; source public on GitHub under MIT. Manifest V3 with four permissions and a strict content security policy: a hand-written calculator parser replaces eval.",
        boundary: "No ratings, install counts or usage figures are claimed."
      },
      primaryImage: "assets/azlune/azlune-new-tab.png",
      primaryImageAvif: "assets/azlune/azlune-new-tab.avif",
      primaryImageWebp: "assets/azlune/azlune-new-tab.webp",
      primaryImageWidth: 1440,
      primaryImageHeight: 900,
      primaryImageAlt: "Azlune new tab page: greeting, clock and date, a search box, six pinned developer links, a focus timer with a 20-week streak grid, and a tasks panel, over a night city wallpaper",
      primaryImageCaption: "The new tab with its default links and wallpaper, rendered from the extension's source."
    },
    orbit: {
      also: 9,
      title: "Orbit",
      shortTitle: "Orbit",
      category: "Installable planning app · in development",
      lead: "A personal planning app for appointments with reminders, today, an inbox, a weekly and monthly planner, habits, goals and projects. It works offline first and synchronizes once you sign in.",
      summary: "Offline-first planner for appointments, tasks and goals, with sync and reminders.",
      tech: "React · TypeScript · Node.js · MySQL · PWA",
      // tests/e2e/*.spec.ts (Playwright; 16 specs run AxeBuilder), compose.yaml (MySQL, Mailpit),
      // .github/workflows/ci.yml.
      extraTech: ["Playwright", "axe-core", "Docker Compose", "GitHub Actions"],
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "",
      // Private for now. Paste the public GitHub URL here when the repository is published.
      repository: "",
      demo: "",
      meta: { role: "Sole developer", context: "Personal product" },
      system: {
        head: "Planning that keeps working offline.",
        intro: "Everything is saved on the device first. Optional verified accounts add synchronization through a Node, TypeScript and MySQL backend, and the app installs as a progressive web app, in English or Italian.",
        architecture: [
          ["React PWA", "Appointments · planner · habits · goals"],
          ["Node + TypeScript API", "Accounts · sync · reminders"],
          ["MySQL", "Synced data · reminder worker"]
        ],
        trace: {
          title: "Offline first",
          steps: [
            "Every change is saved on the device straight away",
            "Signed-in devices synchronize through the API",
            "A separate worker schedules opt-in reminders for verified accounts"
          ]
        },
        evidence: "Unit, end-to-end and installed-app suites with Vitest and Playwright. 16 of the 32 end-to-end specs also run automated axe checks against WCAG 2.2 A and AA rules: automated checks that catch many issues, not a full accessibility audit.",
        boundary: "Not released: a stable version and production deployment are not approved yet, and push delivery to real phones is unverified."
      },
      primaryImage: "assets/orbit/orbit-today.png",
      primaryImageAvif: "assets/orbit/orbit-today.avif",
      primaryImageWebp: "assets/orbit/orbit-today.webp",
      primaryImageWidth: 1600,
      primaryImageHeight: 750,
      primaryImageAlt: "Orbit Today view: navigation grouped into Day, Week and Horizon, a weekday strip, and a task list with favourites, priority and planned dates, filled with synthetic tasks",
      primaryImageCaption: "The Today view with synthetic data, from the project's documentation."
    },
    alfaaz: {
      also: 10,
      title: "Alfaaz",
      shortTitle: "Alfaaz",
      category: "Private multilingual writing system",
      lead: "A private writing environment for poetry, fragments and longer-form work across English, Hindi and Punjabi.",
      summary: "Private writing environment for English, Hindi and Punjabi, privacy by schema.",
      tech: "React · Express · MySQL",
      // tests/e2e/*.spec.js with playwright.config.js, .github/workflows/ci.yml.
      extraTech: ["Playwright", "GitHub Actions"],
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "alfaaz.html",
      shareCard: "assets/social/alfaaz.png", // scripts/social-cards.mjs
      repository: "",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "Personal product",
        focus: "Multilingual writing · concurrency · privacy",
        evidence: "1,127 automated tests · Playwright E2E"
      },
      system: {
        head: "Somewhere to write that keeps nothing it does not need.",
        intro: "Interface language and writing language are independent, and what you write is never automatically translated. Privacy is a property of the schema and the queries rather than a policy page.",
        layers: [
          ["Three-script editor", "One editor for English, Hindi and Punjabi. Transliteration runs in the browser; PDFs are drawn to canvas so Indic text shapes correctly."],
          ["Optimistic concurrency", "Layered Express API. A version mismatch refuses the write, and a restore archives the current text first."],
          ["17 migrations, no ORM", "Parameterized SQL in repositories, every user-owned read scoped by user_id. Session tokens stored only as HMAC digests."],
          ["1,127 tests · offline", "1,127 automated tests across client, server and scripts, plus a Playwright suite. Readable offline as an installed web app. Private repository, not publicly deployed."]
        ],
        architecture: [
          ["React SPA", "Editor · library · books"],
          ["Express API", "Validation · ownership · transactions"],
          ["MySQL", "18 tables · 17 migrations"]
        ],
        decision: {
          title: "Store a digest of the session token, never the token",
          rows: [
            ["Constraint", "Sessions must survive restarts and be revocable, which means persisting something."],
            ["Decision", "Issue an opaque 256-bit random token in an HttpOnly cookie and persist only its HMAC-SHA-256 digest."],
            ["Result", "Read access to the sessions table does not yield a usable credential."],
            ["Trade-off", "The digest secret joins the security surface: rotating it invalidates every live session."]
          ]
        },
        evidence: "1,127 automated tests pass: 729 client, 390 server and 8 script tests, with MySQL integration runs only against a separate test database, and Playwright end-to-end coverage of auth, mobile, exports, transliteration and voice notes.",
        boundary: "Private repository, not publicly deployed. Built as a single-writer product; no user numbers are claimed."
      },
      // The writing surface shows the product, so it leads: in the quick look and at the top
      // of the case study. The sign-in screen illustrates the design section.
      primaryImage: "assets/alfaaz/alfaaz-focus-mode.png",
      primaryImageAvif: "assets/alfaaz/alfaaz-focus-mode.avif",
      primaryImageWebp: "assets/alfaaz/alfaaz-focus-mode.webp",
      primaryImageWidth: 1897,
      primaryImageHeight: 985,
      primaryImageAlt: "Alfaaz focus mode in its dark theme: a Devanagari heading and subtitle on a ruled page, with a saved indicator, the ambience control and a live word and line count",
      primaryImageCaption: "Focus mode with rain ambience: an English interface, writing in Devanagari, and the autosave state as the small “Saved” marker at the top left.",
      signinImage: "assets/alfaaz/alfaaz-sign-in.png",
      signinImageAvif: "assets/alfaaz/alfaaz-sign-in.avif",
      signinImageWebp: "assets/alfaaz/alfaaz-sign-in.webp",
      signinImageWidth: 1843,
      signinImageHeight: 982,
      signinImageAlt: "The Alfaaz sign-in screen laid out as an open book on warm paper, with the wordmark and a botanical illustration on the left page and the sign-in form on the right",
      signinImageCaption: "The sign-in screen, set as an open book on Alfaaz's warm paper.",
      // Real brand asset, used inside the case study's design section only.
      symbol: "assets/alfaaz/alfaaz-symbol.svg"
    },
    tonequill: {
      also: 11,
      title: "ToneQuill",
      shortTitle: "ToneQuill",
      category: "Experimental acoustic modem · Rust",
      lead: "An acoustic modem and file-transfer stack that sends binary data through an ordinary speaker and microphone, with no network at all.",
      summary: "Rust acoustic modem: files through a speaker and a microphone, integrity-checked.",
      tech: "Rust · signal processing · Tauri",
      // .github/workflows/ci.yml (cargo test, clippy, frontend checks), apps/desktop/e2e/verify.mjs
      // (Playwright with an axe audit of the desktop interface).
      extraTech: ["GitHub Actions", "Playwright", "axe-core"],
      status: "Experimental",
      statusClass: "badge-experimental",
      caseStudy: "",
      repository: "https://github.com/gurmilans-dev/tonequill",
      demo: "",
      meta: { role: "Sole developer", context: "Experiment · MIT" },
      system: {
        head: "A file, sent through the air.",
        intro: "Data is split into numbered packets, each with a CRC32, modulated into two audible tones and played through a speaker. The receiver recovers timing from the microphone signal and writes the file only when every packet has arrived and the SHA-256 matches. The audio callbacks only pass fixed-size blocks to a worker thread through lock-free single-producer queues, and are written not to allocate, lock or log; blocks dropped under load are counted.",
        architecture: [
          ["Framing", "Numbered packets · CRC32"],
          ["BFSK modem", "1200 / 2200 Hz · timing recovery"],
          ["Receiver", "Reassembly · SHA-256 check"]
        ],
        trace: {
          title: "What has been validated",
          steps: [
            "Phone speaker → room air → PC microphone, received live",
            "A 17-byte file and a 257-byte, two-packet file recovered and verified by SHA-256",
            "Two-way transfer with retransmission: tested in software only"
          ]
        },
        evidence: "Public repository under MIT, with 130 Rust tests run by default. One-way phone-to-PC transfer was validated physically on ordinary hardware, in one room.",
        boundary: "Experimental, at about 100 bit/s. Two-way transfer between real devices is not validated, the 257-byte transfer needed a replay, and range and hardware variability are not measured."
      }
    },
    licenceManager: {
      also: 12,
      title: "Client-server licence manager",
      shortTitle: "Licence manager",
      category: "Private commercial component",
      context: "Private commercial component",
      lead: "C#/.NET client-server component controlling licence activation and concurrent use.",
      summary: "C#/.NET component for licence activation and concurrent use.",
      tech: "C# · .NET · Client-server architecture",
      status: "Commercial",
      statusClass: "badge-commercial",
      caseStudy: "",
      repository: "",
      sourceNote: "Private to the company",
      meta: { role: "Developer", context: "Commercial software" },
      system: {
        head: "Licence activation and concurrent use, client to server.",
        intro: "The client asks the server to validate its licence; the server checks the activation and evaluates the concurrent-use rule before it answers.",
        architecture: [
          ["Client", "Requests validation"],
          ["Server", "Checks activation"],
          ["Rule", "Concurrent use evaluated"]
        ],
        trace: {
          title: "Licence validation protocol",
          steps: ["Client requests validation", "Server checks activation", "Concurrent-use rule evaluated", "Validation result returned"]
        },
        evidence: "A private component of the company's commercial C#/.NET software.",
        boundary: "Source and interface are private to the company and not published."
      }
    },
    sird: {
      also: 13,
      title: "SIRD Epidemic Simulator",
      shortTitle: "SIRD Simulator",
      category: "Academic · Java 17 · JavaFX",
      lead: "Agent-based SIRD desktop simulator: a background engine drives moving agents with collision handling, real-time S/I/R/D visualization, and CSV export, on a model–engine–controller architecture.",
      summary: "Agent-based epidemic simulator in Java and JavaFX.",
      tech: "Java 17 · JavaFX · Maven · concurrency",
      // .github/workflows/build.yml (Maven build).
      extraTech: ["GitHub Actions"],
      status: "Academic",
      statusClass: "badge-academic",
      caseStudy: "",
      repository: "https://github.com/gurmilans-dev/sir-simulation",
      meta: { role: "Developer", context: "Academic" },
      system: {
        head: "An epidemic, one agent at a time.",
        intro: "A desktop simulation of susceptible, infected, recovered and deceased populations, modelled as individual moving agents and split into model, engine and controller.",
        architecture: [
          ["Model", "Agents · S/I/R/D state"],
          ["Engine", "Background simulation · collisions"],
          ["Controller", "JavaFX view · CSV export"]
        ],
        trace: {
          title: "Model–engine–controller",
          steps: ["A background engine drives moving agents with collision handling", "Real-time S/I/R/D visualization in JavaFX", "CSV export of the run"]
        },
        evidence: "Public repository.",
        boundary: "Academic desktop project. Not a validated epidemiological model; no accuracy figures are claimed."
      }
    }
  },

  /* Project Universe: the explorer's second view, a 3D map of all thirteen projects. Only what the
     projects above do not already say lives here: each project's domain and place in the space
     (composed by hand, from the reference prototype), the engineering concepts it shares, and the
     relationships drawn between projects. Names, categories, descriptions, technologies, statuses
     and destinations are read from the project entries (scripts/universe-data.mjs), so they cannot
     drift apart. Every concept and relationship restates something a project's own text above
     says; the comments name it. A relationship is a shared technology or concern, never a
     dependency: no project here uses another. */
  universe: {
    // Engineering domains: what kind of engineering a project is, not how far it has come (its
    // status and context stay in its own entry and in the panel).
    domains: [
      { id: "business", name: "Business & operations" },
      { id: "backend", name: "Backend & data" },
      { id: "tools", name: "Developer tools" },
      { id: "personal", name: "Personal & community" },
      { id: "experiments", name: "Experiments & academic" }
    ],
    concepts: {
      authorization: "Server-side authorization",
      workflow: "Operational workflows",
      commercial: "Commercial software",
      concurrency: "Concurrency",
      idempotency: "Idempotency",
      appendOnly: "Append-only records",
      integrity: "Data integrity checks",
      loadTesting: "Load testing",
      processIdentity: "Process identity",
      devTools: "Developer tooling",
      live: "Live updates",
      sync: "Cross-device synchronization",
      speech: "Speech matching",
      punjabi: "Punjabi text support",
      scopedAccess: "Scoped QR access",
      planning: "Planning",
      serverTime: "Server-owned timers",
      keyboard: "Keyboard-first",
      offline: "Offline capabilities",
      privacy: "Privacy by schema",
      simulation: "Agent-based simulation",
      licensing: "Licence activation",
      aiAssist: "AI assistance with guardrails",
      observability: "Metrics and dashboards",
      semanticSearch: "Semantic search"
    },
    // position: [x, y, z]; y is up, the ground lies at y = -170.
    projects: {
      // "Server-side roles", "Validation + role checks", "daily internal operations", "Commercial software".
      erp: { domain: "business", position: [-145, 70, -145], concepts: ["authorization", "workflow", "commercial"] },
      // "Paths that lock two accounts lock them in one fixed order", "transfers that cannot be applied twice", "the application can insert ledger rows but never rewrite them", "A deferred constraint trigger rejects any transfer whose debits and credits differ", "load tests", "local Prometheus metrics in two Grafana dashboards".
      flowbank: { domain: "backend", position: [136, 115, -118], concepts: ["concurrency", "idempotency", "appendOnly", "integrity", "loadTesting", "observability"] },
      // "checks a process's identity again before it ends it", "for developers".
      procbeacon: { domain: "tools", position: [-205, -4, 90], concepts: ["processIdentity", "devTools"] },
      // "request and triage through assignment ... SLA", "Services own authorization", "Lifecycle changes write immutable events", "optional AI suggestions that change nothing until a person accepts them".
      maintops: { domain: "business", position: [-225, -76, -65], concepts: ["workflow", "authorization", "appendOnly", "aiAssist"] },
      // "follows live Punjabi recitation", "Operator, projector and viewers all follow this one selected line", "Search by meaning is retrieval, not a chatbot".
      gurmat: { domain: "personal", position: [35, 125, 157], concepts: ["live", "sync", "speech", "punjabi", "semanticSearch"] },
      // "readiness is computed from what is still open", "checked server-side on every write", "Server-Sent Events push changes live", "revocable QR codes", "Optional assistance, no write authority", "Offline operation is behind a feature flag ... a durable outbox".
      opssemble: { domain: "business", position: [-100, 140, -35], concepts: ["workflow", "authorization", "live", "scopedAccess", "aiAssist", "offline"] },
      // "study planner", "a timer the server owns rather than the browser".
      esamarea: { domain: "personal", position: [238, -25, -48], concepts: ["planning", "serverTime"] },
      // "A keyboard-first new tab for developers".
      azlune: { domain: "tools", position: [-95, 104, 177], concepts: ["devTools", "keyboard"] },
      // "A personal planning app", "works offline first and synchronizes once you sign in".
      orbit: { domain: "personal", position: [-18, -110, 210], concepts: ["planning", "offline", "sync"] },
      // "Optimistic concurrency", "Readable offline as an installed web app", "English, Hindi and Punjabi", "privacy by schema".
      alfaaz: { domain: "personal", position: [144, -5, 192], concepts: ["concurrency", "offline", "punjabi", "privacy"] },
      // "numbered packets, each with a CRC32", "writes the file only when every packet has arrived and the SHA-256 matches", "lock-free single-producer queues".
      tonequill: { domain: "experiments", position: [-35, -115, -175], concepts: ["integrity", "concurrency"] },
      // "licence activation", "Commercial software".
      licenceManager: { domain: "business", position: [-252, 65, -170], concepts: ["commercial", "licensing"] },
      // "Agent-based", "Java 17 · JavaFX · Maven · concurrency", "A background engine drives moving agents".
      sird: { domain: "experiments", position: [242, 108, -10], concepts: ["simulation", "concurrency"] }
    },
    // [project, project, what they share, how each does it]
    connections: [
      ["erp", "maintops", "Server-side authorization", "Both check roles on the server rather than in the browser: Business Platform's API validates input and checks roles; MaintOps runs authorization inside the same transaction as the change."],
      // MaintOps: "optional AI suggestions that change nothing until a person accepts them", "A triage suggestion stays pending until a supervisor accepts it". Opssemble: "Optional assistance, no write authority". (Their shared React, Fastify and MySQL stay findable by technology.)
      ["maintops", "opssemble", "AI assistance without write authority", "Both add optional LLM assistance behind server-side limits, and neither lets it change records on its own: MaintOps screens input with Prompt Guard and holds a triage suggestion until a supervisor accepts it; Opssemble's assistant has no write authority, so every change goes through the normal endpoints."],
      ["flowbank", "maintops", "Append-only records", "FlowBank's ledger rows can be inserted but never rewritten; MaintOps records every lifecycle change as an immutable event."],
      ["flowbank", "alfaaz", "Concurrency control", "FlowBank takes account locks in one fixed order so crossed transfers do not deadlock on them; Alfaaz uses optimistic concurrency and refuses a save whose version is out of date."],
      ["flowbank", "sird", "Java", "Both are written in Java: Java 21 with Spring Boot for a backend, Java 17 with JavaFX for a desktop simulation."],
      ["flowbank", "tonequill", "Data integrity checks", "Both verify data before trusting it: FlowBank's database rejects any transfer whose debits and credits differ; ToneQuill checks a CRC32 on every packet and writes a file only when its SHA-256 matches."],
      ["procbeacon", "licenceManager", "C# and .NET", "Both are built in C# and .NET: a WPF desktop tool, and a client-server component in commercial software."],
      ["procbeacon", "azlune", "Developer tooling", "Two tools for a developer's working day: ProcBeacon shows which process holds a port and whether it is safe to stop; Azlune is a keyboard-first new tab with local developer tools."],
      ["gurmat", "orbit", "Cross-device synchronization", "Gurmat Saanj keeps the projector and every connected viewer on the same line during a live session; Orbit synchronizes signed-in devices through its API."],
      ["gurmat", "alfaaz", "Punjabi text support", "Gurmat Saanj matches recited Punjabi against known Gurbani; Alfaaz is a writing environment for English, Hindi and Punjabi."],
      ["orbit", "alfaaz", "Offline capabilities", "Both install as web apps with offline support: Orbit works offline first and saves every change on the device; Alfaaz stays readable offline."],
      // Orbit: "Everything is saved on the device first" (an IndexedDB outbox, src/db/outbox.ts). Opssemble: "downloaded into IndexedDB, work continues through a durable outbox, and the server reconciles it with idempotent receipts".
      ["opssemble", "orbit", "Offline outbox", "Both keep working without a connection by queuing changes in IndexedDB: Orbit saves every change on the device first and synchronizes once you sign in; Opssemble's offline mode, behind a feature flag, replays a durable outbox that the server reconciles with idempotent receipts."],
      ["esamarea", "orbit", "Planning apps: React, TypeScript, MySQL", "Two planning apps on a similar stack: Esamarea shares one weekly study budget across exams; Orbit plans appointments, tasks and goals."],
      ["erp", "licenceManager", "Commercial software", "Both were built for a company as commercial software: a business platform in daily production use, and a licensing component."]
    ]
  }
};

// Featured projects in index order. Used by build.mjs and validate.mjs so the
// homepage ordering has exactly one source of truth.
export const featuredProjects = Object.entries(siteConfig.projects)
  .filter(([, project]) => typeof project.order === "number")
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key, project]) => ({ key, ...project }));

// "Also built" entries, in their configured order.
export const alsoProjects = Object.entries(siteConfig.projects)
  .filter(([, project]) => typeof project.also === "number")
  .sort((a, b) => a[1].also - b[1].also)
  .map(([key, project]) => ({ key, ...project }));

// Case studies in reading order, for previous/next pagination: featured first, then the
// "Also built" entries that have one.
export const caseStudyProjects = [...featuredProjects, ...alsoProjects].filter((project) => project.caseStudy);
