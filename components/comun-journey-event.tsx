"use client";

import { useEffect } from "react";

const allowedEvents = new Set([
  "home_viewed",
  "pauta_opened",
  "participation_started",
  "participation_completed",
  "participation_abandoned",
  "miniapp_opened",
  "return_to_pauta",
  "community_followed",
]);

export function ComunJourneyEvent({
  event,
  surface,
}: {
  event: string;
  surface: string;
}) {
  useEffect(() => {
    if (!allowedEvents.has(event)) return;
    const detail = { event, surface };
    performance.mark(`comun:${event}:${surface}`);
    window.dispatchEvent(new CustomEvent("comun:journey", { detail }));
  }, [event, surface]);

  return null;
}
