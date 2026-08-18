import { useEffect, useState } from "react";
import { VideoMeta } from "@/lib/types";

interface TitleInfo {
  title: string;
  channel: string;
}

const cache = new Map<string, TitleInfo>();

export function useVideoTitles(videos: VideoMeta[]) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const missing = videos.filter((v) => !cache.has(v.youtubeId));
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (v) => {
        try {
          const res = await fetch(`/api/videos/${v.youtubeId}/meta`);
          if (!res.ok) return;
          const data = await res.json();
          cache.set(v.youtubeId, { title: data.title, channel: data.author });
        } catch {
          // ignore; card will fall back to topic label
        }
      })
    ).then(() => {
      if (!cancelled) forceUpdate((n) => n + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [videos]);

  return (youtubeId: string): TitleInfo | undefined => cache.get(youtubeId);
}
