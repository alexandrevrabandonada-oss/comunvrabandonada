import { requestCommunityDeactivationAction } from "@/app/actions";
import { ComunShell, Section } from "@/components/comun-shell";
import { requireCommunitySession } from "@/lib/community-auth";
export default async function PrivacidadePage() {
  await requireCommunitySession("/comun/conta/privacidade");
  return (
    <ComunShell>
      <Section>
        <div className="max-w-2xl bg-comun-paper p-6">
          <h1 className="text-3xl font-black uppercase">
            Privacidade e desativação
          </h1>
          <p className="mt-4">
            Seu perfil nasce privado. A desativação encerra a sessão e pausa
            vínculos ativos; contribuições incorporadas permanecem no registro
            coletivo sem expor dados privados.
          </p>
          <form action={requestCommunityDeactivationAction} className="mt-6">
            <button className="min-h-11 border-2 border-red-800 px-4 font-black uppercase text-red-900">
              Solicitar desativação da conta
            </button>
          </form>
        </div>
      </Section>
    </ComunShell>
  );
}
