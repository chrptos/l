import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/queries";
import { checkout, removeFromCart } from "@/app/actions/learning";
import { formatPrice } from "@/lib/constants";
import { Thumbnail } from "@/components/Thumbnail";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "ショッピングカート" };

export default async function CartPage() {
  const user = await requireUser("/cart");
  const items = getCart(user.id);
  const total = items.reduce((a, c) => a + c.price, 0);
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">ショッピングカート</h1>
      <p className="mt-2 text-sm text-gray-600">{items.length}コースがカートに入っています</p>
      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-gray-600">カートは空です。</p>
          <Link href="/courses" className="btn-primary mt-4">コースを探す</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {items.map((c) => (
              <li key={c.id} className="flex gap-4 py-4">
                <Link href={`/courses/${c.slug}`} className="w-32 shrink-0 overflow-hidden rounded">
                  <Thumbnail url={c.thumbnail_url} slug={c.slug} title={c.title} category={c.category} />
                </Link>
                <div className="flex-1">
                  <Link href={`/courses/${c.slug}`} className="font-bold hover:text-brand-700">{c.title}</Link>
                  <p className="text-xs text-gray-600">{c.instructor_name}</p>
                  <form action={removeFromCart} className="mt-2">
                    <input type="hidden" name="courseId" value={c.id} />
                    <button className="text-sm text-brand-700 hover:underline">削除</button>
                  </form>
                </div>
                <p className="font-bold">{formatPrice(c.price)}</p>
              </li>
            ))}
          </ul>
          <div>
            <p className="text-sm font-bold text-gray-600">合計:</p>
            <p className="text-4xl font-bold">{formatPrice(total)}</p>
            <form action={checkout} className="mt-4">
              <SubmitButton className="btn-primary w-full py-3">購入手続きへ</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-gray-500">※ デモ環境のため、実際の決済は行われません。</p>
          </div>
        </div>
      )}
    </div>
  );
}
