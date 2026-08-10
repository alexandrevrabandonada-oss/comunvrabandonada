"use client";

import { useEffect, useState } from "react";

type Network = "municipal" | "state" | "unknown";
type EducationChannel = {
  id: string;
  institution: string;
  sphere: "municipal" | "state" | "federal" | "protection" | "emergency";
  channelType: "web" | "phone" | "email" | "in_person";
  destination: string;
  sourceStatus: "source_verified" | "source_unclear";
  operationalStatus: "operationally_unchecked";
  notes: string;
  protectionOnly: boolean;
  emergencyOnly: boolean;
};

export function ComunEducationChannelsPanel({
  childSafetySignal,
  emergency,
}: {
  childSafetySignal: boolean;
  emergency: boolean;
}) {
  const [network, setNetwork] = useState<Network>("unknown");
  const [channels, setChannels] = useState<EducationChannel[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/comun/education-channels", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { channels?: EducationChannel[] })
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

  const visible = channels.filter((channel) => {
    if (childSafetySignal) {
      return channel.protectionOnly && (!channel.emergencyOnly || emergency);
    }
    if (channel.protectionOnly) return false;
    return network === "unknown" || channel.sphere === network;
  });

  return (
    <section className="grid gap-4 border-2 border-comun-black bg-comun-paper p-4">
      <div className="grid gap-1">
        <h3 className="text-lg font-black">
          {childSafetySignal
            ? "Rede de proteção para consultar"
            : "Canais oficiais que podem receber esta manifestação"}
        </h3>
        <p className="text-sm">
          Nenhum texto, foto, escola, turma, localização ou dado de estudante
          foi enviado. Estas são apenas referências oficiais.
        </p>
      </div>
      {childSafetySignal ? (
        <p className="border-l-4 border-comun-yellow pl-3 text-sm font-bold">
          Um canal educacional comum não é suficiente para este sinal. O COMUN
          não acionou Conselho Tutelar, Disque 100, SAMU ou outro serviço.
        </p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="font-black">
            A escola é municipal, estadual ou você não sabe?
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["municipal", "Municipal"],
              ["state", "Estadual"],
              ["unknown", "Não sei"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={network === value}
                onClick={() => setNetwork(value as Network)}
                className={`min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black ${network === value ? "bg-comun-yellow" : "bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3">
        {visible.map((channel) => (
          <article
            key={channel.id}
            className="grid gap-2 border-2 border-comun-black bg-white p-3"
          >
            <h4 className="font-black">{channel.institution}</h4>
            {channel.channelType === "phone" ? (
              <p className="text-lg font-black">
                Telefone {channel.destination}
              </p>
            ) : (
              <a
                href={channel.destination}
                target="_blank"
                rel="noreferrer"
                className="w-fit font-black underline"
              >
                Consultar canal oficial
              </a>
            )}
            <p className="text-sm">{channel.notes}</p>
            <p className="text-xs font-bold">
              Fonte revisada; operação não testada pelo COMUN.
            </p>
          </article>
        ))}
      </div>
      <p className="text-sm font-bold">
        Se quiser informar a escola, faça isso diretamente no canal oficial. Não
        inclua estudante, turma, matrícula, telefone pessoal ou endereço no
        COMUN.
      </p>
    </section>
  );
}
