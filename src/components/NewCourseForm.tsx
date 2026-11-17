"use client";
import { useActionState } from "react";
import { createCourse } from "@/app/actions/instructor";
import { CATEGORIES } from "@/lib/constants";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function NewCourseForm() {
  const [state, action] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1"><label className="label">コースタイトル</label><input name="title" className="input" placeholder="例: はじめてのTypeScript" required /></div>
      <div><label className="label">カテゴリ</label>
        <select name="category" className="input">{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select>
      </div>
      <SubmitButton>コースを作成</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
