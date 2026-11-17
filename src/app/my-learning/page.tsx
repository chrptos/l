import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEnrolledCourses } from "@/lib/queries";
import { Thumbnail } from "@/components/Thumbnail";

export const metadata = { title: "マイラーニング" };

export default async function MyLearning({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const user = await requireUser("/my-learning");
  const { purchased } = await searchParams;
  const courses = getEnrolledCourses(user.id);
  return (
    <>
      <div className="bg-gray-900 py-10 text-white">
        <div className="container-page"><h1 className="text-3xl font-bold">マイラーニング</h1></div>
      </div>
      <div className="container-page py-8">
        {purchased && <p className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">🎉 購入が完了しました！さっそく学習を始めましょう。</p>}
        {courses.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-600">まだ受講中のコースはありません。</p>
            <Link href="/courses" className="btn-primary mt-4">コースを探す</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => {
              const pct = c.lecture_count ? Math.round((c.completed / c.lecture_count) * 100) : 0;
              return (
                <Link key={c.id} href={`/learn/${c.slug}`} className="group block">
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <Thumbnail url={c.thumbnail_url} slug={c.slug} title={c.title} category={c.category} />
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-bold group-hover:text-brand-700">{c.title}</h3>
                  <p className="text-xs text-gray-600">{c.instructor_name}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-200"><div className="h-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-xs text-gray-600">{pct === 0 ? "学習を開始" : pct === 100 ? "🏆 修了" : `${pct}% 完了`}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
