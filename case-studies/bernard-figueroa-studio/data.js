// Case-study block config for Bernard Figueroa Studio.
//
// DRAFT PLACEHOLDER COPY — plausible-sounding filler, not the real project
// story. Swap for real content/images (under
// /assets/case-studies/bernard-figueroa-studio/) whenever the real
// material is ready.
//
// Block order is deliberately different from urban-architecture's (the
// pull-quote sits between Overview and the Challenge module rather than
// after it, no dark full-bleed band, gallery captions read as shoot
// notes) to demonstrate that each case study doesn't have to follow the
// same template shape.

function placeholder(label, w = 1200, h = 800, bg = 'd8cfc0', fg = '1c140a') {
  const escapedLabel = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='monospace' font-size='20' fill='#${fg}' fill-opacity='0.5' text-anchor='middle' dominant-baseline='middle'>${escapedLabel}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CASE_STUDY = {
  id: 'bernard-figueroa-studio',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: 'Bernard Figueroa Studio needed a photography and content system that could keep pace with a weekly social and email cadence, not a shoot every few months. Since 2025 we’ve run their photography direction, social content, and email program as one connected pipeline.',
        media: { type: 'image', src: placeholder('HERO IMAGE — 1600x900', 1600, 900), alt: 'Bernard Figueroa Studio hero placeholder' }
      }
    },
    {
      type: 'glance',
      props: {
        heading: 'At a glance',
        caseId: 'BFS — 02',
        items: [
          { label: 'Client', value: 'Bernard Figueroa Studio' },
          { label: 'Role', value: 'Social Media Coordinator & Studio Assistant' },
          { label: 'Engagement', value: '2025–Present' }
        ],
        scope: 'Photography direction · Social content · Email program'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'Overview',
        chapter: true,
        chapterLabel: 'Overview',
        lede: 'A weekly social and email cadence needed photography that could actually keep up with it — not a shoot every few months.',
        bullets: [
          'Campaigns were leaning on stock imagery or shots months past their moment.',
          'Since 2025, photography direction, social content, and the email program run as one connected pipeline.',
          'Every shoot is planned to serve both channels from day one, not repurposed after the fact.'
        ]
      }
    },
    {
      type: 'quote',
      props: {
        text: 'Every email and post finally looks like it came from the same studio. That wasn’t true before.',
        attribution: 'STUDIO MANAGER, BERNARD FIGUEROA STUDIO'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The challenge',
        chapter: true,
        chapterLabel: 'Challenge',
        lede: 'Social and email were run separately from the studio’s own photography — and it showed.',
        bullets: [
          'Campaigns leaned on stock imagery or shots months past their moment.',
          'No shot list, no consistent color grade.',
          'Email design changed voice with every send.'
        ]
      }
    },
    {
      type: 'statRow',
      props: {
        stats: [
          { value: '2.1x', label: 'EMAIL OPEN RATE' },
          { value: '5.8x', label: 'SOCIAL ENGAGEMENT' },
          { value: 'WEEKLY', label: 'SHOOT CADENCE' }
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: placeholder('SHOOT DAY — 1920x1080', 1920, 1080) },
        caption: 'A single day’s shoot, styled and shot to run across email, social, and the studio’s own site.'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The approach',
        chapter: true,
        chapterLabel: 'Approach',
        lede: 'A repeatable shoot framework, built once and reused every week.',
        bullets: [
          'Same lighting setup, same color grade, same shot-list structure — planned once, cut for email, social, and print.',
          'Email templates and social formats redesigned around that same visual system.'
        ],
        closing: 'A send and a post finally read as the same studio.'
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('SHOOT DAY', 600, 600), alt: 'Shoot day' },
          { src: placeholder('EMAIL TEMPLATE', 600, 600), alt: 'Email template' },
          { src: placeholder('SOCIAL GRID', 600, 600), alt: 'Social grid' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'statmask' }
    }
  ]
};
