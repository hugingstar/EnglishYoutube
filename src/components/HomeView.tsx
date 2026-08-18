"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import YouTubePlayer from "@/components/YouTubePlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import RecommendationList from "@/components/RecommendationList";
import SparrowLogo from "@/components/SparrowLogo";
import StarIcon from "@/components/StarIcon";
import UrlInput from "@/components/UrlInput";
import UserMenu from "@/components/UserMenu";
import { refreshFeaturedVideo } from "@/app/actions/rotation";
import { recordWatchedVideo } from "@/app/actions/watchHistory";
import type { PublicUser } from "@/lib/users";
import { videos } from "@/data/videos";
import {
  LanguageTab,
  TabKey,
  TranscriptLine,
  TRANSLATION_SOURCE_LABELS,
  VideoMeta,
} from "@/lib/types";

/** 주어진 시각 바로 이전 대본 줄의 시각을 찾습니다. 없으면 null. */
function findPrevMentionTime(transcript: TranscriptLine[], time: number) {
  let target: number | null = null;
  for (const line of transcript) {
    if (line.time < time - 0.25) target = line.time;
    else break;
  }
  return target;
}

/** 주어진 시각 바로 다음 대본 줄의 시각을 찾습니다. 없으면 null. */
function findNextMentionTime(transcript: TranscriptLine[], time: number) {
  return transcript.find((line) => line.time > time + 0.25)?.time ?? null;
}
import { useVideoDetail } from "@/lib/useVideoDetail";
import { useVideoTitles } from "@/lib/useVideoTitles";
import { customVideoFor, useCustomVideos } from "@/lib/useCustomVideos";

interface HomeViewProps {
  /** 서버에서 읽은 로그인 사용자. 이 화면은 로그인해야만 열립니다. */
  user: PublicUser;
  /** 계정에 저장돼 있던 "내 영상" 목록 */
  initialCustomVideoIds: string[];
  /** 섹터별 "이번 시간의 추천 영상". 매시간 서버에서 새로 뽑혀 접속할 때마다 반영됩니다. */
  featured: Record<LanguageTab, VideoMeta>;
  /** 새로고침으로 지금까지 찾아온 영상들. 추천 목록 맨 위에 얹힙니다. */
  discovered: Record<LanguageTab, VideoMeta[]>;
  /** 섹터별 큐레이션 목록. 매 접속마다 서버에서 섞어서 내려줍니다. */
  curated: Record<LanguageTab, VideoMeta[]>;
  /** 계정에 저장돼 있던 시청 이력 (최근 본 순) */
  initialHistory: VideoMeta[];
}

export default function HomeView({
  user,
  initialCustomVideoIds,
  featured,
  discovered,
  curated,
  initialHistory,
}: HomeViewProps) {
  const [tab, setTab] = useState<TabKey>("en-GB");
  const [featuredState, setFeaturedState] = useState(featured);
  const [discoveredState, setDiscoveredState] = useState(discovered);
  const [history, setHistory] = useState<VideoMeta[]>(initialHistory);
  const [selected, setSelected] = useState<VideoMeta>(featuredState["en-GB"]);
  const [currentTime, setCurrentTime] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const seekToRef = useRef<((seconds: number) => void) | null>(null);
  const getDurationRef = useRef<(() => number) | null>(null);

  const custom = useCustomVideos(initialCustomVideoIds);
  const { detail, loading, error } = useVideoDetail(selected);
  const starredIds = useMemo(
    () => new Set(custom.videos.map((v) => v.youtubeId)),
    [custom.videos]
  );

  const listForTab =
    tab === "custom"
      ? custom.videos
      : tab === "history"
      ? history
      : [...(discoveredState[tab] ?? []), ...(curated[tab] ?? [])];

  const related =
    selected.language === "custom"
      ? []
      : videos
          .filter(
            (v) => v.language === selected.language && v.id !== selected.id
          )
          .slice(0, 3);
  const getRelatedTitle = useVideoTitles(related);

  /**
   * 영상을 재생 목록에 올릴 때 항상 이걸 통과합니다. 시청 이력에 자동으로
   * 쌓는 지점을 한 곳으로 모으기 위해서입니다(effect에서 하면 렌더가 한 번
   * 더 겹쳐서 여기서 직접 처리).
   */
  const pickVideo = (video: VideoMeta) => {
    setSelected(video);
    setCurrentTime(0);
    setHistory((prev) => [
      video,
      ...prev.filter((v) => v.youtubeId !== video.youtubeId),
    ].slice(0, 50));
    recordWatchedVideo(video).catch(() => {});
  };

  const handleTabChange = (newTab: TabKey) => {
    setTab(newTab);
    const first =
      newTab === "custom"
        ? custom.videos[0]
        : newTab === "history"
        ? history[0]
        : featuredState[newTab] ?? curated[newTab]?.[0];
    if (first) pickVideo(first);
  };

  /** 별표를 누르면 "내 영상"에 추가/제거합니다. "내 영상" 탭 자체에서는 안 씀(거기는 x로 뺌). */
  const handleToggleStar = (video: VideoMeta) => {
    if (starredIds.has(video.youtubeId)) {
      custom.remove(video.youtubeId);
    } else {
      custom.add(video.youtubeId);
    }
  };

  /** 언어 탭에서만 쓸 수 있음. 시간이 안 바뀌었어도 지금 바로 다른 추천 영상으로 바꿉니다. */
  const handleRefreshFeatured = () => {
    if (tab === "custom" || tab === "history") return;
    const sector = tab;
    startRefresh(async () => {
      const next = await refreshFeaturedVideo(sector);
      if (!next) return;
      setFeaturedState((prev) => ({ ...prev, [sector]: next }));

      // YouTube에서 새로 찾아온 영상이면(id가 "disc-"로 시작) 추천 목록 맨 위에도 얹습니다.
      // 큐레이션 목록 안에서 고른 폴백이면 이미 목록에 있으니 따로 안 넣습니다.
      if (next.id.startsWith("disc-")) {
        setDiscoveredState((prev) => ({
          ...prev,
          [sector]: [
            next,
            ...(prev[sector] ?? []).filter((v) => v.id !== next.id),
          ],
        }));
      }

      pickVideo(next);
    });
  };

  const handleSelect = (video: VideoMeta) => {
    pickVideo(video);
  };

  const handleSeek = (seconds: number) => {
    seekToRef.current?.(seconds);
    setCurrentTime(seconds);
  };

  /** 영상 길이의 특정 비율(0~1) 지점으로 이동합니다. */
  const handleSeekPercent = (ratio: number) => {
    const duration = getDurationRef.current?.() ?? 0;
    if (duration > 0) handleSeek(duration * ratio);
  };

  const transcript = detail?.transcript ?? [];

  /** 현재 재생 위치보다 앞에 있는 마지막 대본 줄(직전 멘트)로 이동합니다. */
  const handlePrevMention = () => {
    const target = findPrevMentionTime(transcript, currentTime);
    if (target !== null) handleSeek(target);
  };

  /** 현재 재생 위치 다음에 오는 첫 대본 줄(직후 멘트)로 이동합니다. */
  const handleNextMention = () => {
    const target = findNextMentionTime(transcript, currentTime);
    if (target !== null) handleSeek(target);
  };

  // 단축키 처리 중 최신 상태를 읽기 위한 ref. 리스너는 마운트 시 한 번만 등록합니다.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable)
        return;

      switch (e.key) {
        case "0":
          e.preventDefault();
          handleSeek(0);
          break;
        case "1":
          e.preventDefault();
          handleSeekPercent(0.1);
          break;
        case "2":
          e.preventDefault();
          handleSeekPercent(0.2);
          break;
        case "5":
          e.preventDefault();
          handleSeekPercent(0.5);
          break;
        case "ArrowLeft": {
          e.preventDefault();
          const target = findPrevMentionTime(
            transcriptRef.current,
            currentTimeRef.current
          );
          if (target !== null) handleSeek(target);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const target = findNextMentionTime(
            transcriptRef.current,
            currentTimeRef.current
          );
          if (target !== null) handleSeek(target);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUrlSubmit = (youtubeId: string) => {
    custom.add(youtubeId);
    setTab("custom");
    pickVideo(customVideoFor(youtubeId));
  };

  const handleRemove = (youtubeId: string) => {
    custom.remove(youtubeId);
    if (selected.youtubeId === youtubeId) {
      const fallback = custom.videos.find((v) => v.youtubeId !== youtubeId);
      pickVideo(fallback ?? curated["en-GB"][0]);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        {/* 이미 메인 화면이어도 눌렀을 때 처음 상태로 돌아가야 해서(next/link는
            같은 경로면 아무 반응이 없음) 일부러 실제 페이지 이동을 씁니다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <SparrowLogo className="h-8 w-8" />
          <h1 className="text-lg font-bold text-foreground">
            톡참새{" "}
            <span className="hidden text-sm font-normal text-muted xl:inline">
              — 다국어 일상 대화 유튜브 추천
            </span>
          </h1>
        </a>
        <div className="ml-auto w-full max-w-xl">
          <UrlInput onSubmit={handleUrlSubmit} />
        </div>
        <UserMenu user={user} />
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[2fr_1.2fr_1.3fr]">
        {/* 1열: 메인 영상 (열 안에서 가운데 정렬) */}
        <section className="flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <div className="aspect-video w-full max-w-2xl shrink-0 overflow-hidden rounded-xl bg-black">
            <YouTubePlayer
              key={selected.youtubeId}
              youtubeId={selected.youtubeId}
              onTimeUpdate={setCurrentTime}
              seekToRef={seekToRef}
              getDurationRef={getDurationRef}
            />
          </div>
          <div className="mt-2 flex w-full max-w-2xl flex-wrap justify-center gap-1.5">
            <button
              onClick={() => handleSeek(0)}
              title="영상의 맨 처음으로 이동합니다 (단축키: 0)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground"
            >
              맨 처음 <span className="text-[10px] text-muted/70">0</span>
            </button>
            <button
              onClick={() => handleSeekPercent(0.1)}
              title="영상 길이의 10% 지점으로 이동합니다 (단축키: 1)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground"
            >
              10% <span className="text-[10px] text-muted/70">1</span>
            </button>
            <button
              onClick={() => handleSeekPercent(0.2)}
              title="영상 길이의 20% 지점으로 이동합니다 (단축키: 2)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground"
            >
              20% <span className="text-[10px] text-muted/70">2</span>
            </button>
            <button
              onClick={() => handleSeekPercent(0.5)}
              title="영상 길이의 50% 지점으로 이동합니다 (단축키: 5)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground"
            >
              50% <span className="text-[10px] text-muted/70">5</span>
            </button>
            <button
              onClick={handlePrevMention}
              disabled={transcript.length === 0}
              title="현재 위치 바로 직전 대본 줄로 이동합니다 (단축키: ←)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              직전 멘트 <span className="text-[10px] text-muted/70">←</span>
            </button>
            <button
              onClick={handleNextMention}
              disabled={transcript.length === 0}
              title="현재 위치 바로 다음 대본 줄로 이동합니다 (단축키: →)"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-mocha hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              직후 멘트 <span className="text-[10px] text-muted/70">→</span>
            </button>
          </div>
          <div className="w-full max-w-2xl flex-1 overflow-y-auto pt-3">
            {loading ? (
              <div className="flex flex-col gap-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-mocha-light/60" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-mocha-light/60" />
              </div>
            ) : error ? (
              <p className="text-sm text-accent">{error}</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-foreground">
                    {detail?.title}
                  </h2>
                  <button
                    onClick={() => handleToggleStar(selected)}
                    aria-label={
                      starredIds.has(selected.youtubeId)
                        ? "내 영상에서 빼기"
                        : "내 영상에 추가"
                    }
                    title={
                      starredIds.has(selected.youtubeId)
                        ? "내 영상에서 빼기"
                        : "내 영상에 추가"
                    }
                    className={`shrink-0 rounded-full p-1 transition-colors ${
                      starredIds.has(selected.youtubeId)
                        ? "text-mocha"
                        : "text-muted hover:bg-mocha-light hover:text-foreground"
                    }`}
                  >
                    <StarIcon
                      filled={starredIds.has(selected.youtubeId)}
                      className="h-5 w-5"
                    />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <span>{detail?.channel}</span>
                  {detail && (
                    <>
                      <span className="rounded-full bg-mocha-light px-2 py-0.5 text-[11px] text-mocha-dark">
                        {detail.sourceLabel}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          detail.translationSource === "official"
                            ? "bg-mocha text-white"
                            : "bg-mocha-light text-mocha-dark"
                        }`}
                      >
                        {TRANSLATION_SOURCE_LABELS[detail.translationSource]}
                      </span>
                    </>
                  )}
                </div>
              </>
            )}

            {related.length > 0 && (
              <>
                <p className="mt-4 mb-1 text-xs font-semibold text-muted">
                  연관 영상
                </p>
                <div className="flex flex-col gap-1">
                  {related.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelect(v)}
                      className="truncate rounded-lg px-2 py-1 text-left text-sm text-muted transition-colors hover:bg-mocha-light/50 hover:text-foreground"
                    >
                      {getRelatedTitle(v.youtubeId)?.title ?? v.reason}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 2열: 실시간 대본 */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <TranscriptPanel
            transcript={detail?.transcript ?? []}
            loading={loading}
            error={error}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </section>

        {/* 3열: 언어별 추천 + 내 영상 */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <RecommendationList
            tab={tab}
            onTabChange={handleTabChange}
            videos={listForTab}
            selectedId={selected.id}
            onSelect={handleSelect}
            onRemove={tab === "custom" ? handleRemove : undefined}
            onRefresh={
              tab === "custom" || tab === "history"
                ? undefined
                : handleRefreshFeatured
            }
            refreshing={refreshing}
            onToggleStar={tab === "custom" ? undefined : handleToggleStar}
            starredIds={starredIds}
          />
        </section>
      </main>
    </div>
  );
}
