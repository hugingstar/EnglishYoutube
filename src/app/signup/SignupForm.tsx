"use client";

import { useActionState } from "react";
import { ActionState, signup } from "@/app/actions/auth";

const initialState: ActionState = {};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-mocha";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  // 서버 액션이 끝나면 폼이 비워지므로, 오류가 났을 때 방금 쓴 값을 되살립니다.
  const previous = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">아이디</span>
        <input
          name="username"
          defaultValue={previous.username ?? ""}
          autoComplete="username"
          autoFocus
          required
          minLength={4}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          placeholder="영문·숫자·밑줄 4~20자"
          className={fieldClass}
        />
      </label>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">비밀번호</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={4}
            className={fieldClass}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted">비밀번호 확인</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={4}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">닉네임</span>
        <input
          name="nickname"
          defaultValue={previous.nickname ?? ""}
          autoComplete="nickname"
          required
          minLength={2}
          placeholder="화면에 표시될 이름"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">이메일</span>
        <input
          name="email"
          defaultValue={previous.email ?? ""}
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">
          학습 목표 <span className="font-normal">(선택)</span>
        </span>
        <input
          name="goal"
          defaultValue={previous.goal ?? ""}
          maxLength={60}
          placeholder="예: 매일 영상 한 편씩 보기"
          className={fieldClass}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-mocha px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mocha-dark disabled:opacity-60"
      >
        {pending ? "가입 중..." : "가입하고 시작하기"}
      </button>
    </form>
  );
}
