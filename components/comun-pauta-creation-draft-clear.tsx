"use client";

import { useEffect } from "react";
import { clearPautaDraftRevision } from "@/lib/comun-pauta-session-draft";

export function ComunPautaCreationDraftClear({
  revision,
}: {
  revision?: string;
}) {
  useEffect(() => {
    clearPautaDraftRevision(() => window.sessionStorage, revision ?? "");
  }, [revision]);
  return null;
}
