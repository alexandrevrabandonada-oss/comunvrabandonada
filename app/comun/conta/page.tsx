import Link from "next/link";
import { logoutCommunity, saveCommunityProfileAction } from "@/app/actions";
import { ComunLogoutCleanup } from "@/components/comun-pwa-runtime";
import { ComunShell, Section } from "@/components/comun-shell";
import { requireCommunitySession } from "@/lib/community-auth";
export default async function Conta() {
  const { profile } = await requireCommunitySession("/comun/conta");
  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-paper">
          Minha conta
        </h1>
        <form
          action={saveCommunityProfileAction}
          className="mt-6 grid max-w-xl gap-4 bg-comun-paper p-5"
        >
          <label>
            Nome de exibição
            <input
              name="display_name"
              defaultValue={profile?.display_name || ""}
              required
              className="mt-1 w-full border-2 border-comun-black p-2"
              autoComplete="name"
            />
          </label>
          <label>
            Bio pública
            <textarea
              name="public_bio"
              className="mt-1 w-full border-2 border-comun-black p-2"
            />
          </label>
          <label>
            Visibilidade
            <select
              name="profile_visibility"
              defaultValue={profile?.profile_visibility || "private"}
              className="mt-1 w-full border-2 border-comun-black p-2"
            >
              <option value="private">Privada</option>
              <option value="pauta_members">Membros de pautas</option>
              <option value="public">Pública</option>
            </select>
          </label>
          <button className="min-h-11 bg-comun-yellow font-black uppercase">
            Salvar perfil
          </button>
        </form>
        <Link
          className="mt-5 inline-block font-bold text-comun-yellow underline"
          href="/comun/conta/privacidade"
        >
          Privacidade e desativação
        </Link>
        <form action={logoutCommunity}>
          <ComunLogoutCleanup />
        </form>
      </Section>
    </ComunShell>
  );
}
