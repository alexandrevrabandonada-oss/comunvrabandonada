import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityLoginForm } from "@/components/community-auth-form";
import { safeCommunityReturn } from "@/lib/community-return";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    status?: string;
    experiencia?: string;
  }>;
}) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo);
  const appV2 =
    isComunAppV2(params.experiencia) ||
    new URL(returnTo, "http://comun.local").searchParams.get("experiencia") ===
      "app-v2";
  const signupHref = withComunAppV2(
    `/comun/criar-conta?returnTo=${encodeURIComponent(returnTo)}`,
    appV2,
  );
  if (appV2) {
    return (
      <ComunShell>
        <div
          className="comun-v2-auth-page comun-surface-page"
          data-comun-layout-page="entrar"
        >
          <div className="comun-v2-auth-page__layout">
            <div>
              <header className="comun-v2-auth-page__header">
                <p className="comun-text-action text-xs font-black uppercase">
                  Conta e segurança
                </p>
                <h1 className="comun-v2-auth-page__title comun-text-primary mt-1">
                  Entrar
                </h1>
                <p className="comun-text-secondary mt-2 max-w-xl text-sm">
                  Acesse para acompanhar processos. Depois, você volta à ação
                  escolhida.
                </p>
              </header>
              {params.status === "sessao-expirada" ? (
                <p
                  role="alert"
                  className="mb-3 border-l-4 border-comun-yellow bg-[var(--comun-surface-alert)] p-3 text-sm text-comun-black"
                >
                  <strong>Sua sessão terminou.</strong> Entre novamente para
                  continuar de onde parou.
                </p>
              ) : null}
              <div className="comun-v2-auth-form-card">
                <CommunityLoginForm returnTo={returnTo} experienceV2={appV2} />
                <p className="comun-text-secondary mt-3 text-sm">
                  Ainda não tem conta?{" "}
                  <Link
                    className="comun-text-action font-bold underline"
                    href={signupHref}
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </div>
            <details className="comun-v2-auth-context lg:hidden">
              <summary className="min-h-11 cursor-pointer py-2 font-black">
                Como funciona o retorno
              </summary>
              <AuthReturnContext returnTo={returnTo} />
            </details>
            <aside className="comun-v2-auth-context hidden lg:block">
              <AuthReturnContext returnTo={returnTo} />
            </aside>
          </div>
        </div>
      </ComunShell>
    );
  }
  return (
    <ComunShell>
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,32rem)_1fr]">
          <div>
            <p className="text-sm font-black uppercase text-comun-yellow">
              Acesso pedido no momento necessário
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none text-comun-paper">
              Entrar no COMUN
            </h1>
            <p className="mt-4 max-w-xl text-comun-paper/75">
              A conta é necessária para proteger o acompanhamento e impedir
              acesso a dados de outra pessoa. Depois, você volta à ação
              escolhida sem selecionar pauta, comunidade ou território
              novamente.
            </p>
            {params.status === "sessao-expirada" ? (
              <p
                role="alert"
                className="mt-5 border-l-4 border-comun-yellow bg-comun-paper p-4 text-comun-black"
              >
                <strong>Sua sessão terminou.</strong> Entre novamente para
                continuar de onde parou.
              </p>
            ) : null}
            <div className="mt-6 bg-comun-paper p-5 text-comun-black">
              <CommunityLoginForm returnTo={returnTo} />
              <p className="mt-4 text-sm">
                Ainda não tem conta?{" "}
                <Link className="font-bold underline" href={signupHref}>
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
          <aside className="border-l-4 border-comun-yellow p-5">
            <p className="text-xs font-black uppercase text-comun-yellow">
              Depois do acesso
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              Você retorna ao mesmo contexto
            </h2>
            <p className="mt-3 text-comun-paper/75">
              O destino foi validado como uma rota interna do COMUN. Dados do
              formulário não ficam na URL.
            </p>
            <Link
              href={returnTo}
              className="mt-5 inline-block font-black uppercase text-comun-yellow underline"
            >
              Continuar explorando sem entrar
            </Link>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}

function AuthReturnContext({ returnTo }: { returnTo: string }) {
  return (
    <>
      <p className="comun-text-action text-xs font-black uppercase">
        Depois do acesso
      </p>
      <h2 className="comun-text-primary mt-1 text-xl font-black">
        Você retorna ao mesmo contexto
      </h2>
      <p className="comun-text-secondary mt-2 text-sm">
        O destino foi validado como uma rota interna do COMUN. Dados do
        formulário não ficam na URL.
      </p>
      <Link
        href={withComunAppV2(returnTo)}
        className="comun-text-action mt-3 inline-flex min-h-11 items-center font-black underline"
      >
        Continuar explorando sem entrar
      </Link>
    </>
  );
}
