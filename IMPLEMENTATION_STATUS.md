# P2026 Implementation Status

Updated: March 27, 2026

This file tracks implemented functionality as it exists in the codebase today.

## Core Plugin

- Progressive enhancement of theme-rendered feeds is implemented.
- Front-end inline post editor and front-end new post editor are implemented.
- New Post modal flow (admin bar button fallback when block is absent) is implemented.
- Post polling and pending reveal banner are implemented.
- Expanded-comment refresh is implemented with jitter, batching, and failure backoff.
- Abilities-first permission checks with capability fallback are implemented.

## Search

- REST route `GET /p2026/v1/search` is implemented in `includes/api/search.php`.
- Search UI (`SearchWidget`) is implemented and mounted from `FeedEnhancer`.
- Current behavior is logged-in only and currently scoped to authored posts/comments in SQL filters.

## Read State

- REST routes `GET /p2026/v1/read-state` and `POST /p2026/v1/read-state/sync` are implemented.
- Unread badge UI (`UnreadBadge`) is implemented and mounted from `FeedEnhancer`.
- Last activity is persisted in user meta key `p2026_last_activity`.

## Module System

- PHP module discovery and deny-list activation are implemented.
- JS module loading based on `window.p2026Config.activeModules` is implemented.
- Settings UI for module toggles is implemented in `admin/settings.php`.

## Modules

- `mentions`: implemented (PHP + JS).
- `notifications`: implemented (PHP + JS).
- `link-previews`: implemented (PHP + JS).
- `post-state`: implemented (PHP + core UI integration).
- `audit-log`: implemented (PHP backend + settings tab).

## Observability And Performance Controls

- Polling helper supports exponential backoff.
- Comment refresh loop includes concurrency caps and backoff.
- Dev-only request telemetry middleware is available when `WP_DEBUG` is true.

## Known Gaps / Not Yet Implemented

- Per-post manual read/unread toggling is not implemented (proposal only in `ideas/per-post-read-state.md`).
- Search indexing/FTS optimization is not implemented (current implementation uses LIKE queries).
