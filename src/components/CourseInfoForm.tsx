"use client";
import { useActionState } from "react";
import { updateCourse } from "@/app/actions/instructor";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import type { Course } from "@/lib/queries";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function CourseInfoForm({ course }: { course: Course }) {
  const [state, action] = useActionState(updateCourse, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={course.id} />
      <div><label className="label">タイトル</label><input name="title" defaultValue={course.title} className="input" required maxLength={120} /></div>
      <div><label className="label">サブタイトル</label><input name="subtitle" defaultValue={course.subtitle} className="input" maxLength={200} /></div>
      <div><label className="label">説明</label><textarea name="description" defaultValue={course.description} rows={6} className="input" /></div>
      <div><label className="label">学習内容（1行に1項目）</label><textarea name="what_you_learn" defaultValue={course.what_you_learn} rows={4} className="input" /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">カテゴリ</label>
          <select name="category" defaultValue={course.category} className="input">{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select>
        </div>
        <div><label className="label">レベル</label>
          <select name="level" defaultValue={course.level} className="input">{Object.entries(LEVELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div><label className="label">価格（円・0で無料）</label><input name="price" type="number" min={0} step={100} defaultValue={course.price} className="input" /></div>
      </div>
      <div><label className="label">サムネイル画像URL（任意）</label><input name="thumbnail_url" type="url" defaultValue={course.thumbnail_url} className="input" placeholder="https://…" /></div>
      <FormMessage state={state} />
      <SubmitButton>保存</SubmitButton>
    </form>
  );
}
