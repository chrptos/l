"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, tx } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCourseById, isEnrolled } from "@/lib/queries";

function publishedCourse(courseId: number) {
  const course = getCourseById(courseId);
  if (!course || !course.published) throw new Error("コースが見つかりません");
  return course;
}

/** Free courses enroll immediately; paid courses go to the cart. */
export async function enrollOrAddToCart(form: FormData) {
  const courseId = Number(form.get("courseId"));
  const course = publishedCourse(courseId);
  const user = await requireUser(`/courses/${course.slug}`);
  if (isEnrolled(user.id, courseId)) redirect(`/learn/${course.slug}`);

  if (course.price === 0) {
    db.prepare("INSERT OR IGNORE INTO enrollments (user_id, course_id, price_paid) VALUES (?, ?, 0)").run(user.id, courseId);
    revalidatePath("/my-learning");
    redirect(`/learn/${course.slug}`);
  }
  db.prepare("INSERT OR IGNORE INTO cart_items (user_id, course_id) VALUES (?, ?)").run(user.id, courseId);
  revalidatePath("/", "layout");
  if (form.get("buyNow")) redirect("/cart");
}

export async function removeFromCart(form: FormData) {
  const user = await requireUser("/cart");
  db.prepare("DELETE FROM cart_items WHERE user_id = ? AND course_id = ?").run(user.id, Number(form.get("courseId")));
  revalidatePath("/", "layout");
}

/**
 * Mock checkout: moves every cart item into enrollments.
 * Replace with a real payment provider (e.g. Stripe Checkout + webhook) in production.
 */
export async function checkout() {
  const user = await requireUser("/cart");
  tx(() => {
    db.prepare(
      `INSERT OR IGNORE INTO enrollments (user_id, course_id, price_paid)
       SELECT ci.user_id, ci.course_id, c.price FROM cart_items ci JOIN courses c ON c.id = ci.course_id
       WHERE ci.user_id = ? AND c.published = 1`,
    ).run(user.id);
    db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(user.id);
  });
  revalidatePath("/", "layout");
  redirect("/my-learning?purchased=1");
}

function lectureCourse(lectureId: number) {
  return db
    .prepare("SELECT c.id, c.slug FROM lectures l JOIN sections s ON s.id = l.section_id JOIN courses c ON c.id = s.course_id WHERE l.id = ?")
    .get(lectureId) as { id: number; slug: string } | undefined;
}

export async function toggleLectureComplete(form: FormData) {
  const lectureId = Number(form.get("lectureId"));
  const course = lectureCourse(lectureId);
  if (!course) return;
  const user = await requireUser(`/learn/${course.slug}`);
  if (!isEnrolled(user.id, course.id)) return;

  const done = db.prepare("SELECT 1 FROM lecture_progress WHERE user_id = ? AND lecture_id = ?").get(user.id, lectureId);
  if (done) db.prepare("DELETE FROM lecture_progress WHERE user_id = ? AND lecture_id = ?").run(user.id, lectureId);
  else db.prepare("INSERT INTO lecture_progress (user_id, lecture_id) VALUES (?, ?)").run(user.id, lectureId);

  revalidatePath(`/learn/${course.slug}`, "layout");
  revalidatePath("/my-learning");
  const nextId = form.get("nextLectureId");
  if (!done && nextId) redirect(`/learn/${course.slug}/${nextId}`);
}

export async function submitReview(form: FormData) {
  const courseId = Number(form.get("courseId"));
  const course = publishedCourse(courseId);
  const user = await requireUser(`/courses/${course.slug}`);
  if (!isEnrolled(user.id, courseId)) throw new Error("受講中のコースのみレビューできます");
  const rating = Math.min(5, Math.max(1, Math.round(Number(form.get("rating")) || 0)));
  const comment = String(form.get("comment") ?? "").trim().slice(0, 2000);
  db.prepare(
    `INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, course_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = datetime('now')`,
  ).run(user.id, courseId, rating, comment);
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath(`/learn/${course.slug}`, "layout");
}
