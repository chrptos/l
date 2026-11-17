export const CATEGORIES: Record<string, { label: string; icon: string }> = {
  development: { label: "開発", icon: "💻" },
  data: { label: "データサイエンス", icon: "📊" },
  design: { label: "デザイン", icon: "🎨" },
  business: { label: "ビジネス", icon: "📈" },
  it: { label: "IT・ソフトウェア", icon: "🛠️" },
  lifestyle: { label: "ライフスタイル", icon: "🌱" },
  language: { label: "語学", icon: "🗣️" },
};

export const LEVELS: Record<string, string> = {
  all: "すべてのレベル",
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export function formatPrice(yen: number): string {
  return yen === 0 ? "無料" : `¥${yen.toLocaleString("ja-JP")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/** Deterministic gradient for courses without a thumbnail. */
export function thumbnailGradient(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h % 80)) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 45%), hsl(${b} 75% 35%))`;
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base || "course";
}

/** Convert a YouTube/Vimeo URL into an embeddable URL; returns null for direct video files. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}
