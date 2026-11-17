import type { Lecture } from "@/lib/queries";

export function LectureFields({ lecture }: { lecture?: Lecture }) {
  return (
    <div className="space-y-3">
      <div><label className="label">レクチャータイトル</label><input name="title" defaultValue={lecture?.title} className="input" required /></div>
      <div><label className="label">動画URL（YouTube / Vimeo / mp4）</label><input name="video_url" defaultValue={lecture?.video_url} className="input" placeholder="https://www.youtube.com/watch?v=…" /></div>
      <div><label className="label">レクチャーノート</label><textarea name="content" defaultValue={lecture?.content} rows={3} className="input" /></div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-32"><label className="label">再生時間（分）</label><input name="duration_min" type="number" min={0} defaultValue={lecture?.duration_min ?? 5} className="input" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_preview" defaultChecked={!!lecture?.is_preview} /> 無料プレビューにする</label>
      </div>
    </div>
  );
}
