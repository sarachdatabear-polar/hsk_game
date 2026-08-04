#!/usr/bin/env bash
# Redeploy both purchase webhooks with JWT verification disabled (Stripe/RC
# servers send no Supabase JWT — see docs/supabase/README.md). Requires the
# 2026-08-04 migrations to be applied FIRST (entitlement-source + refund-revoke);
# scripts/apply-refund-migrations.py does that.
set -euo pipefail
cd "$(dirname "$0")/.."
export SUPABASE_ACCESS_TOKEN="$(cat /root/.supabase-token)"
npx supabase@latest functions deploy stripe-webhook --project-ref eqsodiufgjecoqgxdisn --no-verify-jwt
npx supabase@latest functions deploy rc-webhook --project-ref eqsodiufgjecoqgxdisn --no-verify-jwt
