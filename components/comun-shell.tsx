import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ComunAppShell } from "./comun-app-shell";
import { ComunSection } from "./comun-ui";
import type { ComunMobileAppBarProps } from "./comun-mobile-app-bar";

export function ComunShell({
  children,
  showSyntheticNotice,
  inboxBadge,
  appBar,
}: {
  children: ReactNode;
  showSyntheticNotice?: boolean;
  inboxBadge?: number | string | null;
  appBar?: Omit<ComunMobileAppBarProps, "experienceV2">;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="min-h-screen bg-comun-paper px-4 py-6 text-sm font-bold text-comun-black"
        >
          Carregando experiência…
        </div>
      }
    >
      <ComunAppShell
        showSyntheticNotice={showSyntheticNotice}
        inboxBadge={inboxBadge}
        appBar={appBar}
      >
        {children}
      </ComunAppShell>
    </Suspense>
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
      data-comun-primary-action="true"
      className="inline-flex min-h-12 items-center justify-center border-2 border-comun-black bg-comun-yellow px-5 py-3 text-center text-sm font-black uppercase leading-tight text-comun-black shadow-[4px_4px_0_#0b0b0a]"
    >
      {children}
    </Link>
  );
}
