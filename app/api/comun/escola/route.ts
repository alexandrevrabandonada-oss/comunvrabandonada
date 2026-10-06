import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCommunitySession } from "@/lib/community-auth";
import { getMission, isLearningEnabled } from "@/lib/learning/core";
import { learningService, learningSnapshot } from "@/lib/learning/server";

export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const event = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("continue"),
    missionId: z.string().max(100),
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    event: z.literal("answer"),
    missionId: z.string().max(100),
    revision: z.number().int().nonnegative(),
    answer: z.number().int().min(0).max(3),
  }),
  z.object({
    event: z.literal("practice"),
    missionId: z.string().max(100),
    pautaId: z.string().uuid(),
    taskId: z.string().uuid().nullable(),
    reflection: z.string().trim().min(20).max(1200),
  }),
  z.object({
    event: z.literal("bookmark"),
    resourceId: z.enum([
      "fundamentos",
      "investigacao",
      "organizacao",
      "estrategia",
    ]),
  }),
]);
async function activeSession() {
  const session = await getCommunitySession();
  return session?.user && session.profile?.status === "active" ? session : null;
}
export async function GET() {
  if (!isLearningEnabled())
    return reply({ message: "Escola indisponível." }, 404);
  let session;
  try {
    session = await activeSession();
  } catch {
    return reply(
      { message: "Não foi possível verificar sua sessão. Tente novamente." },
      503,
    );
  }
  if (!session)
    return reply({ message: "Entre para guardar seu progresso." }, 401);
  try {
    return reply(await learningSnapshot(session.user.id));
  } catch {
    return reply(
      { message: "Não foi possível carregar seu progresso. Tente novamente." },
      503,
    );
  }
}
export async function POST(request: NextRequest) {
  if (!isLearningEnabled())
    return reply({ message: "Escola indisponível." }, 404);
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply({ message: "Reabra a Escola para continuar." }, 403);
  let session;
  try {
    session = await activeSession();
  } catch {
    return reply(
      { message: "Não foi possível verificar sua sessão. Tente novamente." },
      503,
    );
  }
  if (!session)
    return reply(
      { message: "Sua sessão terminou. Entre novamente para salvar." },
      401,
    );
  const raw = await request.text();
  if (raw.length > 5000)
    return reply({ message: "Conteúdo muito longo." }, 400);
  let parsed;
  try {
    parsed = event.safeParse(JSON.parse(raw));
  } catch {
    return reply({ message: "Dados inválidos." }, 400);
  }
  if (!parsed.success)
    return reply({ message: "Confira os campos e tente novamente." }, 400);
  const input = parsed.data;
  if (input.event !== "bookmark" && !getMission(input.missionId))
    return reply({ message: "Missão indisponível." }, 404);
  try {
    const service = learningService();
    const result =
      input.event === "practice"
        ? await service.rpc("comun_learning_submit_practice", {
            p_user_id: session.user.id,
            p_mission_id: input.missionId,
            p_pauta_id: input.pautaId,
            p_task_id: input.taskId,
            p_reflection: input.reflection,
          })
        : input.event === "bookmark"
          ? await service.rpc("comun_learning_bookmark", {
              p_user_id: session.user.id,
              p_resource_id: input.resourceId,
            })
          : await service.rpc("comun_learning_event", {
              p_user_id: session.user.id,
              p_mission_id: input.missionId,
              p_revision: input.revision,
              p_event: input.event,
              p_answer: input.event === "answer" ? input.answer : null,
            });
    if (result.error) {
      if (result.error.message.includes("learning_stale_revision"))
        return reply(
          {
            message:
              "Seu progresso mudou em outra aba. Atualizamos sua missão; tente novamente.",
          },
          409,
        );
      if (
        /learning_(pauta_access|task_access|practice_not_available|invalid_transition|invalid_answer)/.test(
          result.error.message,
        )
      )
        return reply(
          {
            message:
              "Esta ação não está disponível. Atualize a missão e confira a pauta.",
          },
          400,
        );
      throw result.error;
    }
    return reply({
      result: result.data,
      snapshot: await learningSnapshot(session.user.id),
    });
  } catch {
    return reply(
      {
        message:
          "Não foi possível confirmar o salvamento. Atualize para conferir antes de repetir.",
      },
      503,
    );
  }
}
