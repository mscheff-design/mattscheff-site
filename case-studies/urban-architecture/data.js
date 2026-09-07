// Case-study block config for Urban Architecture Inc.
//
// REAL COPY (Overview provided 2026-09-04; The challenge → Short-form
// provided 2026-09-05) — this is the user's own narrative. Media is still
// placeholder() SVGs — swap those for real assets under
// /assets/case-studies/urban-architecture/ when available; each label notes
// what it stands in for.

function placeholder(label, w = 1200, h = 800, bg = 'd8cfc0', fg = '1c140a') {
  const escapedLabel = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='#${bg}'/>
    <text x='50%' y='50%' font-family='monospace' font-size='20' fill='#${fg}' fill-opacity='0.5' text-anchor='middle' dominant-baseline='middle'>${escapedLabel}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CASE_STUDY = {
  id: 'urban-architecture',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: `Building the digital operation for America’s first authorized Memphis Milano dealer, while preserving the relationships, history, and point of view that built it.`,
        // Third-party image (not the user's own asset) — a styled Memphis
        // Milano furniture/lighting collection, chosen for the hero
        // because it captures the exact postmodern design world this
        // dealership deals in, not a screenshot of the site itself like
        // the placeholder it replaces. Worth confirming usage rights
        // before this goes live publicly, since its actual source/license
        // hasn't been verified here.
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/hero-memphis-collection.webp', alt: 'A curated collection of Memphis Milano furniture and lighting' }
      }
    },
    {
      type: 'glance',
      props: {
        heading: `At a glance`,
        caseId: `UA — 01`,
        items: [
          { label: 'Client', value: 'Urban Architecture Inc., New York' },
          { label: 'Principal', value: 'Keith Johnson, “The Merchant of Memphis”' },
          { label: 'Role', value: 'Digital Consultant & Creative Director' },
          { label: 'Engagement', value: '2022–Present' }
        ],
        scope: `Brand strategy · Art direction · Shopify design & development · Copywriting · Editorial · Email · Catalog systems · Video · Press strategy`
      }
    },
    {
      type: 'module',
      props: {
        heading: `Overview`,
        chapter: true,
        chapterLabel: `Overview`,
        lede: `Building the digital operation for America’s first authorized Memphis Milano dealer — without losing what made it worth dealing with in the first place.`,
        bullets: [
          `Urban Architecture is a New York gallery led by Keith Johnson, “The Merchant of Memphis” — present at Memphis’s first Milan exhibition in 1981, and its first authorized U.S. dealer ever since.`,
          `More than 40 years of relationships with designers, collectors, and institutions, built entirely offline — in conversation, printed ephemera, and Keith’s own memory.`,
          `The task: translate four decades of history into a digital presence without flattening what made it special.`,
          `Four years in: a custom Shopify storefront, editorial voice, email program, catalog infrastructure, and ongoing content strategy — built to feel personal and specific, not like conventional e-commerce.`
        ],
        closing: `The goal was never to look like an online store. It was to feel like Keith’s gallery, on the internet.`
      }
    },
    {
      type: 'module',
      props: {
        heading: `The challenge`,
        chapter: true,
        chapterLabel: `Challenge`,
        lede: `Retain the intimacy of a white-glove business while projecting Keith’s authority to an audience that actually converts.`,
        bullets: [
          `This was never a traffic problem. The audience — collectors, interior designers, architects, curators — is small, informed, and highly selective.`,
          `The site didn’t need to speak to everyone. It needed to feel immediately credible to the few visitors who mattered.`,
          `Most of the business existed in forms that don’t translate to the internet: knowledge in conversation, relationships in a Rolodex, prices in European spreadsheets and printed reference books, sales through direct inquiry.`,
          `The work wasn’t digitization — it was deciding what each of those things should become online, and what should stay personal.`,
          `A parallel constraint: build a social media and visibility strategy alongside the e-commerce build, without either one compromising the other.`
        ]
      }
    },
    {
      type: 'module',
      props: {
        heading: `The approach`,
        chapter: true,
        chapterLabel: `Approach`,
        lede: `The strategy came down to four words: micro, targeted, intentional, authentic.`,
        bullets: [
          `<strong>Put the dealer at the center.</strong> The brand is built around Keith as “The Merchant of Memphis” — his authority comes from having been there since the beginning.`,
          `<strong>Treat restraint as a signal.</strong> A quiet, editorial visual system that gives the objects room and assumes intelligence in the visitor, rather than over-explaining or pushing a sale.`,
          `<strong>Build from what is already true.</strong> In a small, taste-conscious market, anything manufactured reads as false fast — every part of the system extends real knowledge and real relationships instead of imitating them.`
        ],
        closing: `Rather than pursuing reach, the focus was building the conditions for a small number of meaningful, high-value relationships.`
      }
    },
    {
      type: 'text',
      props: {
        heading: `Translating the business`,
        body: [
          `Each part of the work began with something that already existed offline.`,
          `Keith’s stories became product notes, editorial, and video. His relationships became a structured private dispatch. A physical inventory became a searchable catalog with documented provenance. European price lists and printed reference books became a pricing and audit system. A sales process built on conversation became an inquiry-only storefront.`,
          `None of these were exact conversions. A dinner cannot become a newsletter, and a Rolodex cannot become a mailing list, without losing something. The work was identifying which part mattered, then building the digital form capable of carrying it.`
        ]
      }
    },
    {
      // Previously three separate textMedia rows, one short paragraph each
      // paired 1:1 with an image — once the copy got trimmed, the tall
      // real scans (letterhead-scan.jpg is a full portrait page, 2550×3300)
      // badly outgrew the short text next to them, leaving a lot of dead
      // vertical space per row. Consolidated to one denser paragraph
      // alongside the single most important artifact (the letterhead
      // itself, still full and prominent via thumbnail:true), with the two
      // supporting images (both similar landscape ratios) moved into a
      // gallery pair below instead of forcing each into its own text row.
      type: 'textMedia',
      props: {
        heading: `A new identity system`,
        chapter: true,
        chapterLabel: `Identity`,
        body: `The identity began with a piece of paper: old gallery letterhead Keith had kept for decades, unused — a red silhouette border and a hand-drawn logotype, credited to Christoph Radl and Ettore Sottsass, Jr. of Sottsass Associati, Milano. Sottsass founded Memphis; Radl was its art director.<br><br>Recovery, not invention: the sheet was scanned and rebuilt as vectors, the logotype redrawn letter by letter to preserve its triangular A, arched U, and interrupted C at any size, then decomposed into a modular SVG system — full sheets, square social frames, and the narrow strip that now divides sections on the site.`,
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/letterhead-scan.jpg', alt: 'The original Urban Architecture Inc. letterhead, with its red silhouette border and boxed hand-drawn logotype' },
        orientation: 'right',
        thumbnail: true
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: '/assets/case-studies/urban-architecture/logotype-vector.png', alt: 'The Urban Architecture logotype redrawn letter by letter on a construction grid' },
          { src: '/assets/case-studies/urban-architecture/identity-artboards.png', alt: 'The modular artboard system built from the letterhead border — full sheets, square frames, and section-divider strips' }
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `A custom Shopify storefront`,
        chapter: true,
        chapterLabel: `Website`,
        body: [
          `Shopify became scaffolding for a custom Liquid theme built around inquiry-based conversion — not a cart.`,
          `The homepage reads as one continuous editorial document, not a stack of modules, moving between collections, inventory, the trade program, press, and email signup. Each product page carries a sticky gallery, provenance and specs, Keith’s own note on the piece, and an inquiry form beneath the call to action.`,
          `The biggest call: removing the cart entirely. A rare cabinet isn’t bought like an ordinary product — these sales run on conversation about condition, provenance, shipping, and trust. Inquiry-only keeps the site closer to how a gallery actually sells, while pricing and availability stay simple for the team to manage day to day.`
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        scrollable: true,
        maxHeight: '760px',
        scrollHint: `Scroll to explore the full homepage`,
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/homepage-full-screenshot.jpg', alt: 'The Urban Architecture Inc. homepage, shown in full' }
      }
    },
    {
      type: 'text',
      props: {
        heading: `Selected details`
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: placeholder('INQUIRY FORM — INLINE EXPANSION', 600, 600), alt: 'Inquiry form expanding inline beneath a single button' },
          { src: placeholder('TRADE PROGRAM — ROTATING BADGE', 600, 600), alt: 'Rotating SVG trade badge on a dark ground' },
          { src: placeholder('SEARCH OVERLAY — PREDICTIVE RESULTS', 600, 600), alt: 'Full-screen overlay search with predictive results' }
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: placeholder('THE DIVIDER — SOTTSASS STATIONERY BORDER, SVG', 1600, 400) },
        caption: `The same Sottsass border used as a compositional break on the site itself, borrowed here to do the same job.`
      }
    },
    {
      type: 'text',
      props: {
        heading: `Voice and editorial`,
        chapter: true,
        chapterLabel: `Voice`,
        body: [
          `Every line on the site — product copy, email, Instagram captions, press — is written as Keith: informed, conversational, opinionated, dry. The test for any sentence is whether he’d actually say it to a friend over dinner.`,
          `Every product page carries Keith’s note: his own case for why a piece matters beyond its dimensions and date. For buyers arriving through culture rather than design history, it’s often the most valuable thing on the page.`,
          `A twelve-part editorial series, led by <em>The Room in Milan</em> — Keith’s own account of the first Memphis exhibition — works first as narrative, second as a way for new audiences to find the dealership through search.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Catalog and pricing systems`,
        body: `Prices arrive from Europe in euros, on spreadsheets and printed reference books — getting them onto the site correctly is the least visible work here, and among the most consequential.<br><br>A Python and Google Sheets pipeline converts the European catalog into Shopify-ready data: euro pricing, margin logic, compare-at pricing, consistent rounding, full or partial catalog updates. An audit step flags anomalies before anything publishes — it’s already caught pricing errors that would’ve gone live otherwise.<br><br>In a provenance-driven business, the details have to be right.`,
        media: { type: 'image', src: placeholder('PRICING PIPELINE — TERMINAL / SHEET CAPTURE') },
        orientation: 'left'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Email as a form of access`,
        body: `The email program runs in three concentric circles: public editorial introduces the brand’s history and point of view; a digital dispatch reaches a curated list of collectors, designers, and press, sent only when there’s something worth sharing; a physical dispatch — a large-format letter with the Sottsass border, mailed with Keith’s signature — is more personal still.<br><br>The digital template mirrors the site’s own visual language and reads nothing like a marketing email. A personalization layer lets Keith open with a recipient’s firm, prior conversation, or interests while the dispatch itself stays intact — not simulating familiarity, just making the real kind operable at scale.`,
        media: { type: 'image', src: placeholder('DISPATCH — EMAIL TEMPLATE + PHYSICAL MAILER') },
        orientation: 'right'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `From the Shelf`,
        chapter: true,
        chapterLabel: `Social`,
        body: `Keith is more compelling on camera than he thinks. “From the Shelf” is a short-form video series built to capture that — no formal intro, no music, no fast cuts, just his knowledge, humor, and cadence starting mid-thought.<br><br>Several episodes are filmed in a single session and released from a rolling bank, so the series runs on Keith’s availability instead of demanding he perform for the platform every week.`,
        media: { type: 'image', src: placeholder('FROM THE SHELF — REEL, MUTED AUTOPLAY') },
        orientation: 'left'
      }
    },
    {
      type: 'text',
      props: {
        heading: `Designing around a real person`,
        body: [
          `The real challenge here was operational, not visual. Keith works through instinct and relationships, most effective in person — so his participation was reduced to single actions: one photo sent, one caption approved, one afternoon given. Everything else is built around those moments.`,
          `A system shouldn’t require someone to become a different kind of person to use it. This one works because it fits how the business actually operates, while giving it a far larger digital life.`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Where it stands`,
        chapter: true,
        chapterLabel: `Today`,
        body: [
          `The site is live. The catalog is priced, searchable, and maintainable. The identity carries across website, email, print, editorial, and video — the email program is built and waiting on Keith’s go-ahead for its first send.`,
          `To a visitor, it reads as a clear, considered gallery. Behind it: European price lists, printed archives, product data, personal correspondence, video, and one man’s memory, all connected.`
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        theme: 'dark',
        media: { type: 'image', src: placeholder('CLOSING — ARCHIVE PHOTOGRAPH OF KEITH', 1600, 1000, '141008', 'd2c8b4') }
      }
    },
    {
      type: 'text',
      props: {
        heading: `The larger idea`,
        body: [
          `Urban Architecture clarified the kind of work this practice fits best: people whose practice outpaces their digital presence, who already have the archive, the knowledge, the relationships — and just need a structure built to hold it.`,
          `The job is finding what makes that work distinct, then translating it into identity, language, and systems without making it feel like everything else online.`
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'bernard-figueroa-studio' }
    }
  ]
};
