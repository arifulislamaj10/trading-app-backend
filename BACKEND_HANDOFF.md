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

---

## Notes for ops

1. Academy content is admin-managed; public lists hide soft-deleted rows.
2. `/training` remains the onboarding unlock flow — separate from Academy.
