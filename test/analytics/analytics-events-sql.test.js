// test/analytics/analytics-events-sql.test.js
// Pins the shape of supabase/analytics-events.sql — a DRAFT file this repo
// never applies programmatically (see the file's own header). It's still
// worth a vitest: the anon key is public, so the WITH CHECK caps here are
// the only defense between "any holder of the anon key" and unlimited-size
// jsonb inserts (audit finding, 2026-08-04). This test fails loudly if
// someone loosens or removes a cap without updating both places.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EVENT_NAMES } from "../../src/analytics/events.js";

const sql = readFileSync(new URL("../../supabase/analytics-events.sql", import.meta.url), "utf8");

describe("supabase/analytics-events.sql — anon insert policy", () => {
  it("still declares the events table with the columns the client writes", () => {
    expect(sql).toMatch(/create table if not exists public\.events/i);
    for (const col of ["name", "ts", "anon_id", "session_id", "level_scope", "props", "app_version", "platform"]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("does not leave the anon insert policy as an unconditional with check (true)", () => {
    expect(sql).not.toMatch(/with check \(true\)/i);
  });

  it("caps props to a small, documented jsonb size", () => {
    expect(sql).toMatch(/pg_column_size\(props\)\s*<=\s*2048/);
  });

  it("caps the text columns the client sends to short, documented lengths", () => {
    expect(sql).toMatch(/length\(name\)\s*<=\s*40/);
    expect(sql).toMatch(/length\(level_scope\)\s*<=\s*64/);
    expect(sql).toMatch(/length\(app_version\)\s*<=\s*32/);
    expect(sql).toMatch(/length\(platform\)\s*<=\s*16/);
  });

  it("documents that this is a size cap only, not rate limiting", () => {
    expect(sql).toMatch(/not a RATE limit/i);
  });

  // If a future event name ever grows past the SQL cap, a legitimate row
  // gets rejected — and index.js's flush() re-enqueues on any !ok send,
  // wedging the offline queue forever on that row. Pin the cap comfortably
  // above the real contract, not just above what happens to exist today.
  it("keeps the name cap above every declared event name with headroom", () => {
    const longest = Math.max(...EVENT_NAMES.map(n => n.length));
    expect(longest).toBeLessThan(40);
  });
});
