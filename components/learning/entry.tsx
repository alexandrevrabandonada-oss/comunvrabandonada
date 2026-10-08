import "server-only";
import { cache } from "react";
import Link from "next/link";
import { isLearningEnabled } from "@/lib/learning/core";
import { learningContinuity } from "@/lib/learning/continuity";
import { learningSnapshot } from "@/lib/learning/server";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";

const ownContinuity = cache(async () => {
  const session = await getCommunitySession();
  if (!session?.user || session.profile?.status !== "active") return null;
  return learningContinuity(await learningSnapshot(session.user.id));
});

export async function LearningEntry() {
  if (!isLearningEnabled()) return null;
  let summary;
  try {
    summary = await ownContinuity();
  } catch {
    return (
      <section
        aria-label="Sua formação"
        className="my-5 border-l-4 border-comun-yellow p-4"
      >
        <h2 className="text-xl font-black">Sua formação</h2>
        <p role="status" className="mt-2">
          Não conseguimos consultar sua formação agora. Seu progresso não foi
          alterado.
        </p>
        <a
          className="mt-2 inline-flex min-h-12 items-center font-bold underline"
          href="/comun/minha-participacao"
        >
          Tentar novamente
        </a>
      </section>
    );
  }
  const description = !summary
    ? "Entre para consultar sua formação privada."
    : summary.kind === "resume"
      ? "Continue a atividade que você já iniciou."
      : summary.kind === "practice"
        ? "Você já estudou esta atividade. Falta registrar sua prática."
        : summary.kind === "review"
          ? "Sua prática está aguardando revisão. Você pode acompanhar o que registrou."
          : "Não há atividade em andamento para retomar. Você pode conhecer as atividades disponíveis.";
  const label = !summary
    ? "Entrar para consultar"
    : summary.kind === "resume"
      ? "Retomar atividade"
      : summary.kind === "practice"
        ? "Concluir minha prática"
        : summary.kind === "review"
          ? "Acompanhar minha prática"
          : "Conhecer atividades";
  return (
    <section
      aria-label="Sua formação"
      className="my-5 border-l-4 border-comun-yellow p-4"
    >
      <h2 className="text-xl font-black">Sua formação</h2>
      <p className="mt-2">{description}</p>
      {summary && "title" in summary ? (
        <p className="mt-2 font-bold">
          {summary.title} · Etapa {summary.stage} de 6
        </p>
      ) : null}
      <Link
        className="mt-2 inline-flex min-h-12 items-center font-bold underline"
        href={summary?.href ?? communityLoginHref("/comun/minha-participacao")}
      >
        {label}
      </Link>
    </section>
  );
}
