import React from "react";

type PublicCredit = {
  position: number;
  public_credit: string;
  credit_role: string;
  public_visibility: string;
};
type PublicMusic = {
  title_public: string;
  performer_public?: string | null;
  composer_public?: string | null;
  license_public?: string | null;
  rights_status: string;
};

export function ComunRadioPublicRights({
  credits = [],
  music = [],
  publishedAt,
}: {
  credits?: PublicCredit[];
  music?: PublicMusic[];
  publishedAt?: string | null;
}) {
  const publication = publishedAt?.trim() ? new Date(publishedAt) : null;
  // published_at is a timestamp with timezone; never interpret a wall clock in
  // the server's local timezone or normalize an impossible calendar date.
  const calendarDate = publishedAt?.slice(0, 10);
  const validPublication =
    publication &&
    Number.isFinite(publication.getTime()) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      publishedAt!,
    ) &&
    new Date(`${calendarDate}T00:00:00Z`).toISOString().slice(0, 10) ===
      calendarDate;
  const publicCredits = credits.filter(
    (credit) => credit.public_visibility === "public",
  );
  const authorizedMusic = music.filter((item) =>
    ["approved", "public_domain_verified"].includes(item.rights_status),
  );
  return (
    <div
      data-comun-radio-rights
      className="surface-memory grid gap-5 rounded-[var(--comun-radius-cultural)] p-5 text-comun-black lg:grid-cols-2"
    >
      <p
        className="min-w-0 break-words lg:col-span-2"
        data-comun-radio-publication
      >
        {validPublication ? (
          <>
            Publicação:{" "}
            <time dateTime={publication.toISOString()}>
              {publication.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            </time>
          </>
        ) : publication ? (
          "Data de publicação inválida."
        ) : (
          "Data de publicação não informada."
        )}
      </p>
      <section className="min-w-0 break-words">
        <h3 className="font-black">Créditos públicos</h3>
        {publicCredits.length ? (
          <ul className="mt-2 grid gap-1">
            {publicCredits.map((credit) => (
              <li key={`${credit.position}-${credit.public_credit}`}>
                {credit.public_credit} — {credit.credit_role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">Nenhum crédito público informado.</p>
        )}
      </section>
      <section className="min-w-0 break-words">
        <h3 className="font-black">Músicas autorizadas</h3>
        {authorizedMusic.length ? (
          <ul className="mt-2 grid gap-4">
            {authorizedMusic.map((item, index) => (
              <li key={`${item.title_public}-${index}`}>
                <p>
                  {item.title_public}
                  {item.performer_public ? ` · ${item.performer_public}` : ""}
                </p>
                {item.composer_public ? (
                  <p>Composição: {item.composer_public}</p>
                ) : null}
                <p>
                  {item.license_public?.trim()
                    ? `Licença/condições informadas: ${item.license_public}`
                    : "Condições específicas não informadas. A escuta no COMUN não autoriza reutilização."}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">Nenhuma música autorizada informada.</p>
        )}
      </section>
    </div>
  );
}
