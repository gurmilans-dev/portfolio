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
        head: "Full-stack software for the work behind the business.",
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
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "flowbank-one.html",
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
        head: "Every euro written twice, and never applied twice.",
        intro: "No real money and no real bank: every account is fictitious. Each transfer is a debit and a credit committed together or not at all, and the system is tested under concurrency and load to prove the books still balance.",
        layers: [
          ["Four-step transfer", "React and TypeScript. The access token lives only in memory; a double click sends one request, and a transfer with no answer is checked by its key, never resent."],
          ["Modular monolith", "Spring Boot with eight modules whose boundaries a test enforces. Accounts are locked in one fixed order, so crossed transfers cannot deadlock."],
          ["Double-entry ledger", "PostgreSQL. A deferred constraint trigger rejects any transfer whose debits and credits differ; the application can insert ledger rows but never rewrite them."],
          ["355 tests · k6", "144 unit and 211 integration tests against a real PostgreSQL container, plus k6 load tests followed by twelve accounting checks."]
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
      primaryImageCaption: "Dashboard of the demo user, running locally with generated history. The interface is Italian.",
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
      mobileImageCaption: "The same dashboard on a phone."
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
        intro: "Port conflicts and orphaned dev servers are a daily nuisance on Windows. ProcBeacon reads the system's own tables, links what it finds to the project folders you register, and treats ending a process as a decision to verify rather than a button.",
        layers: [
          ["Four-area WPF app", "Workspaces, Ports, Processes and System, with one search across services, PIDs and ports. MVVM view models drive every view."],
          ["Identity before action", "One shared monitor feeds every area. A process is its PID plus its creation time, re-checked on the same handle before anything is ended."],
          ["Native sources", "TCP and UDP tables from IP Helper, process facts from kernel32, counters from PDH. Local registries are saved by atomic file replacement."],
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
            ["Result", "A changed identity, a critical or protected process, or ProcBeacon itself is refused before any request reaches Windows."],
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
      primaryImageCaption: "Ports, with the exact-port inspector. Rendered from the application's own WPF views with fixture data; the interface is Italian.",
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
      lead: "A full-stack system for handling maintenance work from request and triage through assignment, execution, SLA tracking, resolution and reporting.",
      tech: "React · Fastify · MySQL",
      status: "Public repository",
      statusClass: "badge-public",
      caseStudy: "maintops.html",
      repository: "https://github.com/gurmilans-dev/maintops-public",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "Single organization",
        focus: "Workflow · SLA · authorization",
        evidence: "Public repository · frontend and backend test suites"
      },
      system: {
        head: "Who owns this fault, and is it late?",
        intro: "A requester reports a fault, a supervisor triages and assigns it, a technician does the work, and SLA cycles record whether the targets were met. The source is public; there is no hosted instance.",
        layers: [
          ["Role workspaces", "React SPA with role-specific workspaces. Frontend guards improve navigation; they are not the security boundary."],
          ["Authz in transaction", "Fastify API. Services own authorization and run it inside the same transaction as the state change."],
          ["Append-only events", "MySQL. Lifecycle changes write immutable events, SLA policies are versioned, and sessions are normalized to UTC."],
          ["Public · tested", "Public repository. Backend cases run on the native Node test runner; the frontend is covered with Vitest and Testing Library."]
        ],
        architecture: [
          ["React SPA", "Role-specific workspaces"],
          ["Fastify API", "Validation · authorization · transitions"],
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
      primaryImageAlt: "MaintOps supervisor dashboard showing SLA breach and at-risk counts, an unassigned request queue, current team workload and backlog aging",
      primaryImageCaption: "Supervisor dashboard, captured from the synthetic demo database."
    },
    gurmat: {
      order: 5,
      title: "Gurmat Saanj",
      shortTitle: "Gurmat Saanj",
      category: "Real-time shared reading system",
      lead: "A deployed system that follows live Punjabi recitation, matches recognized phrases against known Gurbani, and holds a projector and connected viewers on the same line.",
      tech: "React · Node.js · Web Speech API · BaniDB",
      status: "Deployed",
      statusClass: "badge-deployed",
      caseStudy: "gurmat-saanj.html",
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
      status: "Pilot preparation",
      statusClass: "badge-development",
      caseStudy: "opssemble.html",
      repository: "",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "University project, grown into a product",
        focus: "Event roles · live updates · scoped access",
        evidence: "483 unit tests · recorded release checks"
      },
      system: {
        head: "What isn't ready, and what just went wrong.",
        intro: "Opssemble began as my university final project and grew into a product being hardened for a controlled pilot. Areas hold tasks, problems become tracked exceptions with severity, and readiness is computed from what is still open.",
        layers: [
          ["Readiness dashboard", "React and MUI. Readiness, blockers and open exceptions per area, a mobile My Shift queue, and QR area workspaces for on-site staff."],
          ["Role on every write", "Fastify feature modules. Owner, coordinator, operator and viewer are checked server-side on every write; event-scoped Server-Sent Events push changes live."],
          ["Hashed tokens", "MySQL with migrations. QR, verification and reset tokens are stored only as SHA-256 hashes; evidence photos are re-encoded without metadata and served after authorization."],
          ["Release gates", "149 frontend and 334 backend unit tests pass; recorded staging checks ran critical journeys in Chromium and WebKit on the packaged build. Not launched."]
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
        evidence: "149 frontend unit tests and 334 backend tests pass (21 November 2026; ten MySQL integration tests run separately). A staging validation on 4 October 2026 recorded 24 critical browser journeys passing against the packaged release.",
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
      readinessImageAlt: "Opssemble readiness view: areas ready, in progress and blocked, completed tasks, active blockers, and the applied rules that make the event blocked",
      readinessImageCaption: "Readiness explains itself: the rules that blocked this event are listed beside the score. Captured by the project's screenshot script with fixture data.",
      qrImage: "assets/opssemble/opssemble-qr-area-mobile.png",
      qrImageAvif: "assets/opssemble/opssemble-qr-area-mobile.avif",
      qrImageWebp: "assets/opssemble/opssemble-qr-area-mobile.webp",
      qrImageWidth: 780,
      qrImageHeight: 1688,
      qrImageAlt: "Opssemble QR area workspace on a phone: one area's live tasks, an evidence request and a button to report a problem",
      qrImageCaption: "What a QR code opens on a phone: one area, its tasks and its problems, nothing else."
    },
    // "Also built": smaller, earlier or in-progress work. No `order`, so these stay out of
    // the stack; `also` sets their position. Each states what it is through `status`.
    esamarea: {
      also: 7,
      title: "Esamarea",
      shortTitle: "Esamarea",
      category: "Study planning application",
      lead: "A study planner that splits one weekly availability budget across every active exam, and records study sessions on a timer the server owns rather than the browser.",
      summary: "Study planner sharing one weekly budget across exams, with server-owned timers.",
      tech: "React · TypeScript · Express · Prisma · MySQL",
      status: "Open source",
      statusClass: "badge-public",
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
        evidence: "Public repository under MIT, with unit, API and end-to-end tests.",
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
      lead: "A personal planning app — appointments with reminders, today, inbox, a weekly and monthly planner, habits, goals and projects — that works offline first and synchronizes once you sign in.",
      summary: "Offline-first planner for appointments, tasks and goals, with sync and reminders.",
      tech: "React · TypeScript · Node.js · MySQL · PWA",
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
        evidence: "Unit, end-to-end and installable-app test suites with Vitest and Playwright.",
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
      status: "In development",
      statusClass: "badge-development",
      caseStudy: "alfaaz.html",
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
      primaryImage: "assets/alfaaz/alfaaz-sign-in.png",
      primaryImageAvif: "assets/alfaaz/alfaaz-sign-in.avif",
      primaryImageWebp: "assets/alfaaz/alfaaz-sign-in.webp",
      primaryImageWidth: 1843,
      primaryImageHeight: 982,
      primaryImageAlt: "The Alfaaz sign-in screen laid out as an open book on warm paper, with the wordmark and a botanical illustration on the left page and the sign-in form on the right",
      primaryImageCaption: "The sign-in screen, set as an open book.",
      // The writing surface itself belongs in the case study, beside the write-path
      // diagram it illustrates.
      writingImage: "assets/alfaaz/alfaaz-focus-mode.png",
      writingImageAvif: "assets/alfaaz/alfaaz-focus-mode.avif",
      writingImageWebp: "assets/alfaaz/alfaaz-focus-mode.webp",
      writingImageWidth: 1897,
      writingImageHeight: 985,
      writingImageAlt: "Alfaaz focus mode in its dark theme: a Devanagari heading and subtitle on a ruled page, with a saved indicator, the ambience control and a live word and line count",
      writingImageCaption: "Focus mode with rain ambience. The interface stays English while the writing is Devanagari — the autosave state is the small \"Saved\" marker, top left.",
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
      status: "Experimental",
      statusClass: "badge-experimental",
      caseStudy: "",
      repository: "https://github.com/gurmilans-dev/tonequill",
      demo: "",
      meta: { role: "Sole developer", context: "Experiment · MIT" },
      system: {
        head: "A file, sent through the air.",
        intro: "Data is split into numbered packets, each with a CRC32, modulated into two audible tones and played through a speaker. The receiver recovers timing from the microphone signal and writes the file only when every packet has arrived and the SHA-256 matches.",
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
        evidence: "Public repository under MIT. One-way phone-to-PC transfer was validated physically on ordinary hardware, in one room.",
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
