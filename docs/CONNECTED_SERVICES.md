# Connected services

Last verified: 26 October 2026.

## Supabase

- Project: LitYourWit Book Club (`uxnkgzwpmytugvrngqnb`)
- API URL: https://uxnkgzwpmytugvrngqnb.supabase.co
- Region: ap-northeast-2 (the existing user-selected region is preserved)
- Repository integration: avihealthcare/lityourwit-book-club
- Production database deployment from `main` is explicitly approved by the owner and is managed through the existing Supabase GitHub integration. No competing database deployment workflow is used.
- Automatic database preview branching remains off (it requires a paid plan).
- Core schema and performance hardening migrations are applied. The local migration versions match hosted migration history, so future GitHub deployments will not replay the foundation.
- All app tables have RLS. Wallet and ledger browser writes are denied. Security Advisor reports no findings.
- Email/password is enabled and email verification is required.
- Current Site URL: http://127.0.0.1:5173
- Exact callback allowlist: http://127.0.0.1:5173/auth and http://localhost:5173/auth
- `.env.local` contains only the project URL and browser publishable key. It is gitignored. Do not commit this file or place server secrets in VITE\_ variables.

The hosted database intentionally contains no demo families, books, or fake wallets. New real accounts are provisioned with zero coins and pending chapter membership; paid membership activation and borrowing remain later phases.

When a Netlify production hostname is available, set that hostname as the Supabase Site URL and add its exact `/auth` callback. Configure the two Vite environment variables in Netlify. Avoid blanket wildcard callback access on a production project.

## GitHub

Remote: https://github.com/avihealthcare/lityourwit-book-club.git

The repository was initialized through the authenticated GitHub connection. The app is published through feature pull requests into `develop`, then into `main`. `main` is the default production branch and `develop` is the integration branch. Local-only credentials and verification screenshots are excluded.

The committed CI workflow checks lint, types, tests and build for pull requests and main/develop pushes. Database deployments should use the existing Supabase GitHub integration as the single deployment path; do not add a second competing database-deployment workflow.

## Ongoing workflow

1. Create a feature branch from `develop` and open a pull request back to `develop`.
2. Run the required `verify` check (lint, TypeScript, tests and build).
3. Promote tested changes from `develop` to `main` with a pull request.
4. Supabase production deployments use working directory `.`, production branch `main`. Local migration versions already match the applied hosted history.
5. Connect Netlify separately for website deployments, set the two browser environment variables and add the final website `/auth` callback to Supabase.

Branch protection is configured after the initial import and successful CI, requiring pull requests, current passing checks, reviews and resolution of review conversations. The account owner retains the default administrator bypass; add an independent reviewer before public launch.
