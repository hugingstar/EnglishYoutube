/**
 * 최근에 본 영상 이력. "내 영상"(별표)과 달리 사용자가 직접 조작하지 않고,
 * 영상을 열 때마다(재생 시작 시) 자동으로 쌓입니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LanguageTab, VideoMeta } from "@/lib/types";

const MAX_PER_USER = 50;

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "watch-history.json");

export interface WatchHistoryEntry {
  youtubeId: string;
  language: LanguageTab | "custom";
  sourceLang?: string;
  topic: string;
  reason: string;
  viewedAt: string;
}

type Store = Record<string, WatchHistoryEntry[]>;

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Store;
    }
  } catch {
    // 파일이 없거나 깨졌으면 빈 이력으로 시작합니다.
  }
  return {};
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

/** 최근 것이 앞에 오도록 정렬된 목록. */
export async function listWatchHistory(
  userId: string
): Promise<WatchHistoryEntry[]> {
  return (await readStore())[userId] ?? [];
}

/** 같은 영상을 다시 보면 맨 앞으로 옮기고 시각만 갱신합니다. */
export async function recordWatched(
  userId: string,
  video: VideoMeta
): Promise<WatchHistoryEntry[]> {
  const store = await readStore();
  const rest = (store[userId] ?? []).filter(
    (e) => e.youtubeId !== video.youtubeId
  );

  const entry: WatchHistoryEntry = {
    youtubeId: video.youtubeId,
    language: video.language,
    sourceLang: video.sourceLang,
    topic: video.topic,
    reason: video.reason,
    viewedAt: new Date().toISOString(),
  };

  const next = [entry, ...rest].slice(0, MAX_PER_USER);
  store[userId] = next;
  await writeStore(store);
  return next;
}

export function historyEntryToVideoMeta(entry: WatchHistoryEntry): VideoMeta {
  return {
    id: `history-${entry.youtubeId}`,
    youtubeId: entry.youtubeId,
    sourceLang: entry.sourceLang,
    language: entry.language,
    topic: entry.topic,
    reason: entry.reason,
  };
}
