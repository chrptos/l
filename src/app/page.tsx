import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { searchCourses, getCategoryCounts } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function Home() {
  const popular = searchCourses({ sort: "popular" }).slice(0, 8);
  const newest = searchCourses({ sort: "newest" }).slice(0, 4);
  const counts = getCategoryCounts();
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="container-page py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">学びで、明日の自分をアップデートしよう</h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">プログラミング、データ、デザイン、ビジネス。現役のプロから、自分のペースで学べます。</p>
          <form action="/courses" className="mt-8 flex max-w-xl gap-2">
            <input name="q" placeholder="例: JavaScript, Python, デザイン" className="flex-1 rounded-md px-4 py-3 text-gray-900 outline-none" />
            <button className="btn-dark px-6">検索</button>
          </form>
        </div>
      </section>

      <section className="container-page mt-12">
        <h2 className="text-2xl font-bold">カテゴリから探す</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <Link key={key} href={`/courses?category=${key}`} className="card flex flex-col items-center gap-1 p-4 text-center hover:border-gray-900">
              <span className="text-3xl">{c.icon}</span>
              <span className="text-sm font-semibold">{c.label}</span>
              <span className="text-xs text-gray-500">{counts[key] ?? 0}コース</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">人気のコース</h2>
          <Link href="/courses" className="text-sm font-semibold text-brand-700 hover:underline">すべて見る →</Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <section className="container-page mt-12">
        <h2 className="text-2xl font-bold">新着コース</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {newest.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <section className="container-page mt-16">
        <div className="card flex flex-col items-start gap-4 bg-gray-50 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">講師として教えてみませんか？</h2>
            <p className="mt-1 text-gray-600">あなたの知識をコースにして、世界中の学習者に届けましょう。</p>
          </div>
          <Link href="/instructor" className="btn-dark">今すぐ始める</Link>
        </div>
      </section>
    </>
  );
}
