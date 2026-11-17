"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ user }: { user: { name: string; headline: string; bio: string } }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label">氏名</label><input name="name" defaultValue={user.name} className="input" required /></div>
      <div><label className="label">肩書き</label><input name="headline" defaultValue={user.headline} className="input" placeholder="例: Webエンジニア" /></div>
      <div><label className="label">自己紹介</label><textarea name="bio" defaultValue={user.bio} rows={5} className="input" /></div>
      <FormMessage state={state} />
      <SubmitButton>保存</SubmitButton>
    </form>
  );
}
