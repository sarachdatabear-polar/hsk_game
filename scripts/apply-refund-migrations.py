#!/usr/bin/env python3
# One-shot: apply the two 2026-08-04 migrations to the live Supabase project
# via the Management API (no supabase CLI / psql on the VPS). Both files are
# re-runnable (drop-if-exists / create-or-replace), so running this twice is
# safe. Delete after use or keep — it does nothing destructive.
import json
import urllib.request

PROJECT = "eqsodiufgjecoqgxdisn"
FILES = [
    "docs/supabase/migrations/2026-08-04-entitlement-source.sql",
    "docs/supabase/migrations/2026-08-04-refund-revoke.sql",
]

token = open("/root/.supabase-token").read().strip()
for f in FILES:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=json.dumps({"query": open(f).read()}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "supabase-cli/2.0",
        },
        method="POST",
    )
    try:
        print(f, "-> OK", urllib.request.urlopen(req).read().decode()[:200])
    except urllib.error.HTTPError as e:
        print(f, "-> HTTP", e.code, e.read().decode()[:300])
