import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { searchCourses } from "@/lib/queries";
import { CATEGORIES, LEVELS } from "@/lib/constants";

export const metadata = { title: "コースを探す" };

type SP = Promise<Record<string, string | undefined>>;

const SORT_LABELS: Record<string, string> = { popular: "人気順", rating: "評価が高い順", newest: "新しい順", price_asc: "価格が安い順", price_desc: "価格が高い順" };

export default async function CoursesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const courses = searchCourses(sp);
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    return `/courses?${p}`;
  };
  const Filter = ({ name, value, label }: { name: string; value?: string; label: string }) => {
    const active = (sp[name] ?? undefined) === value;
    return (
      <Link href={href({ [name]: value })} className={`block rounded px-2 py-1 text-sm ${active ? "bg-gray-900 font-semibold text-white" : "hover:bg-gray-100"}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold">{sp.q ? `「${sp.q}」の検索結果` : sp.category ? CATEGORIES[sp.category]?.label : "すべてのコース"}</h1>
      <form className="mt-4 flex gap-2 md:hidden">
        <input name="q" defaultValue={sp.q} placeholder="コースを検索" className="input" />
        <button className="btn-dark">検索</button>
      </form>
      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-bold">並び替え</h2>
            <form>
              {Object.entries(sp).filter(([k]) => k !== "sort").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <select name="sort" defaultValue={sp.sort ?? "popular"} className="input">
                {Object.entries(SORT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="btn-outline mt-2 w-full">適用</button>
            </form>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold">カテゴリ</h2>
            <Filter name="category" label="すべて" />
            {Object.entries(CATEGORIES).map(([k, c]) => <Filter key={k} name="category" value={k} label={`${c.icon} ${c.label}`} />)}
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold">レベル</h2>
            <Filter name="level" label="すべて" />
            {Object.entries(LEVELS).map(([k, l]) => <Filter key={k} name="level" value={k} label={l} />)}
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold">価格</h2>
            <Filter name="price" label="すべて" />
            <Filter name="price" value="free" label="無料" />
            <Filter name="price" value="paid" label="有料" />
          </div>
        </aside>
        <section>
          <p className="mb-4 text-sm text-gray-600">{courses.length}件のコース</p>
          {courses.length === 0 ? (
            <div className="card p-10 text-center text-gray-600">条件に一致するコースが見つかりませんでした。</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
