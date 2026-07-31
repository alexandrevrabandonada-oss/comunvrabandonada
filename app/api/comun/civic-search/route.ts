import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCivicSearchRateLimit } from "@/lib/rate-limit";
import { hybridPublicSearch } from "@/lib/civic-intelligence/search";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  q: z.string().trim().min(2).max(120),
  tipo: z.string().trim().max(40).optional(),
  pauta: z.string().uuid().optional(),
  territorio: z.string().uuid().optional(),
  semantic: z.enum(["1", "0"]).default("1"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = inputSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_query" }, { status: 400 });
  }
  const limit = await checkCivicSearchRateLimit();
  if (!limit.allowed) {
    return NextResponse.json(
      { code: "rate_limited", fallbackPreserved: true },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  try {
    const result = await hybridPublicSearch({
      query: parsed.data.q,
      type: parsed.data.tipo,
      pautaId: parsed.data.pauta,
      territoryId: parsed.data.territorio,
      semantic: parsed.data.semantic === "1",
      timeoutMs: 1800,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { code: "enrichment_unavailable", fallbackPreserved: true },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
