# Core UI verification — 26 October 2026

- Strict TypeScript, ESLint and production build pass.
- 21 automated tests pass: catalogue filters/search, ISBN checks, mock payment safety, and Postgres migration/seed/RLS tests.
- The embedded Postgres suite verifies two-parent child/wallet isolation, role spoofing denial, denied wallet/ledger writes, denied membership/trust/availability changes, immutable ledger entries, atomic pending listings and rollback.
- Browser checked: home at desktop and 390px iframe viewport, search with fast typing and Enter, Matilda details, mobile navigation to Add Book, and submitting a fictional book into My Books as Awaiting approval without altering the 75-coin demo balance.
- Dependency audit: zero known vulnerabilities at delivery.

## Limits

The hosted Supabase project is connected and both migrations are applied. Live API probes confirm email/password is enabled, email verification is required, and anonymous profile/wallet reads return 401. SQL checks confirm no public app table lacks RLS and clients cannot mutate wallets or the ledger. Auth URLs are configured for port 5173. Full parent sign-in, email delivery and production headers still require end-to-end verification. GitHub publishing is handled by the authenticated connector, with source checksums verified against local Git. Netlify deployment is not connected. Docker is installed but its daemon is not running; the migration was tested in embedded Postgres instead. Native PWA installation, real-device camera permissions and offline behavior need device verification. Later lending/payment/admin/community phases are documented in ROADMAP.md and are not complete.

## Branding update

The supplied blue logo replaces the original mark, including mobile navigation and app icons. Interface and illustration colours now match the blue-and-white identity. See CONNECTED_SERVICES.md for live configuration details.

Production database deployment from main is approved. The initial repository import and CI run precede saving that setting. Preview screenshots stay local rather than becoming public repository content.
