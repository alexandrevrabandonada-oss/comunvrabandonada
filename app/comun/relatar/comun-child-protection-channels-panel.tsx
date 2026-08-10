"use client";

import { useEffect, useState } from "react";

type ProtectionChannel = {
  id: string;
  institution: string;
  destination: string | null;
  sourceUrls: string[];
  sourceStatus: "source_verified" | "source_conflict";
  operationalStatus: "operationally_unchecked";
  notes: string;
  emergencyOnly: boolean;
};

export function ComunChildProtectionChannelsPanel({
  immediateDanger,
}: {
  immediateDanger: boolean;
}) {
  const [channels, setChannels] = useState<ProtectionChannel[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/comun/child-protection-channels", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { channels?: ProtectionChannel[] })
          : null,
      )
      .then((value) => {
        if (active && Array.isArray(value?.channels))
          setChannels(value.channels);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const visible = channels.filter(
    (channel) => immediateDanger || !channel.emergencyOnly,
  );

  return (
    <section className="grid gap-4 border-2 border-comun-black bg-comun-paper p-4">
      <div className="grid gap-1">
        <h3 className="text-lg font-black">
          Canais de proteção para consultar
        </h3>
        <p className="text-sm">
          Nenhum texto, foto, localização ou dado pessoal foi enviado. O COMUN
          não abriu chamada, não criou encaminhamento e não avisou nenhum
          serviço.
        </p>
      </div>
      <div className="grid gap-3">
        {visible.map((channel) => (
          <article
            key={channel.id}
            className="grid gap-2 border-2 border-comun-black bg-white p-3"
          >
            <h4 className="font-black">{channel.institution}</h4>
            {channel.destination ? (
              <p className="text-lg font-black">
                Telefone {channel.destination}
              </p>
            ) : null}
            <p className="text-sm">{channel.notes}</p>
            {channel.sourceStatus === "source_conflict" ? (
              <p className="border-l-4 border-comun-yellow pl-3 text-sm font-bold">
                Fontes oficiais conflitantes; contato não confirmado pelo COMUN.
              </p>
            ) : (
              <p className="text-xs font-bold">
                Fonte oficial verificada; operação não testada pelo COMUN.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {channel.sourceUrls.map((sourceUrl, index) => (
                <a
                  key={sourceUrl}
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit font-black underline"
                >
                  Consultar fonte oficial
                  {channel.sourceUrls.length > 1 ? ` ${index + 1}` : ""}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
