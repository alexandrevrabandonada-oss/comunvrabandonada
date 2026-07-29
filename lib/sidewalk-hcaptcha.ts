type HCaptchaApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      size: "normal" | "compact";
      hl: string;
      theme: "light";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "close-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
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
let activeChallenge: Promise<string> | null = null;
let activeChallengeCleanup: (() => void) | null = null;

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

function createChallengeOverlay() {
  const overlay = document.createElement("div"),
    panel = document.createElement("section"),
    title = document.createElement("h2"),
    explanation = document.createElement("p"),
    host = document.createElement("div"),
    privacy = document.createElement("p"),
    cancel = document.createElement("button"),
    previousOverflow = document.body.style.overflow;

  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "comun-hcaptcha-title");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    display: "grid",
    placeItems: "center",
    padding: "16px",
    background: "rgba(11, 11, 10, 0.82)",
  });
  Object.assign(panel.style, {
    width: "min(100%, 380px)",
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    padding: "20px",
    border: "3px solid #0b0b0a",
    background: "#f4f0e6",
    color: "#0b0b0a",
    boxShadow: "6px 6px 0 #f6c900",
    textAlign: "center",
  });
  title.id = "comun-hcaptcha-title";
  title.textContent = "Confirme que você é uma pessoa";
  Object.assign(title.style, {
    margin: "0",
    fontSize: "22px",
    fontWeight: "900",
    textTransform: "uppercase",
  });
  explanation.textContent =
    "Conclua a verificação abaixo para liberar o envio da contribuição.";
  Object.assign(explanation.style, { margin: "12px 0 16px", lineHeight: "1.45" });
  Object.assign(host.style, {
    display: "grid",
    placeItems: "center",
    minHeight: "82px",
  });
  privacy.textContent =
    "A verificação não envia a foto nem cria o registro. O envio continua somente depois da confirmação.";
  Object.assign(privacy.style, {
    margin: "14px 0",
    fontSize: "13px",
    lineHeight: "1.4",
  });
  cancel.type = "button";
  cancel.textContent = "Cancelar e voltar";
  Object.assign(cancel.style, {
    width: "100%",
    minHeight: "48px",
    border: "2px solid #0b0b0a",
    background: "#ffffff",
    color: "#0b0b0a",
    fontWeight: "900",
    textTransform: "uppercase",
  });
  panel.append(title, explanation, host, privacy, cancel);
  overlay.append(panel);
  document.body.append(overlay);
  document.body.style.overflow = "hidden";
  cancel.focus();

  return {
    host,
    cancel,
    remove() {
      document.body.style.overflow = previousOverflow;
      overlay.remove();
    },
  };
}

export async function getSidewalkCaptchaToken() {
  if (activeChallenge) return activeChallenge;
  activeChallenge = (async () => {
    const sitekey = getSitekey();
    if (!sitekey)
      throw new Error("A chave pública da proteção antirobô não foi configurada.");
    const api = await loadHCaptchaApi(),
      overlay = createChallengeOverlay();
    return new Promise<string>((resolve, reject) => {
      let widgetId = "",
        settled = false;
      const timeout = setTimeout(
        () => finish(undefined, "A verificação expirou. Tente novamente."),
        5 * 60_000,
      );
      const cleanup = () => {
        clearTimeout(timeout);
        if (widgetId) {
          try {
            api.remove(widgetId);
          } catch {
            // O provedor pode já ter removido o widget ao fechar o desafio.
          }
        }
        overlay.remove();
        activeChallengeCleanup = null;
      };
      const finish = (token?: string, error?: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (token?.trim()) resolve(token.trim());
        else reject(new Error(error || "Verificação antirobô não concluída."));
      };
      activeChallengeCleanup = () =>
        finish(undefined, "Verificação cancelada. Nenhum dado foi enviado.");
      overlay.cancel.addEventListener("click", activeChallengeCleanup, {
        once: true,
      });
      try {
        widgetId = api.render(overlay.host, {
          sitekey,
          size: window.innerWidth < 390 ? "compact" : "normal",
          hl: "pt-BR",
          theme: "light",
          callback: (token) => finish(token),
          "expired-callback": () =>
            finish(undefined, "A verificação expirou. Tente novamente."),
          "error-callback": () =>
            finish(
              undefined,
              "Não foi possível carregar a verificação antirobô.",
            ),
          "close-callback": () =>
            finish(undefined, "Verificação fechada. Nenhum dado foi enviado."),
        });
      } catch {
        finish(undefined, "Não foi possível iniciar a verificação antirobô.");
      }
    });
  })().finally(() => {
    activeChallenge = null;
  });
  return activeChallenge;
}

export function resetSidewalkCaptcha() {
  activeChallengeCleanup?.();
  activeChallengeCleanup = null;
}
