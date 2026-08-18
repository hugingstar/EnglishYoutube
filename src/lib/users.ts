/**
 * 서버 전용 모듈입니다. 비밀번호 해시가 들어 있으니 클라이언트 컴포넌트에서
 * import 하지 마세요 — 서버 컴포넌트와 서버 액션에서만 씁니다.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface User {
  id: string;
  /** 로그인 아이디. 가입 후에는 바꾸지 않습니다. */
  username: string;
  nickname: string;
  email: string;
  /** 학습 목표 한 줄 메모 (설정 페이지에서 편집) */
  goal: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

/** 비밀번호를 뺀, 클라이언트로 내려보내도 되는 형태입니다. */
export type PublicUser = Omit<User, "passwordHash" | "salt">;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    goal: user.goal,
    createdAt: user.createdAt,
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return derived.toString("hex");
}

/** 길이가 달라도 예외 없이 false를 돌려주는 상수 시간 비교입니다. */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function buildUser(params: {
  username: string;
  password: string;
  nickname: string;
  email: string;
  goal?: string;
}): Promise<User> {
  const salt = randomBytes(16).toString("hex");
  return {
    id: randomBytes(8).toString("hex"),
    username: params.username,
    nickname: params.nickname,
    email: params.email,
    goal: params.goal ?? "",
    passwordHash: await hashPassword(params.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 저장소가 비어 있을 때만 만들어 두는 데모 계정입니다.
 * 화면 어디에도 표시하지 않으니, 실제로 쓸 계정은 회원가입으로 만드세요.
 */
async function seedUsers(): Promise<User[]> {
  return [
    await buildUser({
      username: "test",
      password: "1111",
      nickname: "테스트 사용자",
      email: "test@example.com",
      goal: "매일 영상 한 편씩 보기",
    }),
  ];
}

async function readUsers(): Promise<User[]> {
  try {
    const raw = await readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as User[];
  } catch {
    // 파일이 없거나 깨졌으면 아래에서 새로 만듭니다.
  }
  const seeded = await seedUsers();
  await writeUsers(seeded);
  return seeded;
}

async function writeUsers(users: User[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function findUserByUsername(
  username: string
): Promise<User | null> {
  const users = await readUsers();
  const key = username.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === key) ?? null;
}

/** 같은 아이디를 이미 쓰고 있는지 확인합니다. 대소문자는 구분하지 않습니다. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  return (await findUserByUsername(username)) !== null;
}

/**
 * 새 계정을 만들어 저장합니다. 중복 검사는 호출하는 쪽(회원가입 액션)에서
 * 먼저 하고, 여기서도 마지막으로 한 번 더 막습니다.
 */
export async function createUser(params: {
  username: string;
  password: string;
  nickname: string;
  email: string;
  goal?: string;
}): Promise<User | null> {
  const users = await readUsers();
  const username = params.username.trim();
  const email = params.email.trim();

  const duplicated = users.some(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() ||
      u.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicated) return null;

  const user = await buildUser({ ...params, username, email });
  users.push(user);
  await writeUsers(users);
  return user;
}

/** 아이디/비밀번호가 맞으면 사용자를, 아니면 null을 돌려줍니다. */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<User | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const attempt = await hashPassword(password, user.salt);
  return safeEqualHex(attempt, user.passwordHash) ? user : null;
}

export async function isPasswordCorrect(
  user: User,
  password: string
): Promise<boolean> {
  const attempt = await hashPassword(password, user.salt);
  return safeEqualHex(attempt, user.passwordHash);
}

/** 이메일이 다른 사용자에게 이미 쓰이고 있는지 확인합니다. */
export async function isEmailTaken(
  email: string,
  exceptUserId: string
): Promise<boolean> {
  const users = await readUsers();
  const key = email.trim().toLowerCase();
  return users.some(
    (u) => u.id !== exceptUserId && u.email.toLowerCase() === key
  );
}

export async function updateProfile(
  userId: string,
  changes: { nickname: string; email: string; goal: string }
): Promise<User | null> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    nickname: changes.nickname.trim(),
    email: changes.email.trim(),
    goal: changes.goal.trim(),
  };
  await writeUsers(users);
  return users[index];
}

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  const salt = randomBytes(16).toString("hex");
  users[index] = {
    ...users[index],
    salt,
    passwordHash: await hashPassword(newPassword, salt),
  };
  await writeUsers(users);
  return true;
}
