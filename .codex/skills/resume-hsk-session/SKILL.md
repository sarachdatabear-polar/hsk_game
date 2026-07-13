---
name: resume-hsk-session
description: Use when resuming Lucky Cat HSK work on the VPS home base (or any machine) — attaches to the persistent session and runs the safe pick-up-where-I-left-off ritual before judging what's left to do.
---

# Resume HSK Session

The VPS is the home base. This is the ritual for picking work back up safely.

## Attach to the living session
From desktop or Mac (the VPS's Tailscale name is `assistant`, full MagicDNS
`assistant.tail70c631.ts.net`):
```
mosh assistant -- tmux new -A -s hsk
```
Fallback if mosh can't connect (Hostinger provider firewall must have UDP 60000–61000
open for mosh; SSH always works):
```
ssh assistant -t 'tmux new -A -s hsk'
```

## Home base facts
- Runs as **root** on the VPS. The HSK tree is at `~/work/HSK` (root repo) with the
  separate game repo nested at `~/work/HSK/game`.
- `git` identity (Jordan / sarach.northbear@gmail.com) is set **per-repo (local)**, not
  global — this box also runs other root-owned git (Hermes backup), kept isolated on purpose.
- Node comes from nvm (`. ~/.nvm/nvm.sh` if `node` isn't on PATH). Audio build uses the
  venv at `~/work/HSK/game/.venv` (`edge-tts`).

## Before claiming anything is "left to do"
`origin/development` is the source of truth; local state can be stale from another machine.
1. `git fetch --all --prune`
2. `gh pr list --state merged` — see what already landed
3. Read `HANDOFF.md` at the repo root for the current thread of work.

Note: the **root** repo currently has no `development` branch (default is `main`); the
**game** repo tracks `development`.

## The one exception
`npm run apk:release` is keystore-bound to Jordan's Windows desktop — it does NOT run on
the VPS. Everything else (build, test, `build_game_data.py`, `build_audio.py`, deploy via
push to `main`) runs here.

## When you stop / switch machines
Update `HANDOFF.md` (current task, last decision, next step, active branch) and commit it —
that's the offline safety net for when the VPS is unreachable.
