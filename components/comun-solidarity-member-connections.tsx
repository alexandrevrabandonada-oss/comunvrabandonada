import Link from "next/link";
import {
  solidarityConnectionStateLabel,
  type PrivateSolidarityMemberConnectionV1,
} from "@/lib/comun-solidarity-private-connections";
import { withdrawSolidarityConnectionAction } from "@/app/comun/cooperativas/[slug]/connection-actions";

export function SolidarityConnectionCards({
  connections,
}: {
  connections: PrivateSolidarityMemberConnectionV1[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {connections.map((connection) => (
        <SolidarityConnectionCard
          connection={connection}
          key={`${connection.kind}:${connection.interestId}`}
        />
      ))}
    </div>
  );
}

export function SolidarityConnectionCard({
  connection,
  appV2 = false,
}: {
  connection: PrivateSolidarityMemberConnectionV1;
  appV2?: boolean;
}) {
  const subjectKind = connection.kind === "offer_interest" ? "offer" : "need";
  const href =
    subjectKind === "offer"
      ? `/comun/cooperativas/${connection.organizationSlug}/ofertas/${connection.subjectSlug}/interesse`
      : `/comun/cooperativas/${connection.organizationSlug}/necessidades/${connection.subjectSlug}/ajudar`;
  return (
    <article
      className={
        appV2
          ? "surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
          : "border-2 border-comun-yellow p-5"
      }
    >
      <p
        className={
          appV2
            ? "comun-v2-status text-comun-rust"
            : "text-xs font-black uppercase text-comun-yellow"
        }
      >
        {connection.kind === "offer_interest" ? "Interesse" : "Ajuda"}
      </p>
      <h3 className="mt-2 text-lg font-black">{connection.subjectTitle}</h3>
      <p className="mt-1 text-sm">{connection.organizationName}</p>
      <p className="mt-3 font-bold">
        {solidarityConnectionStateLabel(connection.state)}
      </p>
      <p className="mt-1 text-sm">
        {connection.state === "pending"
          ? "Próximo passo: aguardar a resposta da organização."
          : connection.state === "accepted"
            ? "A organização já pode ver o contato protegido desta conexão."
            : "Este registro permanece na sua memória privada."}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center font-black underline"
          href={href}
        >
          Ver item
        </Link>
        {["pending", "accepted"].includes(connection.state) ? (
          <form action={withdrawSolidarityConnectionAction}>
            <input
              type="hidden"
              name="interest_id"
              value={connection.interestId}
            />
            <input type="hidden" name="subject_kind" value={subjectKind} />
            <button className="min-h-11 font-black underline">
              Retirar conexão
            </button>
          </form>
        ) : null}
      </div>
      {connection.state === "accepted" ? (
        <p className="mt-2 text-xs">
          Ao retirar, o COMUN remove o contato protegido. Cópias feitas fora do
          COMUN não podem ser recolhidas automaticamente.
        </p>
      ) : null}
    </article>
  );
}
