// Case-study block config for Contributor Development Partnership.
//
// DRAFT PLACEHOLDER COPY — plausible-sounding filler, not the real project
// story. Swap for the real narrative whenever it's ready.
//
// Deliberately text-forward and shorter than the other three case
// studies: this engagement was training/CRM/documentation work with no
// visual creative output to showcase, so rather than force it into the
// same image-heavy template, it uses only media-free blocks (glance,
// module, statRow, quote) and skips textMedia/fullBleedMedia/gallery
// entirely. No hero image either. The shorter length is itself part of
// how this case study reads differently from the other three, not an
// oversight.

export const CASE_STUDY = {
  id: 'contributor-development-partnership',
  blocks: [
    {
      type: 'hero',
      props: {
        summary: 'In 2023, Contributor Development Partnership brought us in to fix a specific operational problem: a fast-growing team of contributors with no consistent onboarding, no shared documentation, and a CRM that had drifted out of sync with how the team actually worked.'
      }
    },
    {
      type: 'glance',
      props: {
        heading: 'At a glance',
        caseId: 'CDP — 04',
        items: [
          { label: 'Client', value: 'Contributor Development Partnership' },
          { label: 'Role', value: 'Training Assistant' },
          { label: 'Engagement', value: '2023' }
        ],
        scope: 'Onboarding documentation · CRM cleanup · Training systems'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'Overview',
        chapter: true,
        chapterLabel: 'Overview',
        lede: 'A fast-growing team of contributors, with no consistent onboarding and a CRM drifted out of sync with how the team actually worked.',
        bullets: [
          'Brought in during 2023 to fix a specific operational problem, not to redesign anything.',
          'The fix needed to outlast the engagement — something the team could keep using on its own.'
        ]
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The challenge',
        chapter: true,
        chapterLabel: 'Challenge',
        lede: 'Onboarding took weeks — not because the work was complex, but because there was no single reference for it.',
        bullets: [
          'The process lived across a handful of Slack threads and one outdated PDF.',
          'It depended on whichever teammate happened to remember the current version.',
          'The CRM had drifted the same way: unused fields, records nobody trusted, no clear owner.'
        ]
      }
    },
    {
      type: 'statRow',
      props: {
        stats: [
          { value: '9 DAYS', label: 'ONBOARDING TIME' },
          { value: '40+', label: 'CONTRIBUTORS ONBOARDED' },
          { value: '1', label: 'SOURCE OF TRUTH' }
        ]
      }
    },
    {
      type: 'quote',
      props: {
        text: 'Onboarding used to be tribal knowledge. Now it’s just... written down.',
        attribution: 'OPERATIONS LEAD, CONTRIBUTOR DEVELOPMENT PARTNERSHIP'
      }
    },
    {
      type: 'module',
      props: {
        heading: 'The approach',
        chapter: true,
        chapterLabel: 'Approach',
        lede: 'Not a new tool — just making the tools already in place trustworthy again.',
        bullets: [
          'Onboarding rebuilt as a single, versioned reference doc, replacing the scattered threads and attachments.',
          'The CRM’s fields and record ownership rebuilt around how the team was actually working day to day.'
        ]
      }
    },
    {
      type: 'nextProject',
      props: {}
    }
  ]
};
