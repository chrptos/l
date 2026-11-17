import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInstructor } from "@/lib/auth";
import { getCourseById, getCourseStats, getCurriculum } from "@/lib/queries";
import {
  addLecture, addSection, deleteCourse, deleteLecture, deleteSection, moveLecture, moveSection, renameSection, setPublished, updateLecture,
} from "@/app/actions/instructor";
import { CourseInfoForm } from "@/components/CourseInfoForm";
import { LectureFields } from "@/components/LectureFields";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "コースを編集" };

function MoveButtons({ action, idName, id }: { action: (f: FormData) => Promise<void>; idName: string; id: number }) {
  return (
    <div className="flex">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={action}>
          <input type="hidden" name={idName} value={id} />
          <input type="hidden" name="dir" value={dir} />
          <button className="btn-ghost px-2 py-1" aria-label={dir === "up" ? "上へ" : "下へ"}>{dir === "up" ? "↑" : "↓"}</button>
        </form>
      ))}
    </div>
  );
}

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInstructor();
  const course = getCourseById(Number((await params).id));
  if (!course || course.instructor_id !== user.id) notFound();
  const curriculum = getCurriculum(course.id);
  const stats = getCourseStats(course.id);

  return (
    <div className="container-page max-w-5xl py-10">
      <Link href="/instructor" className="text-sm text-brand-700 hover:underline">← ダッシュボードに戻る</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-gray-600">
            <span className={`mr-2 rounded px-1.5 py-0.5 font-semibold ${course.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{course.published ? "公開中" : "下書き"}</span>
            {stats.lecture_count}レクチャー・受講者{stats.student_count}人
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${course.slug}`} className="btn-outline">プレビュー</Link>
          <form action={setPublished}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="publish" value={course.published ? "0" : "1"} />
            <SubmitButton className={course.published ? "btn-outline" : "btn-primary"} disabled={!course.published && stats.lecture_count === 0}>
              {course.published ? "非公開にする" : "公開する"}
            </SubmitButton>
          </form>
        </div>
      </div>
      {!course.published && stats.lecture_count === 0 && <p className="mt-2 text-sm text-amber-700">公開するには少なくとも1つのレクチャーを追加してください。</p>}

      <section className="card mt-8 p-6">
        <h2 className="mb-4 text-lg font-bold">コース情報</h2>
        <CourseInfoForm course={course} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">カリキュラム</h2>
        <div className="mt-4 space-y-4">
          {curriculum.map((s, si) => (
            <div key={s.id} className="card bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">セクション{si + 1}:</span>
                <form action={renameSection} className="flex flex-1 gap-2">
                  <input type="hidden" name="sectionId" value={s.id} />
                  <input name="title" defaultValue={s.title} className="input flex-1 bg-white" />
                  <button className="btn-ghost">名前を保存</button>
                </form>
                <MoveButtons action={moveSection} idName="sectionId" id={s.id} />
                <form action={deleteSection}>
                  <input type="hidden" name="sectionId" value={s.id} />
                  <ConfirmButton message="このセクションとその中のレクチャーをすべて削除しますか？" className="btn-ghost text-red-600">削除</ConfirmButton>
                </form>
              </div>
              <ul className="mt-3 space-y-2">
                {s.lectures.map((l, li) => (
                  <li key={l.id} className="rounded-md border border-gray-200 bg-white">
                    <details>
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm">
                        <span className="text-gray-500">{li + 1}.</span>
                        <span className="flex-1 font-semibold">{l.video_url ? "▶" : "📄"} {l.title}</span>
                        {l.is_preview ? <span className="rounded bg-brand-100 px-1.5 text-xs text-brand-700">プレビュー</span> : null}
                        <span className="text-gray-500">{l.duration_min}分</span>
                        <span className="text-brand-700">編集</span>
                      </summary>
                      <div className="border-t border-gray-200 p-4">
                        <form action={updateLecture} className="space-y-3">
                          <input type="hidden" name="lectureId" value={l.id} />
                          <LectureFields lecture={l} />
                          <SubmitButton>レクチャーを保存</SubmitButton>
                        </form>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                          <MoveButtons action={moveLecture} idName="lectureId" id={l.id} />
                          <form action={deleteLecture}>
                            <input type="hidden" name="lectureId" value={l.id} />
                            <ConfirmButton message="このレクチャーを削除しますか？">レクチャーを削除</ConfirmButton>
                          </form>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <details className="mt-3">
                <summary className="btn-outline cursor-pointer list-none bg-white">＋ レクチャーを追加</summary>
                <form action={addLecture} className="mt-3 space-y-3 rounded-md border border-gray-200 bg-white p-4">
                  <input type="hidden" name="sectionId" value={s.id} />
                  <LectureFields />
                  <SubmitButton>追加</SubmitButton>
                </form>
              </details>
            </div>
          ))}
        </div>
        <form action={addSection} className="mt-4 flex gap-2">
          <input type="hidden" name="courseId" value={course.id} />
          <input name="title" placeholder="新しいセクション名" className="input max-w-sm" />
          <SubmitButton className="btn-dark">＋ セクションを追加</SubmitButton>
        </form>
      </section>

      <section className="mt-12 rounded-lg border border-red-200 p-6">
        <h2 className="font-bold text-red-700">危険な操作</h2>
        <p className="mt-1 text-sm text-gray-600">受講者がいるコースは削除できません。</p>
        <form action={deleteCourse} className="mt-3">
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmButton message="このコースを完全に削除しますか？この操作は取り消せません。">コースを削除</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
