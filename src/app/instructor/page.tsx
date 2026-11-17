import Link from "next/link";
import { requireInstructor } from "@/lib/auth";
import { getInstructorCourses, getInstructorStats } from "@/lib/queries";
import { formatPrice } from "@/lib/constants";
import { Thumbnail } from "@/components/Thumbnail";
import { NewCourseForm } from "@/components/NewCourseForm";

export const metadata = { title: "講師ダッシュボード" };

export default async function InstructorDashboard() {
  const user = await requireInstructor();
  const stats = getInstructorStats(user.id);
  const courses = getInstructorCourses(user.id);
  const tiles = [
    { label: "総売上", value: formatPrice(stats.revenue).replace("無料", "¥0") },
    { label: "受講者数", value: stats.students.toLocaleString() },
    { label: "平均評価", value: stats.rating?.toFixed(1) ?? "—" },
    { label: "公開コース", value: stats.courses },
  ];
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">講師ダッシュボード</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5"><p className="text-sm text-gray-600">{t.label}</p><p className="mt-1 text-3xl font-bold">{t.value}</p></div>
        ))}
      </div>
      <section className="card mt-8 p-6">
        <h2 className="mb-4 text-lg font-bold">新しいコースを作成</h2>
        <NewCourseForm />
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-bold">あなたのコース</h2>
        <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          {courses.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="w-28 overflow-hidden rounded"><Thumbnail url={c.thumbnail_url} slug={c.slug} title={c.title} category={c.category} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.title}</p>
                <p className="text-xs text-gray-600">
                  <span className={`mr-2 rounded px-1.5 py-0.5 font-semibold ${c.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{c.published ? "公開中" : "下書き"}</span>
                  {formatPrice(c.price)}・{c.lecture_count}レクチャー・受講者{c.student_count}人・評価 {c.avg_rating ?? "—"}（{c.review_count}件）
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/courses/${c.slug}`} className="btn-ghost">表示</Link>
                <Link href={`/instructor/courses/${c.id}`} className="btn-outline">編集</Link>
              </div>
            </li>
          ))}
          {courses.length === 0 && <li className="py-8 text-center text-sm text-gray-600">まだコースがありません。上のフォームから作成しましょう。</li>}
        </ul>
      </section>
    </div>
  );
}
