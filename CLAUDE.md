# CLAUDE.md

This file documents the current architecture and contribution conventions for the p2026 plugin.

## What This Plugin Is

p2026 modernizes P2/o2-style collaboration by layering React and Block Editor UX on top of theme-rendered loops.

Core design principles:

-   Progressive enhancement over existing theme markup.
-   WordPress REST API as the data boundary.
-   Shared store state for feed, comments, and editor UI.
-   Capability-aware UX driven by runtime config from PHP.

It is intentionally not a complete SPA replacement.

## Top-Level Layout

-   p2026.php: bootstrap, block registration, frontend enqueue, runtime config injection, abilities integration, admin bar node, PHP module loader.
-   src/frontend.js: enhancement bootstrap for existing loop pages; mounts modal root, wires admin bar button, and side-effect-imports all JS modules.
-   src/enhancer.js: exports `setupPostToolbar` (mounts per-post PostEnhancement React root) and `observePosts` (no-op stub retained for API compatibility).
-   src/blocks/new-post/: dynamic block server render + frontend mount.
-   src/components/: feed controls, comments UI, post editor/new post editor, new post modal.
-   src/store/index.js: shared @wordpress/data store and async thunks.
-   src/api/index.js: apiFetch middleware and polling helper.
-   src/styles.scss: frontend styling for editor/comment/feed enhancements, modal overlay; imports module stylesheets via `@use`.
-   src/modules/index.js: side-effect entry point that imports every active JS module; add a new module by creating `src/modules/{name}/index.js` and importing it here.
-   src/modules/mentions/: JS mentions module — Block Editor autocomplete, textarea autocomplete (`MentionTextareaControl`), and hovercard host.
-   modules/: PHP modules directory; each subdirectory contains an `index.php` loaded by glob on init.
-   modules/mentions/index.php: REST endpoints for user search and hovercard detail, @mention linkification on `the_content`/`comment_text`, and the `p2026_mentions_found` notification hook.
-   .github/: WordPress Playground blueprint and setup script.
-   build/: generated artifacts from @wordpress/scripts (do not hand-edit).

## Runtime Flow

1. PHP registers block metadata from build output and enqueues frontend assets.
2. PHP injects window.p2026Config before frontend script execution.
3. PHP adds a "New Post" admin bar node on the blog index for users who can create posts.
4. PHP glob-loads `modules/*/index.php`; active modules are controlled by the `p2026_active_modules` option (defaults to all modules active).
5. frontend.js discovers rendered posts in block or classic themes.
6. frontend.js mounts the NewPostModal root and wires the admin bar button click.
7. frontend.js side-effect-imports `src/modules/index.js`, which initialises all JS modules (e.g. mentions autocomplete, hovercard host).
8. `setupPostToolbar` from `enhancer.js` mounts a PostEnhancement React root per post, providing the three-dots menu, comment expansion, and inline editing.
9. FeedEnhancer mounts once and polls for new posts.
10. Posts buffer new content behind a reveal banner; expanded comment threads fetch and render inline.
11. Inline editing and new-post creation use Block Editor primitives on frontend.
12. Admin bar "New Post" button scrolls to an existing new-post editor if present, otherwise opens the NewPostModal.

## Permission Model

p2026 now uses an abilities-first model with fallback:

-   If Abilities API is present, plugin registers:
    -   p2026/post-create
    -   p2026/post-update
-   Permission checks use ability.check_permissions() when available.
-   If abilities are not available, checks fall back to core capability checks.

Runtime config includes:

-   canCreatePosts
-   canUpdatePosts
-   canComment
-   requireNameEmail
-   currentUser (logged-in metadata when available)

New post mount rendering in src/blocks/new-post/render.php is gated by p2026_can_create_posts().

## Commenting Behavior

-   Logged-in and logged-out users can both view comment threads.
-   Top-level comment form is rendered inline when canComment is true.
-   Reply forms support anonymous commenters.
-   Anonymous submissions send author_name, author_email, and author_url.
-   Name/email requirements follow WordPress require_name_email.
-   Expanded threads refresh on a jittered interval to reduce synchronized polling.

## Core Features

### Search (Core)

Unified search across posts and comments. Accessible to logged-in users.

-   `includes/api/search.php`: REST endpoint `GET /p2026/v1/search?q={query}&offset={offset}` searches posts and comments with LIKE queries, respects post/comment permissions.
-   Results sorted newest-first, capped at 20 per request.
-   `SearchWidget.js`: Debounced (300ms) input with modal results overlay; click navigates to post or comment and scrolls into view.
-   State management: Uses local component state (useState) for query, results, and loading; does not persist to global store (search is transient UX).
-   Styling: `src/components/search.scss`.

### Read/Unread Tracking (Core)

Per-user activity tracking to surface new content. Accessible to logged-in users.

-   `includes/api/read-state.php`: Manages user's last-activity timestamp in user_meta (`p2026_last_activity`, ISO-8601).
-   REST endpoints:
    -   `GET /p2026/v1/read-state` — returns `{ lastActivity, unreadCount }` (count capped at 100, includes posts after lastActivity).
    -   `POST /p2026/v1/read-state/sync` — updates lastActivity to current UTC timestamp.
-   `UnreadBadge.js`: Displays red pill badge with unread count when > 0. Click syncs read state and reveals pending posts via store action `revealPendingPosts()`.
-   Auto-syncs read state when tab becomes hidden (via `visibilitychange` event).
-   Styling: `src/components/unread-badge.scss`.

### Notifications Module (Independent)

Optional real-time notifications dock for mentions and comment replies.

-   `modules/notifications/index.php`: Notification CRUD system using user_meta (UUID-keyed entries). Stores `type` (mention, reply), `post_id`, `comment_id`, `from_user`, `created_at`, `unread`.
-   Auto-creates notifications:
    -   On @mentions via `p2026_mentions_found` hook (when mentions module is active).
    -   On comment replies via `wp_insert_comment` hook (detects replies to user's comments).
-   REST endpoints:
    -   `GET /p2026/v1/notifications?limit=20&offset=0` — paginated notifications list.
    -   `POST /p2026/v1/notifications/{meta_key}/read` — mark single notification as read.
    -   `POST /p2026/v1/notifications/read-all` — bulk mark all as read.
-   `NotificationDock.js`: Fixed bottom-right dock with badge showing unread count. Expands on click to show paginated list. Real-time polling every 10s with exponential backoff (1-8s) on error. Visibility-aware (stops polling when tab hidden).
-   `NotificationItem.js`: Individual notification card with type badge, message, date, and navigation to source post/comment.
-   Styling: `src/modules/notifications/_notification-dock.scss`, `src/modules/notifications/_notification-item.scss`.
-   Module readme with full API docs: `modules/notifications/README.md`.

## Store and REST Boundaries

Store name: p2026.

Key state:

-   posts
-   comments by post ID
-   pendingPosts and pendingCount
-   expandedPosts / editingPost
-   savingPost (null | postId | 'new') / savingComment
-   newPostModalOpen
-   readState (lastActivity, unreadCount)
-   notifications
-   unreadNotificationCount

**Note:** Search state is managed locally by SearchWidget (not in global store) since search queries are transient and user-specific.

REST endpoints in use:

-   GET /wp/v2/posts (initial + polling)
-   POST /wp/v2/posts (create/update)
-   GET /wp/v2/comments (thread fetch)
-   POST /wp/v2/comments (top-level + reply)
-   GET /p2026/v1/search (unified search)
-   GET /p2026/v1/read-state (fetch read state)
-   POST /p2026/v1/read-state/sync (sync activity timestamp)
-   GET /p2026/v1/notifications (list notifications)
-   POST /p2026/v1/notifications/{id}/read (mark notification as read)
-   POST /p2026/v1/notifications/read-all (bulk mark as read)

## Module System

p2026 has a lightweight module system for self-contained features.

**PHP side:** `p2026.php` globs `modules/*/index.php` at init and requires each file whose slug appears in the `p2026_active_modules` option. If the option has never been saved, all discovered modules are active by default. Each PHP module file is responsible for hooking into WordPress itself; there is no module API to call.

**JS side:** `src/modules/index.js` is a single file of side-effect imports. `frontend.js` imports it once. To add a new JS module, create `src/modules/{name}/index.js` and add `import './{name}';` to `src/modules/index.js`.

**Active modules:**

| Module        | PHP                                                                                                    | JS                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| mentions      | `modules/mentions/index.php` — REST endpoints, linkification, `p2026_mentions_found` hook              | `src/modules/mentions/` — Block Editor completer, `MentionTextareaControl`, hovercard |
| notifications | `modules/notifications/index.php` — Notification CRUD, auto-create on mentions/replies, REST endpoints | `src/modules/notifications/` — NotificationDock, NotificationItem, real-time polling  |

## Build and Validation

From plugin root:

```bash
npm install
composer install
npm run build
npm run lint:js
npm run lint:php
```

Validation expectations after functional changes:

1. Build passes.
2. JS lint passes.
3. PHP lint passes.
4. Manual smoke test confirms:
    - controls attach to theme-rendered posts,
    - top-level comments and replies work for expected user states,
    - inline post editing respects permissions,
    - new-post block visibility matches capabilities,
    - admin bar "New Post" button opens modal when block is absent; scrolls to block when present,
    - new-post banner and comment refresh behavior are sane.

## Working Conventions

-   Keep enhancement additive; do not replace the theme loop rendering.
-   Reuse existing store selectors/actions before introducing new state paths.
-   Keep i18n text domain as p2026.
-   Keep build output generated only.
-   Prefer capability checks through centralized helpers in p2026.php.

## Performance and Scale Notes

This section captures current hotspots and preferred mitigations.

### Current Request Profile

-   Post polling: one GET /wp/v2/posts per client every POLL_INTERVAL seconds (default 15).
-   Expanded-thread refresh: one GET /wp/v2/comments per expanded post on a jittered timer (20s + up to 8s).
-   Comment expand action: one GET /wp/v2/comments?post={id}&per_page=100 per toggle-open.

Rough request-rate model:

-   Post polling RPS ~= active_clients / poll_interval_seconds.
-   Expanded comment refresh RPS ~= (active_clients_with_open_threads \* average_open_threads) / average_refresh_seconds.

### Hotspots in Current Implementation

-   Posts polling always requests \_embed; payload size can be high at scale.
-   Comments fetch uses per_page=100 and full-thread replacement on every refresh.
-   Expanded-thread refresh runs all open post IDs in parallel for each cycle.
-   No client-side backoff on repeated endpoint failures.

### Preferred Mitigations for Future Changes

-   Keep jitter on all periodic timers; never introduce lockstep intervals.
-   Add exponential backoff for pollForNewPosts and comment refresh after transient failures.
-   Consider splitting feed polling into lighter payload mode for heartbeat checks, then hydrate on reveal.
-   Cap concurrently refreshed expanded threads per cycle when many are open.
-   Favor incremental comment fetch patterns when backend support exists (for example, after=<timestamp> or modified-since).
-   Keep visibility-state checks for all interval work.

### Profiling and Validation Expectations

When touching polling/comment refresh logic:

1. Measure request counts in browser devtools over 60s with 1, 5, and 10 expanded threads.
2. Confirm timers stop on unmount and do not duplicate after rerenders.
3. Verify failure paths do not spin retry loops.
4. Smoke-test with a large thread (100 comments) to observe render and network behavior.
