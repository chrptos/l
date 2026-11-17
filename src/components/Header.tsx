import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/queries";
import { logout } from "@/app/actions/auth";

export async function Header() {
  const user = await getCurrentUser();
  const cartCount = user ? getCartCount(user.id) : 0;
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0 text-xl font-black tracking-tight text-brand-700">
          Manabi<span className="text-gray-900">.</span>
        </Link>
        <form action="/courses" className="hidden flex-1 md:block">
          <input name="q" placeholder="何を学びたいですか？" className="w-full rounded-full border border-gray-400 bg-gray-50 px-5 py-2.5 text-sm outline-none focus:border-gray-900 focus:bg-white" />
        </form>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/courses" className="btn-ghost md:hidden">検索</Link>
          <Link href="/instructor" className="btn-ghost hidden sm:inline-flex">{user?.role === "instructor" ? "講師ダッシュボード" : "講師になる"}</Link>
          {user ? (
            <>
              <Link href="/my-learning" className="btn-ghost">マイラーニング</Link>
              <Link href="/cart" className="btn-ghost relative" aria-label="カート">
                🛒
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{cartCount}</span>
                )}
              </Link>
              <details className="relative">
                <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-gray-900 font-bold text-white">
                  {user.name.slice(0, 1)}
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-gray-100 px-4 pb-2">
                    <p className="font-bold">{user.name}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link href="/my-learning" className="block px-4 py-2 hover:bg-gray-50">マイラーニング</Link>
                  <Link href="/instructor" className="block px-4 py-2 hover:bg-gray-50">講師ダッシュボード</Link>
                  <Link href="/profile" className="block px-4 py-2 hover:bg-gray-50">プロフィール</Link>
                  <form action={logout}>
                    <button className="block w-full px-4 py-2 text-left hover:bg-gray-50">ログアウト</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">ログイン</Link>
              <Link href="/signup" className="btn-dark">新規登録</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
