import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPrivateSupabase } from "./private-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("private Supabase transport", () => {
  it("preserves cancellation carried by a Request object", async () => {
    const control = new AbortController();
    const request = new Request("http://127.0.0.1/auth/v1/user", {
      signal: control.signal,
    });
    control.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init: RequestInit) => {
        expect(init.signal).toBe(request.signal);
        expect(init.signal?.aborted).toBe(true);
        return new Response(null, { status: 403 });
      }),
    );
    expect((await fetchPrivateSupabase(request)).status).toBe(403);
  });
  it("performs independent live checks and overrides shared cache requests", async () => {
    const seen: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init: RequestInit) => {
        seen.push(init);
        return new Response(null, { status: seen.length === 1 ? 200 : 403 });
      }),
    );
    const url = "http://127.0.0.1/auth/v1/user";
    expect(
      (await fetchPrivateSupabase(url, { cache: "force-cache" })).status,
    ).toBe(200);
    expect((await fetchPrivateSupabase(url)).status).toBe(403);
    expect(seen.every((item) => item.cache === "no-store")).toBe(true);
    expect(seen[0].signal).toBeInstanceOf(AbortSignal);
    expect(seen[1].signal).toBeInstanceOf(AbortSignal);
    expect(seen[0].signal).not.toBe(seen[1].signal);
    expect(seen.every((item) => !item.signal?.aborted)).toBe(true);
  });

  it("preserves caller cancellation, method and body without logging credentials", async () => {
    const control = new AbortController();
    control.abort();
    const transport = vi.fn(async (_input, init: RequestInit) => {
      expect(init.signal).toBe(control.signal);
      expect(init.method).toBe("POST");
      expect(init.body).toBe("opaque-test-body");
      throw new DOMException("Cancelled", "AbortError");
    });
    vi.stubGlobal("fetch", transport);
    await expect(
      fetchPrivateSupabase("http://127.0.0.1/rest/v1/owned", {
        signal: control.signal,
        method: "POST",
        body: "opaque-test-body",
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(transport).toHaveBeenCalledOnce();
  });
});
