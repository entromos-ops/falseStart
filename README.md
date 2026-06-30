# False Start

A mobile-first daily reaction challenge where everyone gets the same seeded
sequence and two ranked attempts per day.

## Local Development

```bash
npm install
npm run db:push
npm run dev
```

Open `http://127.0.0.1:3000`.

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`: SQLite connection string for local development.
- `DAILY_CHALLENGE_SECRET`: server-only secret used to derive daily seeds.
- `SESSION_SECRET`: server-only secret used to sign anonymous player cookies.

The committed `.env` uses development-only secrets for local MVP testing.

## Scripts

- `npm run dev`: start Next.js locally.
- `npm run build`: generate Prisma client and build the app.
- `npm run db:push`: generate Prisma Client and create/update the local SQLite schema.
- `npm test`: run deterministic generator and scoring tests.

## MVP Notes

Anonymous sessions use a signed HTTP-only cookie. Clearing cookies can bypass
daily limits, which is acceptable for this MVP; serious ranked play should add
authentication.

The local database init path uses `scripts/init-db.mjs` because `prisma db push`
returned a blank schema-engine error on this Windows setup, while Prisma Client
generation and runtime queries worked correctly.
