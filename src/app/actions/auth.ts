"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, requireUser } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email || !password) return { error: "すべての項目を入力してください。" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません。" };
  if (password.length < 8) return { error: "パスワードは8文字以上にしてください。" };
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return { error: "このメールアドレスは既に登録されています。" };

  const { id } = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id")
    .get(name, email, hashPassword(password)) as { id: number };
  await createSession(id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function becomeInstructor(form: FormData) {
  const user = await requireUser("/instructor/become");
  const headline = String(form.get("headline") ?? "").trim().slice(0, 120);
  const bio = String(form.get("bio") ?? "").trim().slice(0, 2000);
  db.prepare("UPDATE users SET role = 'instructor', headline = ?, bio = ? WHERE id = ?").run(headline, bio, user.id);
  revalidatePath("/", "layout");
  redirect("/instructor");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/profile");
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "名前を入力してください。" };
  const headline = String(form.get("headline") ?? "").trim().slice(0, 120);
  const bio = String(form.get("bio") ?? "").trim().slice(0, 2000);
  db.prepare("UPDATE users SET name = ?, headline = ?, bio = ? WHERE id = ?").run(name, headline, bio, user.id);
  revalidatePath("/", "layout");
  return { ok: "プロフィールを更新しました。" };
}
