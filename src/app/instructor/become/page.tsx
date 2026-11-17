import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { becomeInstructor } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "講師になる" };

export default async function BecomeInstructor() {
  const user = await requireUser("/instructor/become");
  if (user.role === "instructor") redirect("/instructor");
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-bold">講師として教えよう</h1>
      <p className="mt-2 text-gray-600">あなたの専門知識をコースにして公開できます。まずはプロフィールを設定しましょう。</p>
      <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <li className="card p-4">🎬<p className="mt-1 font-bold">コースを作成</p><p className="text-gray-600">動画とテキストでカリキュラムを構成</p></li>
        <li className="card p-4">🌏<p className="mt-1 font-bold">公開する</p><p className="text-gray-600">無料・有料を自由に設定</p></li>
        <li className="card p-4">📈<p className="mt-1 font-bold">成長を追う</p><p className="text-gray-600">受講者数・評価・売上を確認</p></li>
      </ul>
      <form action={becomeInstructor} className="card mt-8 space-y-4 p-6">
        <div><label className="label">肩書き</label><input name="headline" defaultValue={user.headline} className="input" placeholder="例: フルスタックエンジニア" /></div>
        <div><label className="label">自己紹介</label><textarea name="bio" defaultValue={user.bio} rows={5} className="input" placeholder="経歴や得意分野など" /></div>
        <SubmitButton className="btn-primary w-full py-3">講師として登録する</SubmitButton>
      </form>
    </div>
  );
}
