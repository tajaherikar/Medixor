import type { NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { AuthSession } from "@/lib/auth-helpers";

export const SESSION_COOKIE_NAME = "medixor-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SignedSessionPayload {
  session: AuthSession;
  expiresAt: number;
}

const textEncoder = new TextEncoder();

function getSessionSecret(): string {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "medixor-development-session-secret";
  }

  throw new Error("AUTH_SECRET is required in production");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.userId === "string" &&
    typeof session.email === "string" &&
    typeof session.tenantId === "string" &&
    (session.role === "admin" || session.role === "member") &&
    (
      session.permissions === undefined ||
      (
        Array.isArray(session.permissions) &&
        session.permissions.every((permission) => typeof permission === "string")
      )
    )
  );
}

export async function signSessionToken(session: AuthSession): Promise<string> {
  const payload: SignedSessionPayload = {
    session,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadPart = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payloadPart)
  );

  return `${payloadPart}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  try {
    const key = await getSigningKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(fromBase64Url(signaturePart)),
      textEncoder.encode(payloadPart)
    );
    if (!isValid) return null;

    const rawPayload = new TextDecoder().decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(rawPayload) as Partial<SignedSessionPayload>;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) {
      return null;
    }
    if (!isAuthSession(payload.session)) return null;

    return payload.session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  response: NextResponse,
  session: AuthSession
): Promise<void> {
  response.cookies.set(SESSION_COOKIE_NAME, await signSessionToken(session), getCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

export function getCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}
