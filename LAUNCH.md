# Yearkeep launch brief

## The bet

Yearkeep is not a broad homeschool planner. It does one recurring job:

> Log what happened today in 20 seconds, know whether the year is on track, and print a clean learning record when somebody asks.

The market has demonstrated willingness to pay. Homeschool Planet lists an annual plan around $85, Homeschool Moment lists $99/year, Homeschool Ledger lists $59.99/year, and Diligent lists $24.99/year. The opportunity is not to copy their feature breadth. It is to be the deliberately small, private, low-cost alternative at exactly `$12 per household per year`.

Sources:

- [Homeschool Planet subscription options](https://homeschoolplanet.com/homeschool-planet-subscription-options/)
- [Homeschool Moment](https://homeschoolmoment.com/)
- [Homeschool Ledger pricing](https://homeschoolledger.com/pricing/)
- [Diligent pricing](https://diligenthomeschool.com/pricing.php)

The wedge:

- no curriculum marketplace or bloated lesson planner;
- no child account or social feed;
- records stay in the browser;
- a first name, initials, or nickname is enough;
- free backup and CSV export prevent data lock-in;
- explicit user-set day targets, with no claim that the app interprets local law;
- polished report preview creates the upgrade moment.

The strongest conversion line is:

> You already did the teaching. Your record is ready to print.

## Offer

Free forever:

- one learner;
- 30 journal entries;
- Today, journal, progress, and live report preview;
- JSON backup/restore;
- CSV export;
- existing records always remain readable.

Yearkeep Pro — `$12/year` per household:

- unlimited entries;
- up to six learners;
- print or save polished reports;
- school-year archives;

Do not add a monthly plan. One annual $12 charge keeps payment fees and cancellation friction reasonable.

## Before taking money

1. Create and verify a Lemon Squeezy store.
2. Add a `$12/year` recurring product.
3. Enable license keys with three activations.
4. Add the checkout URL, store ID, product ID, and variant ID to Vercel environment variables.
5. Set a real support email.
6. Confirm the production host permits commercial use. [Vercel says Hobby is non-commercial](https://vercel.com/docs/plans/hobby); use Vercel Pro or a commercial-friendly static host before enabling checkout.
7. Make one test purchase, activate it in two browsers, deactivate one, cancel renewal, and verify the entitlement behavior.

Lemon Squeezy’s base platform fee and subscription fee leave roughly `$10.84` before any international-payment or tax-related add-ons on a domestic $12 sale. Verify current fees before launch: [pricing](https://www.lemonsqueezy.com/pricing) and [fee details](https://docs.lemonsqueezy.com/help/getting-started/fees).

License implementation references:

- [License API](https://docs.lemonsqueezy.com/api/license-api)
- [License-key integration guide](https://docs.lemonsqueezy.com/guides/tutorials/license-keys)

## First 14 days

Do not buy ads yet. We need evidence that qualified parents keep logging and want the report.

### Day 1: recruit five design partners

Send this privately to homeschool parents you actually know, co-op organizers, or small creators:

> I built a very small private homeschool record keeper because the existing tools often become another planning job. You write one sentence about what happened, and it builds a learning-day calendar and year-end record. It is free for the first 30 entries. Would you try logging three real days and tell me where it feels slow or untrustworthy? I am not asking for a testimonial—blunt feedback is more useful.

Ask each person to screen-record only the interface if they are comfortable. Never ask them to expose a child’s name or learning notes.

### Day 2–4: ask group admins before posting

Message ten homeschool Facebook-group and local co-op admins:

> Hi — I made a tiny, privacy-first learning log for homeschool families. It is not curriculum and does not claim legal compliance; it turns quick daily notes into a printable record. I would like to offer the free version to the group and ask for usability feedback. Is that appropriate here, and if so is there a preferred thread or day for tools from members/builders?

Respect a no. Do not sneak promotional links into advice threads.

### Day 5: transparent Reddit post

Suggested title:

> I made the homeschool record keeper I wished was smaller — can I get blunt feedback on the 20-second logging flow?

Body:

> Most homeschool software tries to plan the whole school. I made the opposite: one sentence about what happened, an optional duration, and a learning-day checkbox. It builds a private journal and report preview in the browser; no child account and no cloud upload. The first 30 entries are free, and the planned paid tier is $12/year for unlimited entries, multiple learners, and printable reports.
>
> I am looking for criticism, especially from anyone who has abandoned a record-keeping app before. Does the capture flow feel faster than a notebook or spreadsheet? Is the report useful, or am I solving the wrong end-of-year problem?
>
> [live link]

Check each community’s self-promotion rule before posting.

### Day 6–10: distribute the free calendar tool

Share the free 180-day calendar generator as a standalone planning utility, not as a disguised sales pitch. Make three simple Pinterest images and one printable screenshot using these headlines:

- “What date is our 180th homeschool day?”
- “Plan 180 learning days around your real breaks”
- “A free homeschool finish-date calculator”

The tool’s final screen can mention Yearkeep naturally: planning dates is free; keeping the actual record is the product.

### Day 11–14: publish what changed

Post a short changelog with concrete fixes from early users. This is more credible than claiming a user count or manufacturing testimonials.

## Metrics and kill criteria

Track only aggregate product events. Never send learner names, notes, subjects, license keys, or report contents to analytics.

First validation cohort:

- 100 qualified landing visits;
- 20 private logs started;
- 12 users create the first entry;
- 6 users reach five entries within ten days;
- 3 users open the report upgrade moment;
- 2 users pay or explicitly say they would pay once checkout opens.

Interpretation:

- Fewer than 20 starts: the promise or trust story is weak.
- Starts but few first entries: capture flow is too demanding or unclear.
- First entries but few fifth entries: the recurring job is not strong enough; interview abandoners before adding features.
- Repeat use but no report intent: improve the annual output or change what Pro sells.
- Report intent but no purchases: test price presentation and checkout trust before lowering the price.

Do not build transcripts, AI summaries, state-law automation, cloud photos, curriculum planning, or native apps until the first ten households repeatedly use the journal. Those features increase liability and support cost before the core behavior is proven.

## Messaging guardrails

Say:

- “learning-day target”;
- “time logged”;
- “organizes your records”;
- “stored in this browser”;
- “print or save as PDF.”

Do not say:

- “state compliant” or “meets all requirements”;
- “total learning time”;
- “securely encrypted”;
- “cloud backup” or “sync”;
- “official transcript”;
- “AI-generated portfolio.”
