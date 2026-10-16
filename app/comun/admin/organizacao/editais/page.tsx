import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { isComunEditaisR0Enabled } from "@/lib/comun-editais-r0";
import { EditaisR0Workbench } from "./workbench";

export const dynamic = "force-dynamic";

/** Acesso administrativo explícito. Flag desligada em todos os ambientes por padrão. */
export default async function Page() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  if (!isComunEditaisR0Enabled()) notFound();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="max-w-5xl">
        <Link className="text-sm font-bold underline" href="/comun/admin/organizacao">
          Voltar à Sala de Organização
        </Link>
        <h1 className="mt-4 text-3xl font-black uppercase">COMUN Editais — R0</h1>
        <p className="mt-2 max-w-3xl">
          Piloto privado de triagem e preparação documental da APS.
          Não produz inscrição, não confere elegibilidade e não substitui
          a leitura integral do edital e das retificações.
        </p>
        <EditaisR0Workbench />
      </div>
    </AdminShell>
  );
}
