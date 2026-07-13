# Luma Village

Luma Village is a mobile-first open-world language RPG. It borrows the parts
that made old-school life-skill games memorable—walking through a real place,
gathering resources, tending a farm, trading with neighbors, growing visible
skills, and opening new roads—then makes useful Spanish part of living in that
world.

The current valley chapter is a complete single-player vertical slice:

- tap-to-move isometric exploration with keyboard controls on desktop;
- woodcutting, farming, cooking, and trading XP;
- persistent inventory, tree respawns, timed crops, and world changes;
- a ten-part quest chain from first greeting to opening the north road;
- adaptive Spanish support, pronunciation, safe mistakes, and a phrasebook;
- device-local saves with a rolling backup;
- responsive controls designed around phones first.

This is intentionally a focused RPG foundation, not an MMO. Accounts, cloud
sync, multiplayer, more regions, deeper economies, and long-tail skill content
can grow from the proven loop instead of being prerequisites for it.

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
- `npm test` runs the deterministic realm, progression, timer, and save tests.

## Architecture

The interface uses Next.js and React, while Phaser renders the isometric world
and handles pointer, keyboard, camera, and movement input. Realm rules live in a
pure TypeScript state engine so progression can be tested independently from
the canvas.

The app exports as a static site and needs no environment variables or backend.
Vercel can deploy it directly from `main`. `NEXT_PUBLIC_SITE_URL` remains an
optional override for social-card URLs; the checked-in fallback is the live
Vercel origin.
