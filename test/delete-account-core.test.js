import { describe, it, expect } from "vitest";
import { authorizeDelete } from "../supabase/functions/delete-account/core.js";

describe("authorizeDelete", () => {
  it("rejects a missing header", () => {
    expect(authorizeDelete(null)).toEqual({ ok: false, status: 401 });
  });
  it("rejects a non-Bearer header", () => {
    expect(authorizeDelete("Basic abc")).toEqual({ ok: false, status: 401 });
  });
  it("rejects an empty Bearer token", () => {
    expect(authorizeDelete("Bearer    ")).toEqual({ ok: false, status: 401 });
  });
  it("accepts a well-formed Bearer token", () => {
    expect(authorizeDelete("Bearer jwt.token.here")).toEqual({ ok: true, jwt: "jwt.token.here" });
  });
});
