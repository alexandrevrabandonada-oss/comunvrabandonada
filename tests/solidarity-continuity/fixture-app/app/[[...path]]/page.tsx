import Link from "next/link";
import { notFound } from "next/navigation";
import OfferPage from "@/app/comun/cooperativas/[slug]/ofertas/[offerSlug]/interesse/page";
import NeedPage from "@/app/comun/cooperativas/[slug]/necessidades/[needSlug]/ajudar/page";
import Account from "@/app/comun/conta/page";
import Login from "@/app/comun/entrar/page";
import { SolidarityConnectionCard } from "@/components/comun-solidarity-member-connections";
import { listMySolidarityConnections } from "@/lib/server/comun-solidarity-private-connections";
import { requireCommunitySession } from "@/lib/community-auth";
import { reviewSolidarityConnectionAction } from "@/app/comun/cooperativas/[slug]/connection-actions";
import { ids, world } from "../../world";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { path = [] } = await params;
  const route = path.join("/");
  if (route.endsWith("/interesse"))
    return (
      <OfferPage
        params={Promise.resolve({
          slug: "organizacao-lab",
          offerSlug: "oferta-lab",
        })}
      />
    );
  if (route.endsWith("/ajudar"))
    return (
      <NeedPage
        params={Promise.resolve({
          slug: "organizacao-lab",
          needSlug: "necessidade-lab",
        })}
      />
    );
  if (route === "comun/conta") return <Account />;
  if (route === "comun/entrar") return <Login searchParams={searchParams} />;
  if (route === "comun/minha-participacao") {
    const { user } = await requireCommunitySession();
    const connections = await listMySolidarityConnections(user.id);
    return (
      <main className="mx-auto max-w-3xl bg-comun-paper p-6 text-comun-black">
        <h1 className="text-3xl font-black">Minha participação</h1>
        {connections.map((connection) => (
          <SolidarityConnectionCard
            appV2
            key={connection.interestId}
            connection={connection}
          />
        ))}
        <Link href="/comun/conta">Minha conta</Link>
      </main>
    );
  }
  if (route === "comun/cooperativas/organizacao-lab") {
    await requireCommunitySession();
    return (
      <main>
        <h1>Organização sintética</h1>
        {world().rows.map((row) => (
          <article key={row.interest_id}>
            <h2>{row.subject_title}</h2>
            <form action={reviewSolidarityConnectionAction}>
              <input
                type="hidden"
                name="organization_slug"
                value="organizacao-lab"
              />
              <input
                type="hidden"
                name="organization_territory_id"
                value={ids.org}
              />
              <input type="hidden" name="interest_id" value={row.interest_id} />
              <input
                type="hidden"
                name="subject_kind"
                value={row.subject_kind}
              />
              <button name="decision" value="accept">
                Aceitar conexão
              </button>
              <button name="decision" value="reject">
                Recusar conexão
              </button>
            </form>
          </article>
        ))}
      </main>
    );
  }
  notFound();
}
