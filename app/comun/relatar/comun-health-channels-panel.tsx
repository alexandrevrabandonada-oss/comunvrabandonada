"use client";

import { useEffect, useState } from "react";

type Sphere = "municipal" | "state" | "unknown";
type HealthChannel = {
  id: string;
  institution: string;
  sphere: "municipal" | "state" | "federal" | "emergency";
  channelType: "web" | "phone" | "email" | "in_person";
  destination: string | null;
  sourceStatus: "source_verified" | "conflicting_sources";
  operationalStatus: "operationally_unchecked";
  identificationRequirement: string;
  hours: string | null;
  notes: string;
};

export function ComunHealthChannelsPanel({ emergency }: { emergency: boolean }) {
  const [sphere, setSphere] = useState<Sphere>("unknown");
  const [channels, setChannels] = useState<HealthChannel[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/comun/health-channels", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { channels?: HealthChannel[] })
          : null,
      )
      .then((value) => {
        if (active && Array.isArray(value?.channels)) setChannels(value.channels);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const visible = channels.filter((channel) => {
    if (channel.sphere === "emergency") return emergency;
    if (channel.sphere === "federal") return true;
    return sphere === channel.sphere;
  });

  return (
    <section className="grid gap-4 border-2 border-comun-black bg-comun-paper p-4">
      <div className="grid gap-1">
        <h3 className="text-lg font-black">
          Canais oficiais que podem receber esta manifestação
        </h3>
        <p className="text-sm">
          Nenhum texto, foto, local ou dado de saúde foi enviado. Os canais
          abaixo são apenas referências oficiais para você consultar.
        </p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="font-black">
          A unidade é municipal, estadual ou você não sabe?
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
              aria-pressed={sphere === value}
              onClick={() => setSphere(value as Sphere)}
              className={`min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black ${sphere === value ? "bg-comun-yellow" : "bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {sphere === "unknown" ? (
        <p className="text-sm font-bold">
          O OuvSUS é a alternativa geral. Confirme a gestão da unidade no
          próprio canal, se puder.
        </p>
      ) : null}
      <div className="grid gap-3">
        {visible.map((channel) => (
          <article key={channel.id} className="grid gap-2 border-2 border-comun-black bg-white p-3">
            <h4 className="font-black">{channel.institution}</h4>
            {channel.channelType === "phone" && channel.destination ? (
              <p className="text-lg font-black">Telefone {channel.destination}</p>
            ) : channel.destination ? (
              <a
                href={channel.destination}
                target="_blank"
                rel="noreferrer"
                className="w-fit font-black underline"
              >
                Consultar canal oficial
              </a>
            ) : null}
            {channel.sourceStatus === "conflicting_sources" ? (
              <p className="border-l-4 border-comun-yellow pl-3 text-sm font-bold">
                Fontes municipais oficiais divergem. Confira os requisitos na
                página antes de fornecer qualquer dado.
              </p>
            ) : null}
            <p className="text-sm">{channel.notes}</p>
            {channel.hours ? <p className="text-xs">{channel.hours}</p> : null}
            <p className="text-xs font-bold">
              Fonte verificada; operação não testada pelo COMUN.
            </p>
          </article>
        ))}
      </div>
      <p className="text-sm font-bold">
        Se quiser informar a unidade, faça isso diretamente no canal oficial.
        Não inclua nome de paciente, endereço residencial, prontuário ou
        documento no COMUN.
      </p>
    </section>
  );
}
