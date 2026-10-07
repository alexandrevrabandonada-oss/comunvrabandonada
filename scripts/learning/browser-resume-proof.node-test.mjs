import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sessionCookies } from "./browser-resume-proof.mjs";

test("SSR cookie chunks preserve padding and remain restricted to the local app", () => {
  assert.deepEqual(
    sessionCookies(
      "sb-local-auth-token.0=base64-a==; sb-local-auth-token.1=b=",
      "http://localhost:3017",
    ),
    [
      {
        name: "sb-local-auth-token.0",
        value: "base64-a==",
        url: "http://localhost:3017",
      },
      {
        name: "sb-local-auth-token.1",
        value: "b=",
        url: "http://localhost:3017",
      },
    ],
  );
  assert.throws(() =>
    sessionCookies("other-cookie=x", "http://localhost:3017"),
  );
  assert.throws(() =>
    sessionCookies("sb-local-auth-token=x", "https://remote.example"),
  );
});
test("browser proof cannot substitute API results or persist sessions in artifacts", () => {
  const source = readFileSync(
    new URL("./browser-resume-proof.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\.route\(|routeFromHAR|storageState|\.tracing\./,
  );
  assert.match(source, /page\.waitForResponse/);
  assert.match(source, /page\.reload/);
});
