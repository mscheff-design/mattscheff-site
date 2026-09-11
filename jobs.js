// Shared job/project data — the single source both the 3D card's résumé
// tab (card.js) and the "Selected Work" section (index.html) read from,
// so the two never describe the same job with different wording again.
//
// role is the emphasized field in both consumers (the big line); name
// (the company) is folded into the smaller secondary line alongside
// dates instead.
//
// tags is an array (not a preformatted string) because each consumer
// joins it differently: card.js joins with ' · ' for its canvas-drawn
// tags line, index.html joins with ' · ' (+ dates) for the row subtitle
// and with '<br>' for the stacked tag column.
export const JOBS = [
  {
    id: 'urban-architecture',
    role: 'Digital Manager / Digital Strategy',
    name: 'Urban Architecture Inc.',
    dates: '2022 – Present',
    tags: ['BRAND STRATEGY', 'SHOPIFY DEVELOPMENT', 'EDITORIAL'],
    caseStudyUrl: '/case-studies/urban-architecture/'
  },
  {
    id: 'bernard-figueroa-studio',
    role: 'Studio Assistant & Digital Manager',
    name: 'Bernard Figueroa Lights',
    dates: '2025 – Present',
    tags: ['PORTFOLIO WEBSITE', 'DOCUMENTATION', 'FABRICATION'],
    caseStudyUrl: '/case-studies/bernard-figueroa-studio/'
  },
  {
    id: 'statmask',
    role: 'Social Media Manager & Product Photographer',
    name: 'STATMASK',
    dates: '2020 – 2022',
    tags: ['PRODUCT PHOTOGRAPHY', 'PAID SOCIAL', 'META ADS'],
    caseStudyUrl: '/case-studies/statmask/'
  }
  // Contributor Development Partnership moved out of the case-study
  // roster to index.html's "Additional credits" list — it doesn't
  // warrant a full case study page. Its case-study files (draft
  // placeholder copy, never finished) were deleted outright rather than
  // left unlinked on disk, once that unlinked page turned out to still
  // be publicly reachable and crashing (JOBS.find(...) returning
  // undefined once this entry was removed, with no null check on the
  // page's own side).
];
