import { ComunShell, Section } from "@/components/comun-shell";
import { PrimaryLink } from "@/components/comun-shell";

const items = [
  "Voce pode relatar sem se identificar publicamente.",
  "Contato e opcional e nunca aparece em pagina publica.",
  "Dados privados nao sao publicados.",
  "Relatos sensiveis passam por revisao.",
  "Nem todo relato sera publicado.",
  "Publicacao de relato nao significa confirmacao automatica de todos os fatos.",
  "Evite enviar CPF, telefone, endereco completo ou dados de terceiros.",
  "Fotos enviadas no relato rapido ficam privadas e nao aparecem publicamente sem curadoria.",
  "Localizacao precisa fica interna. Quando necessario, a publicacao usa apenas local aproximado ou sanitizado.",
  "O COMUN e uma plataforma comunitaria e nao substitui canais oficiais quando houver risco imediato ou necessidade formal.",
];

export default function SecurityPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Como o COMUN protege relatos</h1>
        <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/78 sm:text-lg">
          O COMUN existe para organizar memoria coletiva com cuidado. Relato nao entra publico automaticamente e dados sensiveis ficam fora da parte aberta.
        </p>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div key={item} className="paper-panel comun-prose border-2 border-comun-black p-4 font-bold">{item}</div>
          ))}
        </div>
        <div className="mt-6">
          <PrimaryLink href="/comun/relatar">Enviar relato com seguranca</PrimaryLink>
        </div>
      </Section>
    </ComunShell>
  );
}
