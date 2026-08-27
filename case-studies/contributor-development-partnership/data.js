// Case-study block config for Contributor Development Partnership.
//
// DRAFT PLACEHOLDER COPY — plausible-sounding filler, not the real project
// story. Swap for the real narrative whenever it's ready.
//
// Deliberately text-forward and shorter than the other three case
// studies: this engagement was training/CRM/documentation work with no
// visual creative output to showcase, so rather than force it into the
// same image-heavy template, it uses the plain `text` block (no media
// slot) and skips textMedia/fullBleedMedia/gallery entirely. No hero
// image either. Fewer blocks overall (6 vs. 8) on purpose — the shorter
// length is itself part of how this case study reads differently from
// the other three, not an oversight.

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
      type: 'text',
      props: {
        heading: 'The challenge',
        body: 'Onboarding took weeks not because the work itself was complex, but because there was no single reference for it — the process lived across a handful of Slack threads and one outdated PDF, and it depended on whichever teammate happened to remember the current version. The CRM had drifted the same way: fields nobody used anymore, records nobody fully trusted, and no clear owner responsible for keeping it current.'
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
      type: 'text',
      props: {
        heading: 'The approach',
        body: 'We rebuilt onboarding as a single, versioned reference doc instead of a scattered mix of threads and file attachments, then rebuilt the CRM’s fields and record ownership around how the team was actually working day to day, not how it had been set up two years earlier. The goal wasn’t a new tool — it was making the tools already in place trustworthy again.'
      }
    },
    {
      type: 'nextProject',
      props: {}
    }
  ]
};
