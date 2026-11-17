# Manabi — Udemy型 LMS プラットフォーム

誰でも学べて、誰でも教えられるオンライン学習プラットフォームの MVP です。

## 技術スタック

- **Next.js 15** (App Router / Server Components / Server Actions) + TypeScript
- **Tailwind CSS**
- **SQLite**（Node.js 組み込みの `node:sqlite`。ネイティブ依存なし）
- 認証: scrypt パスワードハッシュ + DB セッション（httpOnly Cookie）

## 機能

| 受講者 | 講師 |
| --- | --- |
| 会員登録 / ログイン | 講師登録（誰でも講師になれる） |
| コース検索（キーワード・カテゴリ・レベル・価格・並び替え） | コース作成・編集（タイトル、説明、学習内容、価格、レベル、サムネイル） |
| コース詳細（カリキュラム、講師情報、評価分布、レビュー） | セクション / レクチャーの追加・編集・並び替え・削除 |
| 無料プレビューレクチャー | 動画（YouTube / Vimeo / mp4 URL）+ レクチャーノート |
| カート → 購入（デモ決済）/ 無料コースは即受講 | 公開 / 非公開の切り替え |
| 学習プレイヤー（進捗管理、完了して次へ、レジューム） | ダッシュボード（売上・受講者数・平均評価） |
| 星評価レビューの投稿・編集 | |
| マイラーニング（進捗バー） / 修了証明書 | |

## セットアップ

Node.js **22.13 以上**が必要です。

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。初回アクセス時に `data/lms.db` が作られ、デモデータが投入されます。

### デモアカウント（パスワード: `password123`）

- 受講者: `student@example.com`
- 講師: `instructor@example.com` / `hanako@example.com`

DB を初期化するには `npm run db:reset` を実行します。

## ディレクトリ構成

```
src/
  app/
    actions/        Server Actions（auth / learning / instructor）
    courses/        コース一覧・詳細
    learn/          学習プレイヤー
    instructor/     講師ダッシュボード・コースエディタ
    cart/ my-learning/ certificate/ profile/ login/ signup/
  components/       UI コンポーネント
  lib/
    db.ts           スキーマ・接続・シードデータ
    queries.ts      データ取得
    auth.ts         セッション管理
```

## 本番化に向けた次のステップ

- 決済: `checkout()` を Stripe Checkout + Webhook に置き換える
- 動画: アップロード + HLS 配信（Mux / Cloudflare Stream / S3 + CloudFront など）と署名付き URL での保護
- DB: PostgreSQL へ移行（Prisma / Drizzle）
- クーポン・Q&A・お知らせ・クイズ・講師への収益分配・管理者画面
