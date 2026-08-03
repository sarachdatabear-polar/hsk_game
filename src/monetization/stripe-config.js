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
// ⚠ CURRENTLY READ BY NOTHING — verified: this file is its only mention in
// src/ and test/. It is not the go-live switch and filling it alone turns
// nothing on. That is correct for redirect-to-hosted-Checkout: the session URL
// is created server-side by the stripe-checkout function using the SECRET key,
// so the browser never talks to Stripe's API directly and needs no publishable
// key. Kept because Stripe.js (embedded/element flows, or a future
// client-confirmed payment) would need it, and because its absence would look
// like an oversight to the next reader.
//
// THE SINGLE GO-LIVE SWITCH IS STRIPE_CHECKOUT_URL BELOW.
export const STRIPE_PUBLISHABLE_KEY = "";

// Supabase edge function endpoint. FILLED 2026-08-03 (owner: "go with
// supporter only flip the checkout url") — billing is LIVE from this commit.
// Blanking this string is the kill switch: the provider becomes unavailable,
// iapVisible() goes false and the whole purchase surface hides again.
export const STRIPE_CHECKOUT_URL =
  "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/stripe-checkout";

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
