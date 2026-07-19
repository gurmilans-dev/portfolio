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
  projects: {
    erp: {
      status: "Production",
      repository: "",
      demo: "",
      primaryImage: "",
      secondaryImage: ""
    },
    // Opssemble ships diagram-first: the case study renders engineered system
    // visuals drawn from the implemented codebase. Screenshot slots stay empty until
    // sanitized captures of the real app exist; filling them renders the media blocks.
    opssemble: {
      status: "Active development",
      repository: "",
      demo: "",
      primaryImage: "",
      secondaryImage: ""
    },
    gurmat: {
      status: "Deployed community project",
      repository: "",
      demo: "",
      primaryImage: "assets/gurmat/gurmat-projector-output.png",
      primaryImageAvif: "assets/gurmat/gurmat-projector-output.avif",
      primaryImageWebp: "assets/gurmat/gurmat-projector-output.webp",
      secondaryImage: "assets/gurmat/gurmat-main-workspace.png",
      secondaryImageAvif: "assets/gurmat/gurmat-main-workspace.avif",
      secondaryImageWebp: "assets/gurmat/gurmat-main-workspace.webp",
      mobileImage: "assets/gurmat/gurmat-mobile-editor.png",
      mobileImageAvif: "assets/gurmat/gurmat-mobile-editor.avif",
      mobileImageWebp: "assets/gurmat/gurmat-mobile-editor.webp",
      transferImage: "assets/gurmat/gurmat-editor-transfer-request.png",
      transferImageAvif: "assets/gurmat/gurmat-editor-transfer-request.avif",
      transferImageWebp: "assets/gurmat/gurmat-editor-transfer-request.webp"
    },
    licenceManager: {
      context: "Private commercial component",
      repository: ""
    },
    azure: {
      status: "Academic",
      repository: ""
    }
  }
};
