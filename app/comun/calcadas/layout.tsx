import type { ReactNode } from "react";
import { ComunShell } from "@/components/comun-shell";

export default function SidewalkLayout({ children }: { children: ReactNode }) {
  return <ComunShell showSyntheticNotice={false}>{children}</ComunShell>;
}
