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

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
    __comunSidewalkHCaptchaLoaded?: () => void;
  }
}

const HCAPTCHA_SCRIPT_SELECTOR =
  'script[data-comun-sidewalk-hcaptcha="true"]';
// Sitekeys são identificadores públicos. Production pode sobrescrever este valor
// com NEXT_PUBLIC_HCAPTCHA_SITEKEY sem expor a chave secreta do provedor.
const DEFAULT_SIDEWALK_HCAPTCHA_SITEKEY =
  "740aa1e0-2e96-49ce-9ef6-b65a7e965640";
let hcaptchaApiPromise: Promise<HCaptchaApi> | null = null;
let controllerPromise: Promise<InvisibleHCaptchaController> | null = null;

function getSitekey() {
  return (
    process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY?.trim() ||
    DEFAULT_SIDEWALK_HCAPTCHA_SITEKEY
  );
}

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

async function getController() {
  if (controllerPromise) return controllerPromise;
  controllerPromise = (async () => {
    const sitekey = getSitekey();
    if (!sitekey)
      throw new Error("A chave pública da proteção antirobô não foi configurada.");
    const api = await loadHCaptchaApi();
    const container = document.createElement("div");
    container.dataset.comunSidewalkHcaptchaContainer = "true";
    document.body.appendChild(container);
    const widgetId = api.render(container, {
      sitekey,
      size: "invisible",
      hl: "pt-BR",
    });
    return {
      async execute() {
        const result = await api.execute(widgetId, { async: true });
        const token = result.response?.trim();
        if (!token)
          throw new Error(
            "A confirmação antirobô não retornou um token válido.",
          );
        return token;
      },
      reset() {
        api.reset(widgetId);
      },
    };
  })().catch((error) => {
    controllerPromise = null;
    throw error;
  });
  return controllerPromise;
}

export async function getSidewalkCaptchaToken() {
  const controller = await getController();
  try {
    return await controller.execute();
  } catch {
    controller.reset();
    throw new Error(
      "Não foi possível confirmar que o envio é humano. Tente novamente.",
    );
  }
}

export function resetSidewalkCaptcha() {
  void controllerPromise?.then((controller) => controller.reset());
}
