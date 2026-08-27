// Case-study block config for Urban Architecture Inc.
//
// REAL COPY (provided 2026-08-27) — this is the actual case study narrative,
// not draft/placeholder text. Only the media is still placeholder() SVGs;
// swap those for real assets under /assets/case-studies/urban-architecture/
// following the sequence noted inline below (each placeholder label
// corresponds to a specific suggested shot from the source brief).
//
// This is deliberately the longest, most media-rich of the four case
// studies — the real engagement covers brand strategy, a custom Shopify
// build, copywriting, a pricing pipeline, email/AI personalization,
// editorial, video, and press strategy, so the page reflects that range
// rather than compressing it to match the others' length.

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
        summary: `I built the entire digital presence of a forty-year-old collectible design dealership from nothing, for an audience of maybe four hundred people worldwide who matter.`,
        media: { type: 'image', src: placeholder('HERO — HOMEPAGE CAPTURE / SLIDESHOW LOOP', 1600, 900), alt: 'Urban Architecture Inc. homepage' }
      }
    },
    {
      type: 'text',
      props: {
        heading: `At a glance`,
        body: [
          `Client — Urban Architecture Inc., New York`,
          `Principal — Keith Johnson, “The Merchant of Memphis”`,
          `Role — Digital Consultant & Creative Director (sole)`,
          `Engagement — 2022–present`,
          `Disciplines — Brand strategy · Art direction · Design systems · Shopify/Liquid development · Copywriting · Editorial · Email architecture · Data pipelines · Video direction · Press strategy`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `The situation`,
        body: [
          `Keith Johnson was in the room in Milan in September 1981, at the first Memphis show. He became the first — and remains the oldest — authorized Memphis Milano dealer in North America. Four decades of relationships with the designers themselves. A stationery collaboration with Sottsass. An inventory most museums would take.`,
          `And almost no digital footprint.`,
          `The business ran the way it had always run: phone calls, dinners, a rolodex, forty years of accumulated trust. That model works until the room gets smaller. The people who knew Keith knew Keith. Nobody else could find him.`,
          `The problem was never traffic. Collectible postmodern design is a small world with a fixed population, and the buyers who matter — principal designers sourcing for significant projects, collectors with real money and a developed eye — do not discover dealers through search. The problem was that when someone in that world finally looked, there was nothing there that matched the authority of the man.`
        ]
      }
    },
    {
      type: 'quote',
      props: {
        text: `Micro. Targeted. Intentional. Authentic.`,
        attribution: `THE GOVERNING BRAND FRAME`
      }
    },
    {
      type: 'text',
      props: {
        body: [
          `I wrote and delivered a full brand and marketing strategy that governs every decision made since. The commercial objective is a small number of high-value relationships per year, not volume. Everything else is infrastructure that makes those relationships possible — every time the brand tries to be legible to everyone, it becomes less compelling to the people who actually buy.`,
          `Three convictions carried the work:`,
          `<strong>The dealer is the product.</strong> Not the inventory, not the gallery. I built the brand around Keith as a character — the Merchant of Memphis — in the tradition of person-as-brand authorities like Bourdain, Saltz, Parker. Authority through accumulated presence, not marketing.`,
          `<strong>Restraint is a positioning statement.</strong> The site never explains what Memphis is. No hashtags. No sale graphics. No add-to-cart. The absence of accessibility is itself the signal — if you are here, you already know, or you are about to find out on your own terms.`,
          `<strong>Nothing inauthentic survives contact with this audience.</strong> The Memphis collector world is small and taste-conscious. One piece of content that reads as manufactured undoes a year of credibility. Every system I built was designed to amplify a real relationship, never to simulate one.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Brand & identity system`,
        body: `A complete visual and verbal system built from scratch and held consistently across web, email, print, and social. Two typefaces carry everything: Cormorant Garamond for editorial voice — headlines, prices, Keith’s notes, always light, often italic — and DM Mono for structure — labels, metadata, navigation, always uppercase with generous tracking. No third face anywhere. The palette is five values: cream, near-black, gold, warm grey, and a single brand red reserved exclusively for designer names — a signal color, never decoration, that teaches the eye across the entire site that a name in red means an authored object.`,
        media: { type: 'image', src: placeholder('IDENTITY PLATE — TYPE SPECIMEN & PALETTE') },
        orientation: 'right'
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: placeholder('HOMEPAGE — FULL VERTICAL COMPOSITE', 1100, 2200) },
        caption: `The homepage composed as one continuous document with deliberate tonal shifts, not a stack of independent modules — it reads top to bottom like a printed object.`
      }
    },
    {
      type: 'text',
      props: {
        heading: `The site — custom Shopify build`,
        body: [
          `Built on Shopify with the Dawn theme as scaffolding only. Every section on the site is custom Liquid written from scratch; Dawn’s default aesthetic is overridden entirely. It is, functionally, a custom design system running on Shopify’s commerce infrastructure.`,
          `Sections designed and developed: a hero with a custom transparent topbar, animated ticker, and captioned slideshow; full-width horizontal editorial collection strips with gradient overlays; a four-product “Prêt à Expédier” available-inventory grid; a dark Trade Program section breaking the cream rhythm with gold accents and a rotating SVG badge on a text path; an invitation-language dispatch signup; a Sottsass stationery border rendered as SVG and used as a compositional break; press strip, press page, About, Contact, Journal, and footer; and a full-screen overlay search with predictive results wired into the hero nav.`,
          `<strong>The commercial decision that defined the build:</strong> no add-to-cart. Inquiry only. The form goes directly to Keith — no middleman, no automated response. A $40,000 Sottsass cabinet does not get bought from a button. Removing the cart was the single choice that made the site feel like a gallery instead of a store, and it aligned the interface with how the business actually closes.`,
          `Sale logic runs entirely off Shopify’s compare-at price field — rotated sale tag, struck-through original in muted grey, sale price in red — so pricing changes require no code and no developer. Keith’s staff can run the catalog without touching the theme.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `The product page`,
        body: `The custom product template runs a two-column sticky layout with a thumbnail switcher, a provenance grid, Keith’s note block, and a pulsing availability indicator. The inquiry form expands inline beneath a single button rather than routing to a separate page — keeping the moment of interest and the moment of contact in the same breath.`,
        media: { type: 'image', src: placeholder('PRODUCT PAGE — ANNOTATED') },
        orientation: 'left'
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
      type: 'text',
      props: {
        heading: `Voice & copywriting`,
        body: [
          `I write in Keith’s voice across every surface — site copy, product descriptions, Instagram captions, email dispatches, press materials. The register is peer-to-peer, never vendor-to-client: opinionated, specific, dry. Short declarative sentences. Nothing ever starts by introducing its subject; it starts mid-thought, the way a person talks at dinner.`,
          `The product description field on every page holds Keith’s note about the object — his opinion about why it matters beyond the facts. That block is the most important content on the site: it’s what converts the collector who came to Memphis through culture rather than design history.`,
          `The governing filter for every line written for this brand: <em>would Keith say this to a friend at dinner?</em> That single test resolves nearly every content decision before it reaches a draft.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Catalog & pricing infrastructure`,
        body: `A production data pipeline in Python connects the European supplier catalog to the live Shopify storefront — ingesting EUR wholesale pricing, applying the conversion and margin formula, setting compare-at pricing to support sale logic, rounding to a clean retail increment, and generating a Shopify-ready import. An audit pass flags anomalies for manual verification against the printed reference books, which caught several mispriced pieces before they reached the storefront. This is unglamorous work, and it’s the reason the catalog is trustworthy — a dealership whose prices are wrong is a dealership whose provenance is also in question.`,
        media: { type: 'image', src: placeholder('PRICING PIPELINE — TERMINAL / SHEET CAPTURE') },
        orientation: 'right'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Email — three concentric circles`,
        body: `The email program runs as three levels of access, each more private than the last. Public writing establishes the voice in long form and feeds subscribers inward. The dispatch goes to a curated warm list of designers, collectors, past inquirers, and press — sent irregularly, when something is worth saying, in a custom HTML template matched to the site’s visual language. The physical dispatch is mailed: large format, quality paper, the Sottsass border, Keith’s letter, objects photographed and printed, his signature — nothing digital competes with something that arrives in the post and has weight.`,
        media: { type: 'image', src: placeholder('DISPATCH — EMAIL TEMPLATE + PHYSICAL MAILER') },
        orientation: 'left'
      }
    },
    {
      type: 'quote',
      props: {
        text: `The recipient experiences it as Keith remembering them specifically, because Keith does remember them specifically.`,
        attribution: `ON THE DISPATCH PERSONALIZATION LAYER`
      }
    },
    {
      type: 'text',
      props: {
        body: [
          `I designed an AI personalization layer on the Claude API: the dispatch body is identical for every recipient, but the opening two sentences are generated uniquely from a recipient profile — their firm, a past conversation, a project type, an aesthetic direction. The system amplifies a real relationship rather than manufacturing a fake one; that distinction is the entire ethical and strategic design of the feature.`,
          `Supporting work: a custom dispatch and stationery HTML generator, list extraction and cleaning from years of prior correspondence, and a verification and sending workflow.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Editorial & search`,
        body: `Twelve long-form articles are written and production-ready, sequenced for staged publication rather than a dump. The lead piece — <em>The Room in Milan</em> — is the 1981 origin story, written to serve the brand narrative and to rank against Sottsass, Memphis Milano, and Memphis design queries simultaneously: editorial that works as editorial first and as acquisition second. A full-screen overlay search with predictive results, wired into the hero nav, makes the archive as easy to search as it is to read.`,
        media: { type: 'image', src: placeholder('JOURNAL — ARTICLE PAGE, TREATED AS EDITORIAL') },
        orientation: 'right'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Social — <em>From the Shelf</em>`,
        body: `A recurring Reel series with Keith on camera and me directing, producing, and cutting. Format rules come from the brand, not from platform convention: cold opens from a strong mid-sentence moment, no intros, no context-setting, no music, no captions beyond a series header and one clean identifying line. Keith’s deliberate cadence — the thing a social consultant would try to edit out — is treated as the asset it is. Production runs in monthly shoot blocks producing four to six pieces, released weekly from a rolling bank, so the account never posts reactively and the talent is never asked to perform on demand.`,
        media: { type: 'image', src: placeholder('FROM THE SHELF — REEL, MUTED AUTOPLAY') },
        orientation: 'left'
      }
    },
    {
      type: 'text',
      props: {
        heading: `Press strategy`,
        body: `Five target journalists identified across the publications this audience actually reads — not a mass pitch, but a relationship-first approach where the pitch arrives as the natural next step in a real conversation. The story requires no manufacturing: first authorized Memphis dealer in America, in the room in Milan in 1981, forty years of relationships with the designers themselves. One well-placed profile does more than every other channel combined, and the only ask of Keith is a single afternoon.`
      }
    },
    {
      type: 'text',
      props: {
        heading: `The constraint that shaped everything`,
        body: [
          `Keith is loyalty-driven, relationship-driven, and not detail-oriented. He is better reached in person than in writing, and genuinely unsettled by changes to his tools, even beneficial ones. So the operating principle became: <strong>his participation is engineered, not requested.</strong>`,
          `Any ask reduced to one physical action — send me a photo when you see something you like, approve this caption with one tap, give me one afternoon. Everything else — strategy, production, systems, publication — happens around him and stays invisible to him.`,
          `This is the part of the job that doesn’t photograph well and matters most. A strategy the principal won’t execute is not a strategy. Designing the workflow around the actual human being, rather than the ideal one, is what turned a plan into a running operation.`
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        theme: 'dark',
        media: { type: 'image', src: placeholder('CLOSING — ARCHIVE PHOTOGRAPH OF KEITH', 1600, 1000, '141008', 'd2c8b4') },
        caption: `Keith Johnson, in the room where this all started. Nothing built here will carry more weight than that.`
      }
    },
    {
      type: 'text',
      props: {
        heading: `What this engagement demonstrates`,
        body: [
          `<strong>Range with coherence.</strong> Positioning, identity, front-end development, copywriting, data engineering, video direction, and email architecture — all held to one visual and verbal standard across four years. Every artifact looks like it came from the same hand, because it did.`,
          `<strong>Restraint as a design skill.</strong> The hardest decisions here were removals: the cart, the hashtags, the explanation, the schedule, the reach. Knowing what a brand should refuse is more valuable than knowing what it can add.`,
          `<strong>Building for a real business, not a case study.</strong> The pricing pipeline, the sale logic, the inquiry routing, and the shoot cadence exist because a working dealership needed them. Nothing in this project was built to be photographed.`,
          `<strong>Voice fidelity.</strong> Four years of writing as someone else, in a world where a single false note is disqualifying, and never being caught.`
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'bernard-figueroa-studio' }
    }
  ]
};
