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
}: {
  credits?: PublicCredit[];
  music?: PublicMusic[];
}) {
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
