"use client";

import { useActionState } from "react";
import { ActionState, changePassword, saveProfile } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/users";

const initialState: ActionState = {};

const fieldClass =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-mocha";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-xl bg-mocha-light px-3 py-2 text-xs text-mocha-dark"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">아이디</span>
        <input
          value={user.username}
          disabled
          className={`${fieldClass} cursor-not-allowed text-muted`}
        />
        <span className="text-[11px] text-muted">
          아이디는 바꿀 수 없어요.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">닉네임</span>
        <input
          name="nickname"
          defaultValue={user.nickname}
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">이메일</span>
        <input
          name="email"
          type="email"
          defaultValue={user.email}
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">학습 목표</span>
        <input
          name="goal"
          defaultValue={user.goal}
          placeholder="예) 매일 영상 한 편씩 보기"
          className={fieldClass}
        />
      </label>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-xl bg-mocha px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-mocha-dark disabled:opacity-60"
      >
        {pending ? "저장 중..." : "개인정보 저장"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">현재 비밀번호</span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">새 비밀번호</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">
          새 비밀번호 확인
        </span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-xl border border-mocha px-4 py-2 text-sm font-semibold text-mocha-dark transition-colors hover:bg-mocha-light disabled:opacity-60"
      >
        {pending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
