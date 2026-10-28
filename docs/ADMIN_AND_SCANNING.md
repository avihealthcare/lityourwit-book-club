# Administration and book scanning

## Administrator access

Sign in through `/auth` with the existing owner account, then choose **Admin panel** in the navigation or profile page, or visit `/admin`.

Roles are assigned by the backend in `private.user_roles`. Email addresses and user-editable signup metadata never grant administrator access. The owner role is provisioned separately against the existing verified account; there is no hardcoded administrator email or password in application source. Current role and suspension status are checked on every admin request.

The panel provides:

- Overview of active chapters, members, pending approvals and books.
- Create/edit chapters: name, area, city, PIN, description, active status.
- Invite members by email, edit display name and chapter, approve/decline, suspend, remove and restore.
- Approve or hide books, while protecting reserved/on-loan copies from moderation changes.
- Edit membership plan prices, borrowing allowances, durations, child limits and protection amounts.
- Edit existing BookCoin reward, overdue reminder and milestone settings.
- Last 100 administrator actions in a private, server-written activity log.

Removal is reversible: suspension blocks Data API access even with an existing token, listings are hidden, and records are retained. Restore requires reviewing chapter approval and book availability again. Existing administrators cannot be removed through this panel. Membership plan changes do not charge users or activate subscriptions. Payment processing and borrowing exchanges remain separate roadmap work.

`admin-invite` is a Supabase Edge Function. It validates the caller and current admin role before invoking Supabase's invitation API with a server-only key supplied by the Supabase runtime. It sends mail only when an administrator explicitly submits the invite form. No server key belongs in Netlify's public Vite variables. The recipient follows the invitation and chooses their own password.

## Front/back scanning

On **Add book → Scan book**, take or choose a front-cover photo and a back-cover photo, then select **Read and fill book details**. The app reads English text locally with pinned Tesseract.js assets, validates ISBN checksums, and, if possible, matches the ISBN with Open Library to improve the title/author/description. OCR is a best-effort suggestion; review all fields before submitting. Existing typed fields are preserved.

Photos stay in memory on the device and are not uploaded or saved as public covers. Only the ISBN is sent to Open Library. JPG/PNG/WebP are supported up to 20 MB; photos are resized before recognition. The camera button uses the native capture picker on supported phones. Manual entry remains available if recognition or lookup fails. The first scan downloads an English reading model (about 10 MB); subsequent scans may use browser caching. No AI vendor account or API key is needed.

All worker, WebAssembly and language files are copied from pinned npm packages at build time with `scripts/prepare-ocr.mjs`. Generated `/public/ocr/` is gitignored and included by the build. The security policy permits same-origin workers and WebAssembly compilation; third-party scripts are not required.

## Verification

Run `npm run lint`, `npm test`, and `npm run build`. Database tests execute all migrations in PGlite and verify both denied member requests and authorized admin operations. Scanning tests cover ISBN validation, OCR parsing and catalogue fallback. Live verification should additionally check actual phone photos and an invitation sent to a consenting recipient.

## Listing photographs

A book copy can have up to six owner photographs. Add them during listing, reuse the front/back scan photos with **Use these photos in the listing**, or choose **My bookshelf → Manage photos** later. **Make cover** moves a photograph to the first position; that photo appears in Explore and shelf cards. The detail page has a selectable gallery and full-size links.

Listing photographs are distinct from OCR input: scan photos stay local unless the owner explicitly chooses to add them to the listing. Listing uploads are resized to a 1600-pixel maximum edge, converted to JPEG to remove original metadata, and capped at 2 MB each. JPG, PNG and WebP inputs up to 20 MB are supported. An existing external HTTPS cover URL remains an optional fallback.

The private `book-photos` bucket allows owner uploads and uses the same chapter/publication visibility as books. Owners and administrators can read pending photos; another chapter cannot read them. Clients store permanent object paths on `book_copies`, then request one-hour signed viewing links when loading the catalogue. These links are temporary bearer links and are not stored in the database. Only the owner can update a copy's photo paths, and the database checks path ownership, duplicates and the six-photo maximum. Failed uploads are cleaned up when possible; linked photos cannot be deleted directly by a client. Replaced/unlinked existing objects remain private to the owner and administrator pending storage housekeeping.
