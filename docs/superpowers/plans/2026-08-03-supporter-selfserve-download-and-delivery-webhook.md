# Supporter Self-Serve Download + Resend Delivery Webhook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Supporter can download the six-guide ZIP directly in-game (fresh signed URL, no email), and Resend delivery outcomes (delivered/bounced/failed) become visible in `supporter_deliveries` with an owner alert on failure.

**Architecture:** Two new Deno edge functions following the house thin-wrapper pattern — `supporter-download` (JWT-verified, modeled on `stripe-checkout`) and `resend-webhook` (svix-verified, `--no-verify-jwt`, modeled on `stripe-webhook`). All decision logic lives in vitest-tested pure modules (`_shared/resend-webhook/core.js`, `src/monetization/supporter-download.js`). Client wiring is a small `src/ui/` factory mounted at two existing `main.js` sites.

**Tech Stack:** Deno edge functions (esm.sh supabase-js@2), Web Crypto HMAC, vanilla JS ES modules, vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-supporter-selfserve-download-and-delivery-webhook-design.md`

## Global Constraints

- Repo: `~/work/HSK/game`, branch `development`. Node via `. ~/.nvm/nvm.sh` if missing.
- NEVER pipe `npm test` through `tail`/`grep` when gating a commit — run it plainly; the exit code must be visible.
- After changing `src/`, `npm run build` must pass. `npm run lint` before pushing.
- `main.js` is frozen for NEW feature wiring — only the two additive touch-points named in Task 6; heavy lifting stays in `src/ui/supporter-download.js`.
- New TH strings get a `// TH-REVIEW` line comment (existing convention in `src/i18n.js`).
- i18n keys must exist in BOTH locales (parity suite enforces).
- Do NOT bump the `sw.js` SHELL version in these tasks — the release cut does that separately.
- Alert recipient is exactly `support@luckycathsk.com`. Signed URL lifetime is exactly 7 days (`SIGNED_URL_SECONDS`), matching email copy.
- Status value strings are exact: `pending`, `sending`, `sent`, `failed`, `delivered`.

---

### Task 1: Migration — `delivered` status

**Files:**
- Create: `docs/supabase/migrations/2026-08-03-supporter-delivery-status.sql`
- Modify: `docs/supabase/schema.sql` (the `supporter_deliveries` status check + a revision note at the top of its supporter-delivery block)

**Interfaces:**
- Produces: DB accepts `status = 'delivered'` on `public.supporter_deliveries`. Task 3 relies on this.

- [ ] **Step 1: Write the migration file**

```sql
-- 2026-08-03: delivery truth. The Resend webhook (resend-webhook function)
-- moves rows past 'sent': email.delivered -> 'delivered' (terminal),
-- email.bounced/email.failed -> 'failed' (re-claimable by
-- claim_supporter_delivery, unchanged). Additive + idempotent.
alter table public.supporter_deliveries
  drop constraint if exists supporter_deliveries_status_check;
alter table public.supporter_deliveries
  add constraint supporter_deliveries_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'delivered'));
```

Note: the constraint was created inline as `check (status in (...))` in
`2026-08-02-supporter-email-delivery.sql`, so Postgres named it
`supporter_deliveries_status_check` by default. The `drop ... if exists`
makes the script idempotent; the applier (lead session) re-checks the name
live before running (`select conname from pg_constraint where conrelid =
'public.supporter_deliveries'::regclass and contype = 'c';`).

- [ ] **Step 2: Mirror in schema.sql**

In `docs/supabase/schema.sql`, find the `supporter_deliveries` create block and change

```sql
                       check (status in ('pending', 'sending', 'sent', 'failed')),
```

to

```sql
                       check (status in ('pending', 'sending', 'sent', 'failed', 'delivered')),
```

and append to the comment block above the table (keeping its style): a line
`-- rev 2026-08-03: + 'delivered' status (resend-webhook delivery truth).`

- [ ] **Step 3: Commit**

```bash
git add docs/supabase/migrations/2026-08-03-supporter-delivery-status.sql docs/supabase/schema.sql
git commit -m "feat(db): supporter_deliveries accepts 'delivered' status (delivery-truth webhook)"
```

---

### Task 2: `_shared/resend-webhook/core.js` — pure webhook logic + tests

**Files:**
- Create: `supabase/functions/_shared/resend-webhook/core.js`
- Test: `test/resend-webhook.test.js`

**Interfaces:**
- Produces (Task 3 imports these exact names):
  - `async verifySvixSignature({ payload, id, timestamp, signature, secret, nowSeconds }) -> boolean`
  - `classifyResendEvent(event) -> { action: "deliver"|"fail"|"ignore", emailId?, reason? }`
  - `buildDeliveryAlert({ from, orderId, buyerDomain, reason }) -> { from, to, subject, text }`
  - `const ALERT_TO = "support@luckycathsk.com"`

- [ ] **Step 1: Write the failing tests**

Create `test/resend-webhook.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  verifySvixSignature,
  classifyResendEvent,
  buildDeliveryAlert,
  ALERT_TO,
} from "../supabase/functions/_shared/resend-webhook/core.js";

// Build a real signature the same way svix does, so the verifier is tested
// against the wire format, not against itself alone.
async function sign(secretB64, id, timestamp, payload) {
  const key = await crypto.subtle.importKey(
    "raw", Uint8Array.from(atob(secretB64), c => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

const SECRET_B64 = btoa("test-webhook-secret-32-bytes-long!");
const SECRET = `whsec_${SECRET_B64}`;
const NOW = 1_754_300_000;

describe("verifySvixSignature", () => {
  const payload = '{"type":"email.delivered"}';

  it("accepts a valid v1 signature within tolerance", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW + 60,
    })).toBe(true);
  });

  it("accepts when the valid signature is one of several space-separated entries", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,AAAA v1,${sig}`, secret: SECRET, nowSeconds: NOW,
    })).toBe(true);
  });

  it("rejects a wrong signature", async () => {
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: "v1,bm9wZQ==", secret: SECRET, nowSeconds: NOW,
    })).toBe(false);
  });

  it("rejects a stale timestamp (>5 min)", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW + 301,
    })).toBe(false);
  });

  it("rejects a signature computed for a different payload", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), '{"other":true}');
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW,
    })).toBe(false);
  });

  it("rejects missing header parts and malformed secrets", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    for (const patch of [
      { id: null }, { timestamp: null }, { signature: null },
      { secret: null }, { secret: "whsec_%%%not-base64%%%" },
      { timestamp: "not-a-number" },
    ]) {
      expect(await verifySvixSignature({
        payload, id: "msg_1", timestamp: String(NOW),
        signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW, ...patch,
      })).toBe(false);
    }
  });
});

describe("classifyResendEvent", () => {
  it("maps email.delivered to deliver", () => {
    expect(classifyResendEvent({ type: "email.delivered", data: { email_id: "re_1" } }))
      .toEqual({ action: "deliver", emailId: "re_1" });
  });

  it("maps email.bounced to fail with a reason carrying the bounce detail", () => {
    const c = classifyResendEvent({
      type: "email.bounced",
      data: { email_id: "re_2", bounce: { message: "mailbox full" } },
    });
    expect(c.action).toBe("fail");
    expect(c.emailId).toBe("re_2");
    expect(c.reason).toContain("email.bounced");
    expect(c.reason).toContain("mailbox full");
  });

  it("maps email.failed to fail even without detail", () => {
    const c = classifyResendEvent({ type: "email.failed", data: { email_id: "re_3" } });
    expect(c.action).toBe("fail");
    expect(c.reason).toContain("email.failed");
  });

  it("ignores other event types, missing data, and missing email_id", () => {
    expect(classifyResendEvent({ type: "email.sent", data: { email_id: "re_4" } }).action).toBe("ignore");
    expect(classifyResendEvent({ type: "email.delivered" }).action).toBe("ignore");
    expect(classifyResendEvent(null).action).toBe("ignore");
    expect(classifyResendEvent({}).action).toBe("ignore");
  });

  it("caps the failure reason length", () => {
    const c = classifyResendEvent({
      type: "email.failed",
      data: { email_id: "re_5", failed: { reason: "x".repeat(2000) } },
    });
    expect(c.reason.length).toBeLessThanOrEqual(500);
  });
});

describe("buildDeliveryAlert", () => {
  it("addresses the alert to support@ with order id, domain, and reason", () => {
    const a = buildDeliveryAlert({
      from: "Lucky Cat HSK <gift@mail.luckycathsk.com>",
      orderId: "cs_live_123", buyerDomain: "gmail.com", reason: "email.bounced: mailbox full",
    });
    expect(a.to).toEqual([ALERT_TO]);
    expect(a.from).toBe("Lucky Cat HSK <gift@mail.luckycathsk.com>");
    expect(a.subject).toContain("cs_live_123");
    expect(a.text).toContain("gmail.com");
    expect(a.text).toContain("mailbox full");
    // never leak a full buyer address into the alert
    expect(a.text).not.toContain("@gmail.com@");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/resend-webhook.test.js`
Expected: FAIL — cannot resolve `../supabase/functions/_shared/resend-webhook/core.js`

- [ ] **Step 3: Implement `core.js`**

Create `supabase/functions/_shared/resend-webhook/core.js`:

```js
"use strict";
// Pure decision logic for the Resend delivery webhook. Runs in BOTH Deno
// (edge function) and Node/vitest — Web Crypto + atob/btoa only, no imports.
// Svix wire format: sign `${id}.${timestamp}.${payload}` with the base64
// secret after "whsec_", compare base64 HMAC-SHA256 against each
// space-separated "v1,<sig>" entry. https://docs.svix.com/receiving/verifying-payloads
export const ALERT_TO = "support@luckycathsk.com";
const TOLERANCE_SECONDS = 300;
const REASON_MAX = 500;

export async function verifySvixSignature({ payload, id, timestamp, signature, secret, nowSeconds }) {
  if (typeof payload !== "string" || !id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Number.isFinite(nowSeconds) ? nowSeconds : Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return signature.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    return version === "v1" && !!sig && sig === expected;
  });
}

export function classifyResendEvent(event) {
  const type = event && event.type;
  const emailId = event && event.data && event.data.email_id;
  if (!emailId || typeof emailId !== "string") return { action: "ignore", reason: "no-email-id" };
  if (type === "email.delivered") return { action: "deliver", emailId };
  if (type === "email.bounced" || type === "email.failed") {
    const detail =
      (event.data.bounce && event.data.bounce.message) ||
      (event.data.failed && event.data.failed.reason) || "";
    const reason = [type, detail].filter(Boolean).join(": ").slice(0, REASON_MAX);
    return { action: "fail", emailId, reason };
  }
  return { action: "ignore", reason: type || "no-type" };
}

export function buildDeliveryAlert({ from, orderId, buyerDomain, reason }) {
  return {
    from,
    to: [ALERT_TO],
    subject: `Supporter guide email FAILED — order ${orderId}`,
    text: [
      `The supporter guide email for order ${orderId} was not delivered.`,
      `Buyer domain: ${buyerDomain || "unknown"}`,
      `Reason: ${reason}`,
      "",
      "The delivery row is back to 'failed' (re-claimable). The buyer can",
      "also self-serve any time via the in-game download button.",
    ].join("\n"),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/resend-webhook.test.js`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/resend-webhook/core.js test/resend-webhook.test.js
git commit -m "feat(resend-webhook): pure svix verification, event classification, owner alert builder"
```

---

### Task 3: `resend-webhook/index.ts` — Deno wiring

**Files:**
- Create: `supabase/functions/resend-webhook/index.ts`

**Interfaces:**
- Consumes: Task 2's `verifySvixSignature`, `classifyResendEvent`, `buildDeliveryAlert`; `RESEND_ENDPOINT` from `../_shared/supporter-email/core.js`.
- Produces: deployed endpoint `POST /functions/v1/resend-webhook` (deployed `--no-verify-jwt` — Resend sends no Supabase JWT).
- No vitest coverage — thin I/O wrapper, untested by design like `stripe-webhook/index.ts`.

- [ ] **Step 1: Write the function**

Create `supabase/functions/resend-webhook/index.ts`:

```ts
// Resend delivery webhook — Deno Edge Function. Thin I/O wrapper: all
// decision logic lives in _shared/resend-webhook/core.js (vitest-tested,
// see test/resend-webhook.test.js).
//
// ⚠ DEPLOY WITH JWT VERIFICATION DISABLED (--no-verify-jwt). Resend sends
// svix headers, not a Supabase JWT. Auth = svix signature, fail closed.
// No CORS: the caller is Resend's server, not a browser.
//
// Delivery truth (spec 2026-08-03): 'sent' only means "Resend accepted".
// email.delivered  -> row 'sent' -> 'delivered' (terminal).
// email.bounced/failed -> row 'sent' -> 'failed' (re-claimable) + one
// alert email to support@. Rows are matched by provider_message_id; both
// updates are gated on status='sent' so a manually reset / re-claimed /
// already-delivered row is never moved backwards. Unmatched events no-op
// 200 — that INCLUDES the alert emails themselves (same Resend account),
// which is what breaks the alert-about-alert loop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifySvixSignature,
  classifyResendEvent,
  buildDeliveryAlert,
} from "../_shared/resend-webhook/core.js";
import { RESEND_ENDPOINT } from "../_shared/supporter-email/core.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Fail closed: an unset secret must never mean "no signature needed".
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  const payload = await req.text();
  const verified = await verifySvixSignature({
    payload,
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
    secret,
  });
  if (!verified) return new Response("unauthorized", { status: 401 });

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const c = classifyResendEvent(event);
  if (c.action === "ignore") return json({ ignored: c.reason });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (c.action === "deliver") {
    const { error } = await supabase
      .from("supporter_deliveries")
      .update({ status: "delivered" })
      .eq("provider_message_id", c.emailId)
      .eq("status", "sent");
    if (error) return new Response("storage error", { status: 500 }); // Resend retries
    return json({ ok: true });
  }

  // c.action === "fail"
  const { data, error } = await supabase
    .from("supporter_deliveries")
    .update({ status: "failed", last_error: c.reason })
    .eq("provider_message_id", c.emailId)
    .eq("status", "sent")
    .select("order_id, user_id");
  if (error) return new Response("storage error", { status: 500 }); // Resend retries
  const row = data && data[0];
  if (!row) return json({ ignored: "no-matching-row" });

  // Alert is best-effort: the row flip above is the durable record, so an
  // alert failure must not 5xx (Resend would retry and re-flip a row the
  // owner may already be acting on).
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("SUPPORTER_EMAIL_FROM");
  let alerted = false;
  if (apiKey && from) {
    let buyerDomain = "unknown";
    try {
      const u = await supabase.auth.admin.getUserById(row.user_id);
      const email = u.data && u.data.user && u.data.user.email;
      if (email && email.includes("@")) buyerDomain = email.split("@").pop() as string;
    } catch { /* domain stays "unknown" */ }
    try {
      const r = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDeliveryAlert({ from, orderId: row.order_id, buyerDomain, reason: c.reason }),
        ),
      });
      alerted = r.ok;
    } catch { /* alerted stays false */ }
  }
  return json({ ok: true, alerted });
});
```

- [ ] **Step 2: Sanity-check imports resolve in the test runner's module graph**

Run: `npx vitest run test/resend-webhook.test.js test/supporter-email.test.js`
Expected: PASS (Task 2's tests still green; `RESEND_ENDPOINT` export exists — it is already exported by `_shared/supporter-email/core.js:6`)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/resend-webhook/index.ts
git commit -m "feat(resend-webhook): delivery-truth endpoint — delivered/failed row transitions + owner alert"
```

---

### Task 4: `supporter-download/index.ts` — JWT-verified signed-URL issuer

**Files:**
- Modify: `supabase/functions/_shared/supporter-email/core.js` (add `SIGNED_URL_SECONDS` export)
- Modify: `supabase/functions/_shared/supporter-email/service.js` (import it instead of its local const)
- Create: `supabase/functions/supporter-download/index.ts`

**Interfaces:**
- Consumes: `SUPPORTER_BUCKET`, `SUPPORTER_OBJECT`, `SIGNED_URL_SECONDS` from `../_shared/supporter-email/core.js`.
- Produces: endpoint `POST /functions/v1/supporter-download` (JWT verification ON — default deploy, NOT `--no-verify-jwt`). Responses: `200 {"url": "<signed https url>"}`, `401 {"error":"unauthorized"}`, `403 {"error":"not_supporter"}`, `500`/`503` on server trouble. Task 5's parser consumes exactly these shapes.

- [ ] **Step 1: Move `SIGNED_URL_SECONDS` into core.js**

In `supabase/functions/_shared/supporter-email/core.js`, next to the
`SUPPORTER_BUCKET`/`SUPPORTER_OBJECT` exports, add:

```js
// One lifetime for BOTH delivery legs (email link and self-serve download):
// the email copy promises "7 days" — keep copy and constant in sync.
export const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;
```

In `service.js`, delete the local `const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;`
(and its comment block's stale half, keeping the link-based-delivery
explanation) and add `SIGNED_URL_SECONDS` to the existing import from
`./core.js`.

- [ ] **Step 2: Verify the email suite still passes**

Run: `npx vitest run test/supporter-email.test.js`
Expected: PASS

- [ ] **Step 3: Write the function**

Create `supabase/functions/supporter-download/index.ts`:

```ts
// Supporter self-serve download — Deno Edge Function. Issues a fresh 7-day
// signed URL for the six-guide ZIP to a signed-in caller who owns the
// 'supporter' entitlement. Spec: docs/superpowers/specs/
// 2026-08-03-supporter-selfserve-download-and-delivery-webhook-design.md
//
// Deploy with JWT verification ON (default): the gateway rejects unsigned
// calls before this code runs. CORS is REQUIRED — the browser sends an
// Authorization header, which forces a preflight (same as stripe-checkout).
// The server is the real gate: the client shows the button on local
// supporter state, but only a caller whose ACCOUNT owns the entitlement
// gets a URL. Anonymous sessions simply fail the entitlement check (an
// anonymous uid can never hold a purchase — grants require the account
// flow), so they get 403 like any other non-supporter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPPORTER_BUCKET,
  SUPPORTER_OBJECT,
  SIGNED_URL_SECONDS,
} from "../_shared/supporter-email/core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status: number) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return reply("service unavailable", 503);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return reply({ error: "unauthorized" }, 401);

  // Resolve the caller from their OWN verified token — never from the body.
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const user = userData && userData.user;
  if (userError || !user) return reply({ error: "unauthorized" }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey);
  const { data: ent, error: entError } = await service
    .from("entitlements")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", "supporter")
    .maybeSingle();
  if (entError) return reply("storage error", 500);
  if (!ent) return reply({ error: "not_supporter" }, 403);

  const signed = await service.storage
    .from(SUPPORTER_BUCKET)
    .createSignedUrl(SUPPORTER_OBJECT, SIGNED_URL_SECONDS);
  const url = signed.data && signed.data.signedUrl;
  if (signed.error || !url) return reply({ error: "unavailable" }, 500);
  return reply({ url }, 200);
});
```

- [ ] **Step 4: Run the neighboring suites (regression guard)**

Run: `npx vitest run test/supporter-email.test.js test/resend-webhook.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/supporter-email/core.js supabase/functions/_shared/supporter-email/service.js supabase/functions/supporter-download/index.ts
git commit -m "feat(supporter-download): JWT-verified fresh signed-URL issuer for the guide ZIP"
```

---

### Task 5: `src/monetization/supporter-download.js` — pure client logic + tests

**Files:**
- Create: `src/monetization/supporter-download.js`
- Test: `test/supporter-download.test.js`

**Interfaces:**
- Produces (Task 6 imports these exact names):
  - `const SUPPORTER_DOWNLOAD_URL = "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download"`
  - `parseDownloadResponse(status, body) -> { ok: true, url } | { ok: false, reason: "signin"|"failed" }`

- [ ] **Step 1: Write the failing tests**

Create `test/supporter-download.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  SUPPORTER_DOWNLOAD_URL,
  parseDownloadResponse,
} from "../src/monetization/supporter-download.js";

describe("SUPPORTER_DOWNLOAD_URL", () => {
  it("points at the project's supporter-download function", () => {
    expect(SUPPORTER_DOWNLOAD_URL).toBe(
      "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download",
    );
  });
});

describe("parseDownloadResponse", () => {
  it("accepts 200 with an https url", () => {
    expect(parseDownloadResponse(200, { url: "https://x.supabase.co/signed" }))
      .toEqual({ ok: true, url: "https://x.supabase.co/signed" });
  });

  it("rejects 200 with a missing or non-https url", () => {
    expect(parseDownloadResponse(200, {}).ok).toBe(false);
    expect(parseDownloadResponse(200, { url: "http://insecure" }).ok).toBe(false);
    expect(parseDownloadResponse(200, { url: 42 }).ok).toBe(false);
    expect(parseDownloadResponse(200, null).ok).toBe(false);
  });

  it("maps 401 and 403 to the sign-in nudge", () => {
    // 403 = valid session, wrong account (no entitlement) — the fix for the
    // user is the same: sign in to the account that bought Supporter.
    expect(parseDownloadResponse(401, { error: "unauthorized" })).toEqual({ ok: false, reason: "signin" });
    expect(parseDownloadResponse(403, { error: "not_supporter" })).toEqual({ ok: false, reason: "signin" });
  });

  it("maps everything else to failed", () => {
    expect(parseDownloadResponse(500, null)).toEqual({ ok: false, reason: "failed" });
    expect(parseDownloadResponse(503, "service unavailable")).toEqual({ ok: false, reason: "failed" });
    expect(parseDownloadResponse(0, null)).toEqual({ ok: false, reason: "failed" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/supporter-download.test.js`
Expected: FAIL — cannot resolve `../src/monetization/supporter-download.js`

- [ ] **Step 3: Implement**

Create `src/monetization/supporter-download.js`:

```js
"use strict";
// Pure client half of supporter self-serve download (spec 2026-08-03).
// The endpoint is JWT-verified; the server owns the entitlement gate.

export const SUPPORTER_DOWNLOAD_URL =
  "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download";

// 401 (no/expired session) and 403 (session on an account without the
// entitlement) share one user-facing fix: sign in to the buying account.
export function parseDownloadResponse(status, body) {
  if (status === 200 && body && typeof body.url === "string" && body.url.startsWith("https://")) {
    return { ok: true, url: body.url };
  }
  if (status === 401 || status === 403) return { ok: false, reason: "signin" };
  return { ok: false, reason: "failed" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/supporter-download.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/monetization/supporter-download.js test/supporter-download.test.js
git commit -m "feat(supporter-download): client response parsing + endpoint constant"
```

---

### Task 6: UI factory, main.js wiring, i18n strings

**Files:**
- Create: `src/ui/supporter-download.js`
- Modify: `src/i18n.js` (3 new keys × 2 locales)
- Modify: `src/main.js` — exactly three additive touches:
  1. import + factory construction near the other `src/ui/` factories
  2. account panel block at `src/main.js:971` (`if(isSupporter(ent)){...}`)
  3. shop owned branch inside `makeSupporterCard()` (~`src/main.js:4070`)

**Interfaces:**
- Consumes: Task 5's `SUPPORTER_DOWNLOAD_URL`, `parseDownloadResponse`; existing `getSession` (already imported in main.js:55 from `./cloud.js`), existing `toast`, `t`, `accountBtn`.
- Produces: `createSupporterDownload({ getSession, toast, fetchImpl?, navigate? }) -> { download(), button(className?) }`.

- [ ] **Step 1: Add i18n strings**

In `src/i18n.js`, EN dict (near the other `supporter.*` keys, ~line 565):

```js
    "supporter.download.btn": "Download your guides",
    "supporter.download.failed": "Download failed — please try again",
    "supporter.download.signin": "Sign in with the account you bought Supporter on to download",
```

TH dict (near `supporter.sheet.title`, ~line 1269):

```js
    "supporter.download.btn": "ดาวน์โหลดคู่มือของคุณ", // TH-REVIEW
    "supporter.download.failed": "ดาวน์โหลดไม่สำเร็จ — โปรดลองอีกครั้ง", // TH-REVIEW
    "supporter.download.signin": "เข้าสู่ระบบด้วยบัญชีที่ซื้อ Supporter เพื่อดาวน์โหลด", // TH-REVIEW
```

- [ ] **Step 2: Write the UI factory**

Create `src/ui/supporter-download.js`:

```js
// src/ui/supporter-download.js
// Supporter self-serve download button (spec 2026-08-03). DOM wiring only —
// response interpretation lives in src/monetization/supporter-download.js
// (vitest-tested); this factory is untested by design like the other
// src/ui/ factories. The button renders wherever LOCAL supporter state is
// true; the edge function is the real gate (401/403 -> sign-in nudge).
import { t } from "../i18n.js";
import {
  SUPPORTER_DOWNLOAD_URL,
  parseDownloadResponse,
} from "../monetization/supporter-download.js";

export function createSupporterDownload({
  getSession,
  toast,
  fetchImpl = (...args) => fetch(...args),
  navigate = (url) => window.location.assign(url),
}) {
  let busy = false; // double-tap guard; module state like iapPending
  async function download() {
    if (busy) return;
    busy = true;
    try {
      const session = await getSession();
      const token = session && session.access_token;
      if (!token) { toast(t("supporter.download.signin")); return; }
      let response;
      try {
        response = await fetchImpl(SUPPORTER_DOWNLOAD_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        toast(t("supporter.download.failed"));
        return;
      }
      let body = null;
      try { body = await response.json(); } catch { /* non-JSON error body */ }
      const parsed = parseDownloadResponse(response.status, body);
      if (!parsed.ok) {
        toast(t(parsed.reason === "signin" ? "supporter.download.signin" : "supporter.download.failed"));
        return;
      }
      navigate(parsed.url);
    } finally {
      busy = false;
    }
  }
  function button(className = "chip buy-chip") {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = t("supporter.download.btn");
    el.onclick = download;
    return el;
  }
  return { download, button };
}
```

- [ ] **Step 3: Wire main.js (three additive touches)**

(1) With the other `src/ui/` imports at the top of `src/main.js`:

```js
import { createSupporterDownload } from "./ui/supporter-download.js";
```

and near the other factory constructions (e.g. after the
`createSupporterMomentRow` block at ~`src/main.js:613`):

```js
const supporterDownload = createSupporterDownload({ getSession, toast });
```

(2) Account panel — extend the existing block at `src/main.js:971`:

```js
  if(isSupporter(ent)){
    const chip = document.createElement("p");
    chip.className = "account-explain";
    chip.textContent = t("account.supporterChip");
    p.appendChild(chip);
    p.appendChild(accountBtn(t("supporter.download.btn"), () => supporterDownload.download()));
  }
```

(3) Shop owned state — in `makeSupporterCard()` (~`src/main.js:4070`), the
`owned` branch currently appends no button. Add after the `row.appendChild(copy);`
line, mirroring the unowned branch's structure:

```js
  if(owned){
    row.appendChild(supporterDownload.button());
  }
```

(keep the existing `if(!owned){ ... }` block unchanged).

- [ ] **Step 4: Full gate**

Run (plainly, no piping):

```
npm test
npm run lint
npm run build
```

Expected: suite green (9,731 + new tests), lint clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/supporter-download.js src/main.js src/i18n.js dist/app.js
git commit -m "feat(supporter-download): in-game download button — shop owned card + account panel, EN+TH"
```

(`dist/app.js` IS committed in this repo — release verifications compare the
live bundle's sha against the repo copy. Commit the rebuilt bundle.)

---

### Task 7: Docs — deploy/README + owner steps + review sheet note

**Files:**
- Modify: `docs/supabase/README.md` (deploy + verify instructions for both new functions)
- Modify: `docs/OWNER-ACTIONS.md` (new owner step: create the Resend webhook, hand over the signing secret)

**Interfaces:** none (docs only).

- [ ] **Step 1: README — deployment section**

Add to `docs/supabase/README.md`, following its existing function-deploy
style, a section covering:

- `npx supabase@latest functions deploy supporter-download --project-ref eqsodiufgjecoqgxdisn`
  (JWT verification ON — no flag) and
  `npx supabase@latest functions deploy resend-webhook --project-ref eqsodiufgjecoqgxdisn --no-verify-jwt`.
- New secret: `RESEND_WEBHOOK_SECRET` (svix signing secret from the Resend
  dashboard webhook).
- Migration `2026-08-03-supporter-delivery-status.sql` must be applied
  before deploying `resend-webhook`.
- Verify block, documenting exactly what the code returns: (a) unsigned
  POST to `resend-webhook` → 401; (b) synthetic svix-signed
  `email.delivered` for a fake message id → 200 `{"ok":true}` (the deliver
  path updates 0 rows silently — it does not report no-match); (c)
  synthetic svix-signed `email.bounced` for a fake message id → 200
  `{"ignored":"no-matching-row"}` (only the fail path selects and reports
  the matched row); (d) `supporter-download` without a token → gateway 401.

- [ ] **Step 2: OWNER-ACTIONS — the 2-minute webhook step**

Add to `docs/OWNER-ACTIONS.md` (new subsection in the §B family, matching its
checkbox style):

- In the **guides** Resend account (the one with `mail.luckycathsk.com` —
  NOT the auth-SMTP account), Dashboard → Webhooks → Add endpoint:
  URL `https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/resend-webhook`,
  events: `email.delivered`, `email.bounced`, `email.failed`.
- Copy the endpoint's signing secret (`whsec_…`) to the VPS as a root-only
  file (`umask 077; cat > /root/.resend-webhook-secret` — NOT into chat),
  then tell the agent, who sets it as the `RESEND_WEBHOOK_SECRET` function
  secret and runs the verify block.
- Note in the step: until this webhook is live, `status='sent'` still only
  means "accepted"; the download button works regardless.

- [ ] **Step 3: Commit**

```bash
git add docs/supabase/README.md docs/OWNER-ACTIONS.md
git commit -m "docs: deploy/verify steps for supporter-download + resend-webhook, owner webhook setup"
```

---

## Not in this plan (lead session handles after merge)

Applying the migration to prod, deploying both functions, setting
`RESEND_WEBHOOK_SECRET`, the synthetic svix verification against the live
endpoint, the Resend-dashboard owner step, `thai-review-sheet.csv`
regeneration (3 new TH-REVIEW strings), and the v151 release cut
(SHELL bump + sw-precache pin + suite re-run + merge to main + live verify).
