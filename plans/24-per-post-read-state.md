# Plan: Per-Post Read/Unread Tracking

Status: Proposed

Priority: Later

Implementation Areas:

-   REST API
-   Data model and storage
-   Frontend UI (post controls menu)

Depends on:

-   Existing global read-state system (`includes/api/read-state.php`).

## Estimated Size

Medium

## Risk

Low. Additive to existing read-state infrastructure; no architectural changes required.

## Summary

Add manual per-post read/unread toggling to complement the global `lastActivity`-based read-state behavior already shipped.

## Why This Exists

The current system marks all posts older than the user's last-activity timestamp as read. Users cannot mark individual posts as unread after visiting them, or manually mark a post as read without syncing the global timestamp.

## Goals

-   Let users mark individual posts as unread so they can return to them later.
-   Let users mark individual posts as read without advancing the global timestamp.
-   Merge per-post override state with timestamp-based unread logic for badge and count display.

## Non-Goals

-   Replacing the global timestamp system.
-   Showing per-post read state to other users.

## Proposed Approach

-   Store a per-user list of explicitly-unread post IDs in user meta.
-   Expose REST endpoints for reading and toggling per-post state.
-   Add "Mark as unread" / "Mark as read" actions to the existing post controls menu (`PostEnhancement.js`).
-   Factor per-post overrides into `p2026_count_unread_posts()` and the `UnreadBadge` poll.

## Candidate API

-   `POST /p2026/v1/posts/{post_id}/read-state` — set read or unread for the current user.
-   `GET  /p2026/v1/posts/read-state` — return the current user's per-post override list.

## Suggested Data Model

User meta key `p2026_unread_post_ids` storing a JSON-encoded array of post IDs the user has explicitly marked unread:

```json
[ 1245, 1248, 1251 ]
```

## Acceptance Criteria

-   A logged-in user can mark any visible post as unread from the post controls menu.
-   Marked-unread posts are reflected in the unread badge count even if they are older than `lastActivity`.
-   A user can mark an unread post as read, removing it from the override list.
-   Per-post state is user-specific and not visible to others.
-   The feature degrades gracefully if the endpoint is unavailable (no UI regression).
