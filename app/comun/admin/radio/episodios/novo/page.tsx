import { createRadioEpisode } from "@/app/comun/radio/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  const session = await requireComunAdmin();
  const database = createServiceSupabaseClient();
  const { data } = database
    ? await database
        .from("comun_radio_programs")
        .select("archive_item_id,title_public")
        .order("title_public")
    : { data: [] };
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Novo episódio</h1>
      <form action={createRadioEpisode} className="mt-6 grid max-w-xl gap-3">
        <select
          required
          name="program_item_id"
          aria-label="Programa"
          className="border-2 border-comun-black p-3"
        >
          {data?.map((program) => (
            <option
              value={program.archive_item_id}
              key={program.archive_item_id}
            >
              {program.title_public}
            </option>
          ))}
        </select>
        <input
          required
          name="title"
          aria-label="Título"
          placeholder="Título ou Parte 1 — tema"
          className="border-2 border-comun-black p-3"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="season_number"
            type="number"
            min="1"
            aria-label="Temporada"
            placeholder="Temporada"
            className="border-2 border-comun-black p-3"
          />
          <input
            name="episode_number"
            type="number"
            min="1"
            aria-label="Número do episódio ou parte"
            placeholder="Episódio ou parte"
            className="border-2 border-comun-black p-3"
          />
        </div>
        <p className="text-sm">
          Se o programa passar de 30 minutos ou 45 MiB, crie partes editoriais
          numeradas. Cada parte mantém contexto, título próprio e ordem.
        </p>
        <textarea
          required
          name="summary"
          aria-label="Resumo"
          placeholder="Resumo público"
          className="border-2 border-comun-black p-3"
        />
        <button className="border-2 border-comun-black bg-comun-yellow p-3 font-black">
          CRIAR EPISÓDIO
        </button>
      </form>
    </AdminShell>
  );
}
