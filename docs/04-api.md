# 4. API 設計

## 4.1 方針

公開 API（外部の開発者・モバイルアプリ向け）は当面作らない。そのため次のように使い分ける。

| 種類 | 用途 | 例 |
| --- | --- | --- |
| **Server Components** | 画面表示のための読み取り。`modules/*` の関数を直接呼ぶ | コース詳細、マイラーニング |
| **Server Actions** | フォームからの書き込み | カートに追加、コース編集 |
| **Route Handlers** (`/api/*`) | ブラウザから JS で頻繁に呼ぶもの、外部からの呼び出し | 再生位置の保存、Webhook、Cron |

将来モバイルアプリを作る場合は、`modules/*` を呼ぶ REST の Route Handler を `/api/v1/*` に追加する。業務ロジックは `modules/*` にあるので、二重実装にはならない。

### 共通ルール

- 入力はすべて Zod で検証する。
- Server Action の戻り値は `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }` に統一する。
- エラーコード: `UNAUTHENTICATED` / `FORBIDDEN` / `NOT_FOUND` / `VALIDATION` / `CONFLICT` / `RATE_LIMITED` / `INTERNAL`
- Route Handler は HTTP ステータスで返す（401 / 403 / 404 / 422 / 409 / 429 / 500）。
- 冪等にすべき操作（注文作成など）は、クライアントが生成した `idempotencyKey` を受け取る。

権限の略号: **G** = ゲスト可 / **L** = ログイン必須 / **E** = 受講者（そのコースに登録済み）/ **O** = コースの所有講師 / **A** = 管理者

## 4.2 Server Actions

### identity

| Action | 権限 | 入力 | 処理 |
| --- | --- | --- | --- |
| `signUp` | G | name, email, password | ユーザー作成、確認メール送信 |
| `verifyEmail` | G | token | |
| `signIn` / `signOut` | G / L | | Auth.js |
| `requestPasswordReset` | G | email | 存在しないメールでも同じ応答を返す（アカウントの有無を漏らさない） |
| `resetPassword` | G | token, password | 既存のセッションをすべて失効 |
| `updateProfile` | L | name, headline, bio, avatarKey | |
| `deleteAccount` | L | password | 匿名化。購入履歴は保持 |

### instructor onboarding

| Action | 権限 | 入力 | 処理 |
| --- | --- | --- | --- |
| `becomeInstructor` | L | headline, bio, agreeTermsVersion | ロール付与 |
| `startPayoutOnboarding` | 講師 | — | Stripe Connect のアカウントを作成し、Account Link の URL を返す |
| `updateInvoiceNumber` | 講師 | registrationNumber | 形式チェック（T + 13桁） |

### catalog（講師）

| Action | 権限 | 入力 |
| --- | --- | --- |
| `createCourse` | 講師 | title, categoryId |
| `updateCourse` | O | title, subtitle, description, whatYouLearn[], requirements[], level, categoryId, price, thumbnailKey |
| `submitForReview` | O | courseId — 公開条件（レクチャー5本以上、動画30分以上、全動画が ready、Connect 設定済み ※有料の場合）を検証 |
| `setListing` | O | courseId, listed: boolean（published ⇔ unlisted） |
| `deleteCourse` | O | courseId — draft かつ受講者0人のときのみ |
| `upsertSection` / `deleteSection` | O | |
| `upsertLecture` / `deleteLecture` | O | kind, title, body, videoAssetId, durationSec, isFreePreview |
| `reorderCurriculum` | O | courseId, sections: `[{ id, lectureIds[] }]` — 全体の並び順を一括で送る（ドラッグ&ドロップ用） |
| `createVideoUpload` | O | lectureId, filename → `{ uploadUrl, videoAssetId }` |
| `createFileUpload` | O | purpose（thumbnail / attachment / avatar）, contentType, size → `{ url, key }`（R2 の署名付き PUT URL） |

### commerce

| Action | 権限 | 入力 | 処理 |
| --- | --- | --- | --- |
| `addToCart` / `removeFromCart` | L | courseId | 購入済み・自分のコースは追加不可 |
| `applyCoupon` | L | code | カートの金額を再計算して返す |
| `enrollFree` | L | courseId | price=0 のときのみ |
| `startCheckout` | L | idempotencyKey, couponCode? | order(pending) を作成し、Stripe Checkout の URL を返す |
| `requestRefund` | E | orderItemId, reason | 自動返金の条件を満たせば即時に返金、それ以外は管理者のキューへ |

### learning / community

| Action | 権限 | 入力 |
| --- | --- | --- |
| `toggleLectureComplete` | E | lectureId |
| `upsertReview` | E | courseId, rating, body |
| `replyToReview` | O | reviewId, body |
| `askQuestion` / `answerQuestion` | E or O | |
| `postAnnouncement` | O | courseId, title, body — 受講者へのメールはジョブで送る |
| `report` | L | targetType, targetId, reason |

### admin

| Action | 権限 | 入力 |
| --- | --- | --- |
| `decideCourseReview` | A | courseId, decision, comment |
| `suspendCourse` / `suspendUser` | A | id, reason |
| `processRefund` | A | refundId, approve |
| `resolveReport` | A | reportId, action（hide / dismiss） |
| `adjustLedger` | A | instructorId, amount, memo |

管理者の操作は、すべて `audit_logs` に記録する。

## 4.3 Route Handlers

### 学習

```
GET  /api/lectures/{lectureId}/playback        権限: E / O / 無料プレビュー / A
→ 200 { playbackId, token, expiresAt, startAtSec }

PUT  /api/lectures/{lectureId}/progress        権限: E
body { positionSec: number, durationSec: number }
→ 204   ※ 90% 以上で自動的に完了扱い。最大で10秒に1回程度に制限

GET  /api/lectures/{lectureId}/attachments/{id}  権限: E / O
→ 302 R2 の期限つき URL へリダイレクト

GET  /api/orders/{publicId}/status             権限: 注文者
→ 200 { status }   ※ 決済完了画面からのポーリング用
```

### 講師

```
GET  /api/video-assets/{id}                    権限: 所有者
→ 200 { status, durationSec }   ※ エディタでエンコード状況を表示するためのポーリング用
```

### 公開

```
GET  /certificates/{publicId}                  権限: G（修了証の検証ページ。ページとして実装）
```

### Webhook

| エンドポイント | 検証 | 処理するイベント |
| --- | --- | --- |
| `POST /api/webhooks/stripe` | `Stripe-Signature` | `checkout.session.completed` → 注文の確定・受講登録・台帳への記帳<br>`checkout.session.expired` → 注文を expired に<br>`charge.refunded` → 返金の確定・受講取り消し・台帳の取り消し<br>`charge.dispute.created` → 管理者に通知<br>`account.updated` → `payouts_enabled` を更新<br>`transfer.*` → payouts の状態を更新 |
| `POST /api/webhooks/mux` | `Mux-Signature` | `video.upload.asset_created` → asset_id を紐付け<br>`video.asset.ready` → ready、再生時間を保存<br>`video.asset.errored` → errored、講師に通知 |

処理の手順（共通）:

1. 署名を検証する（失敗したら 400）。
2. `processed_webhook_events` に `(provider, event_id)` を INSERT する。一意制約に違反したら、処理済みとして 200 を返す。
3. 業務処理を**同じトランザクション**で行う。
4. 失敗したら 500 を返す（プロバイダーが再送する）。

### Cron（Vercel Cron。`CRON_SECRET` で保護）

| エンドポイント | 頻度 | 処理 |
| --- | --- | --- |
| `/api/cron/payouts` | 毎月15日 | 確定残高が ¥1,000 以上の講師に Stripe Transfer を作成 |
| `/api/cron/expire-orders` | 1時間ごと | 24時間以上 pending の注文を expired に |
| `/api/cron/reconcile` | 毎日 | Stripe の残高・取引と台帳を照合し、差分があればアラート |
| `/api/cron/cleanup` | 毎日 | 期限切れのセッション・トークン、使われていない動画アセットの削除 |

## 4.4 主要な読み取り（Server Components から呼ぶ関数）

| 関数 | 用途 | キャッシュ |
| --- | --- | --- |
| `catalog.search({ q, category, level, price, rating, sort, cursor })` | 検索一覧（カーソル型ページング、1ページ24件） | タグ `catalog`、60秒 |
| `catalog.getCourseDetail(slug)` | コース詳細 | タグ `course:{id}` |
| `catalog.getCurriculum(courseId)` | カリキュラム | タグ `course:{id}` |
| `community.listReviews(courseId, cursor)` | レビュー | タグ `reviews:{courseId}` |
| `learning.getMyCourses(userId)` | マイラーニング | なし |
| `learning.getPlayerState(userId, lectureId)` | プレイヤー（カリキュラム＋進捗） | なし |
| `ledger.getInstructorSummary(userId, range)` | 講師ダッシュボード | なし |
