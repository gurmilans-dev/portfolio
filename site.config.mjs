export const siteConfig = {
  profile: {
    name: "Gurmilan Singh",
    role: "Full-Stack Web Developer & Software Engineer",
    employmentTitle: "Software Developer",
    employer: "Phema S.r.l.",
    positioning: "I design and build responsive interfaces, backend APIs, and data-driven workflows for software used in real operational environments.",
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
    { file: "maintops.html", priority: "0.8", indexed: true },
    { file: "erp-case-study.html", priority: "0.8", indexed: true },
    { file: "gurmat-saanj.html", priority: "0.8", indexed: true },
    { file: "alfaaz.html", priority: "0.8", indexed: true },
    { file: "opssemble.html", priority: "0.8", indexed: true },
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
  // The four layers every system is cut through, top to bottom. The homepage stack,
  // each case file and each case study's layer cut all read their order from here.
  layers: [
    { code: "L4", name: "Interface" },
    { code: "L3", name: "Application" },
    { code: "L2", name: "Data" },
    { code: "L1", name: "Delivery" }
  ],
  // Featured work. `order` decides the position in the workbench index and stack and is
  // the single place to re-rank the section — validate.mjs asserts the homepage matches.
  //
  // `system.layers` holds one [tag, sentence] pair per layer, in `layers` order. Every
  // sentence must be supported by the project's own case study or repository: these
  // summaries are evidence, not marketing copy.
  //
  // Image slots may stay empty: a case file without `primaryImage` says why no
  // interface is shown. Never point these at invented or mocked-up interface art.
  projects: {
    maintops: {
      order: 1,
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
    erp: {
      order: 2,
      title: "Confidential Production Business Platform",
      shortTitle: "Business Platform",
      category: "Commercial software · Production",
      lead: "Internal business software used in daily company operations, built around shared records and role-based access.",
      tech: "React · Node.js · Relational data",
      status: "Production",
      statusClass: "badge-production",
      caseStudy: "erp-case-study.html",
      repository: "",
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
    gurmat: {
      order: 3,
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
          ["Speech → match", "Web Speech output is normalized, matched and scored against BaniDB. Editor control transfers only on approval."],
          ["Known text only", "Known BaniDB text only. Raw transcript text never reaches the display."],
          ["Deployed · in use", "Deployed and in active use at a local Gurdwara. Helmet, CORS, rate limiting and input validation on the API."]
        ],
        architecture: [
          ["React interface", "Projector · editor · viewers"],
          ["Node.js + Express", "Matching · shared session"],
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
        evidence: "Deployed and in active use at a local Gurdwara, coordinating a shared projector with connected personal reading.",
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
    alfaaz: {
      order: 4,
      title: "Alfaaz",
      shortTitle: "Alfaaz",
      category: "Private multilingual writing system",
      lead: "A private writing environment for poetry, fragments and longer-form work across English, Hindi and Punjabi.",
      tech: "React · Express · MySQL",
      status: "Private repository",
      statusClass: "badge-private",
      caseStudy: "alfaaz.html",
      repository: "",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "Personal product",
        focus: "Multilingual writing · concurrency · privacy",
        evidence: "Component, integration and end-to-end test coverage"
      },
      system: {
        head: "Somewhere to write that keeps nothing it does not need.",
        intro: "Interface language and writing language are independent, and what you write is never automatically translated. Privacy is a property of the schema and the queries rather than a policy page.",
        layers: [
          ["Three-script editor", "One editor for English, Hindi and Punjabi. Transliteration runs in the browser; PDFs are drawn to canvas so Indic text shapes correctly."],
          ["Optimistic concurrency", "Layered Express API. A version mismatch refuses the write, and a restore archives the current text first."],
          ["15 migrations, no ORM", "Parameterized SQL in repositories, every user-owned read scoped by user_id. Session tokens stored only as HMAC digests."],
          ["Playwright E2E", "Vitest and Testing Library, Supertest, and a Playwright end-to-end suite. Private repository, not publicly deployed."]
        ],
        architecture: [
          ["React SPA", "Editor · library · books"],
          ["Express API", "Validation · ownership · transactions"],
          ["MySQL", "18 tables · 15 migrations"]
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
        evidence: "Component and unit tests, server tests with opt-in integration runs against a separate database, and Playwright end-to-end coverage of auth, mobile, exports, transliteration and voice notes.",
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
    opssemble: {
      order: 5,
      title: "Opssemble",
      shortTitle: "Opssemble",
      category: "Event readiness and coordination",
      lead: "A university final project for coordinating event areas, tasks, exceptions and readiness through one full-stack application.",
      tech: "React · Fastify · MySQL",
      status: "Active development",
      statusClass: "badge-academic",
      caseStudy: "opssemble.html",
      repository: "",
      demo: "",
      meta: {
        role: "End-to-end developer",
        context: "University final project",
        focus: "Readiness · exceptions · scoped access",
        evidence: "University final project · core workflow implemented"
      },
      system: {
        head: "What isn't ready, and what just went wrong.",
        intro: "Areas hold tasks, problems become tracked exceptions with severity, and readiness is computed from what is still open. The core workflow is implemented and the project is in active development.",
        layers: [
          ["Readiness dashboard", "Readiness dashboard with blocking tasks, open exceptions and a per-area summary."],
          ["4 event roles", "Fastify feature modules. Owner, coordinator, operator and viewer roles are checked on every write; optional AI has no write authority."],
          ["Derived readiness", "Readiness 0–100 derived from open work. Verification, reset and QR area tokens stored only as SHA-256 hashes."],
          ["In progress", "Active development: core workflow implemented, tests and documentation in preparation."]
        ],
        architecture: [
          ["Product interface", "Feature modules"],
          ["Application API", "Validation + event-role checks"],
          ["Relational database", "Migrations · seeds"]
        ],
        decision: {
          title: "Authorize every write against the caller's event role",
          rows: [
            ["Constraint", "Four roles act on the same event from different devices."],
            ["Decision", "Role checks live in the API beside input validation."],
            ["Result", "The interface reflects permissions that the server already enforces."],
            ["Trade-off", "Every new write endpoint requires an authorization rule and test."]
          ]
        },
        evidence: "A screenshot of the running application, and a case study documenting the module structure, roles and data rules.",
        boundary: "An active-development university project, not commercial SaaS. No load, uptime or usage figures. Public repository and test reporting are still in progress."
      },
      primaryImage: "assets/opssemble/opssemble-dashboard.png",
      primaryImageAvif: "assets/opssemble/opssemble-dashboard.avif",
      primaryImageWebp: "assets/opssemble/opssemble-dashboard.webp",
      primaryImageWidth: 1900,
      primaryImageHeight: 984,
      primaryImageAlt: "Opssemble event dashboard showing a 45 per cent readiness score, blocking tasks, open exceptions and a per-area readiness summary",
      primaryImageCaption: "Screenshot from the running application: event readiness, blocking tasks and open exceptions. The interface is Italian."
    },
    esamarea: {
      order: 6,
      title: "Esamarea",
      shortTitle: "Esamarea",
      category: "Study planning application",
      lead: "A study planner that splits one weekly availability budget across every active exam, and records study sessions on a timer the server owns rather than the browser.",
      tech: "React · TypeScript · Express · Prisma · MySQL",
      status: "Public repository",
      statusClass: "badge-public",
      // No case study: one commit, published in a day. The repository is the evidence,
      // and a six-section analysis would claim a depth the history cannot support.
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
        layers: [
          ["Shared-capacity plan", "React and TypeScript plan: available against planned hours, exams at risk, per-day capacity."],
          ["Server-owned timers", "Express API. Study sessions are timed by the server, not the browser."],
          ["Deterministic plan", "Prisma and MySQL. Deterministic planning over one shared weekly budget."],
          ["MIT · E2E tests", "Public repository under MIT, with unit, API and end-to-end tests."]
        ],
        architecture: [
          ["React + TypeScript", "Shared-capacity plan"],
          ["Express API", "Server-owned timers"],
          ["Prisma + MySQL", "Exams · sessions"]
        ],
        decision: {
          title: "Let the server own the timer",
          rows: [
            ["Decision", "Study sessions are recorded on a timer the server owns rather than the browser."],
            ["Planning", "Deterministic: one weekly availability budget is distributed across every active exam."]
          ]
        },
        evidence: "Public repository under MIT, with unit, API and end-to-end tests.",
        boundary: "No usage figures are claimed; the public repository is the evidence."
      },
      primaryImage: "assets/esamarea/esamarea-shared-plan.png",
      primaryImageAvif: "assets/esamarea/esamarea-shared-plan.avif",
      primaryImageWebp: "assets/esamarea/esamarea-shared-plan.webp",
      primaryImageWidth: 1440,
      primaryImageHeight: 950,
      primaryImageAlt: "Esamarea shared-capacity plan showing available against planned hours, the number of exams at risk, overall progress and per-day capacity marked as overloaded",
      primaryImageCaption: "One weekly availability budget, distributed across active exams. The interface is Italian."
    },
    // Additional work. No `order`, so these stay out of the stack and appear as case
    // files in the "Also" list. `archive` sets their position in that list.
    licenceManager: {
      archive: 7,
      title: "Client-server licence manager",
      shortTitle: "Licence manager",
      category: "Private commercial component",
      context: "Private commercial component",
      lead: "C#/.NET client-server component controlling licence activation and concurrent use.",
      tech: "C# · .NET · Client-server architecture",
      status: "Commercial",
      statusClass: "badge-private",
      caseStudy: "",
      repository: "",
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
      archive: 8,
      title: "SIRD Epidemic Simulator",
      shortTitle: "SIRD Simulator",
      category: "Academic · Java 17 · JavaFX",
      lead: "Agent-based SIRD desktop simulator: a background engine drives moving agents with collision handling, real-time S/I/R/D visualization, and CSV export, on a model–engine–controller architecture.",
      tech: "Java 17 · JavaFX · Maven · concurrency",
      status: "Public repository",
      statusClass: "badge-public",
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

// Additional-work case files, in "Also" order.
export const archiveProjects = Object.entries(siteConfig.projects)
  .filter(([, project]) => typeof project.archive === "number")
  .sort((a, b) => a[1].archive - b[1].archive)
  .map(([key, project]) => ({ key, ...project }));

// Case studies in reading order, for previous/next pagination.
export const caseStudyProjects = featuredProjects.filter((project) => project.caseStudy);
