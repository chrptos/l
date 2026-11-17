import "server-only";
import { db } from "./db";

export type CourseCard = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  price: number;
  thumbnail_url: string;
  published: number;
  instructor_name: string;
  avg_rating: number | null;
  review_count: number;
  student_count: number;
  lecture_count: number;
  total_minutes: number;
};

const CARD_SELECT = `
  SELECT c.id, c.slug, c.title, c.subtitle, c.category, c.level, c.price, c.thumbnail_url, c.published,
         u.name AS instructor_name,
         (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.course_id = c.id) AS avg_rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id) AS review_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM lectures l JOIN sections s ON s.id = l.section_id WHERE s.course_id = c.id) AS lecture_count,
         (SELECT COALESCE(SUM(l.duration_min), 0) FROM lectures l JOIN sections s ON s.id = l.section_id WHERE s.course_id = c.id) AS total_minutes
  FROM courses c JOIN users u ON u.id = c.instructor_id
`;

export type CourseSort = "popular" | "rating" | "newest" | "price_asc" | "price_desc";

const SORTS: Record<CourseSort, string> = {
  popular: "student_count DESC, c.id DESC",
  rating: "avg_rating DESC NULLS LAST, review_count DESC",
  newest: "c.created_at DESC, c.id DESC",
  price_asc: "c.price ASC",
  price_desc: "c.price DESC",
};

export function searchCourses(opts: { q?: string; category?: string; level?: string; price?: string; sort?: string }): CourseCard[] {
  const where = ["c.published = 1"];
  const params: (string | number)[] = [];
  if (opts.q) {
    where.push("(c.title LIKE ? OR c.subtitle LIKE ? OR c.description LIKE ? OR u.name LIKE ?)");
    const like = `%${opts.q}%`;
    params.push(like, like, like, like);
  }
  if (opts.category) {
    where.push("c.category = ?");
    params.push(opts.category);
  }
  if (opts.level) {
    where.push("c.level = ?");
    params.push(opts.level);
  }
  if (opts.price === "free") where.push("c.price = 0");
  if (opts.price === "paid") where.push("c.price > 0");
  const order = SORTS[(opts.sort as CourseSort) ?? "popular"] ?? SORTS.popular;
  return db.prepare(`${CARD_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order}`).all(...params) as CourseCard[];
}

export function getInstructorCourses(instructorId: number): CourseCard[] {
  return db.prepare(`${CARD_SELECT} WHERE c.instructor_id = ? ORDER BY c.updated_at DESC`).all(instructorId) as CourseCard[];
}

export type Course = {
  id: number;
  instructor_id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  price: number;
  thumbnail_url: string;
  what_you_learn: string;
  published: number;
  updated_at: string;
};

export type Lecture = {
  id: number;
  section_id: number;
  title: string;
  video_url: string;
  content: string;
  duration_min: number;
  is_preview: number;
  position: number;
};

export type Section = { id: number; course_id: number; title: string; position: number; lectures: Lecture[] };

export function getCourseBySlug(slug: string): Course | undefined {
  return db.prepare("SELECT * FROM courses WHERE slug = ?").get(slug) as Course | undefined;
}

export function getCourseById(id: number): Course | undefined {
  return db.prepare("SELECT * FROM courses WHERE id = ?").get(id) as Course | undefined;
}

export function getCourseStats(courseId: number) {
  return db.prepare(`${CARD_SELECT} WHERE c.id = ?`).get(courseId) as CourseCard;
}

export function getCurriculum(courseId: number): Section[] {
  const sections = db.prepare("SELECT * FROM sections WHERE course_id = ? ORDER BY position, id").all(courseId) as Omit<Section, "lectures">[];
  const lectures = db
    .prepare(
      `SELECT l.* FROM lectures l JOIN sections s ON s.id = l.section_id
       WHERE s.course_id = ? ORDER BY l.position, l.id`,
    )
    .all(courseId) as Lecture[];
  return sections.map((s) => ({ ...s, lectures: lectures.filter((l) => l.section_id === s.id) }));
}

export function getInstructor(id: number) {
  return db.prepare("SELECT id, name, headline, bio FROM users WHERE id = ?").get(id) as
    | { id: number; name: string; headline: string; bio: string }
    | undefined;
}

export function getInstructorStats(id: number) {
  return db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM courses WHERE instructor_id = ? AND published = 1) AS courses,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = ?) AS students,
        (SELECT COUNT(*) FROM reviews r JOIN courses c ON c.id = r.course_id WHERE c.instructor_id = ?) AS reviews,
        (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN courses c ON c.id = r.course_id WHERE c.instructor_id = ?) AS rating,
        (SELECT COALESCE(SUM(e.price_paid), 0) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = ?) AS revenue`,
    )
    .get(id, id, id, id, id) as { courses: number; students: number; reviews: number; rating: number | null; revenue: number };
}

export type Review = { id: number; rating: number; comment: string; created_at: string; user_id: number; user_name: string };

export function getReviews(courseId: number): Review[] {
  return db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.course_id = ? ORDER BY r.created_at DESC, r.id DESC`,
    )
    .all(courseId) as Review[];
}

export function getRatingDistribution(courseId: number): Record<number, number> {
  const rows = db.prepare("SELECT rating, COUNT(*) AS n FROM reviews WHERE course_id = ? GROUP BY rating").all(courseId) as { rating: number; n: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) dist[r.rating] = r.n;
  return dist;
}

export function isEnrolled(userId: number, courseId: number): boolean {
  return !!db.prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?").get(userId, courseId);
}

export function isInCart(userId: number, courseId: number): boolean {
  return !!db.prepare("SELECT 1 FROM cart_items WHERE user_id = ? AND course_id = ?").get(userId, courseId);
}

export function getCart(userId: number): CourseCard[] {
  return db
    .prepare(`${CARD_SELECT} JOIN cart_items ci ON ci.course_id = c.id WHERE ci.user_id = ? ORDER BY c.title`)
    .all(userId) as CourseCard[];
}

export function getCartCount(userId: number): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM cart_items WHERE user_id = ?").get(userId) as { n: number }).n;
}

export type EnrolledCourse = CourseCard & { completed: number; last_lecture_id: number | null };

export function getEnrolledCourses(userId: number): EnrolledCourse[] {
  return db
    .prepare(
      `SELECT * FROM (${CARD_SELECT} JOIN enrollments e ON e.course_id = c.id WHERE e.user_id = ?) x
       ORDER BY x.id DESC`,
    )
    .all(userId)
    .map((c) => {
      const card = c as CourseCard;
      const p = db
        .prepare(
          `SELECT COUNT(*) AS completed, MAX(lp.lecture_id) AS last_lecture_id
           FROM lecture_progress lp JOIN lectures l ON l.id = lp.lecture_id JOIN sections s ON s.id = l.section_id
           WHERE lp.user_id = ? AND s.course_id = ?`,
        )
        .get(userId, card.id) as { completed: number; last_lecture_id: number | null };
      return { ...card, ...p };
    });
}

export function getCompletedLectureIds(userId: number, courseId: number): Set<number> {
  const rows = db
    .prepare(
      `SELECT lp.lecture_id FROM lecture_progress lp JOIN lectures l ON l.id = lp.lecture_id
       JOIN sections s ON s.id = l.section_id WHERE lp.user_id = ? AND s.course_id = ?`,
    )
    .all(userId, courseId) as { lecture_id: number }[];
  return new Set(rows.map((r) => r.lecture_id));
}

export function getUserReview(userId: number, courseId: number) {
  return db.prepare("SELECT rating, comment FROM reviews WHERE user_id = ? AND course_id = ?").get(userId, courseId) as
    | { rating: number; comment: string }
    | undefined;
}

export function getCategoryCounts(): Record<string, number> {
  const rows = db.prepare("SELECT category, COUNT(*) AS n FROM courses WHERE published = 1 GROUP BY category").all() as { category: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.category, r.n]));
}
