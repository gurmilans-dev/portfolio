export const siteConfig = {
  profile: {
    name: "Gurmilan Singh",
    role: "Full-Stack Web Developer & Software Engineer",
    employmentTitle: "Software Developer",
    positioning: "I design and build responsive interfaces, backend APIs, and data-driven workflows for software used in real operational environments.",
    experience: "2+ years of commercial software development",
    employmentPeriod: "September 2023 - Present",
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
  // Featured work. `order` decides the position in the sticky-split index and is the
  // single place to re-rank the section — validate.mjs asserts the homepage matches.
  //
  // Image slots may stay empty: a panel without `primaryImage` renders its system
  // model instead, at the same aspect ratio, so nothing shifts when a real capture
  // lands. Never point these at invented or mocked-up interface art.
  projects: {
    maintops: {
      order: 1,
      title: "MaintOps",
      category: "Maintenance operations platform",
      lead: "A full-stack system for handling maintenance work from request and triage through assignment, execution, SLA tracking, resolution and reporting.",
      tech: "React · Fastify · MySQL",
      status: "Public repository",
      statusClass: "badge-public",
      caseStudy: "maintops.html",
      repository: "https://github.com/gurmilans-dev/maintops-public",
      demo: "",
      meta: {
        role: "Full-stack development",
        focus: "Workflow · SLA · authorization",
        evidence: "Public repository · frontend and backend test suites"
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
        focus: "Operations · permissions · releases",
        evidence: "In daily internal use · confidential source and interface"
      },
      // Confidential: no screenshots exist and none will be fabricated. The panel
      // renders the operating-model card instead.
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
      category: "Real-time shared reading system",
      lead: "A deployed system that follows live Punjabi recitation, matches recognised phrases against known Gurbani, and holds a projector and connected viewers on the same line.",
      tech: "React · Node.js · Web Speech API · BaniDB",
      status: "Deployed",
      statusClass: "badge-deployed",
      caseStudy: "gurmat-saanj.html",
      repository: "https://github.com/gurmilans-dev/gurmatsaanj",
      demo: "",
      meta: {
        role: "Full-stack development",
        focus: "Speech matching · shared session state",
        evidence: "Deployed · used at a local Gurdwara"
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
      category: "Private multilingual writing system",
      lead: "A private writing environment for poetry, fragments and longer-form work across English, Hindi and Punjabi.",
      tech: "React · Express · MySQL",
      status: "Private repository",
      statusClass: "badge-private",
      caseStudy: "alfaaz.html",
      repository: "",
      demo: "",
      meta: {
        role: "Full-stack development",
        focus: "Multilingual writing · concurrency · privacy",
        evidence: "Component, integration and end-to-end test coverage"
      },
      // The repository's social/cover artwork is an unfilled template ("TITLE
      // PLACEHOLDER"), so it is not used. The panel renders the writing-system model
      // until a real Write-view capture exists.
      primaryImage: "assets/alfaaz/alfaaz-sign-in.png",
      primaryImageAvif: "assets/alfaaz/alfaaz-sign-in.avif",
      primaryImageWebp: "assets/alfaaz/alfaaz-sign-in.webp",
      primaryImageWidth: 1843,
      primaryImageHeight: 982,
      primaryImageAlt: "The Alfaaz sign-in screen laid out as an open book on warm paper, with the wordmark and a botanical illustration on the left page and the sign-in form on the right",
      primaryImageCaption: "The sign-in screen, set as an open book.",
      // The sign-in screen carries the identity on the homepage; the writing surface
      // itself belongs in the case study, beside the write-path diagram it illustrates.
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
        focus: "Readiness · exceptions · scoped access",
        evidence: "University final project · core workflow implemented"
      },
      primaryImage: "assets/opssemble/opssemble-dashboard.png",
      primaryImageAvif: "assets/opssemble/opssemble-dashboard.avif",
      primaryImageWebp: "assets/opssemble/opssemble-dashboard.webp",
      primaryImageWidth: 1900,
      primaryImageHeight: 984,
      primaryImageAlt: "Opssemble event dashboard showing a 45 per cent readiness score, blocking tasks, open exceptions and a per-area readiness summary",
      primaryImageCaption: "Event dashboard: readiness score, blocking tasks and open exceptions. The interface is Italian."
    },
    // Archive entries (06-07). No `order`, so they stay out of the featured index.
    licenceManager: {
      context: "Private commercial component",
      repository: ""
    },
    sird: {
      status: "Academic",
      repository: "https://github.com/gurmilans-dev/sir-simulation"
    }
  }
};

// Featured projects in index order. Used by build.mjs and validate.mjs so the
// homepage ordering has exactly one source of truth.
export const featuredProjects = Object.entries(siteConfig.projects)
  .filter(([, project]) => typeof project.order === "number")
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key, project]) => ({ key, ...project }));
