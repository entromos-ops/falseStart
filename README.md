# Hearthfolio

Hearthfolio is a calm, local-first homeschool learning log. A parent can record what happened in about 20 seconds, watch a learning-day target take shape, and turn the year into a printable record.

The GitHub repository is still named `falseStart`; the product is not.

## What is implemented

- Mobile-first public product page and installable PWA shell
- One-sentence learning capture with subject, duration, type, date, and optional note
- Explicit “count this date as a learning day” control
- Multi-learner activity credits in the data model
- Today dashboard, searchable journal, subject totals, and learning-day calendar
- Live end-of-year report preview with browser print/PDF support for Pro
- Free JSON backup/restore and CSV export
- Free plan limit that never hides or deletes existing records
- Lemon Squeezy license activation, validation, seven-day outage grace, and deactivation
- Vercel Analytics events that do not include learning-record content
- Privacy and terms pages
- Offline caching after the first visit
- Free 180-day calendar calculator with break ranges, monthly totals, and print view

## Product boundary

Hearthfolio organizes user-entered records. It does not interpret state law, certify attendance, assess mastery, generate grades, provide curriculum, or promise that a report satisfies a particular authority.

Learning records live in `localStorage`. There is no account, server database, child account, cloud backup, or device sync. Users should download backups regularly.

## Local development

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Verification:

```powershell
npm test
npm run typecheck
npm run build
```

The Next.js app uses static export and can be hosted on Vercel or another static host.

## Checkout and licensing

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.example
NEXT_PUBLIC_CHECKOUT_URL=https://your-store.lemonsqueezy.com/buy/...
NEXT_PUBLIC_LEMON_STORE_ID=123
NEXT_PUBLIC_LEMON_PRODUCT_ID=456
NEXT_PUBLIC_LEMON_VARIANT_ID=789
NEXT_PUBLIC_CUSTOMER_PORTAL_URL=https://app.lemonsqueezy.com/my-orders/...
```

Create a `$12/year` recurring Lemon Squeezy product, enable license keys, and allow three activations. The browser calls Lemon’s public License API directly; no Lemon API key belongs in this repository or in `NEXT_PUBLIC_*` variables.

Activation only succeeds when the returned store, product, and variant IDs match the public configuration. A checkout redirect never unlocks Pro by itself.

The client-side paywall is proportionate for a $12 local utility but is not cryptographic DRM. Premium code is delivered to the browser and a determined user can tamper with it.

## Data files

- Household storage key: `hearthfolio:household:v1`
- License storage key: `hearthfolio:license:v1`
- Backup format marker: `hearthfolio-backup`
- Schema version: `1`

## Deployment

`main` is the production branch used by the existing Vercel project. Confirm the Vercel account permits commercial use before enabling paid checkout. Vercel Hobby is for personal, non-commercial use; either use Vercel Pro or deploy the static export to a commercial-friendly host.

See [LAUNCH.md](./LAUNCH.md) for market rationale, activation steps, launch copy, and the validation scorecard.
