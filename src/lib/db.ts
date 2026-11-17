import "server-only";
import { DatabaseSync, type StatementSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "lms.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','instructor')),
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'development',
  level TEXT NOT NULL DEFAULT 'all' CHECK (level IN ('beginner','intermediate','advanced','all')),
  price INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  what_you_learn TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  duration_min INTEGER NOT NULL DEFAULT 0,
  is_preview INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lecture_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lecture_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published, category);
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id, position);
CREATE INDEX IF NOT EXISTS idx_lectures_section ON lectures(section_id, position);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
`;

declare global {
  // eslint-disable-next-line no-var
  var __lmsDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const conn = new DatabaseSync(DB_PATH, { timeout: 10_000 });
  conn.exec(SCHEMA);
  seed(conn);
  return conn;
}

function getDb(): DatabaseSync {
  return (globalThis.__lmsDb ??= open());
}

/**
 * node:sqlite returns rows with a null prototype, which React refuses to pass to
 * Client Components. Wrap statements so get()/all() return plain objects.
 */
function plainStatement(stmt: StatementSync): StatementSync {
  return new Proxy(stmt, {
    get(target, prop) {
      if (prop === "get") return (...args: SQLInputValue[]) => {
        const row = target.get(...args);
        return row ? { ...row } : row;
      };
      if (prop === "all") return (...args: SQLInputValue[]) => target.all(...args).map((r) => ({ ...r }));
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** Lazily-opened shared connection (opened on first use, not at import time). */
export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_, prop) {
    const conn = getDb();
    if (prop === "prepare") return (sql: string) => plainStatement(conn.prepare(sql));
    const value = Reflect.get(conn, prop, conn);
    return typeof value === "function" ? value.bind(conn) : value;
  },
});

/** Run fn inside a transaction. */
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Seed data (demo accounts + sample courses)
// ---------------------------------------------------------------------------

type SeedCourse = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  price: number;
  learn: string[];
  sections: { title: string; lectures: { title: string; min: number; preview?: boolean; video?: string }[] }[];
};

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const SEED_COURSES: SeedCourse[] = [
  {
    slug: "modern-javascript-bootcamp",
    title: "モダンJavaScript完全ブートキャンプ",
    subtitle: "ES2024までの文法から非同期処理、DOM操作までを実践で学ぶ",
    description:
      "JavaScriptをゼロから学び、実務で使えるレベルまで引き上げるコースです。\n変数・関数といった基礎から、Promise/async-await、モジュール、ブラウザAPIまで、手を動かしながら理解します。",
    category: "development",
    level: "beginner",
    price: 2400,
    learn: ["モダンなJavaScriptの文法を理解する", "非同期処理を正しく書ける", "DOMを操作して動くWebページを作れる", "ES Modulesでコードを整理できる"],
    sections: [
      { title: "はじめに", lectures: [{ title: "コースの概要", min: 4, preview: true, video: SAMPLE_VIDEO }, { title: "開発環境のセットアップ", min: 9 }] },
      { title: "基本文法", lectures: [{ title: "変数と型", min: 12 }, { title: "関数とアロー関数", min: 15 }, { title: "配列とオブジェクト", min: 18 }] },
      { title: "非同期処理", lectures: [{ title: "コールバックとPromise", min: 16 }, { title: "async / await", min: 14 }, { title: "fetchでAPIを叩く", min: 20 }] },
    ],
  },
  {
    slug: "react-nextjs-practical",
    title: "React & Next.js 実践開発入門",
    subtitle: "App Router・Server Components時代のフロントエンド開発",
    description: "Reactの基本からNext.jsのApp Router、サーバーアクション、データ取得パターンまでを一気通貫で学びます。",
    category: "development",
    level: "intermediate",
    price: 3600,
    learn: ["Reactのコンポーネント設計", "Server Componentsとクライアントコンポーネントの使い分け", "Next.jsでフルスタックアプリを作る"],
    sections: [
      { title: "React基礎", lectures: [{ title: "JSXとコンポーネント", min: 10, preview: true, video: SAMPLE_VIDEO }, { title: "StateとProps", min: 14 }, { title: "フック入門", min: 17 }] },
      { title: "Next.js", lectures: [{ title: "App Routerの構造", min: 13 }, { title: "Server Actions", min: 19 }, { title: "デプロイ", min: 8 }] },
    ],
  },
  {
    slug: "python-data-analysis",
    title: "Pythonではじめるデータ分析",
    subtitle: "pandas・可視化・統計の基本をハンズオンで",
    description: "Pythonの基礎からpandasを使ったデータ加工、グラフによる可視化、基本統計までを学ぶ、データ分析の入門コースです。",
    category: "data",
    level: "beginner",
    price: 2900,
    learn: ["Pythonの基本文法", "pandasでデータを集計・加工", "グラフでデータを可視化", "基本的な統計指標を理解"],
    sections: [
      { title: "Python入門", lectures: [{ title: "Pythonとは", min: 6, preview: true, video: SAMPLE_VIDEO }, { title: "データ型と制御構文", min: 20 }] },
      { title: "pandas", lectures: [{ title: "DataFrameの基本", min: 18 }, { title: "集計とグループ化", min: 22 }] },
      { title: "可視化", lectures: [{ title: "グラフの種類と選び方", min: 12 }, { title: "実データで分析してみよう", min: 25 }] },
    ],
  },
  {
    slug: "ui-design-fundamentals",
    title: "UIデザインの基礎",
    subtitle: "余白・タイポグラフィ・色で「伝わる」画面をつくる",
    description: "エンジニアやPMにも役立つ、UIデザインの原則を学ぶコースです。Figmaでの実践も含みます。",
    category: "design",
    level: "all",
    price: 0,
    learn: ["レイアウトと余白の原則", "タイポグラフィの基本", "配色の考え方", "Figmaでのワイヤーフレーム作成"],
    sections: [
      { title: "デザインの原則", lectures: [{ title: "良いUIとは", min: 7, preview: true, video: SAMPLE_VIDEO }, { title: "余白とグリッド", min: 11 }, { title: "タイポグラフィ", min: 13 }] },
      { title: "Figma実践", lectures: [{ title: "Figmaの基本操作", min: 15 }, { title: "ワイヤーフレームを作る", min: 21 }] },
    ],
  },
  {
    slug: "marketing-analytics",
    title: "Webマーケティング & アクセス解析",
    subtitle: "数字に基づいて施策を考えるための実践スキル",
    description: "KPI設計、ファネル分析、A/Bテストなど、Webマーケティングで成果を出すための考え方とツールを学びます。",
    category: "business",
    level: "intermediate",
    price: 1800,
    learn: ["KPIツリーの作り方", "ファネル分析", "A/Bテストの設計と評価"],
    sections: [
      { title: "マーケティングの基礎", lectures: [{ title: "KPIを設計する", min: 12, preview: true, video: SAMPLE_VIDEO }, { title: "ファネル分析", min: 16 }] },
      { title: "改善サイクル", lectures: [{ title: "A/Bテストの設計", min: 14 }, { title: "結果の読み方", min: 10 }] },
    ],
  },
];

/** Inserts demo data into an empty database. Safe to call concurrently from several processes. */
function seed(db: DatabaseSync) {
  db.exec("BEGIN IMMEDIATE");
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n > 0) {
    db.exec("COMMIT");
    return;
  }
  const pw = hashPassword("password123");
  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role, headline, bio) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
  );
  try {
    const teacher = insertUser.get("山田 太郎", "instructor@example.com", pw, "instructor", "ソフトウェアエンジニア / 講師", "10年以上Web開発に携わり、延べ1万人以上に教えてきました。") as { id: number };
    const teacher2 = insertUser.get("佐藤 花子", "hanako@example.com", pw, "instructor", "データサイエンティスト・デザイナー", "データとデザインの両面からプロダクトづくりを支援しています。") as { id: number };
    const student = insertUser.get("学習 次郎", "student@example.com", pw, "student", "", "") as { id: number };

    const insertCourse = db.prepare(
      `INSERT INTO courses (instructor_id, slug, title, subtitle, description, category, level, price, what_you_learn, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING id`,
    );
    const insertSection = db.prepare("INSERT INTO sections (course_id, title, position) VALUES (?, ?, ?) RETURNING id");
    const insertLecture = db.prepare(
      "INSERT INTO lectures (section_id, title, video_url, content, duration_min, is_preview, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const insertReview = db.prepare("INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)");

    SEED_COURSES.forEach((c, i) => {
      const owner = i % 2 === 0 ? teacher.id : teacher2.id;
      const { id: courseId } = insertCourse.get(owner, c.slug, c.title, c.subtitle, c.description, c.category, c.level, c.price, c.learn.join("\n")) as { id: number };
      c.sections.forEach((s, si) => {
        const { id: sectionId } = insertSection.get(courseId, s.title, si) as { id: number };
        s.lectures.forEach((l, li) => {
          insertLecture.run(sectionId, l.title, l.video ?? SAMPLE_VIDEO, `「${l.title}」のレクチャーノートです。\n\n動画を視聴したら、自分の手で同じ内容を試してみましょう。`, l.min, l.preview ? 1 : 0, li);
        });
      });
      if (i < 3) {
        db.prepare("INSERT INTO enrollments (user_id, course_id, price_paid) VALUES (?, ?, ?)").run(student.id, courseId, c.price);
        insertReview.run(student.id, courseId, 5 - (i % 2), "とても分かりやすく、実践的な内容でした！");
      }
    });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
