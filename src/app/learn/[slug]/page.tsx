import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCompletedLectureIds, getCourseBySlug, getCurriculum } from "@/lib/queries";
import { canAccessCourse } from "@/lib/access";

/** Resume: jump to the first lecture not yet completed. */
export default async function LearnIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/learn/${slug}`);
  const course = getCourseBySlug(slug);
  if (!course) notFound();
  if (!canAccessCourse(user, course).full) redirect(`/courses/${slug}`);
  const lectures = getCurriculum(course.id).flatMap((s) => s.lectures);
  if (lectures.length === 0) redirect(`/courses/${slug}`);
  const done = getCompletedLectureIds(user.id, course.id);
  const next = lectures.find((l) => !done.has(l.id)) ?? lectures[0];
  redirect(`/learn/${slug}/${next.id}`);
}
