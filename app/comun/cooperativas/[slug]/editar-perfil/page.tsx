import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityOrganizationProfileForm } from "@/components/comun-solidarity-organization-profile-form";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import { isComunSolidarityOrganizationProfileSelfEditEnabled } from "@/lib/comun-solidarity-organization-profile";
import { getSolidarityOrganizationProfileEditorContext } from "@/lib/server/comun-solidarity-organization-profile";
import { updateSolidarityOrganizationProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditSolidarityOrganizationProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isComunSolidarityOrganizationProfileSelfEditEnabled()) notFound();
  const { slug } = await params;
  const returnTo = `/comun/cooperativas/${slug}/editar-perfil`;
  const session = await getCommunitySession();
  if (!session?.user) redirect(communityLoginHref(returnTo));
  const context = await getSolidarityOrganizationProfileEditorContext(
    slug,
    session.user.id,
  );
  if (!context) notFound();

  return (
    <ComunShell>
      <header className="border-b-2 border-comun-black bg-comun-yellow px-4 py-8 text-comun-black sm:px-8">
        <Link className="text-sm font-black underline" href={`/comun/cooperativas/${slug}`}>
          ← {context.organization.publicName}
        </Link>
        <h1 className="mt-5 text-4xl font-black sm:text-5xl">
          Editar perfil da organização
        </h1>
        <p className="mt-3 max-w-2xl text-lg">
          Atualize as informações cotidianas que aparecem na ficha pública.
        </p>
      </header>
      <Section>
        <div className="mx-auto max-w-3xl">
          <SolidarityOrganizationProfileForm
            action={updateSolidarityOrganizationProfileAction}
            organization={context.organization}
            expectedUpdatedAt={context.updatedAt}
          />
        </div>
      </Section>
    </ComunShell>
  );
}
