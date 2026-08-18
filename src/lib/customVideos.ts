/**
 * 서버 전용 모듈입니다. "내 영상" 목록을 계정별로 파일에 저장합니다.
 * 브라우저 localStorage가 아니라 계정에 붙어 있으므로, 로그아웃했다가
 * 다시 로그인해도(다른 기기에서 로그인해도) 목록이 그대로 남습니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** 한 계정이 담아 둘 수 있는 최대 개수. 오래된 것부터 밀려납니다. */
const MAX_PER_USER = 50;

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "custom-videos.json");

/** userId → 최근에 추가한 순서의 youtubeId 목록 */
type Store = Record<string, string[]>;

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Store;
    }
  } catch {
    // 파일이 없거나 깨졌으면 빈 저장소로 시작합니다.
  }
  return {};
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listMyVideoIds(userId: string): Promise<string[]> {
  return (await readStore())[userId] ?? [];
}

/** 이미 있는 영상이면 순서를 유지한 채 그대로 둡니다. */
export async function addMyVideoId(
  userId: string,
  youtubeId: string
): Promise<string[]> {
  const store = await readStore();
  const current = store[userId] ?? [];
  if (current.includes(youtubeId)) return current;

  const next = [youtubeId, ...current].slice(0, MAX_PER_USER);
  store[userId] = next;
  await writeStore(store);
  return next;
}

export async function removeMyVideoId(
  userId: string,
  youtubeId: string
): Promise<string[]> {
  const store = await readStore();
  const next = (store[userId] ?? []).filter((id) => id !== youtubeId);
  store[userId] = next;
  await writeStore(store);
  return next;
}

/** 예전에 브라우저에만 저장돼 있던 목록을 계정으로 한 번에 옮길 때 씁니다. */
export async function mergeMyVideoIds(
  userId: string,
  youtubeIds: string[]
): Promise<string[]> {
  const store = await readStore();
  const current = store[userId] ?? [];
  const merged = [...current];
  for (const id of youtubeIds) {
    if (!merged.includes(id)) merged.push(id);
  }

  const next = merged.slice(0, MAX_PER_USER);
  store[userId] = next;
  await writeStore(store);
  return next;
}
