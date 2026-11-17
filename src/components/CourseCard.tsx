import Link from "next/link";
import type { CourseCard as Card } from "@/lib/queries";
import { formatDuration, formatPrice, LEVELS } from "@/lib/constants";
import { Stars } from "./Stars";
import { Thumbnail } from "./Thumbnail";

export function CourseCard({ course }: { course: Card }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div className="overflow-hidden rounded-md border border-gray-200">
        <Thumbnail url={course.thumbnail_url} slug={course.slug} title={course.title} category={course.category} className="transition group-hover:opacity-90" />
      </div>
      <h3 className="mt-2 line-clamp-2 font-bold leading-snug group-hover:text-brand-700">{course.title}</h3>
      <p className="mt-0.5 text-xs text-gray-600">{course.instructor_name}</p>
      <div className="mt-1 flex items-center gap-1 text-sm">
        <span className="font-bold text-amber-700">{course.avg_rating?.toFixed(1) ?? "—"}</span>
        <Stars rating={course.avg_rating} size="text-xs" />
        <span className="text-xs text-gray-500">({course.review_count})</span>
      </div>
      <p className="text-xs text-gray-500">
        {formatDuration(course.total_minutes)}・{course.lecture_count}レクチャー・{LEVELS[course.level]}
      </p>
      <p className="mt-1 font-bold">{formatPrice(course.price)}</p>
    </Link>
  );
}
