import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE = path.join(ROOT, "audio", "index.json");
const FULL = path.join(ROOT, "audio", "index-full.json");
const haveBoth = fs.existsSync(CORE) && fs.existsSync(FULL);

// Guards the core/full audio index contract (build_audio.py): the bundled
// core must be a subset of the hosted full set, and both must be populated.
// Skips on a checkout where the generated indexes are absent.
describe.skipIf(!haveBoth)("audio index contract", () => {
  const core = haveBoth ? JSON.parse(fs.readFileSync(CORE, "utf8")) : [];
  const full = haveBoth ? JSON.parse(fs.readFileSync(FULL, "utf8")) : [];

  it("both indexes are non-empty arrays of strings", () => {
    expect(Array.isArray(core) && core.length >= 2000).toBe(true);
    expect(Array.isArray(full) && full.length >= 13000).toBe(true);
    expect(core.every(w => typeof w === "string" && w.length > 0)).toBe(true);
  });

  it("core is a subset of full", () => {
    const fullSet = new Set(full);
    const missing = core.filter(w => !fullSet.has(w));
    expect(missing).toEqual([]);
  });

  it("full has no duplicates", () => {
    expect(new Set(full).size).toBe(full.length);
  });
});
