import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityResetForm } from "@/components/community-password-form";
export default function RedefinirAcessoPage() { return <ComunShell><Section><div className="mx-auto max-w-lg bg-comun-paper p-6"><h1 className="text-3xl font-black uppercase">Redefinir acesso</h1><p className="my-4">Defina uma nova senha para a sessão aberta pelo link de recuperação.</p><CommunityResetForm/></div></Section></ComunShell>; }
