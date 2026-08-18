"use client";

import { LANGUAGE_LABELS, TAB_LABELS, TabKey, VideoMeta } from "@/lib/types";
import { thumbnailUrl } from "@/data/videos";
import StarIcon from "@/components/StarIcon";
import { useVideoTitles } from "@/lib/useVideoTitles";

interface RecommendationListProps {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  videos: VideoMeta[];
  selectedId: string;
  onSelect: (video: VideoMeta) => void;
  onRemove?: (youtubeId: string) => void;
  /** 정해진 시간을 안 기다리고 지금 바로 추천 영상을 바꾸고 싶을 때. "내 영상"/"시청 이력" 탭에서는 없음 */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** 별표를 눌러 "내 영상"에 추가/제거. "내 영상" 탭 자체에서는 없음(거기는 x로 뺌) */
  onToggleStar?: (video: VideoMeta) => void;
  /** 지금 "내 영상"에 들어있는 youtubeId 집합. 별표 채워짐 여부 표시용 */
  starredIds?: Set<string>;
}

const TABS: TabKey[] = ["en-US", "en-GB", "ja", "zh", "custom", "history"];

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export default function RecommendationList({
  tab,
  onTabChange,
  videos,
  selectedId,
  onSelect,
  onRemove,
  onRefresh,
  refreshing,
  onToggleStar,
  starredIds,
}: RecommendationListProps) {
  const getTitle = useVideoTitles(videos);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 px-1 py-2.5 text-xs font-semibold transition-colors ${
              t === tab
                ? "border-b-2 border-mocha text-mocha-dark"
                : "text-muted hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted">
            {tab === "custom"
              ? "내가 추가한 영상"
              : tab === "history"
              ? "최근 본 영상"
              : `${LANGUAGE_LABELS[tab]} 추천 영상`}
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="지금 바로 추천 영상 바꾸기"
              aria-label="지금 바로 추천 영상 바꾸기"
              className="rounded-full p-1 text-muted transition-colors hover:bg-mocha-light/50 hover:text-foreground disabled:opacity-40"
            >
              <RefreshIcon
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>

        {videos.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs leading-relaxed text-muted">
            {tab === "history" ? (
              "아직 본 영상이 없어요."
            ) : tab === "custom" ? (
              <>
                아직 추가한 영상이 없어요.
                <br />
                위에 유튜브 URL을 붙여넣거나 별표를 눌러보세요.
              </>
            ) : (
              "영상이 없어요."
            )}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {videos.map((v) => {
            const info = getTitle(v.youtubeId);
            return (
              <div
                key={v.id}
                className={`group relative flex gap-2 rounded-xl border p-2 transition-colors ${
                  v.id === selectedId
                    ? "border-mocha bg-accent-soft"
                    : "border-border hover:bg-mocha-light/40"
                }`}
              >
                <button
                  onClick={() => onSelect(v)}
                  className="flex min-w-0 flex-1 gap-2 text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(v.youtubeId)}
                    alt={info?.title ?? v.topic}
                    className="h-12 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {info?.title ?? "불러오는 중..."}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {info?.channel ?? " "}
                    </p>
                    <p className="mt-0.5 inline-block rounded-full bg-mocha-light px-2 py-0.5 text-[11px] text-mocha-dark">
                      {v.reason}
                    </p>
                  </div>
                </button>
                {onRemove && (
                  <button
                    onClick={() => onRemove(v.youtubeId)}
                    aria-label="목록에서 삭제"
                    className="absolute right-1 top-1 hidden h-6 w-6 rounded-full text-muted transition-colors hover:bg-mocha-light hover:text-foreground group-hover:block"
                  >
                    ×
                  </button>
                )}
                {onToggleStar && (
                  <button
                    onClick={() => onToggleStar(v)}
                    aria-label={
                      starredIds?.has(v.youtubeId)
                        ? "내 영상에서 빼기"
                        : "내 영상에 추가"
                    }
                    title={
                      starredIds?.has(v.youtubeId)
                        ? "내 영상에서 빼기"
                        : "내 영상에 추가"
                    }
                    className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      starredIds?.has(v.youtubeId)
                        ? "text-mocha"
                        : "text-muted opacity-0 hover:bg-mocha-light hover:text-foreground group-hover:opacity-100"
                    }`}
                  >
                    <StarIcon
                      filled={starredIds?.has(v.youtubeId) ?? false}
                      className="h-4 w-4"
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
