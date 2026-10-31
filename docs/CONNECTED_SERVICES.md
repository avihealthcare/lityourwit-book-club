# Connected services

Last verified: 30 October 2026.

## Supabase

- Project: LitYourWit Book Club (`uxnkgzwpmytugvrngqnb`)
- API URL: https://uxnkgzwpmytugvrngqnb.supabase.co
- Region: ap-northeast-2 (the existing user-selected region is preserved)
- Repository integration: avihealthcare/lityourwit-book-club
- Production database deployment from `main` is explicitly approved by the owner and is managed through the existing Supabase GitHub integration. No competing database deployment workflow is used.
- Automatic database preview branching remains off (it requires a paid plan).
- Core schema, performance hardening, administration, book photographs and manual UPI membership/BookCoin migrations are applied. The local migration versions match hosted migration history, so future GitHub deployments will not replay the foundation.
- All app tables have RLS. Wallet and ledger browser writes are denied. The latest advisor check reports no security errors; it flags disabled leaked-password protection and the intentionally closed private activity table.
- Email/password is enabled. At the owner’s explicit request on 30 October 2026, signup email confirmation is temporarily disabled to avoid the default sender quota. Restore it after custom SMTP is configured; password-reset and invitation emails still depend on an email provider.
- The `admin-invite` Edge Function is deployed with JWT verification and an additional current-role check.
- The existing verified owner account has the backend admin role and approved chapter membership.
- Current Site URL: https://lityourwit-book-club.netlify.app
- Exact callback allowlist: http://127.0.0.1:5173/auth and http://localhost:5173/auth, plus https://lityourwit-book-club.netlify.app/auth
- `.env.local` contains only the project URL and browser publishable key. It is gitignored. Do not commit this file or place server secrets in VITE\_ variables.

The hosted database intentionally contains no demo families, books, or fake wallets. New real accounts start with zero coins and pending chapter membership. Eligible book uploads credit their configured listing reward automatically. Manual UPI membership activation and coin purchases are supported through admin payment approval; borrowing remains a later phase.

## Netlify

- Public website: https://lityourwit-book-club.netlify.app (verified signed out).
- Project ID: `386aed79-65d3-4fc1-a8ba-dd07b01baba6`.
- Linked GitHub repository, production branch `main`, build `npm run build`, publish folder `dist`.
- Both browser Supabase environment variables are configured in Netlify.
- `prebuild` copies pinned local OCR worker/model assets into the output; photo recognition does not need an AI API key.
- Supabase production sign-in callback is configured. Deploy previews remain private.

See [ADMIN_AND_SCANNING.md](ADMIN_AND_SCANNING.md) for administration and scanning.

## GitHub

Remote: https://github.com/avihealthcare/lityourwit-book-club.git

The repository was initialized through the authenticated GitHub connection. The app is published through feature pull requests into `develop`, then into `main`. `main` is the default production branch and `develop` is the integration branch. Local-only credentials and verification screenshots are excluded.

The committed CI workflow checks lint, types, tests and build for pull requests and main/develop pushes. Database deployments should use the existing Supabase GitHub integration as the single deployment path; do not add a second competing database-deployment workflow.

## Ongoing workflow

1. Create a feature branch from `develop` and open a pull request back to `develop`.
2. Run the required `verify` check (lint, TypeScript, tests and build).
3. Promote tested changes from `develop` to `main` with a pull request.
4. Supabase production deployments use working directory `.`, production branch `main`. Local migration versions already match the applied hosted history.
5. Netlify automatically publishes successful `main` builds. Verify `/auth`, `/admin` and the scanner after deployment.

Branch protection is configured after the initial import and successful CI, requiring pull requests, current passing checks, reviews and resolution of review conversations. The account owner retains the default administrator bypass; add an independent reviewer before public launch.
