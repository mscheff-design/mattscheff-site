// Case-study block config for Urban Architecture Inc.
//
// REAL COPY — user-provided narrative. Overview/Challenge/Approach modules
// provided 2026-09-04/05; a full-page draft (Overview, Identity, Storefront,
// Voice, Email, Video, Operations, Status) provided 2026-09-09 and used as
// the authoritative source for those sections below. Every placeholder()
// SVG has since been swapped for a real asset — the last ones (From the
// Collection's video triptych) went in 2026-09-10.

export const CASE_STUDY = {
  id: 'urban-architecture',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: `Digital strategy and infrastructure for America’s first authorized Memphis Milano dealer.`,
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
          { label: 'Role', value: 'Digital Consultant & Creative Director' }
        ],
        scope: `Brand strategy · Art direction · Shopify development · Copywriting · Editorial · Email · Catalog systems · Video · Press strategy · Art handling · Vendor liaison · Product photography`
      }
    },
    {
      type: 'text',
      props: {
        heading: `Overview`,
        chapter: true,
        chapterLabel: `Overview`,
        body: [
          `Urban Architecture is a New York gallery specializing in Memphis Milano furniture, lighting, and objects. Prior to my joining, the business had virtually no online presence. Over forty years of conducting business in person and by phone, owner Keith Johnson had built a high-profile network of clients and collectors who valued discretion, boutique service, and his cultural authority.`,
          `Keith’s relationships with the designers and firsthand knowledge of their work are central to the buying experience. The challenge was to retain that intimacy and white-glove service while introducing the business to a digital audience of prospective buyers.`,
          `The scope included the website, visual identity, product catalog, and a coordinated editorial, email, and social media strategy. Each needed to reflect Keith’s expertise and accommodate the way he worked.`,
          `The day-to-day ran wider than any title implied: handling the art itself, acting as vendor liaison, even managing the gallery’s utilities when something needed to get done.`
        ]
      }
    },
    {
      type: 'textColumns',
      props: {
        heading: `The challenge`,
        chapter: true,
        chapterLabel: `Challenge & Approach`,
        columns: [
          {
            heading: `The challenge`,
            body: [
              `Urban Architecture’s audience is small, informed, and selective: collectors, interior designers, architects, and curators. Reaching more people was never the objective. The site had to be immediately credible to the few visitors who mattered.`,
              `Most of the business existed in forms that do not translate directly to the internet. Knowledge held in conversation. Relationships held in a Rolodex. Prices held in European spreadsheets and printed reference books. Sales conducted through direct inquiry.`,
              `Each of those required a decision about what it should become online and what should stay personal. The e-commerce build and the visibility strategy also had to be developed in parallel, without either compromising the other.`
            ]
          },
          {
            heading: `The approach`,
            body: [
              `Four words governed the strategy: micro, targeted, intentional, authentic.`,
              `Keith sits at the center. The brand is built around him as The Merchant of Memphis, with authority that comes from having been there since the beginning.`,
              `The visual system is quiet and editorial. It gives the objects room and assumes intelligence in the visitor, avoiding over-explanation and sales language. In this market, restraint carries a signal of its own.`,
              `Every part of the system extends something already true. A small, taste-conscious audience recognizes anything manufactured quickly, so the work builds on existing knowledge and existing relationships rather than imitating them.`,
              `The objective throughout is a small number of high-value relationships rather than reach.`
            ]
          }
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Translating the business`,
        body: [
          `Each part of the work began with something that already existed offline.`,
          `Keith’s stories became product notes, editorial, and video. His relationships became a structured private dispatch. A physical inventory became a searchable catalog with documented provenance. European price lists and printed reference books became a pricing and audit system. A sales process built on conversation became an inquiry-only storefront.`,
          `None of these are exact conversions. A dinner does not become a newsletter and a Rolodex does not become a mailing list without something being lost. The work in each case was identifying the part that mattered, then building the digital form capable of carrying it.`
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
        body: `The visual identity was developed from original gallery letterhead credited to Christoph Radl and Ettore Sottsass Jr. Its hand-drawn logotype and red border provided a direct connection to the gallery’s history.<br><br>I redrew the lettering and adapted the border for use across the website, email, print, and social media. This gave the existing identity a consistent application across the business’s new digital presence.`,
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
        heading: `The storefront`,
        chapter: true,
        chapterLabel: `Storefront`,
        body: [
          `The website was designed and built on Shopify, with a searchable catalog, available inventory, and a dedicated trade section. Product pages combine photographs, specifications, provenance, and Keith’s own notes on each piece.`,
          `Purchases are handled through direct inquiry. This allows Keith to discuss condition, delivery, and placement with prospective buyers, retaining the personal service his clients expect. Pricing and availability can be updated by the team through Shopify.`
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/graves-dining-set.webp', alt: 'A Michael Graves dining table and chair set from the gallery’s inventory' },
        caption: `A Michael Graves dining table and chair set, from the gallery’s inventory.`
      }
    },
    {
      type: 'gallery',
      props: {
        images: [
          { src: '/assets/case-studies/urban-architecture/graves-chair.webp', alt: 'A Michael Graves ring-back chair from the gallery’s inventory' },
          { src: '/assets/case-studies/urban-architecture/sottsass-console.webp', alt: 'An Ettore Sottsass console with mirror and dresser boxes from the gallery’s inventory' },
          { src: '/assets/case-studies/urban-architecture/sottsass-shelf.webp', alt: 'A Sottsass-style wall shelf and side table from the gallery’s inventory' }
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
        heading: `Voice and editorial`,
        chapter: true,
        chapterLabel: `Voice`,
        body: [
          `The writing draws on Keith’s knowledge of the products, their designers, and how they are made. Product descriptions, social captions, email, and press materials follow his conversational, opinionated style.`,
          `The editorial strategy uses that expertise to provide context for buyers researching Memphis design.`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Operations`,
        chapter: true,
        chapterLabel: `Operations`,
        body: [
          `A catalog workflow converts European supplier pricing into Shopify-ready data and flags discrepancies for review. This has caught pricing errors before publication and simplifies updates across the collection.`,
          `The broader workflow keeps Keith’s involvement manageable through brief approvals, photographs, and scheduled filming sessions. Production and publication are coordinated around those contributions.`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Email`,
        body: [
          `The email program was designed around the gallery’s existing relationships with collectors, designers, and press. A private digital dispatch shares selected objects and commentary, with personalized introductions based on prior correspondence and known interests.`,
          `Each dispatch is built with a modular email tool I developed myself, designed to make campaign creation seamless — reusable content blocks assemble into a new issue without rebuilding the template from scratch each time.`,
          `The design extends to a printed letter using the original gallery border. Both formats retain the personal tone of Keith’s client correspondence.`
        ]
      }
    },
    {
      type: 'fullBleedMedia',
      props: {
        scrollable: true,
        maxHeight: '760px',
        scrollHint: `Scroll to read the full dispatch`,
        media: { type: 'html', src: '/assets/case-studies/urban-architecture/dispatch-001.html', title: 'Urban Architecture Inc. — Dispatch No. 001, a real email campaign' }
      }
    },
    {
      type: 'text',
      props: {
        heading: `From the Collection`,
        chapter: true,
        chapterLabel: `From the Collection`,
        body: [
          `<em>From the Collection</em> was developed as a recurring video series featuring Keith discussing pieces from the collection. My role covers direction, production, and editing, with an emphasis on his knowledge, humor, and natural delivery.`,
          `Several episodes can be recorded in one session, allowing for regular publication around his availability.`
        ]
      }
    },
    {
      type: 'videoTriptych',
      props: {
        videos: [
          { src: '/assets/case-studies/urban-architecture/video/sowden.mp4', poster: '/assets/case-studies/urban-architecture/video/sowden-poster.webp' },
          { src: '/assets/case-studies/urban-architecture/video/reel-01.mp4', poster: '/assets/case-studies/urban-architecture/video/reel-01-poster.webp' },
          { src: '/assets/case-studies/urban-architecture/video/hilton-cucumber.mp4', poster: '/assets/case-studies/urban-architecture/video/hilton-cucumber-poster.webp' }
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Status`,
        chapter: true,
        chapterLabel: `Status`,
        body: [
          `The site is live, with a searchable catalog and direct inquiry process. The identity has been adapted for web, email, print, and video. The first digital dispatch is awaiting Keith’s approval of the mailing list.`
        ]
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
