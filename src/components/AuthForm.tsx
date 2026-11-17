"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions/auth";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";
  return (
    <div className="mx-auto max-w-sm py-16 px-4">
      <h1 className="text-2xl font-bold">{isSignup ? "新規登録して学習を始めよう" : "Manabiにログイン"}</h1>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        {isSignup && (
          <div>
            <label className="label" htmlFor="name">氏名</label>
            <input id="name" name="name" className="input" required autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード</label>
          <input id="password" name="password" type="password" className="input" required minLength={isSignup ? 8 : undefined} autoComplete={isSignup ? "new-password" : "current-password"} />
          {isSignup && <p className="mt-1 text-xs text-gray-500">8文字以上</p>}
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full py-3">{isSignup ? "登録する" : "ログイン"}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        {isSignup ? "既にアカウントをお持ちですか？ " : "アカウントをお持ちでないですか？ "}
        <Link href={`/${isSignup ? "login" : "signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 underline">
          {isSignup ? "ログイン" : "新規登録"}
        </Link>
      </p>
      {!isSignup && (
        <div className="mt-8 rounded-md bg-gray-50 p-4 text-xs text-gray-600">
          <p className="font-bold">デモアカウント（パスワード: password123）</p>
          <p>受講者: student@example.com</p>
          <p>講師: instructor@example.com</p>
        </div>
      )}
    </div>
  );
}
