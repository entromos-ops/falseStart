# Luma Village

Luma Village is a mobile-first cozy building game where useful Spanish replaces
English gradually as the player proves they understand it. The repository name
remains `falseStart`; the old reaction-game product has been fully retired.

The current vertical slice includes a complete first-day loop: meet Alma,
gather and deliver materials, improve the plaza, shop at the market, respond in
Spanish, and finish with a transfer task that reuses language in a new context.
Progress and language support preferences are stored locally on the device.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Scripts

- `npm run dev`: start Next.js locally.
- `npm run build`: create the static production build in `out/`.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm test`: run the pure game-state and progression tests.

## Deployment

The app is a static Next.js export with no required environment variables or
backend services. It is ready for a later Vercel deployment. Device-local saves
are intentional for this validation build; cloud sync can be added after the
learning loop is proven.

When the public Vercel URL is known, set the optional `NEXT_PUBLIC_SITE_URL`
build variable so Open Graph and X cards resolve to that production origin.
