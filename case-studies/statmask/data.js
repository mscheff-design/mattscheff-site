// Case-study block config for STATMASK.
//
// REAL COPY — user-provided narrative, provided 2026-09-09. Real product/
// lifestyle photography and ad-creative assets added 2026-09-10, under
// /assets/case-studies/statmask/. A few placeholder() SVGs remain where no
// matching asset was provided (Storefront has no PDP screenshot yet).
//
// The user's draft included a "NOTES FOR MATT, not for publication" section
// flagging open questions (the specific mechanism behind the Q3 2021
// growth, whether to state team size explicitly, product-line specifics,
// a possible Video section pending volume/placement info, ad spend, and
// whether "the asset system has carried into every engagement since" should
// be cut for reaching outside this case study). None of that is rendered
// here — implemented the copy as-written, including that closing line,
// pending the user's call on those open items.
//
// Block order keeps this case study's existing shape: it opens straight
// into a full-bleed image right after the hero (no lead-in text block
// first), since the story is about photography-driven paid social — a
// bold visual open fits it better than the text-first opens used in
// urban-architecture/bernard-figueroa-studio.

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
        summary: 'Product imagery, ad systems, and paid growth for a Brooklyn apparel startup.',
        media: { type: 'image', src: '/assets/case-studies/statmask/hero-lifestyle-flatlay.webp', alt: 'STATMASK masks styled alongside an iPhone, AirPods, and a magazine spread' }
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        maxHeight: '760px',
        media: { type: 'image', src: '/assets/case-studies/statmask/color-wheel-full-range.webp', alt: 'The full STATMASK color range, arranged in a ring' },
        caption: 'The full color range, shot once and reused across storefront, ad, and social.'
      }
    },
    {
      type: 'glance',
      props: {
        heading: 'At a glance',
        caseId: 'STM — 03',
        items: [
          { label: 'Client', value: 'STATMASK' },
          { label: 'Role', value: 'Social Media & E-Commerce Manager, Product Photographer' }
        ],
        scope: 'Product photography, short-form video, art direction, modular asset system, Meta campaign management, Shopify operations, analytics, and sales collateral.'
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Overview',
        chapter: true,
        chapterLabel: 'Overview',
        body: [
          'STATMASK was a Brooklyn apparel startup specializing in personal protective equipment, launched into a category that filled overnight in 2020. The product competed against legacy suppliers, apparel brands that had pivoted, and dropshippers, with no established search position and no existing audience.',
          'Paid social carried the business. Nearly all revenue traced back to an individual piece of creative, and creative fatigues on a predictable schedule. The limiting factor was not budget or targeting but the rate at which usable assets could be produced.',
          'I shot the product, built the system the ads were assembled from, and ran the campaigns.'
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'Photography',
        chapter: true,
        chapterLabel: 'Photography',
        body: 'I directed and produced all product and campaign imagery: studio product for the storefront, styled and on-model work for advertising, and lifestyle imagery for social.<br><br>Catalog photography was kept rigid. Consistent lighting, scale, and color across a product line where differences between items were small, so a customer comparing two items sees a difference in the product. Campaign photography allowed more variation in styling and context, which is what keeps an audience from recognizing the same ad twice.',
        media: { type: 'image', src: '/assets/case-studies/statmask/hand-held-ppe-context.webp', alt: 'A STATMASK held by hand alongside a face shield and no-touch thermometer' },
        orientation: 'right'
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Assets',
        chapter: true,
        chapterLabel: 'Assets',
        body: [
          'Rather than producing finished ads one at a time, I built a modular system that generated an entire family of platform-ready formats from a single core asset. Grid, feed, and vertical story formats came out of one setup.',
          'Shoots were composed for the crop. Square, portrait, and vertical framing were mapped before the shutter, and negative space for copy overlays was built in so no format required recomposition. Layered templates held the product and the type on separate layers, which meant a change of offer was a text edit across the set rather than a rebuild.',
          'The result was a library instead of a queue. When a campaign needed six variants, they already existed.'
        ]
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: '/assets/case-studies/statmask/sneaker-flatlay-square.webp', alt: 'A styled flatlay shoot, cropped square for grid and feed placements' },
          { src: '/assets/case-studies/statmask/sneaker-flatlay-vertical.webp', alt: 'The same shoot, cropped vertical for story placements' }
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: 'Campaigns',
        chapter: true,
        chapterLabel: 'Campaigns',
        body: 'I managed Meta campaign strategy through the ads portal: audience construction and refinement with Facebook Audiences, interest and lookalike layering, budget allocation, and the testing schedule.<br><br>Testing was structured around one variable at a time, usually image style, offer framing, or copy angle, so results could be attributed. Winning variants moved into the primary set and losing ones informed the next production block.',
        media: { type: 'image', src: '/assets/case-studies/statmask/black-friday-ad-creative.webp', alt: 'A Black Friday Meta ad creative built from the modular asset system' },
        orientation: 'left'
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Storefront',
        chapter: true,
        chapterLabel: 'Storefront',
        body: [
          'I managed e-commerce operations on Shopify, including catalog structure, listing copy, imagery, and promotional mechanics.',
          'Owning the storefront and the ad account together meant the ad and the page it pointed to were built at the same time, from the same image, in the same language. A strong ad pointed at a weak product page loses money quickly.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Analytics',
        chapter: true,
        chapterLabel: 'Analytics',
        body: [
          'Shopify sales data, Google Analytics traffic metrics, and Meta placement performance were read together. Traffic source against conversion rate against creative variant, closing back into the next shoot list.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Collateral',
        body: [
          'Branded sales assets and promotional materials were produced to the same standard as the advertising, keeping the storefront, the ad account, and the social feed consistent.'
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: 'Results',
        chapter: true,
        chapterLabel: 'Results',
        body: [
          'Revenue grew 150% in Q3 2021, driven by targeted placement supported by a creative library deep enough to sustain it. The asset system built here has carried into every engagement since.'
        ]
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: '/assets/case-studies/statmask/desert-magazine-square.webp', alt: 'STATMASK masks styled on a magazine spread, cropped square' },
          { src: '/assets/case-studies/statmask/desert-magazine-vertical.webp', alt: 'The same shoot, cropped vertical for story placements' },
          { src: '/assets/case-studies/statmask/streetwear-flatlay-square.webp', alt: 'STATMASK masks styled alongside sneakers and a Supreme cap' }
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'contributor-development-partnership' }
    }
  ]
};
