import Link from "next/link";
import { notFound } from "next/navigation";
import { requireComunAdmin } from "@/lib/admin-auth";
import { ComunShell, Section } from "@/components/comun-shell";
import { getMission, isLearningEnabled } from "@/lib/learning/core";
import { learningService } from "@/lib/learning/server";
import { reviewPractice } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isLearningEnabled()) notFound();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const { status } = await searchParams;
  const service = learningService();
  const { data, error } = await service
    .from("comun_learning_practice_links")
    .select("user_id,mission_id,pauta_id,task_id,reflection,updated_at")
    .eq("state", "pending")
    .neq("user_id", session.user.id)
    .order("updated_at")
    .limit(50);
  const ids = [...new Set((data ?? []).map((row) => String(row.pauta_id)))];
  const { data: pautas } = ids.length
    ? await service
        .from("comun_pauta_spaces")
        .select("id,title,slug")
        .in("id", ids)
    : { data: [] };
  return (
    <ComunShell
      appBar={{
        title: "Escola",
        contextLabel: "Revisão de práticas",
        backDestination: "/comun/admin",
      }}
    >
      <Section>
        <h1 className="text-3xl font-black">Revisar práticas</h1>
        <p className="mt-3">
          Confira o registro na pauta antes de validar. A própria pessoa não
          pode validar sua prática.
        </p>
        {status ? (
          <p role="status" className="my-4 border-l-4 border-comun-yellow p-3">
            {status === "saved"
              ? "Revisão salva."
              : "Não foi possível concluir a revisão. Atualize a fila e tente novamente."}
          </p>
        ) : null}
        {error ? (
          <p role="alert">A fila está indisponível. Tente novamente.</p>
        ) : !data?.length ? (
          <p className="mt-5">Nenhuma prática pendente para você revisar.</p>
        ) : (
          data.map((row) => {
            const pauta = pautas?.find((p) => p.id === row.pauta_id);
            return (
              <article
                key={`${row.user_id}-${row.mission_id}`}
                className="my-6 max-w-3xl border-t border-comun-paper/40 py-5"
              >
                <h2 className="text-xl font-bold">
                  {getMission(row.mission_id)?.title}
                </h2>
                <p className="my-3 whitespace-pre-wrap break-words">
                  {row.reflection}
                </p>
                {pauta ? (
                  <Link
                    className="inline-flex min-h-12 items-center underline"
                    href={`/comun/pautas/${pauta.slug}`}
                  >
                    Conferir registro em {pauta.title}
                  </Link>
                ) : (
                  <p>A pauta não está disponível. Confira antes de revisar.</p>
                )}
                <form action={reviewPractice} className="mt-4 grid gap-3">
                  <input type="hidden" name="userId" value={row.user_id} />
                  <input
                    type="hidden"
                    name="missionId"
                    value={row.mission_id}
                  />
                  <label
                    htmlFor={`note-${row.user_id}-${row.mission_id}`}
                    className="font-bold"
                  >
                    Observação para a pessoa (opcional)
                  </label>
                  <textarea
                    id={`note-${row.user_id}-${row.mission_id}`}
                    name="note"
                    maxLength={600}
                    rows={3}
                    className="border-2 border-comun-paper bg-comun-paper p-3 text-comun-black"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      name="decision"
                      value="validated"
                      className="min-h-12 bg-comun-yellow px-4 py-3 font-bold text-comun-black"
                    >
                      Validar prática
                    </button>
                    <button
                      name="decision"
                      value="revision_requested"
                      className="min-h-12 border-2 border-comun-paper px-4 py-3 font-bold"
                    >
                      Pedir revisão
                    </button>
                  </div>
                </form>
              </article>
            );
          })
        )}
      </Section>
    </ComunShell>
  );
}
