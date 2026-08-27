// Case-study block config for Urban Architecture Inc.
//
// DRAFT PLACEHOLDER COPY — this narrative/stats/quote is plausible-sounding
// filler, not the real project story. It exists so the template can be
// evaluated fully fleshed out. Swap it for real content, and swap the
// placeholder() image calls for real assets under
// /assets/case-studies/urban-architecture/, whenever the real material is
// ready. The block sequence itself (hero -> textMedia -> statRow ->
// fullBleedMedia(dark) -> quote -> textMedia -> gallery -> nextProject) is
// a reasonable default order to start from, not a fixed requirement.

function placeholder(label, w = 1200, h = 800, bg = 'd8cfc0', fg = '1c140a') {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='monospace' font-size='20' fill='#${fg}' fill-opacity='0.5' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CASE_STUDY = {
  id: 'urban-architecture',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: 'Urban Architecture Inc. came to us running a five-year-old site that no longer matched how the studio actually worked — a static portfolio bolted onto a checkout flow, with content updates that took a developer to ship. Since 2022 we’ve rebuilt the digital experience end to end: strategy, storefront, and the editorial system behind it.',
        media: { type: 'image', src: placeholder('HERO IMAGE — 1600x900', 1600, 900), alt: 'Urban Architecture Inc. site, hero placeholder' }
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'The challenge',
        body: 'The old site treated the studio’s project archive and its e-commerce arm as two unrelated products, each with its own template language and content workflow. Editors were routing text changes through engineering, checkout abandoned above industry average, and there was no single source of truth for which projects, materials, or products were current. The brief wasn’t “redesign the homepage” — it was “make the site something the team can actually run day to day.”',
        media: { type: 'image', src: placeholder('SITE AUDIT / BEFORE') },
        orientation: 'right'
      }
    },
    {
      type: 'statRow',
      props: {
        stats: [
          { value: '3.4x', label: 'CONVERSION LIFT' },
          { value: '48%', label: 'FASTER LOAD TIME' },
          { value: '12', label: 'MONTHS ENGAGED' }
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        theme: 'dark',
        media: { type: 'image', src: placeholder('STOREFRONT REDESIGN — 1920x1080', 1920, 1080, '141008', 'd2c8b4') },
        caption: 'The rebuilt storefront, shipped in phase two alongside the new content system.'
      }
    },
    {
      type: 'quote',
      props: {
        text: 'We used to dread touching the site. Now our own team ships a new project page in an afternoon, no developer required.',
        attribution: 'PRINCIPAL, URBAN ARCHITECTURE INC.'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'The approach',
        body: 'We started with a content model, not a mockup: one system for "project," "product," and "material" that both the portfolio and the store could pull from, so an update in one place propagates everywhere it’s referenced. From there, the storefront and content workflows were rebuilt in parallel — a leaner checkout, and an editor interface simple enough that the studio’s own team owns it without our involvement.',
        media: { type: 'image', src: placeholder('CONTENT MODEL / WORKFLOW') },
        orientation: 'left'
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('PROJECT PAGE TEMPLATE', 600, 600), alt: 'Project page template' },
          { src: placeholder('PRODUCT DETAIL VIEW', 600, 600), alt: 'Product detail view' },
          { src: placeholder('EDITOR INTERFACE', 600, 600), alt: 'Editor interface' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'bernard-figueroa-studio' }
    }
  ]
};
