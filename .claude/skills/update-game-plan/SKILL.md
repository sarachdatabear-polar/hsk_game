---
name: update-game-plan
description: Use when the user asks to tidy/arrange the game docs, archive finished plans or PRDs, asks "what stage is the game at", or after a feature round merges and the planning docs are stale.
---

# Update Game Plan

Keep `docs/` showing only pending work, archive finished docs, and maintain the single status summary. **Update in place — never invent new locations, filenames, or section structures.** The fixed structure below is the contract; repeated runs must converge on the same files.

## Fixed locations (never rename)

| Thing | Path |
|---|---|
| Status summary (THE one file) | `docs/STATUS.md` |
| Archive root (mirrors subpaths) | `docs/archive/<original-subfolder>/<file>` |
| Archive index | `docs/archive/README.md` (one line per file: what it was, ship date/PR, superseded-by) |
| Live doc index | `docs/README.md` |

## Procedure

1. **Branch:** run on a fresh `docs/plan-refresh-<date>` branch off `development` (never on a feature branch; never commit to one that has unpushed feature work).
2. **Establish truth** before classifying: `git log --oneline development` + merged PRs (`gh pr list --state merged --limit 20`) + `docs/planning/V2-EXECUTION-PLAN.md` status log. Also note what `main` serves (deploys lag `development`).
3. **Classify every doc** in `docs/prd`, `docs/art`, `docs/planning` (see rules below). `git mv` done ones into `docs/archive/` mirroring their subfolder.
4. **Repoint links** to moved files as working links into `archive/` (do not strip to plain text). Fix relative links *inside* moved files. Verify zero broken links: grep `](` targets across `docs/` and check each target exists.
5. **Rewrite `docs/README.md`** live index (drop archived entries, keep a "Start here → STATUS.md" line and an Archive section) and **update `docs/archive/README.md`**.
6. **Update `docs/STATUS.md`** — see contract. If it exists, edit sections in place; do not restructure.
7. Commit (docs-only), PR to `development`.

## Classification rules (decided — don't re-litigate)

**Archive when:** the spec'd work is merged to `development` (PR + execution-plan log confirm), OR the doc was superseded/abandoned (e.g. an art direction replaced by a newer one).
**Keep live:** unmerged/pending specs; open task lists; evergreen references and tooling (how-tos, style bibles, QA checklists, generation-prompt packs still appended to); `V2-EXECUTION-PLAN.md` (living log).
**Standing exceptions:** `docs/superpowers/**` is already an archive — never move anything out of it. `PRD-v5-visual-retention.md` stays live while its §8 remains the v-next roadmap; archive it only once those items have their own PRDs. `PRD-monetization-and-production.md` stays until implemented.

## STATUS.md contract (exact sections, in order)

1. `# Lucky Cat HSK — Status` + last-updated date + one-line stage TL;DR
2. `## Where the game is` — three tiers: live on `main`/Pages · merged to `development` unreleased · on feature branches
3. `## Done` — shipped rounds, chronological, one line each, link archive/PR
4. `## In progress` — active branch/round + its open deferrals
5. `## Planned` — ordered backlog (ship gaps first, then filed plans in `docs/superpowers/plans/`, then PRD roadmaps/v-next)
6. `## Doc map` — two lines: live index → `README.md`, finished → `archive/README.md`

## Common mistakes

- Creating `STATUS.md` variants (`GAME-STATUS.md`, `docs/planning/STATUS.md`) — there is exactly one, at `docs/STATUS.md`.
- Deleting instead of `git mv` (the archive exists so history is browsable, not just recoverable).
- Archiving a PRD whose work is only on an unmerged feature branch — that's "In progress", not done.
- Treating "merged to development" as "live for users" in STATUS.md — always report the three tiers separately.
