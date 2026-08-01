import { getCommunity } from "@/lib/comun-data";
import { getCommunityExperience } from "@/lib/community-experience";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params,
    community = await getCommunity(slug),
    x = getCommunityExperience(slug);
  if (!community || !x?.nextActivity)
    return new Response("Atividade não encontrada.", { status: 404 });
  const start = x.nextActivity.isoDate.replace(/[-:]/g, "").replace(".000", "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//COMUN//Comunidades//PT-BR",
    "BEGIN:VEVENT",
    `UID:${slug}-sprint36@comun.local`,
    `DTSTART:${start}`,
    `SUMMARY:${x.nextActivity.title}`,
    `DESCRIPTION:Atividade da comunidade ${community.name}. Abra o COMUN para contexto e inscrição.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"comun-${slug}.ics\"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
