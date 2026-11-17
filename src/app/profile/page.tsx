import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "プロフィール" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-bold">プロフィール</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}・{user.role === "instructor" ? "講師" : "受講者"}</p>
      <div className="card mt-6 p-6"><ProfileForm user={user} /></div>
    </div>
  );
}
