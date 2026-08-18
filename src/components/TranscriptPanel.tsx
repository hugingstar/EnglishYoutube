"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TranscriptLine } from "@/lib/types";

interface TranscriptPanelProps {
  transcript: TranscriptLine[];
  loading: boolean;
  error: string | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export default function TranscriptPanel({
  transcript,
  loading,
  error,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const [query, setQuery] = useState("");
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].time <= currentTime) idx = i;
    }
    return idx;
  }, [transcript, currentTime]);

  useEffect(() => {
    if (activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="rounded bg-accent-soft px-0.5 text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="표현 검색..."
          className="w-full rounded-full border border-border bg-background px-3.5 py-1.5 text-sm outline-none transition-colors focus:border-mocha"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-mocha-light/60"
              />
            ))}
          </div>
        )}
        {error && !loading && (
          <p className="p-2 text-sm text-accent">
            대본을 불러오지 못했어요. ({error})
          </p>
        )}
        {!loading &&
          !error &&
          transcript.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              onClick={() => onSeek(line.time)}
              className={`mb-2 cursor-pointer rounded-lg p-2 transition-colors ${
                i === activeIndex
                  ? "bg-accent-soft"
                  : "hover:bg-mocha-light/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-muted">
                  {formatTime(line.time)}
                </span>
                <div className="min-w-0">
                  {line.original && (
                    <p className="text-sm font-medium text-foreground">
                      {highlight(line.original)}
                    </p>
                  )}
                  {line.translation && (
                    <p className="text-sm text-muted">{line.translation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
