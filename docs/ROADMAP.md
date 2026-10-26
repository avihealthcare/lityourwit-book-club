# Delivery roadmap

## v0.1.0: core UI and foundation

- Welcome, email signup/login/reset, session handling and logout
- Home, searchable/filterable catalogue, book details, manual/ISBN add-book form
- My Books, profile, read-only BookCoin wallet, membership comparison and chapter overview
- Config-driven plans and economy display; responsive original cover artwork
- PWA offline shell, installation handling, Netlify and CI configuration
- Core schema, ownership RLS and fictional 50-family / 210-book seed

## Subsequent phases (not implemented)

1. Borrow requests, moderation, reservations, plan entitlements and membership payment activation.
2. Atomic OTP handover and return, idempotency, locked wallets, immutable ledger, capped membership-year rewards and referral eligibility.
3. Overdue scheduler/notifications, extensions, protected value claims and disputes.
4. Parent-approved reviews, child profiles, badges, challenges, leader dashboards and leaderboards.
5. Admin roles, analytics, audited actions and configuration management.
6. Gateway integration (mock interface exists; no money taken), end-to-end security tests and production operations.

## Production launch gates

Core UI is not a production-ready lending platform. Apply and test migrations in a dedicated Supabase project, verify two-user isolation and privilege escalation, finish later phases, integration-test concurrent handovers and rollback, configure email delivery/backups/monitoring, validate accessibility/mobile devices and offline installation, connect GitHub/Netlify, and run a 50-family pilot before launch.
