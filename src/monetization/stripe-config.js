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

// Web sells the Supporter only this milestone. Coin packs on web are go-live
// step 8, sequenced after the placement sprint.
export const STRIPE_WEB_PRODUCT_IDS = ["supporter"];
