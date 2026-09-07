// Case-study block config for STATMASK.
//
// DRAFT PLACEHOLDER COPY — plausible-sounding filler, not the real project
// story. Swap for real content/images (under
// /assets/case-studies/statmask/) whenever the real material is ready.
//
// Block order is the third distinct shape used across the case studies so
// far: it opens straight into a full-bleed image right after the hero
// (no lead-in text block first), since this project's story is about
// photography-driven paid social — a bold visual open fits it better than
// the text-first opens used in urban-architecture/bernard-figueroa-studio.

function placeholder(label, w = 1200, h = 800, bg = 'd8cfc0', fg = '1c140a') {
  const escapedLabel = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='monospace' font-size='20' fill='#${fg}' fill-opacity='0.5' text-anchor='middle' dominant-baseline='middle'>${escapedLabel}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CASE_STUDY = {
  id: 'statmask',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: 'STATMASK launched at the start of 2020 needing to go from concept to a working storefront and ad creative in weeks, not months. Over the following two years we ran product photography, paid social, and the e-commerce build as one connected effort.',
        media: { type: 'image', src: placeholder('HERO IMAGE — 1600x900', 1600, 900), alt: 'STATMASK hero placeholder' }
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: placeholder('PRODUCT PHOTOGRAPHY — 1920x1080', 1920, 1080) },
        caption: 'Product photography built to work as storefront hero imagery and paid social creative from day one.'
      }
    },
    {
      type: 'glance',
      props: {
        heading: 'At a glance',
        caseId: 'STM — 03',
        items: [
          { label: 'Client', value: 'STATMASK' },
          { label: 'Role', value: 'Digital Manager, Fulfillment Lead' },
          { label: 'Engagement', value: '2020–2022' }
        ],
        scope: 'Product photography · Paid social · E-commerce'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'Overview',
        chapter: true,
        chapterLabel: 'Overview',
        lede: 'STATMASK needed to go from concept to a working storefront and ad creative in weeks, not months.',
        bullets: [
          'Launched into a suddenly crowded category at the start of 2020.',
          'Photography, paid social, and the e-commerce build ran as one connected effort for two years.'
        ],
        closing: 'The photography had to work everywhere at once — storefront, ad, and email — from day one.'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The challenge',
        chapter: true,
        chapterLabel: 'Challenge',
        lede: 'Every other DTC mask brand launching in the same window looked identical.',
        bullets: [
          'Same stock photography, same templated storefront, same three ad formats across the category.',
          'STATMASK needed a visual identity distinct enough to earn attention — on a launch timeline measured in weeks.'
        ]
      }
    },
    {
      type: 'statRow',
      props: {
        stats: [
          { value: '6 WKS', label: 'CONCEPT TO LAUNCH' },
          { value: '2.3x', label: 'ROAS' },
          { value: '140K', label: 'UNITS SOLD' }
        ]
      }
    },
    {
      type: 'quote',
      props: {
        text: 'The ad creative was the whole business early on — if it didn’t stop the scroll, nothing else mattered.',
        attribution: 'FOUNDER, STATMASK'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The approach',
        chapter: true,
        chapterLabel: 'Approach',
        lede: 'A modular photography system, sized for every placement from day one.',
        bullets: [
          'Product-only, on-body, and lifestyle shots — cropped for every paid social placement before testing began.',
          'The storefront built around the same photography, so product pages, ads, and email stayed visually identical.'
        ],
        closing: 'Creative testing never waited on a separate shoot.'
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('PRODUCT SHOT', 600, 600), alt: 'Product shot' },
          { src: placeholder('AD CREATIVE VARIANT', 600, 600), alt: 'Ad creative variant' },
          { src: placeholder('STOREFRONT PDP', 600, 600), alt: 'Storefront product detail page' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'contributor-development-partnership' }
    }
  ]
};
