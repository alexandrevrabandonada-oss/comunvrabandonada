"use client";

import { useEffect } from "react";

export function ComunPautaCreationDraftClear() {
  useEffect(() => {
    sessionStorage.removeItem("comun:pauta-low-friction-draft:v1");
  }, []);
  return null;
}
