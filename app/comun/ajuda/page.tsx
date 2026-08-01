import Link from "next/link";
import { ComunShell } from "@/components/comun-shell";
import { ComunBreadcrumbs, ComunSection } from "@/components/comun-ui";

export const metadata = { title: "Ajuda | COMUN" };

const topics = [
  {
    title: "Encontrar e entender uma pauta",
    text: "Use Explorar ou Buscar. Cada pauta mostra seu estado, a próxima ação e as fontes públicas disponíveis.",
    href: "/comun/explorar",
    action: "Explorar processos",
  },
  {
    title: "Participar e acompanhar",
    text: "Contribuições passam por confirmação e moderação. A área pessoal reúne o que você já iniciou; nenhum envio é confirmado sem resposta do servidor.",
    href: "/comun/participar",
    action: "Ver formas de participar",
  },
  {
    title: "Conexão, instalação e atualização",
    text: "Instalar é opcional. Offline, somente páginas públicas já disponíveis podem ser lidas; envios, conta e administração exigem conexão.",
    href: "/comun/offline",
    action: "Ver ajuda de conexão",
  },
  {
    title: "Privacidade, correção e retirada",
    text: "O COMUN diferencia conteúdo público, comunitário e privado. Consulte os limites e os caminhos para pedir correção ou retirada.",
    href: "/comun/seguranca",
    action: "Abrir segurança e privacidade",
  },
];

export default function HelpPage() {
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[{ label: "Início", href: "/comun" }, { label: "Ajuda" }]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Ajuda para seguir sem se perder
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/80">
          Escolha o que você precisa fazer. Cada caminho informa o estado real,
          preserva seu retorno e não executa nenhuma ação automaticamente.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {topics.map((topic) => (
            <article
              key={topic.title}
              className="flex flex-col border-2 border-comun-paper/30 p-5"
            >
              <h2 className="text-xl font-black">{topic.title}</h2>
              <p className="mt-3 flex-1 text-comun-paper/75">{topic.text}</p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center self-start border-2 border-comun-yellow px-4 font-black text-comun-yellow underline-offset-4 hover:underline"
                href={topic.href}
              >
                {topic.action}
              </Link>
            </article>
          ))}
        </div>
      </ComunSection>
    </ComunShell>
  );
}
