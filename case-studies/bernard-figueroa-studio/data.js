// Case-study block config for Bernard Figueroa Lights (folder/id kept as
// bernard-figueroa-studio to avoid changing the live URL — see jobs.js for
// the corrected display name).
//
// REAL COPY — user-provided narrative, provided 2026-09-09. It replaces an
// earlier draft that had guessed at the wrong kind of business entirely
// (a general photography/social-content studio, not a sculptor and
// lighting designer) — the old statRow numbers and pull-quote were
// fabricated placeholder and are gone along with it. Images are still
// placeholder() SVGs — swap for real assets under
// /assets/case-studies/bernard-figueroa-studio/ when available.
//
// The user's draft included a "NOTES FOR MATT, not for publication"
// section flagging open questions: the Website section is deliberately
// short pending platform/design details (it should be the longest section,
// since the site was the original brief); "bronze and glass" is an
// assumption from the foundry/glassblower relationships, not a confirmed
// material range; "gallery liaison" (mentioned once in Overview) could
// become its own section given which galleries and what the coordination
// involves; email cadence/list size and specific exhibitions are unstated;
// and Status currently ends on "ongoing work" rather than a named outcome
// (placement, commission, or press) — none of that is guessed at here.

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
        summary: 'Digital presence and studio support for a sculptor and lighting designer working between New Jersey and France.',
        media: { type: 'image', src: '/assets/case-studies/bernard-figueroa-studio/homepage-screenshot.webp', alt: 'The Bernard Figueroa Lights homepage, a grid of sculptural lighting and sculpture pieces' }
      }
    },
    {
      type: 'glance',
      props: {
        heading: 'At a glance',
        caseId: 'BFS — 02',
        items: [
          { label: 'Client', value: 'Bernard Figueroa Lights' },
          { label: 'Role', value: 'Studio Assistant & Digital Manager' }
        ],
        scope: 'Portfolio website, short-form video, photography and documentation, archive management, spec sheets, fabrication coordination, email, and social media.'
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Overview',
        chapter: true,
        chapterLabel: 'Overview',
        body: [
          'Bernard Figueroa designs and produces sculptural lighting in bronze, glass, and mixed materials. The studio operates across two locations, New Jersey and Montpellier, and the work is made in collaboration with foundries and artisan glassblowers rather than in volume production.',
          'I was hired to develop the portfolio website. The role expanded into studio assistant, content producer, and gallery liaison as it became clear that the site depended on material the studio did not yet have in an organized form.',
          'The work is sold to collectors, decorators, and design professionals who are buying a hand-made object. Everything produced for the studio has to reflect that, and has to fit around a production schedule set by material and fabrication rather than by a content calendar.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Website',
        chapter: true,
        chapterLabel: 'Website',
        body: [
          'The portfolio site presents the work by piece, with images, materials, and specifications. I manage the site and its content, adding new work as it is completed and documented.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Documentation',
        chapter: true,
        chapterLabel: 'Documentation',
        body: [
          'I photograph incoming materials, work in progress, and finished pieces, producing edited assets for the website, social media, email, and the studio archive.',
          'Lighting is documented twice. Once as an object, lit so form, material, and finish read clearly. Once as a light source, exposed for what the piece does to the space around it. Buyers need both, and neither image is sufficient alone.',
          'Capture is continuous and publication is selective. Documentation is folded into days the studio is already working, which keeps the public presence regular without asking Bernard to produce anything for it.'
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: placeholder('LIGHTING DOCUMENTATION — OBJECT + LIGHT SOURCE, 1920x1080', 1920, 1080) },
        caption: 'Each piece documented twice — once as an object, once as the light it produces.'
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Archive',
        chapter: true,
        chapterLabel: 'Archive',
        body: [
          'I maintain the studio archive across both locations. Image assets, production documentation, and the record of each piece are held in one structure, so material photographed in France and material photographed in New Jersey are filed the same way.',
          'The archive supports the website, sales materials, and gallery submissions, and serves as the studio’s permanent record of the work.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Video',
        chapter: true,
        chapterLabel: 'Video',
        body: [
          'Short-form video is the studio’s primary social content. I develop, shoot, and edit it, working directly with Bernard to build a production style around his practice. The emphasis is on process, material, and the making itself.'
        ]
      }
    },
    {
      type: 'videoTriptych',
      props: {
        videos: [
          { src: '/assets/case-studies/bernard-figueroa-studio/video/lapse.mp4', poster: '/assets/case-studies/bernard-figueroa-studio/video/lapse-poster.webp' },
          { src: '/assets/case-studies/bernard-figueroa-studio/video/old.mp4', poster: '/assets/case-studies/bernard-figueroa-studio/video/old-poster.webp' },
          { src: '/assets/case-studies/bernard-figueroa-studio/video/quick.mp4', poster: '/assets/case-studies/bernard-figueroa-studio/video/quick-poster.webp' }
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Production',
        chapter: true,
        chapterLabel: 'Production',
        body: [
          'I represent the studio in procurement and fabrication relationships with bronze foundries and artisan glassblowers, communicating specifications, tracking lead times, and following up on deliveries. I also coordinate material sourcing and production timelines between the two locations.',
          'The work is conducted in English and French depending on the vendor.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Sales materials',
        chapter: true,
        chapterLabel: 'Sales materials',
        body: [
          'I design spec sheets for prospective buyers, covering dimensions, materials, finishes, and editions, with the images needed to support a purchase decision. These are the documents a decorator forwards to a client, so they have to hold up on their own.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Email and social',
        chapter: true,
        chapterLabel: 'Email & social',
        body: [
          'Mailchimp campaigns go to a list of collectors, decorators, and design professionals, covering new work, studio activity, and exhibitions. Instagram is fed from the ongoing documentation, so the feed reads as a record of a studio at work.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Status',
        chapter: true,
        chapterLabel: 'Status',
        body: [
          'The website is live and maintained. Documentation and archiving are ongoing across both locations, video is in regular production, and email and social run from the same body of material.'
        ]
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('PORTFOLIO SITE — PIECE DETAIL', 600, 600), alt: 'Portfolio site piece detail page' },
          { src: placeholder('SPEC SHEET', 600, 600), alt: 'Spec sheet for a finished piece' },
          { src: placeholder('STUDIO ARCHIVE', 600, 600), alt: 'Studio archive structure' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'statmask' }
    }
  ]
};
