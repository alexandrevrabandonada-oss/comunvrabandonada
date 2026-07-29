import { useCallback, useEffect, useRef, useState } from "react";

type HCaptchaExecution = {
  response?: string;
  key?: string;
};

type HCaptchaApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      size: "invisible";
      hl: string;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  execute(
    widgetId: string,
    options: { async: true },
  ): Promise<HCaptchaExecution>;
  reset(widgetId: string): void;
};

type InvisibleHCaptchaController = {
  execute(): Promise<string>;
  reset(): void;
};

export type SidewalkCaptchaState =
  | "missing"
  | "loading"
  | "ready"
  | "executing"
  | "error";

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
    __comunSidewalkHCaptchaLoaded?: () => void;
  }
}

const HCAPTCHA_SCRIPT_SELECTOR =
  'script[data-comun-sidewalk-hcaptcha="true"]';
let hcaptchaApiPromise: Promise<HCaptchaApi> | null = null;

function loadHCaptchaApi() {
  if (typeof window === "undefined")
    return Promise.reject(
      new Error("A proteção antirobô só pode ser carregada no navegador."),
    );
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (hcaptchaApiPromise) return hcaptchaApiPromise;

  hcaptchaApiPromise = new Promise<HCaptchaApi>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (!window.hcaptcha) return;
      if (timeout) clearTimeout(timeout);
      delete window.__comunSidewalkHCaptchaLoaded;
      resolve(window.hcaptcha);
    };
    const fail = () => {
      if (timeout) clearTimeout(timeout);
      delete window.__comunSidewalkHCaptchaLoaded;
      reject(new Error("Não foi possível carregar a proteção antirobô."));
    };

    window.__comunSidewalkHCaptchaLoaded = finish;
    const existing = document.querySelector<HTMLScriptElement>(
      HCAPTCHA_SCRIPT_SELECTOR,
    );
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
    } else {
      const script = document.createElement("script");
      script.src =
        "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&hl=pt-BR&onload=__comunSidewalkHCaptchaLoaded";
      script.async = true;
      script.defer = true;
      script.dataset.comunSidewalkHcaptcha = "true";
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }
    timeout = setTimeout(fail, 15_000);
  }).catch((error) => {
    hcaptchaApiPromise = null;
    throw error;
  });

  return hcaptchaApiPromise;
}

async function createInvisibleHCaptcha(
  container: HTMLElement,
  sitekey: string,
  onExpired: () => void,
  onError: () => void,
): Promise<InvisibleHCaptchaController> {
  const normalizedSitekey = sitekey.trim();
  if (!normalizedSitekey)
    throw new Error("A chave pública da proteção antirobô não foi configurada.");

  const api = await loadHCaptchaApi();
  const widgetId = api.render(container, {
    sitekey: normalizedSitekey,
    size: "invisible",
    hl: "pt-BR",
    "expired-callback": onExpired,
    "error-callback": onError,
  });

  return {
    async execute() {
      const result = await api.execute(widgetId, { async: true });
      const token = result.response?.trim();
      if (!token)
        throw new Error("A confirmação antirobô não retornou um token válido.");
      return token;
    },
    reset() {
      api.reset(widgetId);
    },
  };
}

export function useSidewalkInvisibleCaptcha(sitekey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerPromiseRef = useRef<
    Promise<InvisibleHCaptchaController> | undefined
  >(undefined);
  const [state, setState] = useState<SidewalkCaptchaState>(
    sitekey.trim() ? "loading" : "missing",
  );

  const ensureController = useCallback(() => {
    if (!sitekey.trim()) {
      setState("missing");
      return Promise.reject(
        new Error("A proteção antirobô ainda não foi configurada."),
      );
    }
    if (!containerRef.current)
      return Promise.reject(
        new Error("A proteção antirobô ainda está sendo preparada."),
      );
    if (controllerPromiseRef.current) return controllerPromiseRef.current;

    setState("loading");
    controllerPromiseRef.current = createInvisibleHCaptcha(
      containerRef.current,
      sitekey,
      () => setState("ready"),
      () => setState("error"),
    )
      .then((controller) => {
        setState("ready");
        return controller;
      })
      .catch((error) => {
        controllerPromiseRef.current = undefined;
        setState("error");
        throw error;
      });
    return controllerPromiseRef.current;
  }, [sitekey]);

  useEffect(() => {
    void ensureController().catch(() => undefined);
  }, [ensureController]);

  const execute = useCallback(async () => {
    const controller = await ensureController();
    setState("executing");
    try {
      const token = await controller.execute();
      setState("ready");
      return token;
    } catch {
      controller.reset();
      setState("error");
      throw new Error(
        "Não foi possível confirmar que o envio é humano. Tente novamente.",
      );
    }
  }, [ensureController]);

  const reset = useCallback(() => {
    void controllerPromiseRef.current?.then((controller) => controller.reset());
    setState(sitekey.trim() ? "ready" : "missing");
  }, [sitekey]);

  return { containerRef, execute, reset, state };
}
