import Link from "next/link";
import type { ReactNode } from "react";
import type { ComunExpressivityLevel } from "@/lib/experience-coherence";

export function ComunExperiencePilot({
  active,
  level,
  currentHref,
  children,
}: {
  active: boolean;
  level: ComunExpressivityLevel;
  currentHref: string;
  children: ReactNode;
}) {
  return (
    <div
      className="comun-experience-surface"
      data-comun-experience-level={level}
      data-comun-experience-pilot={active ? "active" : "baseline"}
    >
      {active ? (
        <aside
          aria-label="Comparação da direção de experiência"
          className="comun-experience-comparison"
        >
          <div>
            <strong>Direção de experiência em comparação</strong>
            <p>
              Protótipo reversível. Conteúdo, permissões e endereço canônico
              permanecem iguais.
            </p>
          </div>
          <Link href={currentHref}>Voltar à versão atual</Link>
        </aside>
      ) : null}
      {children}
    </div>
  );
}
