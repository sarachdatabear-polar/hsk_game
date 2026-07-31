# Lucky Cat HSK production UX and payment audit

**Date:** 2026-07-31  
**Audited release:** `main` at `c755cf29` (v137)  
**Primary market:** Thailand, English and Thai UI  
**Primary payment under review:** one-time 79 THB Supporter purchase on web, using
Stripe Checkout with PromptPay and card

## Executive verdict

Lucky Cat is already a strong learning product. Its core loop, first-run experience,
responsive behavior, accessibility foundations, offline behavior, and game economy are
more mature than the current purchase presentation. The payment backend is also designed
carefully: it is server-authoritative, idempotent, durable across a redirect, and capable
of restoring the Supporter entitlement.

The weak point is the user journey between **wanting Supporter** and **arriving at
checkout**. Today that path feels like a technical account prerequisite rather than a
designed purchase flow:

1. The player taps a price.
2. The button changes to "Processing…".
3. The app discovers that an account is required.
4. A temporary toast appears.
5. The player is moved to the generic Account screen.
6. The Account screen talks about cloud backup, not the product they chose.
7. After email verification, the player is not returned to the offer or checkout.

This is the main reason the payment process will feel rough in production. It adds
navigation, loses context, and makes the player repeat their intent.

**Recommendation:** build one dedicated, in-app **Supporter offer sheet** that owns the
entire pre-checkout journey: benefits, exact price, one-time terms, email verification,
restore, trust links, and checkout continuation. Keep Stripe Checkout as the hosted
payment surface. After Stripe, return to a persistent purchase-status card rather than
communicating the outcome only through a toast.

Do not activate billing until the four P0 findings below are fixed and the documented
live Stripe gate passes.

## Evidence reviewed

- Current `index.html`, `src/main.js`, account/auth helpers, purchase providers,
  checkout-return code, product catalog, i18n strings, and purchase tests.
- Existing v137 handoff and release evidence.
- Existing launch-readiness, responsive, full-feature, and shop audits.
- Current verification run: `npm test` passed **108 files / 9,571 tests**.
- The web billing configuration remains intentionally dark:
  `STRIPE_CHECKOUT_URL` and `STRIPE_PUBLISHABLE_KEY` are blank.
- Production references:
  - [Duolingo's product design for Super](https://blog.duolingo.com/super-duolingo-launch/)
  - [Duolingo's premium-learning principles](https://blog.duolingo.com/duolingo-technology-innovations/)
  - [Duolingo's findings in a price-sensitive Asian market](https://blog.duolingo.com/language-learning-for-the-next-billion-duolingo-in-india/)
  - [Apple Human Interface Guidelines for in-app purchase](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase)
  - [Google Play one-time product guidance](https://developer.android.com/google/play/billing/one-time-products)
  - [Google Play purchase flow](https://developer.android.com/google/play/billing/integrate)
  - [Stripe PromptPay flow](https://docs.stripe.com/payments/promptpay)
  - [RevenueCat web paywall flow](https://production-docs.revenuecat.com/docs/web/paywalls)

## What is already production-grade

### Product and learning UX

- The first run starts at HSK1, supports HSK1–6 and English/Thai, and demonstrates the
  learning loop before asking for money.
- The main experience is not paywalled. This matches Duolingo's strongest product
  principle: paid benefits support the product without blocking the core course.
- The results-screen Supporter moment is contextual, quiet, limited to once per day,
  and appears only after a positive event. This is a much better conversion point than a
  forced first-run paywall.
- Home, Word Quest, Cards, Cat Journey, Profile, More, and Collection have a coherent
  illustrated style and a stable bottom navigation model.
- The permanent responsive matrix covers ten viewports in both English and Thai.
- Purchase buttons meet the existing 44 px touch-target floor.

### Transaction engineering

- The Supporter product is correctly modeled as a non-consumable one-time purchase,
  with 2,000 bonus coins and a permanent entitlement.
- Stripe Checkout is the right payment surface for the web path. It avoids building a
  fragile custom card/QR form.
- PromptPay and card are offered through one Checkout Session.
- The server derives the user from the authenticated token and refuses anonymous
  purchases.
- The webhook grants only paid sessions and reuses the idempotent purchase ledger.
- A durable pending record survives redirects, tab closure, and delayed PromptPay
  settlement.
- Coins and Supporter status are delivered separately and restored correctly.
- Purchase and restore code has strong focused test coverage.

## Prioritized findings

| ID | Severity | Finding | Why it matters |
|---|---|---|---|
| P0-1 | P0 before billing activation | Account creation is an error-like detour and purchase intent is lost. | The player must leave the product, understand a generic backup flow, then find the product and tap again. This is the largest conversion and trust break. |
| P0-2 | P0 before billing activation | Stripe web shows the wrong Supporter copy. | `makeSupporterCard()` treats only `revenuecat-web` as web. `stripe-web` therefore receives "Remove ads forever" even though the web app has no ads. |
| P0-3 | P0 before billing activation | The displayed price can change currency at checkout. | English UI falls back to `$2.99`; Stripe charges `79 THB`. A buyer can see one currency in-app and another on the payment page. |
| P0-4 | P0 before billing activation | The public GitHub Pages bridge can start a checkout that returns to another origin. | The fixed success URL is `luckycathsk.com`; origin-scoped session and local storage do not follow from the bridge, making a working purchase look lost. |
| P1-1 | High | Real-money products are mixed into a screen titled "Collection." | Soft-currency cosmetics, owned inventory, and a real-money Supporter offer serve different user goals and need different hierarchy. |
| P1-2 | High | The Supporter offer is a compact shop row, not a purchase decision surface. | Benefits, permanence, exact price, restore, payment methods, and trust information cannot be scanned confidently. |
| P1-3 | High | Purchase progress and outcomes rely too heavily on a 2.6-second toast. | Toasts are easy to miss, replace one another, do not persist across async PromptPay settlement, and are not currently exposed as an ARIA live region. |
| P1-4 | High | Restore is buried under More → Account. | A returning buyer naturally looks on the offer or purchase screen, not in cloud-account settings. |
| P1-5 | High | Payment-critical Thai strings are still marked `TH-REVIEW`. | Account verification, processing, restore, and purchase-success language directly affect money and trust in the primary market. |
| P1-6 | High | Email and OTP inputs use placeholder-only identification. | The dynamically created account fields have no persistent `<label>` or `aria-label`, and the purchase-triggered route does not move focus to a clearly announced heading. |
| P1-7 | High | First run opens Flashcards before the game and creates no recoverable account. | It positions a secondary study tool as the product, delays the real Word Quest, and allows meaningful progress before cross-device recovery is established. |
| P2-1 | Medium | The button says "Processing…" before checkout has started. | In the account-required case, no payment is processing; the message creates unnecessary anxiety about whether a charge occurred. |
| P2-2 | Medium | Pending copy is coin-centric for an entitlement purchase. | "Your coins will arrive shortly" understates the main outcome: permanent Supporter status. |
| P2-3 | Medium | No product-specific cancel state exists. | Returning from an abandoned Checkout lands back in the app without a durable "Checkout canceled — you were not charged" recovery action. |
| P2-4 | Medium | Trust and support links are absent at the decision point. | Privacy, terms, restore, and purchase-help information should be reachable before payment, not discovered elsewhere afterward. |
| P2-5 | Medium | Funnel analytics cannot isolate the rough step. | `product_view`, `purchase_start`, `purchase_success`, and `purchase_fail` exist, but account-required, OTP completion, checkout loaded, return status, and grant latency are not separately measurable. |

## Detailed payment-flow audit

### 1. Discovery and offer placement

The current results placement is good: it appears after value has been experienced and
does not interrupt the learning path. Keep it.

The destination is weak. The CTA navigates into Collection and scrolls to a shop row.
Instead it should open a focused Supporter sheet directly. Collection may still contain a
small Supporter entry, but it should open the same sheet so there is only one canonical
offer presentation.

Duolingo is the best product reference for timing and framing, not for pricing. It lets
learners experience the core product first and explains premium through concrete
benefits. Its own work in India found that confusing or premature premium promotions
could look like a hard paywall; removing them improved daily active users by 6%, and
interviewed learners expressed a preference for a one-time fee. Lucky Cat's current
one-time Supporter model is therefore a good market fit; the presentation needs to make
that simplicity explicit.

### 2. Offer comprehension

The decision surface should answer five questions without scrolling:

1. What do I get?
2. Is this permanent or recurring?
3. What is the exact total price and currency?
4. How can I pay?
5. How do I recover it on another device?

Recommended offer copy:

> **Support Lucky Cat — once**
>
> - 2,000 coins now
> - Permanent Supporter badge and thank-you cosmetic
> - Ad-free in the Android app
> - Restores on every device linked to your email
>
> **฿79 one time · no subscription**
>
> Pay securely with PromptPay or card

Primary CTA:

- Signed in: **Continue to secure checkout · ฿79**
- Not signed in: **Continue with email**
- Already owned: **Supporter active ✓**

Secondary actions:

- **Restore purchase**
- **Not now**
- **Purchase help**
- Privacy and terms links

Apple's purchase guidance supports this shape: integrated styling, succinct product
names and descriptions, the total billing price, and an obvious restore path. The
system/hosted confirmation page should remain the place where payment is finalized.

### 3. Account requirement

Requiring a recoverable account for a permanent web entitlement is the right product
decision. The problem is the interaction model.

Account creation should be a step inside the purchase sheet, with purchase-specific
copy:

> **Save your Supporter purchase**
>
> Enter your email so your badge and ad-free access can be restored on another device.
> No password required.

After the email is submitted:

- Show "We sent a code to …" in the same sheet.
- Auto-focus the labeled code field.
- Keep the product and price visible in a compact summary.
- Allow changing the email.
- After successful verification, create the Checkout Session and redirect directly to
  Stripe. The original click already expressed checkout intent, and Stripe still owns
  the final payment confirmation.
- If automatic continuation is considered too surprising, return to one explicit
  **Continue to secure checkout · ฿79** button in the same sheet. Do not send the player
  to another screen.

The generic Account screen should remain for backup, sign-out, deletion, and restore
management. It should not be the primary purchase funnel.

### 4. Checkout handoff

Keep hosted Stripe Checkout. PromptPay's official flow is already familiar to Thai
buyers: select PromptPay, scan a QR code in a banking app, authorize, then receive
completion confirmation.

Before redirecting:

- Normalize to the canonical `luckycathsk.com` origin.
- Display `79 THB` in the app and configure the Checkout Session for the same value.
- Persist `{product, source, returnScreen}` as a purchase intent before auth, and the
  Checkout Session id before redirect.
- Use a product-specific cancel URL, for example
  `/?checkout=cancelled&product=supporter`.

Do not expose payment on the GitHub Pages bridge unless the bridge first moves the
entire session to the canonical origin. The simpler production choice is to redirect all
normal public traffic from the bridge to `luckycathsk.com` before sign-in or purchase.

### 5. Pending, success, cancel, and failure

Replace toast-only outcomes with a persistent status component at the top of the current
screen or in the Supporter sheet.

**Pending PromptPay**

> Waiting for PromptPay  
> Finish the payment in your banking app. You can close this screen; Supporter will
> activate automatically when payment completes.

Actions: **Check again**, **Payment help**, **Close**

**Success**

> You're a Supporter ♥  
> Supporter is active and 2,000 coins were added.

Actions: **Keep learning**, **View my badge**

**Canceled**

> Checkout canceled  
> You were not charged.

Actions: **Try again**, **Not now**

**Delayed or unresolved**

> We're still confirming your purchase  
> Your payment is safe. We'll keep checking, or you can contact support with this
> reference.

Actions: **Check again**, **Purchase help**

The existing durable polling and restore logic should power these states; this is mainly
a presentation and navigation change.

### 6. Restore and purchase help

Keep Restore in Account, but also place **Already purchased? Restore** on the Supporter
sheet. This is where Apple and Google users expect recovery to live.

Purchase help should cover:

- Paid but Supporter is not active
- Restore on a new device
- PromptPay still pending
- Request a refund / contact support
- The user's recent purchase reference when available

### 7. Accessibility

The core app has strong dialog focus behavior and touch sizing. The payment flow should
reuse those conventions.

Required fixes:

- Use visible `<label>` elements for email and OTP fields.
- Add `aria-describedby` for account and payment explanations.
- Put async status in `role="status" aria-live="polite"`; urgent payment failures may
  use `role="alert"`.
- Move focus to the offer title when opened and the code field after sending.
- Announce loading without replacing the price with an ambiguous message.
- Keep the close/back action available immediately.
- Test English and Thai at 320×568, 390×844, 844×390, and 200% browser zoom.

## Recommended target journey

```text
Positive result / Collection / More
                |
                v
        Supporter offer sheet
        benefits + ฿79 once
          /             \
 signed in              not signed in
     |                       |
     |                 email + OTP
     |                       |
     +-----------+-----------+
                 |
                 v
       Stripe hosted Checkout
       PromptPay QR or card
          /       |       \
      paid     pending    canceled
        |          |          |
        v          v          v
   Success card  Persistent   Offer sheet
   +2,000 coins  status card  "not charged"
   badge active  auto-check   retry/not now
```

## Reference model

Use a combination rather than copying one app:

- **Duolingo:** reference for premium timing, benefit-led copy, contextual prompts, and
  keeping the learning core free.
- **Apple and Google Play:** reference for an integrated offer surface, localized total
  price, restore, and a platform-controlled confirmation step.
- **Stripe Checkout:** reference for PromptPay/card collection and QR authorization.
- **RevenueCat's three-stage model:** package/offer selection → checkout →
  post-purchase. Lucky Cat currently has checkout engineering but needs stronger offer
  selection and post-purchase presentation.

## First-run orientation

The current Flashcard-first introduction creates the wrong product expectation. Lucky
Cat is a Word Quest game; Flashcards are a supporting study tool and should not be the
first playable screen.

The revised first run is:

1. Welcome and language
2. Offer **Create my account** as the primary action and **Try one quest first** as the
   secondary action
3. Choose an HSK starting level
4. Play a real six-word Word Quest with contextual coach marks
5. Learn the Results, rewards, and Review Pouch
6. If still local, offer to save the just-earned progress or continue playing free
7. Take a short Home → Cat Journey → Profile tour

The Word Quest tutorial uses real rules and pauses the timer only while instructional
text is open. A first miss demonstrates the real Review Pouch and word-return behavior.
Flashcards and Tone Trainer are introduced afterward on Home as optional supporting
tools.

Account creation is recommended but not a hard wall. Declining it never reduces the
free game. Offline and `file://` users retain the same local-play fallback. A local
player who later chooses Supporter completes the same inline email/OTP step inside the
Supporter sheet, preserving purchase context. Shop, Daily Quests, Streak Freeze,
advanced formats, and Supporter use one-time contextual tips later, when each feature
becomes useful. Payment does not appear in onboarding.

Full behavior, copy, state model, code boundaries, testing matrix, and acceptance
criteria are in
[the first-run guided-tour design](2026-07-31-first-run-guided-tour-design.md).

## Implementation order

### Phase 0 — required before activating billing

1. Fix Stripe web Supporter copy.
2. Display one currency and exact total: `฿79` / `79 THB`.
3. Prevent checkout from non-canonical origins.
4. Human-review all Thai payment and account strings.
5. Complete the documented live PromptPay, card, abandon, webhook replay, entitlement,
   and restore gate.

### Phase 1 — smooth purchase path

1. Add a dedicated Supporter offer dialog/sheet in its own `src/ui/` module.
2. Add a pure purchase-intent state helper and focused tests.
3. Embed email and OTP states in that sheet.
4. Continue from verified email to Checkout without losing product context.
5. Route the results CTA, Collection entry, and More entry to the same offer sheet.
6. Add Restore and trust/help links to the sheet.

### Phase 2 — post-purchase confidence

1. Add persistent pending, success, canceled, and unresolved status cards.
2. Make the status screen read the durable checkout record already used by polling.
3. Add manual "Check again" and purchase-help actions.
4. Announce state changes accessibly.

### Phase 3 — measurement and iteration

Add consent-aware funnel events:

- `supporter_prompt_shown` with source
- `supporter_offer_open`
- `purchase_account_required`
- `purchase_otp_sent`
- `purchase_account_complete`
- `checkout_created`
- `checkout_return` with `paid|pending|cancelled`
- `purchase_grant_confirmed` with latency bucket
- `purchase_restore` with result
- `purchase_help_open`

Review funnel loss separately for English/Thai, platform, entry source, and payment
method. Do not optimize only for checkout starts; monitor learning-session completion,
refund/support rate, unresolved grants, and post-purchase retention.

## Acceptance criteria

The redesigned payment UX is production-ready when:

1. A signed-out player can go from Supporter CTA to Stripe without navigating through
   Account, More, or Collection manually.
2. Email verification preserves the chosen product, exact price, and return destination.
3. In-app price and Stripe charge are both 79 THB.
4. Web copy does not promise web ad removal.
5. A purchase cannot start on an origin that cannot receive its authenticated return.
6. Back/cancel returns to the same offer with "You were not charged."
7. PromptPay pending survives reload and gives a visible, actionable status.
8. Success confirms both Supporter status and 2,000 coins.
9. Restore is available from the offer and Account screens.
10. Email, OTP, errors, and status changes pass keyboard and screen-reader checks.
11. Payment-critical Thai copy has native sign-off.
12. The real-money live gate passes for PromptPay, card, abandon, duplicate webhook,
    delayed settlement, new-device restore, and canonical-origin return.

## Final product recommendation

Do not redesign the whole game around monetization. The core UX is already strong.
Concentrate the work in one reusable Supporter sheet and one persistent post-purchase
status component. That will make the payment experience feel like part of Lucky Cat
instead of a handoff between Shop, Account, Stripe, and toast messages.
