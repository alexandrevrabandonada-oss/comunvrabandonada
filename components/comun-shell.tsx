import Link from "next/link";
import type { ReactNode } from "react";
import { ComunAppShell } from "./comun-app-shell";
import { ComunSection } from "./comun-ui";

export function ComunShell({
  children,
  showSyntheticNotice,
}: {
  children: ReactNode;
  showSyntheticNotice?: boolean;
}) {
  return (
    <ComunAppShell showSyntheticNotice={showSyntheticNotice}>
      {children}
    </ComunAppShell>
  );
}

export const Section = ComunSection;

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center border-2 border-comun-black bg-comun-yellow px-5 py-3 text-center text-sm font-black uppercase leading-tight text-comun-black shadow-[4px_4px_0_#0b0b0a]"
    >
      {children}
    </Link>
  );
}
