"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/users";

interface UserMenuProps {
  user: PublicUser;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 바깥을 클릭하거나 Esc를 누르면 닫습니다.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-mocha-light"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mocha text-sm font-bold text-white">
          {user.nickname.slice(0, 1)}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-foreground sm:inline">
          {user.nickname}
        </span>
        <span className="text-[10px] text-muted">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          {/* 간단 정보 */}
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.nickname}
            </p>
            <p className="truncate text-xs text-muted">@{user.username}</p>
            <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
            {user.goal && (
              <p className="mt-2 rounded-lg bg-mocha-light px-2 py-1 text-[11px] leading-snug text-mocha-dark">
                🎯 {user.goal}
              </p>
            )}
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-mocha-light/60"
          >
            설정 · 개인정보 변경
          </Link>

          {/* 로그아웃 가이드 */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-[11px] leading-relaxed text-muted">
              로그아웃하면 로그인 화면으로 돌아가요. 다시 아이디와 비밀번호로
              로그인하면 됩니다.
              <br />
              <span className="text-mocha-dark">
                내 영상 목록은 계정에 저장돼 있어서 그대로 남아 있어요.
              </span>
            </p>
            <form action={logout} className="mt-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-mocha px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-mocha-dark"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
