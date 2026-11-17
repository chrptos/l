"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db, tx } from "@/lib/db";
import { requireInstructor } from "@/lib/auth";
import { CATEGORIES, LEVELS, slugify } from "@/lib/constants";
import type { FormState } from "./auth";

async function ownCourse(courseId: number) {
  const user = await requireInstructor();
  const course = db.prepare("SELECT id, slug, instructor_id FROM courses WHERE id = ?").get(courseId) as
    | { id: number; slug: string; instructor_id: number }
    | undefined;
  if (!course || course.instructor_id !== user.id) throw new Error("このコースを編集する権限がありません");
  return course;
}

function ownSectionCourse(sectionId: number) {
  const row = db.prepare("SELECT course_id FROM sections WHERE id = ?").get(sectionId) as { course_id: number } | undefined;
  if (!row) throw new Error("セクションが見つかりません");
  return ownCourse(row.course_id);
}

function ownLectureCourse(lectureId: number) {
  const row = db.prepare("SELECT s.course_id FROM lectures l JOIN sections s ON s.id = l.section_id WHERE l.id = ?").get(lectureId) as
    | { course_id: number }
    | undefined;
  if (!row) throw new Error("レクチャーが見つかりません");
  return ownCourse(row.course_id);
}

function touch(course: { id: number; slug: string }) {
  db.prepare("UPDATE courses SET updated_at = datetime('now') WHERE id = ?").run(course.id);
  revalidatePath(`/instructor/courses/${course.id}`);
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath(`/learn/${course.slug}`, "layout");
  revalidatePath("/");
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  let slug = base;
  while (db.prepare("SELECT 1 FROM courses WHERE slug = ?").get(slug)) slug = `${base}-${randomBytes(3).toString("hex")}`;
  return slug;
}

export async function createCourse(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireInstructor();
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "development");
  if (!title) return { error: "タイトルを入力してください。" };
  if (!CATEGORIES[category]) return { error: "カテゴリが不正です。" };
  const { id } = db
    .prepare("INSERT INTO courses (instructor_id, slug, title, category) VALUES (?, ?, ?, ?) RETURNING id")
    .get(user.id, uniqueSlug(title), title.slice(0, 120), category) as { id: number };
  db.prepare("INSERT INTO sections (course_id, title, position) VALUES (?, ?, 0)").run(id, "はじめに");
  redirect(`/instructor/courses/${id}`);
}

export async function updateCourse(_: FormState, form: FormData): Promise<FormState> {
  const course = await ownCourse(Number(form.get("courseId")));
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const level = String(form.get("level") ?? "");
  const price = Number(form.get("price") ?? 0);
  if (!title) return { error: "タイトルを入力してください。" };
  if (!CATEGORIES[category] || !LEVELS[level]) return { error: "カテゴリまたはレベルが不正です。" };
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) return { error: "価格は0〜1,000,000円の整数で入力してください。" };
  db.prepare(
    `UPDATE courses SET title = ?, subtitle = ?, description = ?, category = ?, level = ?, price = ?, thumbnail_url = ?, what_you_learn = ?
     WHERE id = ?`,
  ).run(
    title.slice(0, 120),
    String(form.get("subtitle") ?? "").trim().slice(0, 200),
    String(form.get("description") ?? "").trim().slice(0, 10000),
    category,
    level,
    price,
    String(form.get("thumbnail_url") ?? "").trim(),
    String(form.get("what_you_learn") ?? "").trim().slice(0, 3000),
    course.id,
  );
  touch(course);
  return { ok: "保存しました。" };
}

export async function setPublished(form: FormData) {
  const course = await ownCourse(Number(form.get("courseId")));
  const publish = form.get("publish") === "1";
  if (publish) {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM lectures l JOIN sections s ON s.id = l.section_id WHERE s.course_id = ?")
      .get(course.id) as { n: number };
    if (n === 0) throw new Error("公開するには少なくとも1つのレクチャーが必要です");
  }
  db.prepare("UPDATE courses SET published = ? WHERE id = ?").run(publish ? 1 : 0, course.id);
  touch(course);
}

export async function deleteCourse(form: FormData) {
  const course = await ownCourse(Number(form.get("courseId")));
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?").get(course.id) as { n: number };
  if (n > 0) throw new Error("受講者がいるコースは削除できません。非公開にしてください。");
  db.prepare("DELETE FROM courses WHERE id = ?").run(course.id);
  revalidatePath("/instructor");
  redirect("/instructor");
}

export async function addSection(form: FormData) {
  const course = await ownCourse(Number(form.get("courseId")));
  const title = String(form.get("title") ?? "").trim() || "新しいセクション";
  const { p } = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM sections WHERE course_id = ?").get(course.id) as { p: number };
  db.prepare("INSERT INTO sections (course_id, title, position) VALUES (?, ?, ?)").run(course.id, title.slice(0, 200), p);
  touch(course);
}

export async function renameSection(form: FormData) {
  const sectionId = Number(form.get("sectionId"));
  const course = await ownSectionCourse(sectionId);
  const title = String(form.get("title") ?? "").trim();
  if (title) db.prepare("UPDATE sections SET title = ? WHERE id = ?").run(title.slice(0, 200), sectionId);
  touch(course);
}

export async function deleteSection(form: FormData) {
  const sectionId = Number(form.get("sectionId"));
  const course = await ownSectionCourse(sectionId);
  db.prepare("DELETE FROM sections WHERE id = ?").run(sectionId);
  touch(course);
}

/** Swap position with the neighbour above/below. */
function move(table: "sections" | "lectures", parentCol: "course_id" | "section_id", id: number, dir: "up" | "down") {
  const row = db.prepare(`SELECT id, ${parentCol} AS parent, position FROM ${table} WHERE id = ?`).get(id) as
    | { id: number; parent: number; position: number }
    | undefined;
  if (!row) return;
  const siblings = db.prepare(`SELECT id FROM ${table} WHERE ${parentCol} = ? ORDER BY position, id`).all(row.parent) as { id: number }[];
  const idx = siblings.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= siblings.length) return;
  [siblings[idx], siblings[swap]] = [siblings[swap], siblings[idx]];
  const upd = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  tx(() => siblings.forEach((s, i) => upd.run(i, s.id)));
}

export async function moveSection(form: FormData) {
  const sectionId = Number(form.get("sectionId"));
  const course = await ownSectionCourse(sectionId);
  move("sections", "course_id", sectionId, form.get("dir") === "up" ? "up" : "down");
  touch(course);
}

export async function moveLecture(form: FormData) {
  const lectureId = Number(form.get("lectureId"));
  const course = await ownLectureCourse(lectureId);
  move("lectures", "section_id", lectureId, form.get("dir") === "up" ? "up" : "down");
  touch(course);
}

function lectureFields(form: FormData) {
  return {
    title: String(form.get("title") ?? "").trim().slice(0, 200) || "無題のレクチャー",
    video_url: String(form.get("video_url") ?? "").trim(),
    content: String(form.get("content") ?? "").trim().slice(0, 20000),
    duration_min: Math.max(0, Math.round(Number(form.get("duration_min")) || 0)),
    is_preview: form.get("is_preview") ? 1 : 0,
  };
}

export async function addLecture(form: FormData) {
  const sectionId = Number(form.get("sectionId"));
  const course = await ownSectionCourse(sectionId);
  const f = lectureFields(form);
  const { p } = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM lectures WHERE section_id = ?").get(sectionId) as { p: number };
  db.prepare(
    "INSERT INTO lectures (section_id, title, video_url, content, duration_min, is_preview, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(sectionId, f.title, f.video_url, f.content, f.duration_min, f.is_preview, p);
  touch(course);
}

export async function updateLecture(form: FormData) {
  const lectureId = Number(form.get("lectureId"));
  const course = await ownLectureCourse(lectureId);
  const f = lectureFields(form);
  db.prepare("UPDATE lectures SET title = ?, video_url = ?, content = ?, duration_min = ?, is_preview = ? WHERE id = ?").run(
    f.title,
    f.video_url,
    f.content,
    f.duration_min,
    f.is_preview,
    lectureId,
  );
  touch(course);
}

export async function deleteLecture(form: FormData) {
  const lectureId = Number(form.get("lectureId"));
  const course = await ownLectureCourse(lectureId);
  db.prepare("DELETE FROM lectures WHERE id = ?").run(lectureId);
  touch(course);
}
