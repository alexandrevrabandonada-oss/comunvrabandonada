import { redirect } from "next/navigation";
import { requireComunAdmin } from "@/lib/admin-auth";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-experience";
import { canAccessOperationalSurface } from "@/lib/operational-authorization";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ experiencia?: string | string[] }>;
}) {
  const query = await searchParams;
  const session = await requireComunAdmin();
  const destination = ["admin", "editor"].includes(session.admin.role)
    ? "/comun/admin/organizacao"
    : canAccessOperationalSurface(session.profile, "central")
      ? "/comun/admin/operacao"
      : "/comun/admin/notificacoes";
  redirect(
    isComunAppV2(query.experiencia) ? withComunAppV2(destination) : destination,
  );
}
