import { CATEGORIES, thumbnailGradient } from "@/lib/constants";

export function Thumbnail({ url, slug, title, category, className = "" }: { url: string; slug: string; title: string; category: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} className={`aspect-video w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex aspect-video w-full items-center justify-center p-4 text-center ${className}`} style={{ background: thumbnailGradient(slug) }}>
      <div>
        <div className="text-4xl">{CATEGORIES[category]?.icon ?? "📚"}</div>
        <div className="mt-2 line-clamp-2 text-sm font-bold text-white/95">{title}</div>
      </div>
    </div>
  );
}
