# Tech Stack — Lucky Cat HSK

Production architecture reference for the whole system: client, hosting, backend, billing,
and the ops/CI rings that keep it alive. Solid lines/boxes = live in production; dashed
lines/boxes = built or planned but not the primary path today. Solo-dev project (owner
Jordan) — this doc trades org-chart formality for "what's actually running and why."

## System context

How a browser reaches the game, the backend, and the ops/CI rings that keep it alive.

```mermaid
flowchart LR
    Player(["Player (browser / PWA)"])

    subgraph CF["Cloudflare"]
        CFW["luckycathsk.com<br/>Workers Static Assets"]
        CFDNS["Registrar + DNS"]
        CFMail["Email Routing"]
    end

    GHP["GitHub Pages<br/>(legacy bridge)"]

    subgraph SB["Supabase: lucky-cat-hsk"]
        SBAuth["Auth: anon + OTP"]
        SBDB["Postgres + RLS"]
        SBFn["Edge Functions"]
        SBStore["Storage: supporter-assets"]
    end

    Stripe["Stripe (TH account)<br/>hosted Checkout"]
    RSend["Resend send.*<br/>auth OTP SMTP"]
    RMail["Resend mail.*<br/>GUIDES delivery"]
    Support["support@luckycathsk.com"]

    subgraph Ops["Ops ring"]
        VPS["Hostinger VPS<br/>(ops/dev box)"]
        HC["healthchecks.io"]
        UR["UptimeRobot"]
        GHKeep["supabase-keepalive.yml<br/>(every 6h)"]
    end

    subgraph CICD["CI/CD (game repo)"]
        CI["ci.yml"]
        DPages["deploy-pages.yml"]
        DCF["deploy-cloudflare.yml"]
    end

    Play["Google Play Store"]

    Player --> CFW
    CFW -.-> GHP
    CFW --> SBAuth
    CFW --> SBFn
    CFW --> Stripe
    SBAuth --> RSend
    SBFn --> RMail
    CFMail --> Support
    VPS --> HC
    VPS -.-> SBDB
    UR -.-> SBDB
    GHKeep -.-> SBDB
    CI --> DPages
    CI --> DCF
    DPages --> GHP
    DCF --> CFW
    Player -.-> Play

    style GHP stroke-dasharray: 5 5
    style Play stroke-dasharray: 5 5
```

## Client tech map

What ships inside the bundle, and how the build reaches the PWA and Android.

```mermaid
flowchart TB
    HTML["index.html + HSK_DATA"]

    subgraph Src["src/ (~65 modules)"]
        Main["main.js"]
        Rules["Game rules"]
        Meta["Meta-game"]
        Render["Rendering/platform"]
        Mon["Monetization"]
        Cloud["cloud.js / sync.js"]
    end

    subgraph Bld["esbuild"]
        AppJS["dist/app.js"]
        WB["dist/webbilling.js<br/>(lazy, shop-only)"]
    end

    subgraph SW["sw.js — 3 caches"]
        Shell["SHELL v151"]
        Rt["RUNTIME v151"]
        Aud["AUDIO v1"]
    end

    subgraph AudSys["Audio playback"]
        Mp3["bundled mp3"]
        TTS["Web Speech fallback"]
    end

    subgraph Cap["Capacitor 6<br/>com.luckycat.hsk"]
        Plug["plugins: splash, status-bar,<br/>haptics, notifications,<br/>keep-awake, tts, app"]
        RC["RevenueCat SDKs"]
    end

    subgraph QA["Tooling"]
        VT["Vitest: 118 files<br/>~9,757 tests"]
        ES["ESLint 9"]
        PW["Playwright-core<br/>responsive-sweep.mjs"]
    end

    HTML --> Main
    Main --> Rules
    Main --> Meta
    Main --> Render
    Mon --> AppJS
    Mon --> WB
    Cloud -.-> Mon
    Src --> Bld
    Bld --> SW
    Bld --> Cap
    Mp3 --> TTS
    AudSys --> Shell
    Cap -.-> RC
    Src --> QA

    style RC stroke-dasharray: 5 5
```

## Data flow

How mock-exam PDFs become bundled game data.

```mermaid
flowchart LR
    PDFs["HSK1–6 mock-exam PDFs<br/>pipeline/source-exams/"]
    Skill["hsk-extract-word.skill"]
    Vocab["pipeline/vocabulary/<br/>master ranking + top-2000"]
    Product["product/<br/>per-level bilingual CSVs +<br/>thai-supplement.csv"]
    Pack["product/supporter-pack/<br/>six per-level PDF guides (zip)"]
    Bucket["Supabase supporter-assets bucket"]

    Words["build_game_data.py<br/>→ data/words.{js,json} + manifest"]
    Cloze["build_cloze_data.py<br/>→ data/cloze.js"]
    Examples["build_examples_data.py<br/>→ data/examples.js<br/>(not precached)"]
    Audio["build_audio.py (edge-tts)<br/>→ 13,949 mp3s"]
    Idx["index.json (2,125 core) +<br/>index-full.json"]
    Stage["stage-www.js<br/>→ www/ (--audio=core | full)"]

    PDFs --> Skill --> Vocab --> Product
    Product --> Pack --> Bucket
    Product --> Words --> Stage
    Words --> Cloze --> Stage
    Words --> Audio --> Idx --> Stage
    Cloze --> Examples --> Stage
```

Per-word record fields: `h`/`p`/`e`/`t`/`lv`/`f`/`ta`/`tt`/`c`/`n` (hanzi, pinyin, English,
Thai, level, frequency, tests-appeared/total, tier, introduced-flag); ~10k words cumulative
through HSK6.

## Buy & delivery flow

The ฿79 Supporter purchase path end to end.

```mermaid
flowchart TB
    Shop["Shop: Supporter card ฿79"]
    SignIn["non-anon sign-in required"]
    Checkout["stripe-checkout edge fn<br/>(JWT verified)"]
    StripeUI["Stripe hosted Checkout<br/>PromptPay / card, THB 7900"]
    Webhook["stripe-webhook edge fn<br/>(HMAC verified, no JWT)"]
    Grant["grant_purchase() Postgres fn<br/>(service_role, atomic)"]
    Deliver["supporter_deliveries row +<br/>Resend GUIDES email"]
    ResendHook["resend-webhook edge fn<br/>(svix-verified)"]
    ArmNote["fail-closed 503<br/>until §B.1 armed"]
    Return["checkout-return.js<br/>coins poll + entitlement restore"]
    DlBtn["Download your guides button"]
    DlFn["supporter-download edge fn<br/>(JWT + entitlement gate)"]
    SignedURL["fresh 7-day signed URL"]
    AndroidGap["Android: needs Capacitor<br/>Browser bridge (parked)"]

    subgraph Other["Also present"]
        DelAcct["delete-account edge fn"]
    end

    Shop --> SignIn --> Checkout --> StripeUI
    StripeUI -- "checkout.session.completed" --> Webhook --> Grant
    Grant --> Deliver --> ResendHook
    ResendHook -.-> ArmNote
    Grant --> Return
    DlBtn --> DlFn --> SignedURL
    DlBtn -.-> AndroidGap

    style ResendHook stroke-dasharray: 5 5
    style ArmNote stroke-dasharray: 5 5
    style AndroidGap stroke-dasharray: 5 5
```

Replays of `stripe-webhook` are idempotent — unique indexes on `grant_purchase()` make a
repeat delivery return `{"duplicate":true}` instead of double-granting (verified live with
3 replays). Delivery email idempotency key is claim-scoped:
`supporter-gift/<order>/<uuid>`.

## Reference table

| Tech | Purpose | Where it lives |
|---|---|---|
| esbuild (two-bundle build) | app.js + webbilling.js | `game/scripts/build.mjs` |
| Vitest (~9.8k tests, deploy gate) | unit/asset/precache coverage | `game/test/` |
| ESLint 9 | lint gate | game repo |
| Playwright-core (responsive/QA sweeps) | screenshot QA | `game/scripts/responsive-sweep.mjs` |
| Capacitor 6 + plugins (Android wrapper) | native app shell | `game/android/` |
| edge-tts (Python, mp3 TTS gen) | word audio generation | `game/build_audio.py` |
| Cloudflare Workers Static Assets (prod hosting, free unmetered) | prod hosting | `game/wrangler.jsonc` |
| Cloudflare Registrar + DNS + Email Routing (domain, DMARC `p=none`, support@ inbox) | domain + inbound mail | Cloudflare dashboard |
| GitHub Pages (legacy bridge origin) | secondary hosting, retiring | `deploy-pages.yml` |
| GitHub Actions ×4 (ci, deploy-pages, deploy-cloudflare, supabase-keepalive [root repo]) | CI/CD + keep-alive | `.github/workflows/` |
| Supabase (Postgres+RLS, anon+OTP auth, edge functions, storage; server of record for entitlements) | backend | project `eqsodiufgjecoqgxdisn` |
| Stripe (hosted Checkout, PromptPay+card, TH account; `STRIPE_CHECKOUT_URL` in `stripe-config.js` is the go-live/kill switch) | payments | Supabase edge fns + dashboard |
| Resend `send.*` (auth OTP SMTP) / Resend `mail.*` (guide delivery + delivery webhook) | transactional email | two accounts |
| healthchecks.io | backup dead-man switch | — |
| UptimeRobot | 5-min uptime + keep-alive | — |
| Hostinger VPS (ops box: secrets, backup cron, restore rehearsal, Playwright harness — NOT an app server) | ops | home base |
| RevenueCat SDKs (dashed/dormant — native IAP for Play beat) | future native billing | `src/monetization/` |

## Footnotes

- `rc-webhook` edge fn exists in-repo but was never deployed (web billing went direct-Stripe).
- Supabase-native analytics migration drafted but DO-NOT-APPLY (privacy-policy gate) — analytics dark.
- Supabase migrations live at `game/docs/supabase/migrations/` (applied manually via Management API, not supabase CLI).
- Free-tier→Pro tripwires: ~15+ sales/mo, any pause incident, DB→500MB, MAU→50k.
- PWA cache busting: bump SHELL version in `sw.js` on user-facing changes.
