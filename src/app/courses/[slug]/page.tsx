import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getCourseBySlug,
  getCourseStats,
  getCurriculum,
  getInstructor,
  getInstructorStats,
  getRatingDistribution,
  getReviews,
  isEnrolled,
  isInCart,
} from "@/lib/queries";
import { CATEGORIES, formatDuration, formatPrice, LEVELS } from "@/lib/constants";
import { enrollOrAddToCart } from "@/app/actions/learning";
import { Stars } from "@/components/Stars";
import { Thumbnail } from "@/components/Thumbnail";
import { SubmitButton } from "@/components/SubmitButton";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const course = getCourseBySlug((await params).slug);
  return { title: course?.title ?? "コース", description: course?.subtitle };
}

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  const user = await getCurrentUser();
  const isOwner = !!user && course?.instructor_id === user.id;
  if (!course || (!course.published && !isOwner)) notFound();

  const stats = getCourseStats(course.id);
  const curriculum = getCurriculum(course.id);
  const instructor = getInstructor(course.instructor_id)!;
  const iStats = getInstructorStats(instructor.id);
  const reviews = getReviews(course.id);
  const dist = getRatingDistribution(course.id);
  const enrolled = user ? isEnrolled(user.id, course.id) : false;
  const inCart = user ? isInCart(user.id, course.id) : false;
  const learn = course.what_you_learn.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      {!course.published && (
        <div className="bg-amber-100 py-2 text-center text-sm text-amber-900">
          このコースは非公開です（プレビュー表示）。<Link href={`/instructor/courses/${course.id}`} className="font-semibold underline">編集に戻る</Link>
        </div>
      )}
      <section className="bg-gray-900 text-white">
        <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
          <div>
            <nav className="text-sm text-brand-100">
              <Link href={`/courses?category=${course.category}`} className="hover:underline">{CATEGORIES[course.category]?.label}</Link>
            </nav>
            <h1 className="mt-2 text-3xl font-bold leading-tight">{course.title}</h1>
            <p className="mt-3 text-lg text-gray-200">{course.subtitle}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-bold text-amber-400">{stats.avg_rating?.toFixed(1) ?? "—"}</span>
              <Stars rating={stats.avg_rating} />
              <span className="text-brand-100">({stats.review_count}件の評価)</span>
              <span>{stats.student_count.toLocaleString()}人の受講生</span>
            </div>
            <p className="mt-2 text-sm">
              講師: <a href="#instructor" className="text-brand-100 underline">{instructor.name}</a>
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {LEVELS[course.level]}・{formatDuration(stats.total_minutes)}・{stats.lecture_count}レクチャー・最終更新 {course.updated_at.slice(0, 10)}
            </p>
          </div>
          {/* purchase card */}
          <div className="lg:row-span-2">
            <div className="card overflow-hidden text-gray-900 shadow-xl lg:sticky lg:top-20">
              <Thumbnail url={course.thumbnail_url} slug={course.slug} title={course.title} category={course.category} />
              <div className="space-y-3 p-5">
                <p className="text-3xl font-bold">{formatPrice(course.price)}</p>
                {enrolled ? (
                  <Link href={`/learn/${course.slug}`} className="btn-primary w-full py-3">コースに移動</Link>
                ) : isOwner ? (
                  <Link href={`/instructor/courses/${course.id}`} className="btn-dark w-full py-3">コースを編集</Link>
                ) : course.price === 0 ? (
                  <form action={enrollOrAddToCart}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <SubmitButton className="btn-primary w-full py-3">無料で受講する</SubmitButton>
                  </form>
                ) : (
                  <>
                    {inCart ? (
                      <Link href="/cart" className="btn-primary w-full py-3">カートに移動</Link>
                    ) : (
                      <form action={enrollOrAddToCart}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <SubmitButton className="btn-primary w-full py-3">カートに追加</SubmitButton>
                      </form>
                    )}
                    <form action={enrollOrAddToCart}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="buyNow" value="1" />
                      <SubmitButton className="btn-outline w-full py-3">今すぐ購入</SubmitButton>
                    </form>
                  </>
                )}
                <ul className="space-y-1 pt-2 text-sm text-gray-700">
                  <li>📹 {formatDuration(stats.total_minutes)}のオンデマンド動画</li>
                  <li>📄 {stats.lecture_count}本のレクチャー</li>
                  <li>♾️ 無期限アクセス</li>
                  <li>🏆 修了証明書</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10 py-8">
          {learn.length > 0 && (
            <section className="card p-6">
              <h2 className="text-xl font-bold">学習内容</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {learn.map((l, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span>✓</span>{l}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">コースの内容</h2>
            <p className="mt-1 text-sm text-gray-600">
              {curriculum.length}セクション・{stats.lecture_count}レクチャー・合計{formatDuration(stats.total_minutes)}
            </p>
            <div className="mt-3 divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200">
              {curriculum.map((s, i) => (
                <details key={s.id} open={i === 0} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-4 py-3 font-semibold">
                    <span><span className="mr-2 inline-block transition group-open:rotate-90">›</span>{s.title}</span>
                    <span className="text-sm font-normal text-gray-600">
                      {s.lectures.length}レクチャー・{formatDuration(s.lectures.reduce((a, l) => a + l.duration_min, 0))}
                    </span>
                  </summary>
                  <ul>
                    {s.lectures.map((l) => (
                      <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span>{l.video_url ? "▶" : "📄"} {l.title}</span>
                        <span className="flex items-center gap-3 text-gray-500">
                          {l.is_preview ? (
                            <Link href={`/learn/${course.slug}/${l.id}`} className="font-semibold text-brand-700 underline">プレビュー</Link>
                          ) : null}
                          {l.duration_min}分
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {course.description && (
            <section>
              <h2 className="text-xl font-bold">説明</h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{course.description}</div>
            </section>
          )}

          <section id="instructor">
            <h2 className="text-xl font-bold">講師</h2>
            <p className="mt-3 text-lg font-bold text-brand-700">{instructor.name}</p>
            <p className="text-sm text-gray-600">{instructor.headline}</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-3xl font-bold text-white">{instructor.name.slice(0, 1)}</div>
              <ul className="text-sm text-gray-700">
                <li>⭐ 講師評価 {iStats.rating ?? "—"}</li>
                <li>💬 {iStats.reviews}件のレビュー</li>
                <li>👥 {iStats.students}人の受講生</li>
                <li>▶ {iStats.courses}コース</li>
              </ul>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{instructor.bio}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">
              <span className="text-amber-600">★</span> {stats.avg_rating?.toFixed(1) ?? "—"} コース評価・{stats.review_count}件
            </h2>
            {stats.review_count > 0 && (
              <div className="mt-4 max-w-md space-y-1">
                {[5, 4, 3, 2, 1].map((r) => {
                  const pct = Math.round((dist[r] / stats.review_count) * 100);
                  return (
                    <div key={r} className="flex items-center gap-3 text-sm">
                      <div className="h-2 flex-1 overflow-hidden rounded bg-gray-200"><div className="h-full bg-gray-600" style={{ width: `${pct}%` }} /></div>
                      <Stars rating={r} size="text-xs" />
                      <span className="w-10 text-right text-gray-600">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{r.user_name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-bold">{r.user_name}</p>
                      <p className="text-xs text-gray-500"><Stars rating={r.rating} size="text-xs" /> {r.created_at.slice(0, 10)}</p>
                    </div>
                  </div>
                  {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{r.comment}</p>}
                </div>
              ))}
              {reviews.length === 0 && <p className="text-sm text-gray-600">まだレビューはありません。</p>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
