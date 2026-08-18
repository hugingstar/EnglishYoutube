import { useEffect, useState } from "react";
import { captionLangFor, VideoDetail, VideoMeta } from "@/lib/types";

interface UseVideoDetailResult {
  detail: VideoDetail | null;
  loading: boolean;
  error: string | null;
}

interface FetchState {
  key: string;
  detail: VideoDetail | null;
  error: string | null;
}

const EMPTY_STATE: FetchState = { key: "", detail: null, error: null };

export function useVideoDetail(meta: VideoMeta): UseVideoDetailResult {
  const [state, setState] = useState<FetchState>(EMPTY_STATE);
  const lang = captionLangFor(meta);
  const requestKey = `${meta.youtubeId}:${lang ?? "auto"}`;

  useEffect(() => {
    let cancelled = false;

    const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";

    fetch(`/api/videos/${meta.youtubeId}${query}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "대본을 불러오지 못했어요.");
        }
        return res.json() as Promise<VideoDetail>;
      })
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, detail: data, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            key: requestKey,
            detail: null,
            error: err instanceof Error ? err.message : "알 수 없는 오류",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, meta.youtubeId, lang]);

  const isCurrent = state.key === requestKey;
  return {
    detail: isCurrent ? state.detail : null,
    loading: !isCurrent,
    error: isCurrent ? state.error : null,
  };
}
