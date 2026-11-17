import type { FormState } from "@/app/actions/auth";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.ok}</p>;
  return null;
}
