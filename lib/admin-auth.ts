import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "comun_admin_session";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function expectedToken() {
  const password = process.env.COMUN_ADMIN_PASSWORD;
  if (!password) return null;
  return digest(password);
}

export function isAdminAuthenticated() {
  const expected = expectedToken();
  const actual = cookies().get(COOKIE_NAME)?.value;
  if (!expected || !actual) return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function setAdminSession() {
  const token = expectedToken();
  if (!token) return false;
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/comun/admin",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export function clearAdminSession() {
  cookies().delete(COOKIE_NAME);
}

export function checkAdminPassword(password: string) {
  const expected = process.env.COMUN_ADMIN_PASSWORD;
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(password);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
