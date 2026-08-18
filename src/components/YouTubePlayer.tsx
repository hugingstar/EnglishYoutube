"use client";

import { useEffect, useRef } from "react";

// Minimal shape of the YouTube IFrame Player API we rely on.
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YTPlayerEvent {
  target: YTPlayer;
}
interface YTOnStateChangeEvent extends YTPlayerEvent {
  data: number;
}
interface YTPlayerOptions {
  videoId: string;
  playerVars?: { rel?: 0 | 1 };
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTOnStateChangeEvent) => void;
  };
}
interface YTPlayerConstructor {
  new (element: HTMLElement, options: YTPlayerOptions): YTPlayer;
}

const YT_PLAYER_STATE_ENDED = 0;
const YT_PLAYER_STATE_PLAYING = 1;

declare global {
  interface Window {
    YT: {
      Player: YTPlayerConstructor;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

interface YouTubePlayerProps {
  youtubeId: string;
  onTimeUpdate: (seconds: number) => void;
  seekToRef: React.MutableRefObject<((seconds: number) => void) | null>;
  /** 영상 준비가 끝나면 재생 시간(초)을 얻어올 수 있는 함수를 여기 넣어둡니다. */
  getDurationRef?: React.MutableRefObject<(() => number) | null>;
}

// The YouTube IFrame API replaces our target <div> with its own <iframe> node
// outside of React's control. Rendering that target div via JSX makes React
// try to remove a node the API already swapped out (removeChild crash on
// unmount). Instead we own an empty wrapper in JSX and manage the mount
// point ourselves, entirely outside React's diffing.
export default function YouTubePlayer({
  youtubeId,
  onTimeUpdate,
  seekToRef,
  getDurationRef,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const mountPoint = document.createElement("div");
    container.appendChild(mountPoint);

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      playerRef.current = new window.YT.Player(mountPoint, {
        videoId: youtubeId,
        // rel:0이 없으면 영상이 끝났을 때 유튜브가 알아서 추천 영상으로 자동
        // 재생을 시도합니다. 끝난 자리에 그대로 있어야 하니 막아둡니다.
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            seekToRef.current = (seconds: number) => {
              playerRef.current?.seekTo(seconds, true);
            };
            if (getDurationRef) {
              getDurationRef.current = () =>
                playerRef.current?.getDuration() ?? 0;
            }
          },
          onStateChange: (e) => {
            if (e.data === YT_PLAYER_STATE_PLAYING) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  onTimeUpdate(playerRef.current.getCurrentTime());
                }
              }, 500);
            } else {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              // 다른 영상으로 자동 전환되려는 걸 끝난 지점에 붙잡아 둡니다.
              if (e.data === YT_PLAYER_STATE_ENDED) {
                const duration = playerRef.current?.getDuration() ?? 0;
                playerRef.current?.seekTo(duration, true);
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      seekToRef.current = null;
      if (getDurationRef) getDurationRef.current = null;
      container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
