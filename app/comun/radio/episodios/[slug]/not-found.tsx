import Link from "next/link";
export default function UnavailablePublicContent() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Conteúdo indisponível</h1>
      <p className="my-4">
        Este conteúdo pode ter sido retirado ou não estar disponível para
        consulta pública. Nenhum acesso privado foi concedido.
      </p>
      <Link
        className="inline-flex min-h-11 items-center underline"
        href="/comun/explorar"
      >
        Voltar ao Explorar
      </Link>
    </main>
  );
}
