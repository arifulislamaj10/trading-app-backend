# Chris Trading App — Backend Handoff (Single Source of Truth)

Date: 25 Jul 2026  
Base URL: `/api/v1`  
Auth: Bearer token (unless noted)
.

This file replaces older handoff docs (`BACKEND_TODO.md`, `backend-handoff-academy-tracking.md`, `BUG_TRACKER_FIXES.md`).

---

## Implemented

### Academy (NEW)

Public:
- `GET /api/v1/academy/categories` — active only
- `GET /api/v1/academy/videos?categoryId=` — active only

Admin (soft-delete via `isActive: false`):
- `POST|PATCH|DELETE /api/v1/admin/academy/categories[/:id]`
- `POST|PATCH|DELETE /api/v1/admin/academy/videos[/:id]`
- Admin GET lists include inactive items

Collections: `academy_categories`, `academy_videos`

### Like + Bookmark (toggle)

- `POST /api/v1/signals/:id/like` → `{ isLiked, likeCount }` (`Liked` / `Unliked`)
- `POST /api/v1/signals/:id/bookmark` → `{ isBookmarked, bookmarkCount }` (`Saved` / `Unsaved`)
- DELETE variants kept for backward compatibility
- Signal list/detail include: `likeCount`, `bookmarkCount`, `commentCount`, `isLiked`, `isBookmarked`, `isCopied`

### Tracking / copied trades

- Nested `signalId` populate includes `stopLoss`, `takeProfit1`
- Log accepts `stopLoss`, `targetPrice` (and/or `exitPrice`); persists both `targetPrice` and `exitPrice`
- Trade document fields: `entryPrice`, `stopLoss`, `exitPrice`, `targetPrice`, …
- Duplicate copy → `409`

### Comments — unchanged

- `GET /api/v1/comments?signalId=`
- `POST /api/v1/comments` `{ signalId, message }`

### BUG-003 — FCM push

In-app Mongo notifications remain the source of truth. After create, backend sends FCM when configured.

- `POST /api/v1/notifications/device-token` `{ token, platform? }`
- `DELETE /api/v1/notifications/device-token` `{ token }`
- Env: `FIREBASE_SERVICE_ACCOUNT_PATH` **or** `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- Payload includes string `data.signalId`, `data.type`, `data.link`
- Invalid tokens are pruned

If Firebase env is unset, push is skipped (server still runs; in-app notifications work).

---

## Notes for ops

1. Set Firebase credentials in production `.env` for real OS push.
2. Mobile must register FCM token after login via `/notifications/device-token`.
3. Academy content is admin-managed; public lists hide soft-deleted rows.
4. `/training` remains the onboarding unlock flow — separate from Academy.
