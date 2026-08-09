"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  COMUN_INSTALL_DISMISS_KEY,
  COMUN_LAST_SAFE_ROUTE_KEY,
  isSafeComunRoute,
} from "@/lib/comun-pwa";
import {
  COMUN_APP_V2_EXPERIENCE,
  COMUN_LEGACY_EXPERIENCE,
  withComunExperience,
} from "@/lib/comun-experience";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Connection = "online" | "offline" | "reconnecting" | "restored";

export function ComunPwaRuntime({
  inlineConnectionStatus = false,
}: {
  inlineConnectionStatus?: boolean;
} = {}) {
  const path = usePathname();
  const experience = inlineConnectionStatus
    ? COMUN_APP_V2_EXPERIENCE
    : COMUN_LEGACY_EXPERIENCE;
  const installSurfaceBlocked =
    path.startsWith("/comun/calcadas") ||
    path.startsWith("/comun/mapa/contribuir");
  const installSurfaceAllowed =
    path.startsWith("/comun/minha-participacao") ||
    path.startsWith("/comun/conta") ||
    path.includes("/confirmacao");
  const [connection, setConnection] = useState<Connection>("online");
  const hadConfirmedOffline = useRef(false);
  const restoredTimer = useRef<number | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (navigator.onLine) setConnection("online");
      else {
        hadConfirmedOffline.current = true;
        setConnection("offline");
      }
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    });
    if (isSafeComunRoute(path)) {
      const safeRoute = withComunExperience(path, experience);
      sessionStorage.setItem(COMUN_LAST_SAFE_ROUTE_KEY, safeRoute);
    }
  }, [experience, path]);

  useEffect(() => {
    const confirmRestoredConnection = async () => {
      if (!hadConfirmedOffline.current) return;
      setConnection("reconnecting");
      try {
        const response = await fetch("/manifest.webmanifest", {
          cache: "no-store",
          method: "HEAD",
        });
        if (!navigator.onLine || !response.ok) throw new Error("offline");
        hadConfirmedOffline.current = false;
        setConnection("restored");
        if (restoredTimer.current) window.clearTimeout(restoredTimer.current);
        restoredTimer.current = window.setTimeout(
          () => setConnection("online"),
          2400,
        );
      } catch {
        hadConfirmedOffline.current = true;
        setConnection("offline");
      }
    };
    const online = () => void confirmRestoredConnection();
    const offline = () => {
      hadConfirmedOffline.current = true;
      setConnection("offline");
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
      const dismissedAt = Number(
        localStorage.getItem(COMUN_INSTALL_DISMISS_KEY) || 0,
      );
      const valueSeen = Number(
        sessionStorage.getItem("comun:surfaces-seen") || 0,
      );
      if (Date.now() - dismissedAt > 30 * 86400000 && valueSeen >= 1)
        setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/comun/" })
        .then((registration) => {
          if (registration.waiting) setUpdateWorker(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setUpdateWorker(worker);
            });
          });
        })
        .catch(() => undefined);
    }
    sessionStorage.setItem(
      "comun:surfaces-seen",
      String(Number(sessionStorage.getItem("comun:surfaces-seen") || 0) + 1),
    );
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      if (restoredTimer.current) window.clearTimeout(restoredTimer.current);
    };
  }, []);

  const dismissInstall = () => {
    localStorage.setItem(COMUN_INSTALL_DISMISS_KEY, String(Date.now()));
    setShowInstall(false);
  };
  const install = async () => {
    if (!installEvent) {
      setIosHelp(true);
      return;
    }
    await installEvent.prompt();
    if ((await installEvent.userChoice).outcome === "accepted")
      setShowInstall(false);
    else dismissInstall();
  };
  const update = () => {
    updateWorker?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  return (
    <>
      <div
        data-testid="connection-status"
        data-comun-connection-placement={
          inlineConnectionStatus ? "app-shell" : "legacy-shell"
        }
        role="status"
        aria-live="polite"
        className={`${connection === "online" ? "sr-only" : "comun-connection-toast border-2 border-comun-black bg-comun-yellow px-3 py-2 text-center text-xs font-black uppercase text-comun-black shadow-[3px_3px_0_#0b0b0a]"}`}
      >
        {connection === "online"
          ? null
          : connection === "offline"
            ? "Offline — sem conexão. Conteúdos disponíveis continuam acessíveis; envios precisam de conexão."
            : connection === "reconnecting"
              ? "Confirmando conexão…"
              : "Conexão restabelecida."}
        {connection === "offline" ? (
          <Link
            href={withComunExperience("/comun/offline", experience)}
            className="ml-2 underline"
          >
            Ajuda
          </Link>
        ) : null}
      </div>
      {standalone ? (
        <span className="sr-only" data-testid="standalone-active">
          Aplicativo aberto em modo instalado
        </span>
      ) : null}
      {showInstall &&
      installSurfaceAllowed &&
      !installSurfaceBlocked &&
      !updateWorker ? (
        <aside
          aria-label="Instalar COMUN"
          className="relative z-20 border-b-2 border-comun-black bg-comun-paper px-4 py-3 text-comun-black"
        >
          <div className="mx-auto max-w-7xl">
            <p className="font-black">
              Instale o COMUN para acessar suas pautas e continuar de onde
              parou.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={install}
                className="min-h-11 bg-comun-black px-4 font-black uppercase text-comun-paper"
              >
                Instalar
              </button>
              <button
                onClick={dismissInstall}
                className="min-h-11 font-black underline"
              >
                Agora não
              </button>
              <button
                onClick={() => setIosHelp((value) => !value)}
                className="min-h-11 font-black underline"
              >
                Como funciona
              </button>
            </div>
            {iosHelp ? (
              <p className="mt-3 text-sm">
                No iPhone ou iPad, abra Compartilhar e escolha “Adicionar à Tela
                de Início”.
              </p>
            ) : null}
          </div>
        </aside>
      ) : null}
      {updateWorker ? (
        <aside
          role="status"
          className="relative z-20 border-b-2 border-comun-black bg-comun-yellow px-4 py-3 text-comun-black"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
            <strong>Atualização disponível.</strong>
            <button
              onClick={update}
              className="min-h-11 bg-comun-black px-3 font-black uppercase text-white"
            >
              Atualizar agora
            </button>
            <button
              onClick={() => setUpdateWorker(null)}
              className="min-h-11 font-black underline"
            >
              Depois
            </button>
          </div>
        </aside>
      ) : null}
      <aside aria-label="Ajuda de conexão">
        <Link
          href="/comun/offline"
          className="sr-only focus:not-sr-only focus:fixed focus:right-3 focus:top-20 focus:z-50 focus:bg-comun-yellow focus:p-3 focus:text-comun-black"
        >
          Ver ajuda de conexão
        </Link>
      </aside>
    </>
  );
}

export function ComunShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = {
      title,
      text: `Veja no COMUN: ${title}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(data.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button
      type="button"
      onClick={share}
      className="min-h-11 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow"
    >
      Compartilhar
      <span className="sr-only" aria-live="polite">
        {copied ? " Link copiado" : ""}
      </span>
    </button>
  );
}

export function ComunLogoutCleanup() {
  return (
    <button
      type="submit"
      onClick={() => {
        sessionStorage.removeItem(COMUN_LAST_SAFE_ROUTE_KEY);
        navigator.serviceWorker?.controller?.postMessage({
          type: "CLEAR_CONTENT_CACHES",
        });
      }}
      className="mt-5 block min-h-11 border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow"
    >
      Sair
    </button>
  );
}
