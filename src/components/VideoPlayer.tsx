import { toEmbedUrl } from "@/lib/constants";

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  if (!url) {
    return <div className="flex aspect-video w-full items-center justify-center bg-gray-900 text-gray-400">このレクチャーには動画がありません</div>;
  }
  const embed = toEmbedUrl(url);
  if (embed) {
    return <iframe src={embed} title={title} className="aspect-video w-full bg-black" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  }
  return <video key={url} src={url} controls className="aspect-video w-full bg-black" />;
}
