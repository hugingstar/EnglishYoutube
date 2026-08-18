"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMyVideo,
  importMyVideos,
  removeMyVideo,
} from "@/app/actions/customVideos";
import { VideoMeta } from "@/lib/types";

/** 계정 저장으로 옮기기 전, 브라우저에만 담아 두던 목록의 키입니다. */
const LEGACY_KEY = "talkchamsae:custom-videos";

export function customVideoFor(youtubeId: string): VideoMeta {
  return {
    id: `custom-${youtubeId}`,
    youtubeId,
    language: "custom",
    topic: "직접 추가한 영상",
    reason: "내가 추가함",
  };
}

/** 예전 버전이 이 브라우저에 남긴 목록을 읽고, 읽었으면 지웁니다. */
function takeLegacyIds(): string[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    window.localStorage.removeItem(LEGACY_KEY);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (entry as VideoMeta)?.youtubeId)
      .filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/**
 * "내 영상" 목록을 계정에 저장해 두고 씁니다. 서버에서 받은 목록으로 시작하고,
 * 추가/삭제는 화면에 먼저 반영한 뒤 서버 결과로 맞춥니다.
 */
export function useCustomVideos(initialIds: string[]) {
  const [ids, setIds] = useState<string[]>(initialIds);

  // 예전에 브라우저에만 저장돼 있던 목록을 첫 방문 때 한 번 계정으로 옮깁니다.
  useEffect(() => {
    const legacy = takeLegacyIds();
    if (legacy.length === 0) return;
    importMyVideos(legacy).then(setIds, () => {});
  }, []);

  const add = useCallback((youtubeId: string) => {
    setIds((prev) =>
      prev.includes(youtubeId) ? prev : [youtubeId, ...prev]
    );
    addMyVideo(youtubeId).then(setIds, () => {});
  }, []);

  const remove = useCallback((youtubeId: string) => {
    setIds((prev) => prev.filter((id) => id !== youtubeId));
    removeMyVideo(youtubeId).then(setIds, () => {});
  }, []);

  const videos = useMemo(() => ids.map(customVideoFor), [ids]);

  return { videos, add, remove };
}
