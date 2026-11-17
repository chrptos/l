import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompletedLectureIds, getCourseBySlug, getCurriculum, getInstructor, isEnrolled } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "修了証明書" };

export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/certificate/${slug}`);
  const course = getCourseBySlug(slug);
  if (!course || !isEnrolled(user.id, course.id)) notFound();
  const lectures = getCurriculum(course.id).flatMap((s) => s.lectures);
  const done = getCompletedLectureIds(user.id, course.id);
  if (lectures.length === 0 || lectures.some((l) => !done.has(l.id))) redirect(`/learn/${slug}`);
  const { at } = db
    .prepare(
      `SELECT MAX(lp.completed_at) AS at FROM lecture_progress lp JOIN lectures l ON l.id = lp.lecture_id
       JOIN sections s ON s.id = l.section_id WHERE lp.user_id = ? AND s.course_id = ?`,
    )
    .get(user.id, course.id) as { at: string };
  const instructor = getInstructor(course.instructor_id);
  const certId = `MNB-${course.id.toString().padStart(4, "0")}-${user.id.toString().padStart(5, "0")}`;

  return (
    <div className="container-page max-w-4xl py-10">
      <div className="rounded-lg border-8 border-double border-brand-700 bg-gradient-to-br from-white to-brand-50 p-10 text-center sm:p-16">
        <p className="text-sm font-bold tracking-[0.3em] text-brand-700">CERTIFICATE OF COMPLETION</p>
        <h1 className="mt-4 text-3xl font-black">修了証明書</h1>
        <p className="mt-8 text-gray-600">以下の者は、下記コースのすべての課程を修了したことを証明します。</p>
        <p className="mt-6 text-4xl font-bold">{user.name}</p>
        <p className="mt-6 text-xl font-semibold text-brand-700">{course.title}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-12 text-sm text-gray-600">
          <div><p className="font-bold text-gray-900">{at.slice(0, 10)}</p><p>修了日</p></div>
          <div><p className="font-bold text-gray-900">{instructor?.name}</p><p>講師</p></div>
          <div><p className="font-mono font-bold text-gray-900">{certId}</p><p>証明書ID</p></div>
        </div>
      </div>
      <div className="mt-6 text-center print:hidden"><PrintButton /></div>
    </div>
  );
}
