# Manual UPI membership and BookCoin workflow

UPI mobile recipient: **9820737429**, as specified by the owner. The app displays the mobile number and amount, with a copy button. It does not invent a UPI ID or QR code from that number. The member pays in their UPI app, checks the recipient there, and submits payer name and transaction ID/UTR. The app does not send money or independently confirm a bank transaction.

## Membership registration

Choose a plan and monthly/yearly term in **Membership**, pay the displayed amount, then submit transaction details. The backend reads the price and welcome coins from the plan, checks the expected price and freezes them on a pending payment request. One pending membership request is allowed per member. An active paid membership cannot be purchased a second time before expiry.

In **Admin → Payments & memberships**, independently check receipt and the amount/reference in the bank or UPI app, then **Verify & approve**. The database atomically activates the paid term, approves the member’s primary chapter membership, credits the plan’s welcome BookCoins and writes an activity record. The configured welcome amount is awarded for both approved monthly and annual terms. Repeated approval is idempotent. Rejection records a reason and adds no coins. Approved payments cannot be reversed through the review action; refunds require a separate audited process.

Chapter approval and paid membership are distinct. Changing a chapter-member status does not itself establish payment or paid membership.

## BookCoin purchases

Only an approved, currently active paid member can submit a coin-pack payment. Available packs and their prices come from the database. Payment uses the same UPI number and manual verification flow. Approval adds the purchased coins exactly once; submitting a reference alone never changes the wallet. Active membership is checked again at approval. A member can have one pending coin purchase at a time.

References are normalized and globally unique to prevent reuse across members and payment types. Neither members nor administrators have direct browser write access to wallet balances or the append-only ledger. Prices, coins and membership dates are determined on the server, not by submitted browser amounts.

## Upload rewards

Each successful book-copy submission automatically earns the configured `economy.listing` reward, capped by the sum of listing reward coins in the preceding 365 days (`listing_annual_cap`, currently 20). There is no paid-membership requirement for earning upload rewards. One copy can earn only one listing credit; edits or repeated moderation do not credit it again. The migration repairs eligible pre-existing uploads missing a credit, without rewriting historic transactions. Failed submissions roll back their credit with the book. UI balances refresh after submission and periodically while the member has the app open.

## Registration and email

The required parent/guardian checkbox and account restriction have been removed. Anyone can create a member account; the legacy internal table names remain for compatibility.

The owner explicitly approved temporarily turning off signup email confirmation on 30 October 2026. Supabase’s public auth settings verify `mailer_autoconfirm=true`. No custom SMTP sender exists yet. Signup therefore does not need a confirmation email, but email-based password recovery and invitations still depend on the default sender’s limits. Configure custom SMTP and restore confirmation when the owner is ready. Existing accounts are not deleted or assigned new passwords by this change.

Password visibility is controlled by an accessible eye button. Email requests have a cooldown and clearer quota errors to avoid repeated submissions. Mobile layouts use single-column checkout, scrollable dialogs, safe-area navigation and touch-size controls.

## Verification

Database tests cover automatic listing credits, annual caps, replay protection, private requests, denied wallet writes, membership approval, rejected payments, price validation, duplicate UTRs and expired membership gates. No real payment is approved or initiated during verification. Browser checks use local demo payment forms; production approval remains the administrator’s financial verification decision.
