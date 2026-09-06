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
          `Role — Digital Consultant & Creative Director`,
          `Engagement — 2022–present`,
          `Scope — Brand strategy · Art direction · Shopify design and development · Copywriting · Editorial · Email · Catalog systems · Video · Press strategy`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `Overview`,
        chapter: true,
        chapterLabel: `Overview`,
        body: [
          `Building the digital operation for America’s first authorized Memphis Milano dealer.`,
          `Urban Architecture is a New York–based collectible design gallery led by Keith Johnson, better known as “The Merchant of Memphis.” Johnson attended the first Memphis exhibition in Milan in 1981 and became the movement’s first authorized dealer in the United States. He has spent more than forty years building relationships with its designers, collectors, and institutions.`,
          `At the outset, that history lived entirely offline…in conversations, printed ephemera, old photographs, and Keith’s own stories. The task was to translate it into a digital presence without flattening what made the business special.`,
          `The past 4 years have been spent stewarding the brand’s digital identity, custom Shopify storefront, editorial voice, email program, catalog infrastructure, and ongoing content strategy. The goal wasn’t to make Urban Architecture feel like a conventional e-commerce company. It was to create a digital business that still felt personal, specific, and a little difficult to imitate.`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `The challenge`,
        chapter: true,
        chapterLabel: `Challenge`,
        body: [
          `The challenge was to retain the intimacy and white-glove feel of how the business is conducted, while projecting Keith’s story and authority to a digital audience with a high propensity to convert. Technological limitations and an “Old World” mentality would become assets to the online presence of the business rather than obstacles to it.`,
          `This was never a conventional traffic problem. The audience for museum-quality postmodern design is small, informed, and highly selective. The site did not need to speak to everyone. It needed to feel immediately credible to a specific set of visitors: collectors, interior designers, architects, curators, and culturally literate buyers arriving through a particular object or designer.`,
          `The more practical constraint was that most of the business existed in forms that did not translate neatly to the internet. Keith’s knowledge came out in conversation. Relationships lived in a Rolodex and in years of correspondence. Prices arrived from Europe in spreadsheets and printed reference books. Sales happened through direct inquiry. The work was not simply digitization. It was determining what each of those things should become online, and what should remain personal.`,
          `A concurrent challenge emerged: implementing a social media and visibility strategy alongside the eCommerce build, without either one compromising the other.`
        ]
      }
    },
    {
      type: 'text',
      props: {
        heading: `The approach`,
        body: [
          `The strategy came down to four words: micro, targeted, intentional, authentic. Rather than pursuing reach, the focus was on building the conditions for a small number of meaningful, high-value relationships. Three principles governed the work.`,
          `<strong>Put the dealer at the center.</strong> The inventory is remarkable, but Keith is what makes the business singular. The brand was developed around him as “The Merchant of Memphis,” a dealer whose authority derives from having been present at the beginning, knowing the people involved, and living with these objects for decades.`,
          `<strong>Treat restraint as a signal.</strong> The visual system is quiet and editorial. The site does not over-explain Memphis, crowd the page with promotion, or push the visitor toward an immediate purchase. It gives the objects room and assumes intelligence on the part of the viewer.`,
          `<strong>Build from what is already true.</strong> In a small, taste-conscious market, anything overly polished or manufactured registers as false very quickly. Every component of the system, from product copy to email personalization, was designed to extend real knowledge and real relationships rather than to imitate them.`
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
          `None of these were exact conversions. A dinner cannot become a newsletter, and a Rolodex cannot become a mailing list, without losing something. The work was identifying which part mattered, then building the digital form capable of carrying it.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `A new identity system`,
        chapter: true,
        chapterLabel: `Identity`,
        body: `The identity began with a piece of paper.<br><br>Keith possessed old gallery letterhead: a red border of small silhouettes running the perimeter of the page, and a hand-drawn logotype boxed at the top, credited along the bottom to Christoph Radl and Ettore Sottsass, Jr. of Sottsass Associati, Milano. Radl was Memphis’s art director; Sottsass founded it. The two of them made stationery for Keith’s gallery, and it had gone unused for decades.`,
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/letterhead-scan.jpg', alt: 'The original Urban Architecture Inc. letterhead, with its red silhouette border and boxed hand-drawn logotype' },
        orientation: 'right',
        thumbnail: true
      }
    },
    {
      type: 'textMedia',
      props: {
        body: `No newly originated identity would carry comparable authority. The task was recovery, not invention. The sheet was scanned and both elements rebuilt as vectors — the logotype redrawn letter by letter on a grid, preserving the triangular A, the arched U, and the interrupted C, so it would hold at any size.`,
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/logotype-vector.png', alt: 'The Urban Architecture logotype redrawn letter by letter on a construction grid' },
        orientation: 'right'
      }
    },
    {
      type: 'textMedia',
      props: {
        body: `The border was traced into a clean SVG and decomposed into modular components: full sheets in portrait and landscape, square frames for social graphics, and the narrow horizontal strip that became the site’s section divider.`,
        media: { type: 'image', src: '/assets/case-studies/urban-architecture/identity-artboards.png', alt: 'The modular artboard system built from the letterhead border — full sheets, square frames, and section-divider strips' },
        orientation: 'left'
      }
    },
    {
      type: 'text',
      props: {
        heading: `A custom Shopify storefront`,
        chapter: true,
        chapterLabel: `Website`,
        body: [
          `Shopify was used as technical scaffolding to build a custom Liquid theme that centered around inquiry-based conversion.`,
          `The homepage operates as a single continuous editorial document rather than a stack of interchangeable modules. It moves between collection features, available inventory, the trade program, press, and email signup with deliberate shifts in scale and tone. The product template includes a sticky image gallery, provenance and specification details, Keith’s personal note on the object, live availability, and an inquiry form that opens directly beneath the call to action.`,
          `The most consequential commercial decision was the removal of the cart. A rare cabinet or lamp is not purchased in the manner of an ordinary consumer product. These sales depend on conversation regarding condition, provenance, shipping, placement, and trust. An inquiry-only model situates the site closer to the gallery experience and reflects how the business actually closes.`,
          `Behind the interface, sale pricing and availability remain simple for the team to manage through Shopify’s native fields. The system reads as considered to the visitor while remaining practical for the people operating it daily.`
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
          `Every line on the site is written as Keith. Product descriptions, email dispatches, Instagram captions, and press materials follow the same standard.`,
          `The voice is informed but conversational: opinionated, specific, and dry. It addresses the reader peer-to-peer rather than vendor-to-client. The test applied to any line is whether Keith would say it to a friend over dinner.`,
          `Every product page carries Keith’s note, meaning his personal argument for why an object matters beyond its dimensions, date, and materials. For a buyer entering Memphis through culture rather than design history, that perspective is frequently the most valuable content on the page.`,
          `A twelve-part editorial series was also developed, led by <em>The Room in Milan</em>, an account of Keith’s experience at the first Memphis exhibition. The articles are constructed to function first as narrative and second as a route for new audiences to discover the dealership through search.`
        ]
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Catalog and pricing systems`,
        body: `Prices arrive from Europe in euros, on spreadsheets, alongside printed reference books. Bringing them onto the site correctly is the least visible work on this project and among the most consequential.<br><br>A Python and Google Sheets pipeline was built that converts the European supplier catalog into Shopify-ready product data. It converts wholesale pricing from euros, applies margin logic, generates compare-at pricing, rounds retail prices consistently, and supports full, partial, or targeted catalog updates. An audit step flags anomalies for manual verification against the printed references. This has caught incorrect pricing prior to publication and provides a dependable source of truth for a large and specialized catalog.<br><br>In a provenance-driven business, the details are required to be trustworthy.`,
        media: { type: 'image', src: placeholder('PRICING PIPELINE — TERMINAL / SHEET CAPTURE') },
        orientation: 'left'
      }
    },
    {
      type: 'textMedia',
      props: {
        heading: `Email as a form of access`,
        body: `The email program is structured in three concentric circles.<br><br>Public editorial introduces the history and point of view of the brand. The digital dispatch reaches a curated list of collectors, designers, past inquirers, and press, and is sent only when there is something worth sharing. The physical dispatch is more personal still: a large-format printed letter, designed with the Sottsass border and mailed with Keith’s signature.<br><br>The digital template mirrors the visual language of the site and avoids the register of a marketing email entirely. A personalization system was additionally designed that allows Keith to acknowledge a recipient’s firm, prior conversation, project, or interests in the opening lines while the central dispatch remains intact. The intent is not to simulate familiarity, but to make existing familiarity operable at the scale of a carefully maintained list.`,
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
        body: `Keith is more compelling on camera than he believes himself to be. “From the Shelf” is a recurring short-form video series built to capture that.<br><br>Each piece is directed, produced, and edited around the qualities that make him persuasive in person. The videos begin mid-thought, without formal introduction. There is no incidental music and no fast-cut pacing. His knowledge, humor, and deliberate cadence carry the format.<br><br>To make the series sustainable, several pieces are filmed in a single session and released from a rolling bank. The system operates around Keith’s availability rather than requiring him to perform for the platform weekly.`,
        media: { type: 'image', src: placeholder('FROM THE SHELF — REEL, MUTED AUTOPLAY') },
        orientation: 'left'
      }
    },
    {
      type: 'text',
      props: {
        heading: `Designing around a real person`,
        body: [
          `The central challenge of the engagement was operational rather than visual.`,
          `Keith works through instinct, conversation, and long-standing relationships. He is most effective in person and protective of the tools and routines that already function for him. Participation was therefore reduced to single actions: one photo sent, one caption approved, one afternoon given. Strategy, production, systems, and publication are built around those moments.`,
          `A system should not require someone to become a different kind of person in order to use it. The work succeeds because it supports the way this business actually operates while affording it a considerably larger and more coherent digital life.`
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
          `The site is live. The catalog is priced, searchable, and maintainable. The visual and verbal system carries across website, email, print, editorial, and video. The email program is built and awaiting its first send, which is gated on Keith’s confirmation of the list.`,
          `To the visitor, the result is a clear and considered gallery experience. Behind it is a working system connecting European price lists, printed archives, product data, personal correspondence, video production, and one man’s memory.`
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
          `Urban Architecture clarified the kind of work this practice is best suited to — people whose practice is more developed than their digital presence. They already possess the objects, the archive, the knowledge, the relationships, or the work itself. What they require is a digital structure capable of holding it.`,
          `The role is to determine what makes the work distinct, then translate it into identity, language, content, and systems without making it feel like everything else online.`
        ]
      }
    },
    {
      type: 'nextProject',
      props: { nextId: 'bernard-figueroa-studio' }
    }
  ]
};
