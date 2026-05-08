import { ComunShell, Section } from "@/components/comun-shell";

const items = [
  "Voce pode relatar sem se identificar publicamente.",
  "Contato e opcional e nunca aparece em pagina publica.",
  "Dados privados nao sao publicados.",
  "Relatos sensiveis passam por revisao.",
  "Nem todo relato sera publicado.",
  "Publicacao de relato nao significa confirmacao automatica de todos os fatos.",
  "Evite enviar CPF, telefone, endereco completo ou dados de terceiros.",
  "O COMUN e uma plataforma comunitaria e nao substitui canais oficiais quando houver risco imediato ou necessidade formal.",
];

export default function SecurityPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">Como o COMUN protege relatos</h1>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div key={item} className="paper-panel border-2 border-comun-black p-4 font-bold">{item}</div>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
