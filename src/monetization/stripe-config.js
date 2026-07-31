"use strict";
// Stripe web-billing configuration. Mirrors revenuecat-config.js.
//
// SHIPPED DARK: a blank checkout URL makes the provider unavailable, which
// makes iapVisible() false, which hides the whole purchase surface. Filling
// this in is the go-live switch — same contract as REVENUECAT_WEB_PUBLIC_KEY.
//
// The publishable key is safe to commit (it is public by design). The SECRET
// key and the webhook signing secret are Supabase function secrets and must
// never appear in this repo.
export const STRIPE_PUBLISHABLE_KEY = "";

// Supabase edge function endpoint, e.g.
// https://<project>.supabase.co/functions/v1/stripe-checkout
export const STRIPE_CHECKOUT_URL = "";

// The ONE origin a Checkout Session can return to. This MUST stay byte-equal
// to SITE_ORIGIN in supabase/functions/stripe-checkout/index.ts, which builds
// every session's success_url/cancel_url from it.
//
// Why the client needs to know it too: the github.io bridge and workers.dev
// serve this same bundle. A buyer who starts checkout there pays correctly and
// is granted correctly server-side, then returns to a DIFFERENT origin — with
// different localStorage and no Supabase session — and sees no toast and no
// entitlement. Nothing is lost (their next visit here self-heals it), but it
// looks exactly like a failed purchase. So purchase() refuses to start on an
// origin that cannot receive its own return.
//
// ⚠ CHANGING THE CANONICAL DOMAIN MEANS CHANGING BOTH PLACES. Change this
// alone and every purchase is silently refused; change the function alone and
// buyers are stranded on the old origin.
export const STRIPE_SITE_ORIGIN = "https://luckycathsk.com";

// Web sells the Supporter only this milestone. Coin packs on web are go-live
// step 8, sequenced after the placement sprint.
export const STRIPE_WEB_PRODUCT_IDS = ["supporter"];
