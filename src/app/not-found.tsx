import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-4xl font-bold">ページが見つかりません</h1>
      <Link href="/" className="btn-primary mt-6">トップへ戻る</Link>
    </div>
  );
}
