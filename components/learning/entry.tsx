import Link from "next/link";
import { isLearningEnabled } from "@/lib/learning/core";
export function LearningEntry() {
  if (!isLearningEnabled()) return null;
  return (
    <div className="my-5 border-l-4 border-comun-yellow p-4">
      <h2 className="text-xl font-black">Escola COMUN</h2>
      <p className="mt-2">Aprenda uma ferramenta e use numa pauta real.</p>
      <Link
        className="mt-2 inline-flex min-h-12 items-center font-bold underline"
        href="/comun/escola"
      >
        Continuar minha formação
      </Link>
    </div>
  );
}
