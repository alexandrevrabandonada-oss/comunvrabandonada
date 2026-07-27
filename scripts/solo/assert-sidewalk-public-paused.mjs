const pausedMessage =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";

const baseUrl =
  process.env.COMUN_PUBLIC_BASE_URL ?? "https://comunvrabandonada.vercel.app";

export function assertPausedResponse({ status, body }) {
  if (status < 200 || status >= 300) {
    throw new Error("COMUN_SIDEWALK_PUBLIC_PAUSE_HTTP_INVALID");
  }
  if (!String(body).includes(pausedMessage)) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_FLAG_NOT_DISABLED");
  }
}

async function main() {
  const url = new URL("/comun/mapa/contribuir?origem=calcadas", baseUrl);
  if (url.protocol !== "https:") {
    throw new Error("COMUN_SIDEWALK_PUBLIC_PAUSE_URL_INVALID");
  }
  const response = await fetch(url, { redirect: "error" });
  assertPausedResponse({
    status: response.status,
    body: await response.text(),
  });
  console.log("COMUN_SIDEWALK_OPERATIONAL_FLAG_DISABLED_CONFIRMED");
}

if (process.argv[1]?.endsWith("assert-sidewalk-public-paused.mjs")) {
  await main();
}
