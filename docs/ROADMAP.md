# Delivery roadmap

## v0.1.0: core UI and foundation

- Welcome, email signup/login/reset, session handling and logout
- Home, searchable/filterable catalogue, book details, manual/ISBN add-book form
- My Books, profile, read-only BookCoin wallet with automatic upload rewards, membership registration and chapter overview
- Config-driven plans and economy display; responsive original cover artwork
- PWA offline shell, installation handling, Netlify and CI configuration
- Core schema, ownership RLS and fictional 50-family / 210-book seed

## Added since the foundation

- Protected admin panel, book photographs and two-cover scanning
- Manual UPI membership and coin-pack payment requests, independent admin verification, atomic membership/wallet activation, duplicate-credit protection
- Configured upload rewards and repair of missing historical credits
- Reader accounts without a required parent/guardian checkbox, password visibility and mobile layouts

## Subsequent phases (not implemented)

1. Borrow requests, reservations and enforcement of borrowing-plan entitlements.
2. Atomic OTP handover and return, borrowing transfers, return rewards and referral eligibility.
3. Overdue scheduler/notifications, extensions, protected value claims and disputes.
4. Moderated reviews, child profiles, badges, challenges, leader dashboards and leaderboards.
5. Admin roles, analytics, audited actions and configuration management.
6. Automated payment-gateway integration (current UPI payments require admin verification), end-to-end security tests and production operations.

## Production launch gates

Core UI is not a production-ready lending platform. Apply and test migrations in a dedicated Supabase project, verify two-user isolation and privilege escalation, finish later phases, integration-test concurrent handovers and rollback, configure email delivery/backups/monitoring, validate accessibility/mobile devices and offline installation, connect GitHub/Netlify, and run a 50-family pilot before launch.
