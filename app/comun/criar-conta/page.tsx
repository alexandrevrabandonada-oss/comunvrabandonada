import { ComunShell, Section } from "@/components/comun-shell";
import { CommunitySignupForm } from "@/components/community-auth-form";
import { safeCommunityReturn } from "@/lib/community-return";

export default async function CriarConta({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo);
  return <ComunShell><Section><h1 className="text-3xl font-black uppercase text-comun-paper sm:text-4xl">Criar conta comunitária</h1><p className="mt-3 max-w-xl text-comun-paper/75">Use um nome que pode ser pseudônimo. Seu e-mail não é público. Depois do onboarding curto, você retorna ao que estava fazendo.</p><div className="mt-6 max-w-md bg-comun-paper p-5 text-comun-black"><CommunitySignupForm returnTo={returnTo}/></div></Section></ComunShell>;
}
