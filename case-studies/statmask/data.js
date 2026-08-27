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
      type: 'textMedia',
      props: {
        heading: 'The challenge',
        body: 'Every other DTC mask brand launching in the same window looked identical — the same stock photography, the same templated storefront, the same three ad formats. STATMASK needed a visual identity distinct enough to earn attention in a suddenly crowded category, on a launch timeline measured in weeks.',
        media: { type: 'image', src: placeholder('CATEGORY LANDSCAPE') },
        orientation: 'right'
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
      type: 'textMedia',
      props: {
        heading: 'The approach',
        body: 'We shot a modular photography system — product-only, on-body, and lifestyle — sized and cropped for every paid social placement from day one, so creative testing didn’t wait on a separate shoot. The storefront was built around the same photography, keeping product pages, ads, and email visually identical rather than stitched together after the fact.',
        media: { type: 'image', src: placeholder('MODULAR SHOOT SYSTEM') },
        orientation: 'left'
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
