// @ts-nocheck -- Supabase Edge Runtime provides Deno and Supabase.ai globals.
const MODEL = "gte-small";
const DIMENSIONS = 384;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return new Response("method_not_allowed", { status: 405 });
  try {
    const body = await request.json();
    if (
      body?.publicProjection !== true ||
      !["query", "documents"].includes(body?.kind)
    ) {
      return Response.json({ code: "invalid_boundary" }, { status: 400 });
    }
    const inputs = Array.isArray(body.inputs) ? body.inputs : [];
    if (
      !inputs.length ||
      inputs.length > 16 ||
      inputs.some(
        (value: unknown) =>
          typeof value !== "string" ||
          value.trim().length < 2 ||
          value.length > 4000,
      )
    ) {
      return Response.json({ code: "invalid_input" }, { status: 400 });
    }
    const session = new Supabase.ai.Session(MODEL);
    const embeddings = [];
    for (const input of inputs) {
      const vector = await session.run(input.trim(), {
        mean_pool: true,
        normalize: true,
      });
      if (
        !Array.isArray(vector) ||
        vector.length !== DIMENSIONS ||
        vector.some((value) => !Number.isFinite(value))
      ) {
        return Response.json({ code: "invalid_dimensions" }, { status: 502 });
      }
      embeddings.push(vector);
    }
    return Response.json(
      {
        model: MODEL,
        version: "gte-small@supabase-native-v1",
        dimensions: DIMENSIONS,
        embeddings,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json({ code: "provider_unavailable" }, { status: 503 });
  }
});
