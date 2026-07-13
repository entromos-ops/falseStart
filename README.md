# Luma Village

Luma Village is a mobile-first Spanish-learning RPG built around useful
outcomes, not isolated vocabulary drills.

New players begin with Market Day, a 60-second conversation in which they greet
a vendor, request bread, understand the price, choose a quantity, and finish
naturally. Completing it awards bread inside the open valley, where Spanish is
part of farming, gathering, trading, cooking, and opening the next road.

The current free first chapter includes:

- a five-beat practical market challenge with Spanish audio and optional hints;
- a shareable real-world capability result;
- tap-to-move isometric exploration with keyboard controls on desktop;
- woodcutting, farming, cooking, and trading progression;
- persistent inventory, tree respawns, timed crops, and world changes;
- a ten-part quest chain from first greeting to opening the north road;
- adaptive Spanish support, safe mistakes, a phrasebook, and a capability
  passport;
- device-local saves with a rolling backup;
- responsive controls designed around phones first;
- privacy-friendly Vercel page analytics and named funnel events;
- search, social-preview, robots, sitemap, and structured-data metadata.

This is intentionally a focused single-player experiment, not an MMO. The
product question is whether completing one useful Spanish situation earns
enough interest to enter the world and return.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Scripts

- `npm run dev` starts Next.js locally.
- `npm run build` creates the static production build in `out/`.
- `npm run typecheck` runs strict TypeScript checks.
- `npm test` runs deterministic realm, progression, timer, save, and reward
  tests.

## Architecture

Next.js and React own the page and Market Day flow. Phaser renders the
isometric world and handles pointer, keyboard, camera, and movement input. Realm
rules live in a pure TypeScript state engine so progression can be tested
independently from the canvas.

The app exports as a static site and needs no backend. Vercel deploys it from
`main`. `NEXT_PUBLIC_SITE_URL` is an optional override for canonical and
social URLs; the checked-in fallback is the live Vercel origin.

The release and outreach sequence is in [LAUNCH.md](./LAUNCH.md).
