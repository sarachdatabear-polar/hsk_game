"use strict";
// Supabase project coordinates (client-auth round). The publishable key is
// PUBLIC BY DESIGN — it ships in every client bundle; Row-Level Security on
// the server is the actual security boundary. Rotatable from the dashboard.
export const SUPABASE_URL = "https://eqsodiufgjecoqgxdisn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Kcs1HDiNFRnLwZBknl8pVA_cIamOe0J";

// LIVE since v129 (2026-07-27): docs/supabase/migrations/2026-07-27-cat-journey.sql
// is applied to project eqsodiufgjecoqgxdisn and the column was re-queried as
// jsonb / not null / default '{}' with all 8 pre-existing rows backfilled. The
// constant stays explicit so the capability can be darkened again for NEW
// clients if the column ever has to be rolled back — note that already-merged
// local state is not undone by that.
export const CAT_JOURNEY_CLOUD_ENABLED = true;
