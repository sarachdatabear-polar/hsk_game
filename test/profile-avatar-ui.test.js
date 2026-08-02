import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

describe("profile avatar UI contract", () => {
  it("makes the complete home progress capsule open Profile", () => {
    expect(html).toMatch(/<button[^>]*id="home-level"[^>]*data-go="progress"/);
    expect(html).not.toMatch(/class="level-avatar"[^>]*src=/);
  });

  it("renders the saved player avatar into both Home and Profile", () => {
    expect(main).toContain("function renderPlayerAvatar(root, art, initialEl)");
    expect(main).toMatch(/renderPlayerAvatar\(el\.querySelector\("\.level-avatar"\)/);
    expect(main).toContain('renderPlayerAvatar($("#profile-avatar-clip")');
    expect(main).toContain('store.get("profilePhoto", "")');
  });

  it("clips portrait pixels separately from the edit badge", () => {
    expect(html).toMatch(/\.profile-avatar-clip\{[^}]*overflow:hidden/);
    expect(html).toMatch(/button\.profile-avatar\{[^}]*overflow:visible/);
    expect(html).toMatch(/<span class="profile-avatar-clip"[^>]*>[\s\S]*?<\/span>\s*<span class="profile-avatar-edit"/);
  });
});
