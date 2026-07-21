import type {ReactNode} from "react";
import {ComunShell} from "@/components/comun-shell";

export default function SidewalkLayout({children}:{children:ReactNode}){
  return <ComunShell>{children}</ComunShell>;
}
