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
  "No Mapa Popular, matriculas, localizacao privada, geometrias sensiveis e documentos cadastrais restritos permanecem internos.",
  "O COMUN e uma plataforma comunitaria e nao substitui canais oficiais quando houver risco imediato ou necessidade formal.",
  "O Protocolo Popular nao substitui Ouvidoria oficial: ele ajuda a redigir um texto, mas nao envia automaticamente para a Prefeitura.",
  "O numero oficial deve ser informado pelo usuario depois do registro no canal oficial.",
  "Respostas oficiais podem conter dados pessoais e nao sao publicas automaticamente.",
  "Espacos de pauta organizam discussao por problema real, nao por feed global.",
  "Contribuicoes em pautas passam por moderacao antes de aparecer publicamente.",
  "O envio de contribuicoes de pauta tem limite por janela de tempo para reduzir abuso sem exigir login publico.",
  "A fila interna pode marcar risco operacional, mas hashes e metadados tecnicos nao aparecem publicamente.",
  "Contato privado enviado em contribuicao de pauta nunca aparece na pagina publica.",
  "Pautas, tarefas e dossies nao substituem canal oficial nem atendimento de urgencia.",
  "No Acervo, originais ficam em bucket privado e nunca se tornam publicos automaticamente.",
  "A pagina publica usa uma versao separada, aprovada e revisada quanto a direitos, creditos e dados pessoais.",
  "Fotografias comunitarias passam por triagem, pesquisa de fonte, revisao de direitos e geracao de derivados sem EXIF antes da publicacao.",
  "Sugestoes de data, lugar, autoria ou contexto ficam pendentes ate revisao humana e nunca alteram automaticamente uma memoria publicada.",
  "Informacoes sobre pessoas recebem revisao reforcada; o COMUN nao usa reconhecimento facial nem identificacao automatica.",
  "O Acervo nao hospeda arquivos de musica neste sprint: artistas e lancamentos usam somente links oficiais externos.",
  "Contribuicoes e reivindicacoes de artistas ficam pendentes; contato, comprovacoes e notas da moderacao nunca aparecem no perfil publico.",
  "A verificacao de links musicais bloqueia localhost, redes privadas e redirects inseguros; nenhum audio ou corpo de pagina e baixado.",
  "O historico editorial musical usa snapshots sanitizados sem contatos, documentos, tokens, segredos ou URLs assinadas.",
  "Perfis de artistas menores nao devem expor escola, rotina, localizacao precisa, contato privado ou nome civil nao autorizado.",
  "Em Historia Oral, audio original, termo de consentimento e transcricao interna permanecem privados.",
  "Entrevistas so aparecem com consentimento granular valido, versao publica separada, revisao editorial e embargo encerrado.",
  "Participantes podem restringir ou retirar consentimento; a retirada remove imediatamente a superficie publica relacionada.",
  "Consentimento para gravar nao autoriza publicar: a versao editada e cada superficie de uso exigem autorizacao final.",
  "No piloto de Historia Oral, checksum, backup, dupla revisao, terceiros resolvidos e aprovacao do participante bloqueiam a publicacao quando ausentes.",
  "Participantes menores exigem autorizacao de responsavel e revisao reforcada, sem escola, rotina, contato ou localizacao precisa.",
  "Verificacoes tecnicas usam fixtures descartaveis, exigem acesso administrativo e nunca enviam segredos ou originais privados ao navegador.",
  "A busca global consulta somente títulos, resumos e campos públicos aprovados; notas internas, contatos e relatos brutos não são indexados.",
  "Ações públicas mostram apenas lugar, responsáveis e orientações autorizados; equipe, riscos e localização privada permanecem internos.",
  "Disponibilidade de voluntariado e contato são privados e nunca formam uma lista pública de participantes.",
  "Observações dos observatórios nascem privadas e pendentes; payload bruto, contato, hash e evidência opcional não aparecem no portal.",
  "Indicadores comunitários só são publicados de forma agregada, com metodologia, período, amostra, cobertura e limitações.",
  "O monitoramento de transporte não coleta motorista, passageiro, trajetória pessoal, cartão, documento ou localização contínua.",
  "Na Arte dos Territórios, o original e documentos de direitos permanecem privados; somente derivadas aprovadas podem aparecer.",
  "O Storage local bloqueia acesso público ao original e só cria derivadas após autorização explícita de exibição.",
  "Créditos, contexto e autorização de exibição são obrigatórios. O COMUN não presume licença, autoria ou consentimento.",
  "Obras com menores, pessoas identificáveis ou localização sensível passam por revisão reforçada e não expõem escola, rotina, contato ou local preciso.",
];

export default function SecurityPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
          Como o COMUN protege relatos
        </h1>
        <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/78 sm:text-lg">
          O COMUN existe para organizar memoria coletiva com cuidado. Relato nao
          entra publico automaticamente e dados sensiveis ficam fora da parte
          aberta.
        </p>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div
              key={item}
              className="paper-panel comun-prose border-2 border-comun-black p-4 font-bold"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <PrimaryLink href="/comun/relatar">
            Enviar relato com seguranca
          </PrimaryLink>
        </div>
      </Section>
    </ComunShell>
  );
}
