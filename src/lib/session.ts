/**
 * 서버 전용 세션 모듈입니다. 외부 라이브러리 없이 HMAC으로 서명한
 * httpOnly 쿠키 하나로 로그인 상태를 유지합니다.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findUserById, PublicUser, toPublicUser } from "@/lib/users";

const COOKIE_NAME = "talkchamsae_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7일

/**
 * 서명 키. .env.local의 SESSION_SECRET을 쓰고, 없으면 프로세스마다
 * 임시 키를 만듭니다(개발 편의용 — 서버를 재시작하면 로그인이 풀립니다).
 */
const SECRET =
  process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");

interface SessionPayload {
  userId: string;
  /** 만료 시각 (epoch ms) */
  exp: number;
}

const toBase64Url = (input: string) =>
  Buffer.from(input, "utf8").toString("base64url");

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function verifySignature(data: string, signature: string): boolean {
  const expected = Buffer.from(sign(data), "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function encodeToken(payload: SessionPayload): string {
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decodeToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!verifySignature(body, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload?.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, encodeToken({ userId, exp: expiresAt }), {
    httpOnly: true,
    // localhost(http)에서도 로그인되도록 운영 환경에서만 Secure를 켭니다.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** 로그인한 사용자를 돌려줍니다. 로그인 상태가 아니면 null입니다. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const payload = decodeToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!payload) return null;

  const user = await findUserById(payload.userId);
  return user ? toPublicUser(user) : null;
}
