# LitYourWit Book Club

Every bookshelf becomes a library. A parent-controlled, hyperlocal children's book-sharing platform, starting with Viha’s Chapter in Powai, Mumbai.

## Delivery milestone

v0.1.0 is the **core UI and foundation milestone**, following the brief's first-delivery instruction. It includes React, strict TypeScript, React Router, Supabase integration, Netlify configuration, CI, and an installable PWA shell. Complex lending, BookCoin transfers, payments, and administration are intentionally deferred until the core experience is reviewed. See docs/ROADMAP.md for delivery status and launch gates.

## Local setup

```sh
git clone https://github.com/avihealthcare/lityourwit-book-club.git
cd lityourwit-book-club
npm install
cp .env.example .env
npm run dev
```

Without Supabase variables, the app runs in explicitly labelled demo mode. Demo changes last for the current browser session in memory; no family information is persisted in browser storage. Set both variables to use the live backend. A failed live connection never falls back silently to demo data.

## Brand

The attached LitYourWit logo is used intact in navigation and sign-in screens. The interface follows its blue-and-white palette, using primary blue `#0574b9`, navy text and pale blue surfaces. App icons are padded/resized versions of the supplied mark; the service worker cache is versioned to refresh older branding. Book covers retain their varied colours.

## Stack

React, TypeScript, Vite, React Router, Supabase Auth/Postgres, Netlify, GitHub Actions, and a static-only service worker. Original typographic covers avoid storing copyrighted cover art.

## Supabase setup

1. Create a dedicated development Supabase project (do not use an existing production database).
2. Install dependencies, then inspect the CLI: `npx supabase --help` and `npx supabase db --help`.
3. Start a local Supabase instance with Docker: `npx supabase start`. Apply migrations and development seed with `npx supabase db reset`. The seed contains fictional public families and books, not login credentials or real children.
4. For a hosted project, use `npx supabase login`, `npx supabase link --project-ref <project-ref>`, then review and apply migrations with `npx supabase db push`. Do not seed production with fictional families. Run seed.sql only on a dedicated demo/development project.
5. In Auth settings, enable email/password and email confirmation. Set Site URL to your app URL and allow redirect URLs `/auth` on localhost and your Netlify site. Set an SMTP provider for production email delivery.
6. Copy the project URL and browser-safe anon/publishable key into `.env`. The requested `VITE_SUPABASE_ANON_KEY` variable also accepts a publishable key.
7. Run database advisors and verify RLS with two distinct test parent accounts before any pilot. Migrations, seed data, RLS isolation and listing rollback are exercised by the PGlite Postgres test suite. The hosted schema, anonymous access denial and Security Advisor have also been verified. Full two-parent authentication and email delivery still need end-to-end testing before a pilot.

| Variable               | Use                                            |
| ---------------------- | ---------------------------------------------- |
| VITE_SUPABASE_URL      | Supabase project HTTPS URL, exposed to browser |
| VITE_SUPABASE_ANON_KEY | Browser-safe publishable or legacy anon key    |

No service role key belongs in this app. Future `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `BORZO_API_KEY` must only exist in a secure server environment; never prefix them with VITE\_.

## Checks

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

The test suite runs the actual migration and seed in an embedded Postgres engine, checking two-parent isolation, append-only ledgers, denied wallet mutations, role spoofing, atomic listing creation and rollback. For a 390px layout preview during development, open `/docs/mobile-preview.html`.

## Netlify + GitHub

The existing repository is [avihealthcare/lityourwit-book-club](https://github.com/avihealthcare/lityourwit-book-club). The app is published there. Connect it through Netlify's GitHub integration. Select `main` for production; Netlify reads `netlify.toml` (`npm run build`, publish `dist`). Set the two browser environment variables in Netlify. Enable Deploy Previews for pull requests and deploy `develop` as a branch deployment. Add preview URLs to Supabase Auth redirect allowlists. Netlify owns the final site URL; the example lityourwit.netlify.app is not claimed by this repository.

Workflow: **feature branch → pull request → develop → test → main → production**. GitHub Actions checks PRs and pushes to main/develop. Configure branch protection to require `verify` and a reviewer before merging; these repository settings cannot be imposed by a workflow file. Sensitive RLS, wallet, membership, and child privacy changes require security review.

Supabase is connected and the schema is applied. The GitHub repository contains the app, its CI workflow and main/develop branches. Netlify account linkage remains pending. See [connected service status](docs/CONNECTED_SERVICES.md).

## Security and privacy

Public profiles contain only safe display information. Parent and child records are private and protected by ownership RLS. Wallets/ledgers have read-only client access; there is no browser coin mutation endpoint. Plan configuration is read-only to clients. Submitted listings remain pending moderation and earn no client-side reward. No mock payment credits a wallet. Service worker caches only an explicit static asset allowlist, never Supabase/API responses or private account data. On shared devices, sign out after use. Do not commit secrets.

Auth uses [Supabase email/password authentication](https://supabase.com/docs/reference/javascript/auth-signup) and access controls follow [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Releases and collaboration

Use semantic versions: v0.1.0 core prototype, v0.5.0 verified 50-family pilot, v1.0.0 public launch. CODEOWNERS now assigns sensitive paths to the verified repository owner `@avihealthcare`; add an independent reviewer before public launch. Suggested labels and project board setup are in docs/GITHUB_SETUP.md.
