#!/usr/bin/env python3
# Ops helper: show one buyer's purchase state (auth user, entitlements, wallet,
# recent ledger rows) via the Management API. Read-only. Usage:
#   python3 scripts/check-supporter-state.py buyer@example.com
import json
import sys
import urllib.request

PROJECT = "eqsodiufgjecoqgxdisn"

email = (sys.argv[1] if len(sys.argv) > 1 else "").strip().replace("'", "''")
if not email:
    sys.exit("usage: check-supporter-state.py <buyer email>")

# One statement (the endpoint runs a single query): join everything we care
# about off the auth row. Ledger is limited to the newest 6 rows.
query = f"""
with u as (select id, email from auth.users where email = '{email}')
select 'user' as kind, u.id::text as a, u.email as b, null as c, null as d from u
union all
select 'entitlement', e.product_id, e.source, e.granted_at::text, null
  from public.entitlements e join u on e.user_id = u.id
union all
select 'wallet', w.coins::text, null, w.updated_at::text, null
  from public.wallet w join u on w.user_id = u.id
union all
select 'ledger', l.delta::text, l.reason, l.event_id, l.order_id
  from (select li.delta, li.reason, li.event_id, li.order_id
        from public.ledger li join u on li.user_id = u.id
        order by li.created_at desc limit 6) l
"""

token = open("/root/.supabase-token").read().strip()
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
    data=json.dumps({"query": query}).encode(),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "supabase-cli/2.0",
    },
    method="POST",
)
try:
    rows = json.loads(urllib.request.urlopen(req).read().decode())
    if not rows:
        print("no auth user found for", email)
    for r in rows:
        print(" | ".join(str(v) for v in r.values() if v is not None))
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:300])
