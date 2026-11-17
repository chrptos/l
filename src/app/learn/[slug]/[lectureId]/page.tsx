import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompletedLectureIds, getCourseBySlug, getCurriculum, getUserReview } from "@/lib/queries";
import { canAccessCourse } from "@/lib/access";
import { toggleLectureComplete, submitReview } from "@/app/actions/learning";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SubmitButton } from "@/components/SubmitButton";
import { RatingInput } from "@/components/RatingInput";

type Params = Promise<{ slug: string; lectureId: string }>;

export default async function LecturePage({ params }: { params: Params }) {
  const { slug, lectureId } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  const access = canAccessCourse(user, course);

  const curriculum = getCurriculum(course.id);
  const all = curriculum.flatMap((s) => s.lectures);
  const idx = all.findIndex((l) => l.id === Number(lectureId));
  if (idx < 0) notFound();
  const lecture = all[idx];
  if (!access.full && !lecture.is_preview) redirect(user ? `/courses/${slug}` : `/login?next=/learn/${slug}/${lectureId}`);
  if (!course.published && !access.owner) notFound();

  const prev = all[idx - 1];
  const next = all[idx + 1];
  const done = user && access.enrolled ? getCompletedLectureIds(user.id, course.id) : new Set<number>();
  const pct = all.length ? Math.round((done.size / all.length) * 100) : 0;
  const myReview = user && access.enrolled ? getUserReview(user.id, course.id) : undefined;
  const isDone = done.has(lecture.id);

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4 bg-gray-900 px-4 py-3 text-white">
          <Link href={`/courses/${slug}`} className="truncate text-sm font-semibold hover:underline">← {course.title}</Link>
          {access.enrolled && (
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <div className="h-2 w-28 overflow-hidden rounded bg-gray-700"><div className="h-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
              <span>{pct}% 完了</span>
              {pct === 100 && <Link href={`/certificate/${slug}`} className="ml-2 rounded bg-amber-400 px-2 py-1 font-bold text-gray-900">🏆 修了証</Link>}
            </div>
          )}
        </div>
        <VideoPlayer url={lecture.video_url} title={lecture.title} />
        <div className="container-page max-w-4xl py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{lecture.title}</h1>
            {access.enrolled && (
              <form action={toggleLectureComplete}>
                <input type="hidden" name="lectureId" value={lecture.id} />
                {next && <input type="hidden" name="nextLectureId" value={next.id} />}
                <SubmitButton className={isDone ? "btn-outline" : "btn-primary"}>{isDone ? "✓ 完了済み（取り消す）" : next ? "完了して次へ →" : "完了にする"}</SubmitButton>
              </form>
            )}
          </div>
          {!access.full && (
            <div className="mt-4 rounded-md bg-brand-50 p-4 text-sm">
              これは無料プレビューです。<Link href={`/courses/${slug}`} className="font-semibold text-brand-700 underline">コースに登録</Link>してすべてのレクチャーにアクセスしましょう。
            </div>
          )}
          <div className="mt-4 flex gap-2">
            {prev && (access.full || prev.is_preview) ? <Link href={`/learn/${slug}/${prev.id}`} className="btn-outline">← 前へ</Link> : null}
            {next && (access.full || next.is_preview) ? <Link href={`/learn/${slug}/${next.id}`} className="btn-outline">次へ →</Link> : null}
          </div>
          {lecture.content && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">レクチャーノート</h2>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{lecture.content}</div>
            </section>
          )}
          {access.enrolled && (
            <section className="card mt-10 p-6">
              <h2 className="text-lg font-bold">{myReview ? "あなたのレビューを編集" : "このコースを評価する"}</h2>
              <form action={submitReview} className="mt-3 space-y-3">
                <input type="hidden" name="courseId" value={course.id} />
                <RatingInput defaultValue={myReview?.rating ?? 5} />
                <textarea name="comment" defaultValue={myReview?.comment} rows={3} className="input" placeholder="コースの感想を教えてください" />
                <SubmitButton>{myReview ? "更新する" : "レビューを投稿"}</SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>

      <aside className="border-l border-gray-200 lg:h-[calc(100vh-4rem)] lg:w-96 lg:overflow-y-auto">
        <h2 className="border-b border-gray-200 px-4 py-3 font-bold">コースの内容</h2>
        {curriculum.map((s, si) => (
          <div key={s.id}>
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-bold">セクション{si + 1}: {s.title}</p>
              <p className="text-xs text-gray-500">{s.lectures.filter((l) => done.has(l.id)).length} / {s.lectures.length}</p>
            </div>
            <ul>
              {s.lectures.map((l) => {
                const locked = !access.full && !l.is_preview;
                const active = l.id === lecture.id;
                const body = (
                  <>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${done.has(l.id) ? "border-brand-600 bg-brand-600 text-white" : "border-gray-400"}`}>
                      {done.has(l.id) ? "✓" : ""}
                    </span>
                    <span className="flex-1">
                      <span className="block">{l.title}</span>
                      <span className="text-xs text-gray-500">{l.video_url ? "▶" : "📄"} {l.duration_min}分</span>
                    </span>
                    {locked && <span aria-label="ロック">🔒</span>}
                  </>
                );
                return (
                  <li key={l.id}>
                    {locked ? (
                      <div className="flex gap-3 px-4 py-3 text-sm text-gray-400">{body}</div>
                    ) : (
                      <Link href={`/learn/${slug}/${l.id}`} className={`flex gap-3 px-4 py-3 text-sm hover:bg-gray-100 ${active ? "bg-brand-50 font-semibold" : ""}`}>{body}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}
