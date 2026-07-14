import { ComunShell, Section } from "@/components/comun-shell";
import { RightsForm } from "./rights-form";
export default function RightsRemovalPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-paper">
          Direitos, credito e remocao
        </h1>
        <div className="mt-4 max-w-3xl space-y-3 text-comun-paper/80">
          <p>
            Voce pode solicitar correcao de contexto, ajuste de credito ou
            retirada de uma fotografia.
          </p>
          <p>
            A equipe verifica autoria, fonte, permissao e interesse de
            preservacao. Contatos de contribuidores nunca sao publicados.
          </p>
          <p>
            Uma retirada pode despublicar imediatamente o derivado enquanto a
            equipe avalia a preservacao legal do original privado.
          </p>
        </div>
        <RightsForm />
      </Section>
    </ComunShell>
  );
}
