"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button onClick={reset} className="btn-primary mt-6">再試行</button>
    </div>
  );
}
