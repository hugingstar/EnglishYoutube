"use client";

import { useState } from "react";
import { parseYouTubeId } from "@/lib/youtubeUrl";

interface UrlInputProps {
  onSubmit: (youtubeId: string) => void;
}

export default function UrlInput({ onSubmit }: UrlInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseYouTubeId(value);
    if (!id) {
      setError("YouTube 주소를 인식하지 못했어요.");
      return;
    }
    setError(null);
    setValue("");
    onSubmit(id);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="유튜브 URL을 붙여넣으세요 (예: https://youtu.be/...)"
          aria-label="유튜브 URL"
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-1.5 text-sm outline-none transition-colors focus:border-mocha"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-mocha px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-mocha-dark"
        >
          불러오기
        </button>
      </div>
      {error && (
        <p className="absolute mt-1 text-xs text-accent">{error}</p>
      )}
    </form>
  );
}
