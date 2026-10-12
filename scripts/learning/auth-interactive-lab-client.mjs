const $ = (id) => document.getElementById(id);
let config,
  challenge = null,
  issuedAt = 0,
  widgetId,
  session = null,
  busy = false;
let providerFailed = false;
let interactiveSeen = false;
const used = new Set();
const say = (message) => {
  $("status").textContent = message;
};
const fresh = () =>
  interactiveSeen &&
  typeof challenge === "string" &&
  challenge.length > 0 &&
  performance.now() >= issuedAt &&
  performance.now() - issuedAt < 240000;
function clearChallenge() {
  challenge = null;
  issuedAt = 0;
  interactiveSeen = false;
  refresh();
}
function ready() {
  return config?.status === "PREPARED_NOT_MANUAL_PASS" && !providerFailed;
}
function refresh() {
  for (const button of document.querySelectorAll("[data-flow]")) {
    const flow = button.dataset.flow;
    const requiresChallenge = ["signup", "recovery", "magiclink"].includes(
      flow,
    );
    const ownerReady =
      flow === "email_change"
        ? session?.user?.email === config?.identities.a
        : flow === "reauthentication"
          ? session?.user?.email === config?.identities.b
          : true;
    button.disabled =
      !ready() ||
      busy ||
      used.has(flow) ||
      !ownerReady ||
      (requiresChallenge && !fresh());
  }
  $("reset").disabled = !ready() || busy || widgetId === undefined;
  $("verify").disabled = !ready() || busy;
  $("logout").disabled = !ready() || busy || !session;
}
async function auth(route, method, body, authenticated = false) {
  if (
    !ready() ||
    config.authUrl !== "http://127.0.0.1:9999" ||
    !/^\/(signup|recover|otp|user|reauthenticate|verify|logout)$/.test(route)
  )
    throw new Error();
  const response = await fetch(config.authUrl + route, {
    method,
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  // Never show error bodies: Auth may echo submitted values.
  if (!response.ok) throw new Error();
  return response.status === 204 ? {} : response.json();
}
for (const button of document.querySelectorAll("[data-flow]"))
  button.addEventListener("click", async () => {
    const flow = button.dataset.flow;
    if (button.disabled || !ready() || busy || used.has(flow)) return;
    const captchaRequired = ["signup", "recovery", "magiclink"].includes(flow);
    if (captchaRequired && !fresh()) {
      clearChallenge();
      return;
    }
    if (flow === "signup" && $("password").value.length < 12) {
      say("Informe uma senha sintética com pelo menos 12 caracteres.");
      return;
    }
    busy = true;
    refresh();
    try {
      // Persistent one-use reservation contains only the operation name.
      const marker = await fetch("/attempt", {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
        signal: AbortSignal.timeout(5000),
      });
      used.add(flow);
      if (!marker.ok || (captchaRequired && !fresh())) throw new Error();
      let body = { email: config.identities.a };
      let route = {
        signup: "/signup",
        recovery: "/recover",
        magiclink: "/otp",
        email_change: "/user",
        reauthentication: "/reauthenticate",
      }[flow];
      if (flow === "signup") body.password = $("password").value;
      $("password").value = "";
      if (flow === "magiclink") body.create_user = false;
      if (flow === "email_change") body = { email: config.identities.b };
      if (flow === "reauthentication") body = null;
      if (captchaRequired)
        body.gotrue_meta_security = { captcha_token: challenge };
      clearChallenge();
      const response = await auth(
        route,
        flow === "email_change"
          ? "PUT"
          : flow === "reauthentication"
            ? "GET"
            : "POST",
        body,
        !captchaRequired,
      );
      // Do not serialize response/session or infer SMTP delivery from HTTP success.
      void response;
      say(
        captchaRequired
          ? "Auth aceitou a operação após o desafio. Conferência privada de interação humana e MIME ainda necessária; nenhum PASS automático."
          : "Auth aceitou a operação. Conferir o SMTP local e a identidade; nenhum PASS automático.",
      );
    } catch {
      used.add(flow);
      clearChallenge();
      say(
        "Operação recusada ou resultado incerto. Não repetir: reconciliar por leitura no laboratório.",
      );
    } finally {
      busy = false;
      if (widgetId !== undefined) window.turnstile.reset(widgetId);
      refresh();
    }
  });
$("verify").addEventListener("click", async () => {
  if ($("verify").disabled) return;
  const type = $("type").value,
    token = $("code").value;
  $("code").value = "";
  if (!/^\d{6,10}$/.test(token)) {
    say("Use somente o código recebido e conferido no SMTP local.");
    return;
  }
  busy = true;
  refresh();
  try {
    const email =
      type === "email_change" ? config.identities.b : config.identities.a;
    const result = await auth("/verify", "POST", { email, token, type });
    if (result.access_token && result.user?.email === email) {
      session = result;
      say(
        "Sessão local corresponde à identidade esperada. Não é prova de isolamento cruzado.",
      );
    } else {
      session = null;
      say(
        "Confirmação intermediária ou sessão divergente. Conferir política de mudança de e-mail no laboratório.",
      );
    }
  } catch {
    say("Confirmação recusada ou incerta. Reconciliar sem repetir o envio.");
  } finally {
    busy = false;
    refresh();
  }
});
$("logout").addEventListener("click", async () => {
  if ($("logout").disabled) return;
  busy = true;
  refresh();
  try {
    await auth("/logout", "POST", null, true);
    session = null;
    say(
      "Logout aceito; contagem de sessões deve ser conferida pelo coordenador privado.",
    );
  } catch {
    say("Logout incerto. Conferir sessões locais antes da limpeza.");
  } finally {
    busy = false;
    refresh();
  }
});
$("reset").addEventListener("click", () => {
  clearChallenge();
  window.turnstile.reset(widgetId);
});
window.addEventListener("pagehide", () => {
  challenge = null;
  session = null;
  $("password").value = "";
  $("code").value = "";
});
setInterval(() => {
  if (challenge && !fresh()) clearChallenge();
}, 1000);
try {
  config = await (
    await fetch("/config", { credentials: "omit", cache: "no-store" })
  ).json();
  for (const flow of config.attempted ?? []) used.add(flow);
  for (const blocker of config.blockers ?? []) {
    const li = document.createElement("li");
    li.textContent = blocker;
    $("blockers").append(li);
  }
  if (!ready())
    say(
      "BLOCKED — faltam chaves reais exclusivas do laboratório e/ou recibo da stack/hostname isolados. Nenhuma requisição Auth habilitada.",
    );
  else {
    say(
      "Preparado para desafio humano real. Nenhuma aprovação positiva registrada.",
    );
    window.comunWidgetReady = () => {
      widgetId = window.turnstile.render("#widget", {
        sitekey: config.sitekey,
        "response-field": false,
        retry: "never",
        "refresh-expired": "never",
        "refresh-timeout": "never",
        callback: (value) => {
          if (!interactiveSeen) {
            clearChallenge();
            say(
              "Desafio interativo humano não observado. Não enviar ao Auth nem registrar MANUAL_PASS.",
            );
            return;
          }
          challenge = value;
          issuedAt = performance.now();
          refresh();
        },
        "before-interactive-callback": () => {
          interactiveSeen = true;
        },
        "expired-callback": clearChallenge,
        "timeout-callback": clearChallenge,
        "error-callback": () => {
          providerFailed = true;
          clearChallenge();
          say(
            "BLOCKED — provedor recusou desafio/hostname ou houve erro. Nenhuma operação Auth será enviada.",
          );
        },
      });
      refresh();
    };
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=comunWidgetReady&render=explicit";
    script.onerror = () => {
      providerFailed = true;
      clearChallenge();
      say("BLOCKED — widget indisponível.");
    };
    document.head.append(script);
  }
} catch {
  config = null;
  say("BLOCKED — configuração local indisponível.");
}
refresh();
