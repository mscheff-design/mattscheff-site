// Case-study block config for Urban Architecture Inc.
//
// PLACEHOLDER CONTENT — swap the placeholder() image calls below for real
// assets under /assets/case-studies/urban-architecture/, and rewrite the
// copy. This file exists to exercise every block type once as the template
// instance; the block sequence itself (hero -> textMedia -> statRow ->
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
        summary: 'A closer look at the digital strategy, e-commerce, and content work built for Urban Architecture Inc. since 2022 — replace this summary with real project context.',
        media: { type: 'image', src: placeholder('HERO IMAGE — 1600x900', 1600, 900), alt: 'Urban Architecture Inc. hero placeholder' }
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'The challenge',
        body: 'Placeholder body copy describing the problem this project set out to solve. Replace with real narrative.',
        media: { type: 'image', src: placeholder('IMAGE — RIGHT') },
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
        media: { type: 'image', src: placeholder('FULL-BLEED IMAGE — 1920x1080', 1920, 1080, '141008', 'd2c8b4') },
        caption: 'Placeholder caption for this full-bleed image.'
      }
    },
    {
      type: 'quote',
      props: {
        text: 'Placeholder pull-quote from a stakeholder or teammate about the impact of this work.',
        attribution: 'NAME, TITLE'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'The approach',
        body: 'Placeholder body copy describing the approach taken. Replace with real narrative.',
        media: { type: 'image', src: placeholder('IMAGE — LEFT') },
        orientation: 'left'
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('GALLERY 1', 600, 600), alt: '' },
          { src: placeholder('GALLERY 2', 600, 600), alt: '' },
          { src: placeholder('GALLERY 3', 600, 600), alt: '' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'bernard-figueroa-studio' }
    }
  ]
};
