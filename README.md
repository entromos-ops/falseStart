# SpotGrid

SpotGrid is a narrow inventory board for small podcast networks selling baked-in host-read ad spots. The GitHub repository is still named `falseStart`; the public product is SpotGrid.

## What is implemented

- Show x episode inventory grid
- Pre-roll, mid-roll, and post-roll slots
- Held, booked, production, delivered, invoiced, and paid statuses
- Category conflict checks for nearby reads on the same show
- Production pipeline from brief to recorded
- Sponsor commitment table
- Advertiser delivery report
- Browser-local persistence
- CSV import and export
- Mobile-friendly responsive layout

## Product boundary

SpotGrid is deliberately not an audio host, dynamic ad insertion system, attribution platform, marketplace, CRM, accounting system, or AI voice product. It is meant to replace the spreadsheet a network uses to answer: what inventory is open, what is sold, what conflicts, and what needs to be delivered next?

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

## Environment

```dotenv
NEXT_PUBLIC_SITE_URL=https://homeschool-start.vercel.app
NEXT_PUBLIC_SUPPORT_EMAIL=
```

No database, Blob store, payment provider, or paid Vercel feature is required for the current build. The app stores beta workspace data in the browser.

## Deployment

`main` is the production branch for the existing Vercel project. Push to `main`; Vercel deploys the site automatically.
