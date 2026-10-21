import Link from "next/link";
import { Suspense } from "react";
import { SearchReturnLink } from "@/components/civic-intelligence/search-return-link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Conteúdo indisponível</h1>
      <p>
        Este conteúdo pode ter sido retirado ou não estar disponível para
        consulta pública.
      </p>
      <Suspense>
        <SearchReturnLink />
      </Suspense>
      <Link
        href="/comun/explorar"
        className="inline-flex min-h-11 items-center underline"
      >
        Voltar ao Explorar
      </Link>
    </main>
  );
}
