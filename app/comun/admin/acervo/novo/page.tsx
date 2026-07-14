import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { ArchiveForm } from "../archive-form";
export default async function NewArchive(){const session=await requireComunAdmin({roles:["admin","editor"]});return <AdminShell adminEmail={session.admin.email}><h1 className="text-3xl font-black uppercase">Novo item do acervo</h1><ArchiveForm/></AdminShell>}
