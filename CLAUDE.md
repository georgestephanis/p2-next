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
-   src/blocks/feed-tools/: dynamic block server render (logged-in only) + frontend `view.js` that mounts `SidebarControls`.
-   src/components/: comments UI, post editor/new post editor, new post modal, search widget, unread badge.
-   src/interactivity/: shared Interactivity API stores and directive-host initializers for lightweight interaction islands.
-   src/interactivity/module-entry.js: script-module entrypoint that loads interactivity implementations and publishes a bridge API for classic frontend callers.
-   src/interactivity/client-bridge.js: classic-script bridge used by `src/frontend.js`, `src/api/index.js`, and modules/components to call module-loaded interactivity initializers.
-   src/store/index.js: shared @wordpress/data store and async thunks.
-   src/api/index.js: apiFetch middleware and polling helper.
-   src/utils/on-dom-ready.js: shared DOM-ready bootstrap helper used by modules and interactivity hosts.
-   src/styles.scss: frontend styling for editor/comment/feed enhancements, modal overlay; imports module stylesheets via `@use`.
-   src/modules/index.js: side-effect entry point that dynamically imports only modules listed in `window.p2026Config.activeModules`.
-   src/modules/mentions/: JS mentions module — Block Editor autocomplete, textarea autocomplete (`MentionTextareaControl`), and hovercard host.
-   src/modules/notifications/: JS notifications module — dock UI and item rendering.
-   src/modules/sidebar-shell/: JS sidebar-shell module — vanilla JS mount/collapse controller (`index.js`), `SidebarControls.js` React component (search + state filter), and admin block editor for configuring default block content (`admin.js`).
-   src/modules/comment-editor/: markdown WYSIWYG editor component for comment create/edit flows.
-   modules/: PHP modules directory; each subdirectory contains an `index.php` loaded by glob on init.
-   modules/mentions/index.php: REST endpoints for user search and hovercard detail, @mention linkification on `the_content`/`comment_text`, and the `p2026_mentions_found` notification hook.
-   modules/notifications/index.php: per-user notification storage, REST endpoints, and hooks for mention/reply notifications.
-   modules/post-state/index.php: taxonomy-backed workflow state, REST field + mutation endpoint, and audit event emission.
-   modules/audit-log/index.php: backend listener for audit events persisted to JSONL or internal CPT, plus audit settings tab and admin REST endpoints.
-   modules/comment-editor/index.php: optional markdown comment-processing hooks for REST create/update (`p2026_format=markdown`).
-   src/modules/audit-log/: admin DataViews app for browsing audit entries in the settings tab.
-   .github/: WordPress Playground blueprint and setup script.
-   build/: generated artifacts from @wordpress/scripts (do not hand-edit).

## Runtime Flow

1. PHP registers block metadata from build output and enqueues frontend assets.
2. PHP injects window.p2026Config before frontend script execution.
3. PHP adds a "New Post" admin bar node on the blog index for users who can create posts.
4. PHP glob-loads `modules/*/index.php`; modules use a dual-default model: most are active by default (opt-out via `p2026_disabled_modules`), but some modules (currently `sidebar-shell`) default to inactive on themes that already expose sidebar functionality and must be explicitly enabled via `p2026_enabled_modules`. `p2026_module_default_is_active( $slug )` encodes per-module default logic.
5. PHP enqueues the interactivity Script Module (`build/interactivity.module.js`) via `wp_register_script_module` / `wp_enqueue_script_module` when available.
6. The interactivity Script Module initializes Interactivity API stores/host initializers and publishes a classic bridge API on `window.__p2026InteractivityApi`.
7. frontend.js discovers rendered posts in block or classic themes.
8. frontend.js mounts the NewPostModal root and initializes shared interactivity hosts through bridge calls.
9. frontend.js side-effect-imports `src/modules/index.js`, which initialises all JS modules (e.g. mentions autocomplete, hovercard host).
10. `setupPostToolbar` from `enhancer.js` mounts a PostEnhancement React root per post, providing the three-dots menu, comment expansion, and inline editing.
11. FeedEnhancer mounts once and polls for new posts.
12. Posts buffer new content behind a reveal banner; expanded comment threads fetch and render inline.
13. Inline editing and new-post creation use Block Editor primitives on frontend.
14. Admin bar "New Post" button scrolls to an existing new-post editor if present, otherwise opens the NewPostModal.

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
-   isArchiveView
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

-   `includes/api/search.php`: REST endpoint `GET /p2026/v1/search?q={query}&offset={offset}` searches posts and comments with LIKE queries and currently filters to authored content for the current logged-in user.
-   Results sorted newest-first, capped at 20 per request.
-   `SearchWidget.js`: Debounced (300ms) input with modal results overlay; click navigates to post or comment and scrolls into view.
-   Modal opens only after the first non-empty result set, and remains open while refining query.
-   While refining, previous results stay visible with a loading overlay until fresh results arrive.
-   `SearchWidget.js` is rendered by `SidebarControls` (mounted by the `p2026/feed-tools` block). It is no longer injected directly by `FeedEnhancer` into the header area.
-   The `p2026/feed-tools` block can be placed anywhere, but its primary home is inside the Sidebar Shell (auto-injected as `<!-- wp:p2026/feed-tools /-->` in the sidebar shell's tools area).
-   The block renders nothing server-side for logged-out users (`is_user_logged_in()` guard in `render.php`); `SidebarControls` also returns null when `window.p2026Config.currentUser` is absent.
-   State management: Uses local component state (useState) for query, results, and loading; does not persist to global store (search is transient UX).
-   Styling: `src/components/search.scss`.

### Sidebar Shell Module

Optional fixed, collapsible sidebar panel for themes that lack native sidebar support.

-   `modules/sidebar-shell/index.php`: registers a `p2026-sidebar-shell` widget area, renders the shell container via `wp_footer` (priority 20), and provides a dedicated Sidebar Shell settings tab with an embedded block editor for configuring default block content.
-   The shell renders only when content is available: either the `p2026-sidebar-shell` widget area is active, or block markup exists (default: search + latest-posts + latest-comments blocks).
-   Visibility and collapse behavior (default open, allow collapse) are configurable per-site via the settings tab.
-   The `p2026/feed-tools` block is always injected into the tools area inside the shell (`do_blocks( '<!-- wp:p2026/feed-tools /-->' )`); the widget area and block content areas follow.
-   `src/modules/sidebar-shell/index.js`: vanilla JS mount. Reads `data-default-open` / `data-allow-collapse` from the root element, applies `is-collapsed` class and `p2026-sidebar-shell-visible` on `<html>` / `<body>` (the latter shrinks the page width via CSS to reserve space). Persists collapse state in `localStorage` (key `p2026.sidebarShell.collapsed`). Handles keyboard: `Escape` closes the panel and returns focus to the toggle.
-   `SidebarControls.js`: React component that renders the post-state filter buttons (when `post-state` module is active) and `SearchWidget`. Mounted per `[data-p2026-feed-tools]` node by `src/blocks/feed-tools/view.js`. Returns null for logged-out users.
-   Admin block editor (`src/modules/sidebar-shell/admin.js`): standalone `BlockEditorProvider` mounted on the Sidebar Shell settings tab. Keeps a hidden `<textarea>` in sync for form POST delivery. Falls back gracefully to the raw textarea if the block editor cannot mount.
-   CSS: `src/modules/sidebar-shell/_sidebar-shell.scss`. Uses CSS custom properties for width and motion; applies `html { width: calc(100vw - reserve-width) }` at ≥960 px to push page content left rather than overlapping it.

### Read/Unread Tracking (Core)

Per-user activity tracking to surface new content. Accessible to logged-in users.

-   `includes/api/read-state.php`: Manages user's last-activity timestamp in user_meta (`p2026_last_activity`, ISO-8601).
-   REST endpoints:
    -   `GET /p2026/v1/read-state` — returns `{ lastActivity, unreadCount }` (count capped at 100, includes posts after lastActivity).
    -   `POST /p2026/v1/read-state/sync` — updates lastActivity to current UTC timestamp.
-   `UnreadBadge.js`: Displays red pill badge with unread count when > 0. Click syncs read state and reveals pending posts via store action `revealPendingPosts()`.
-   Auto-syncs read state when tab becomes hidden (via `visibilitychange` event).
-   Styling: `src/components/unread-badge.scss`.

### Updates And Distribution

-   `includes/github-updates.php`: Handles the plugin `Update URI` integration for GitHub-hosted installs.
-   Supports stable GitHub releases, optional prerelease opt-in, and a `trunk` channel for direct-update workflows.
-   Uses `P2026_VERSION` as the installed version source for update comparisons.

### Notifications Module (Independent)

Optional real-time notifications dock for mentions and comment replies.

-   `modules/notifications/index.php`: Notification CRUD system using user_meta (UUID-keyed entries). Stores `type` (mention, reply), `post_id`, `comment_id`, `from_user`, `created_at`, `unread`.
-   Auto-creates notifications:
    -   On @mentions via `p2026_mentions_found` hook (when mentions module is active).
    -   On comment replies via `comment_post` hook (detects replies to user's comments).
-   REST endpoints:
    -   `GET /p2026/v1/notifications?limit=20&offset=0` — paginated notifications list.
    -   `POST /p2026/v1/notifications/{meta_key}/read` — mark single notification as read.
    -   `POST /p2026/v1/notifications/read-all` — bulk mark all as read.
-   `NotificationDock.js`: Fixed bottom-right dock (viewport-edge anchored) with badge showing unread count. Expands on click to show paginated list. Real-time polling every 10s with exponential backoff (1-8s) on error. Visibility-aware polling via shared `startPolling` helper.
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
-   notificationDockOpen
-   postStateFilter
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
-   POST /p2026/v1/posts/{postId}/state (set/cycle post workflow state)
-   GET /p2026/v1/notifications (list notifications)
-   POST /p2026/v1/notifications/{id}/read (mark notification as read)
-   POST /p2026/v1/notifications/read-all (bulk mark as read)
-   GET /p2026/v1/audit-log/days (audit day shards)
-   GET /p2026/v1/audit-log/entries (paged audit entries)

## Module System

p2026 has a lightweight module system for self-contained features.

**PHP side:** `p2026.php` globs `modules/*/index.php` at init and requires each file if `p2026_is_module_active( $slug )` returns true. The activation model is dual-default:

-   **Default-active modules** (the majority): active unless their slug appears in `p2026_disabled_modules`. Adding a new module to this category requires no opt-in from existing installs.
-   **Default-inactive modules** (`sidebar-shell` currently): inactive unless their slug appears in `p2026_enabled_modules`, _or_ the context-aware default evaluates to active (e.g. `sidebar-shell` auto-activates when the theme lacks native sidebar support).
-   `p2026_module_default_is_active( $slug )` in `p2026.php` encodes the per-module default; add new cases there when introducing a context-aware default.

Each PHP module file is responsible for hooking into WordPress itself; there is no module API to call.

**JS side:** `src/modules/index.js` is a single file of side-effect imports. `frontend.js` imports it once. To add a new JS module, create `src/modules/{name}/index.js` and add `import './{name}';` to `src/modules/index.js` (both in the "load all" and "load by slug" branches).

**Active modules:**

| Module         | Default  | PHP                                                                                                                 | JS                                                                                                                                                |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| mentions       | active   | `modules/mentions/index.php` — REST endpoints, linkification, `p2026_mentions_found` hook                           | `src/modules/mentions/` — Block Editor completer, `MentionTextareaControl`, hovercard                                                             |
| notifications  | active   | `modules/notifications/index.php` — Notification CRUD, auto-create on mentions/replies, REST endpoints              | `src/modules/notifications/` — NotificationDock, NotificationItem, real-time polling                                                              |
| link-previews  | active   | `modules/link-previews/index.php` — Internal link preview REST endpoint + transient cache                           | `src/modules/link-previews/` — Internal post/comment hover preview cards                                                                          |
| post-state     | active   | `modules/post-state/index.php` — workflow taxonomy state, REST field/endpoint, audit hooks                          | N/A (UI lives in existing core components/store)                                                                                                  |
| audit-log      | active   | `modules/audit-log/index.php` — persists `p2026_audit_log_event` payloads and serves audit REST routes              | `src/modules/audit-log/audit-log-viewer.js` — admin audit browser                                                                                 |
| comment-editor | active   | `modules/comment-editor/index.php` — markdown render/sanitize and markdown source persistence for comments          | Core comment UI integration (`src/components/Comments.js`, `src/components/Comment.js`) via `src/modules/comment-editor/MarkdownCommentEditor.js` |
| sidebar-shell  | context¹ | `modules/sidebar-shell/index.php` — fixed collapsible sidebar panel, widget area, settings tab + block editor admin | `src/modules/sidebar-shell/` — collapse/expand controller, `SidebarControls.js` (search + state filter), admin block editor                       |

¹ `sidebar-shell` defaults to **active** when the theme has no detected sidebar (`sidebar.php` or `parts/sidebar.html`); defaults to **inactive** otherwise. Can be overridden on the Modules settings page.

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

## Playground Seed Data

-   `.github/setup.php` seeds sample users, posts, and nested comments for local/demo environments.
-   Setup also seeds starter notifications for the default Playground login user (`admin`) using `p2026_create_notification()`.
-   Notification seeding is idempotent via user meta marker `p2026_seed_notifications_v1`.

## Working Conventions

-   Keep enhancement additive; do not replace the theme loop rendering.
-   Reuse existing store selectors/actions before introducing new state paths.
-   Keep i18n text domain as p2026.
-   Keep build output generated only.
-   Keep Interactivity API store/host wiring in `src/interactivity/*`; keep feature behavior in `src/modules/*` or `src/components/*`.
-   Keep classic/frontend callers pointed at `src/interactivity/client-bridge.js`; avoid importing `src/interactivity/*` implementation files directly from classic bundles.
-   In script-module interactivity code, use module dependencies for module IDs only and use `window.wp.*` for script interop (`wp-data`, etc.) per Script Modules limitations.
-   Prefer `src/utils/on-dom-ready.js` over ad hoc `DOMContentLoaded` listeners in feature modules.
-   Prefer capability checks through centralized helpers in p2026.php.
-   For every dynamic `import()`, include an explicit human-readable `webpackChunkName` comment. Do not add anonymous split points that emit numeric chunk names.

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
