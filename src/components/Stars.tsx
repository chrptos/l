export function Stars({ rating, size = "text-sm" }: { rating: number | null; size?: string }) {
  const r = rating ?? 0;
  return (
    <span className={`inline-flex ${size}`} aria-label={`評価 ${r} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(r) ? "text-amber-500" : "text-gray-300"}>★</span>
      ))}
    </span>
  );
}
