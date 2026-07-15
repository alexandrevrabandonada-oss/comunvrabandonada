import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityRecoveryForm } from "@/components/community-password-form";
export default function RecuperarAcessoPage() { return <ComunShell><Section><div className="mx-auto max-w-lg bg-comun-paper p-6"><h1 className="text-3xl font-black uppercase">Recuperar acesso</h1><p className="my-4">A resposta é sempre a mesma, exista ou não uma conta com o e-mail informado.</p><CommunityRecoveryForm/></div></Section></ComunShell>; }
