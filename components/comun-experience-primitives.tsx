import Link from "next/link";
import type { ReactNode } from "react";

export function ContextHeader({ territory, community, pauta, children }: { territory?: string; community?: string; pauta?: string; children?: ReactNode }) {
  const context = [territory, community, pauta].filter(Boolean);
  return <header className="border-b-2 border-comun-paper/30 pb-4"><p className="text-xs font-black uppercase text-comun-yellow">{context.length ? context.join(" / ") : "COMUN"}</p>{children}</header>;
}

export function BackNavigation({ href, label = "Voltar" }: { href: string; label?: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4">← {label}</Link>;
}

export function NextActionCard({ title, description, href, action = "Abrir próximo passo" }: { title: string; description: string; href: string; action?: string }) {
  return <article className="border-2 border-comun-black bg-comun-yellow p-5 text-comun-black"><p className="text-xs font-black uppercase">Próxima ação</p><h2 className="mt-2 text-xl font-black leading-tight">{title}</h2><p className="mt-2">{description}</p><Link href={href} className="mt-4 inline-flex min-h-10 items-center bg-comun-black px-3 text-sm font-black uppercase text-comun-paper">{action}</Link></article>;
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex border-2 border-current px-2 py-1 text-xs font-black uppercase">{children}</span>;
}

export function StatusTimeline({ items }: { items: { title: string; description?: string; current?: boolean }[] }) {
  return <ol className="border-l-2 border-comun-yellow pl-5">{items.map((item) => <li className="relative pb-5 before:absolute before:-left-[1.65rem] before:top-1 before:size-3 before:border-2 before:border-comun-black before:bg-comun-paper last:pb-0" key={item.title}><StatusBadge>{item.current ? "Agora" : "Registrado"}</StatusBadge><h3 className="mt-2 font-black">{item.title}</h3>{item.description ? <p className="mt-1 text-sm text-comun-paper/75">{item.description}</p> : null}</li>)}</ol>;
}

export function EmptyState({ title = "Nada por aqui ainda", children, href, action = "Explorar" }: { title?: string; children: ReactNode; href?: string; action?: string }) {
  return <section className="border-2 border-comun-paper/35 p-5"><h2 className="font-black uppercase text-comun-yellow">{title}</h2><p className="mt-2 text-comun-paper/75">{children}</p>{href ? <Link className="mt-4 inline-block font-black uppercase text-comun-yellow underline" href={href}>{action}</Link> : null}</section>;
}

export function ErrorState({ href = "/comun" }: { href?: string }) {
  return <EmptyState title="Não foi possível carregar esta etapa" href={href} action="Voltar ao início">Tente novamente. Nenhuma contribuição foi perdida por esta tela.</EmptyState>;
}

export function OfflineState() {
  return <p role="status" className="border-2 border-comun-yellow p-3 text-sm font-bold text-comun-yellow">Você está sem conexão. O conteúdo público recente continua visível quando estiver disponível no aparelho.</p>;
}

export function SyncState({ children = "Atualizado" }: { children?: ReactNode }) {
  return <p className="text-xs font-bold uppercase text-comun-paper/60">Estado de sincronização: {children}</p>;
}

export function InstallPrompt() {
  return <p className="text-sm text-comun-paper/75">Quando a instalação estiver disponível no seu navegador, você poderá manter o COMUN no início do aparelho.</p>;
}
