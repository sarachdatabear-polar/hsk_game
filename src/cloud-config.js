"use strict";
// Supabase project coordinates (client-auth round). The publishable key is
// PUBLIC BY DESIGN — it ships in every client bundle; Row-Level Security on
// the server is the actual security boundary. Rotatable from the dashboard.
export const SUPABASE_URL = "https://eqsodiufgjecoqgxdisn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Kcs1HDiNFRnLwZBknl8pVA_cIamOe0J";

// Dark until docs/supabase/migrations/2026-07-27-cat-journey.sql is applied
// to the live project. Keeping the capability explicit prevents an older
// progress table from rejecting every sync upsert because it has no
// cat_journey column yet.
export const CAT_JOURNEY_CLOUD_ENABLED = false;
