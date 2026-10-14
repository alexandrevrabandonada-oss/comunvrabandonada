import { world } from "../../world";
export async function GET() {
  const w = world();
  return Response.json({ logouts: w.logouts, rows: w.rows.length });
}
export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return new Response(null, { status: 403 });
  const body = await request.json();
  const w = world();
  if (body.reset) {
    w.rows = [];
    w.logouts = 0;
    w.published = true;
    w.eligible = true;
  }
  if (typeof body.published === "boolean") w.published = body.published;
  if (typeof body.eligible === "boolean") w.eligible = body.eligible;
  return Response.json({ ok: true });
}
