// test/analytics/transport.test.js
import { describe, it, expect, vi } from "vitest";
import { send } from "../../src/analytics/transport.js";

const opts = (fetchImpl) => ({ url: "https://x.supabase.co", key: "anon-key", fetchImpl });

describe("transport.send", () => {
  it("POSTs the batch to /rest/v1/events with anon key + Prefer: return=minimal", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const events = [{ name: "session_start" }];
    const r = await send(events, opts(fetchImpl));
    expect(r).toEqual({ ok: true, status: 201 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/events");
    expect(init.method).toBe("POST");
    expect(init.headers.apikey).toBe("anon-key");
    expect(init.headers.Authorization).toBe("Bearer anon-key");
    expect(init.headers.Prefer).toBe("return=minimal");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(events);
  });

  it("does not call fetch for an empty batch", async () => {
    const fetchImpl = vi.fn();
    const r = await send([], opts(fetchImpl));
    expect(r.ok).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never throws when fetch rejects — returns { ok:false }", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await send([{ name: "x" }], opts(fetchImpl));
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
  });

  it("reports ok:false on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const r = await send([{ name: "x" }], opts(fetchImpl));
    expect(r).toEqual({ ok: false, status: 404 });
  });
});
