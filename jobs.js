// Shared job/project data — the single source both the 3D card's résumé
// tab (card.js) and the "Selected Work" section (index.html) read from,
// so the two never describe the same job with different wording again.
//
// tags is an array (not a preformatted string) because each consumer
// joins it differently: card.js joins with ' · ' for its canvas-drawn
// tags line, index.html joins with ' · ' (+ dates) for the row subtitle
// and with '<br>' for the stacked tag column.
export const JOBS = [
  {
    id: 'urban-architecture',
    name: 'Urban Architecture Inc.',
    dates: '2022 – Present',
    tags: ['DIGITAL STRATEGY', 'E-COMMERCE', 'CONTENT'],
    description: 'A closer look at the digital strategy, e-commerce, and content work built here since 2022 — full case study coming soon.'
  },
  {
    id: 'bernard-figueroa-studio',
    name: 'Bernard Figueroa Studio',
    dates: '2025 – Present',
    tags: ['PHOTOGRAPHY', 'SOCIAL', 'EMAIL'],
    description: 'A closer look at the photography, social, and email work built here since 2025 — full case study coming soon.'
  },
  {
    id: 'statmask',
    name: 'STATMASK',
    dates: '2020 – 2022',
    tags: ['PRODUCT PHOTOGRAPHY', 'PAID SOCIAL', 'E-COMMERCE'],
    description: 'A closer look at the product photography, paid social, and e-commerce work done here from 2020 to 2022 — full case study coming soon.'
  },
  {
    id: 'contributor-development-partnership',
    name: 'Contributor Development Partnership',
    dates: '2023',
    tags: ['TRAINING', 'CRM', 'DOCUMENTATION'],
    description: 'A closer look at the training, CRM, and documentation work done here in 2023 — full case study coming soon.'
  }
];
