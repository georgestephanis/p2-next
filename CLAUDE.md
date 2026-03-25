# CLAUDE.md

This file documents the current architecture and contribution conventions for the p2-next plugin.

## What This Plugin Is

p2-next modernizes P2/o2-style collaboration by layering React and Block Editor UX on top of theme-rendered loops.

Core design principles:

- Progressive enhancement over existing theme markup.
- WordPress REST API as the data boundary.
- Shared store state for feed, comments, and editor UI.
- Capability-aware UX driven by runtime config from PHP.

It is intentionally not a complete SPA replacement.

## Top-Level Layout

- p2-next.php: bootstrap, block registration, frontend enqueue, runtime config injection, abilities integration.
- src/frontend.js: enhancement bootstrap for existing loop pages.
- src/blocks/new-post/: dynamic block server render + frontend mount.
- src/components/: feed controls, comments UI, post editor/new post editor.
- src/store/index.js: shared @wordpress/data store and async thunks.
- src/api/index.js: apiFetch middleware and polling helper.
- src/styles.scss: frontend styling for editor/comment/feed enhancements.
- build/: generated artifacts from @wordpress/scripts (do not hand-edit).

## Runtime Flow

1. PHP registers block metadata from build output and enqueues frontend assets.
2. PHP injects window.p2NextConfig before frontend script execution.
3. frontend.js discovers rendered posts in block or classic themes.
4. FeedEnhancer mounts once and portals controls into existing post markup.
5. Posts poll on a fixed cadence and buffer new content behind a reveal banner.
6. Expanded comment threads fetch and render inline.
7. Inline editing and new-post creation use Block Editor primitives on frontend.

## Permission Model

p2-next now uses an abilities-first model with fallback:

- If Abilities API is present, plugin registers:
  - p2-next/post-create
  - p2-next/post-update
- Permission checks use ability.check_permissions() when available.
- If abilities are not available, checks fall back to core capability checks.

Runtime config includes:

- canCreatePosts
- canUpdatePosts
- canComment
- requireNameEmail
- currentUser (logged-in metadata when available)

New post mount rendering in src/blocks/new-post/render.php is gated by p2next_can_create_posts().

## Commenting Behavior

- Logged-in and logged-out users can both view comment threads.
- Top-level comment form is rendered inline when canComment is true.
- Reply forms support anonymous commenters.
- Anonymous submissions send author_name, author_email, and author_url.
- Name/email requirements follow WordPress require_name_email.
- Expanded threads refresh on a jittered interval to reduce synchronized polling.

## Store and REST Boundaries

Store name: p2-next.

Key state:

- posts
- comments by post ID
- pendingPosts and pendingCount
- expandedPosts / editingPost
- savingPost / savingComment

REST endpoints in use:

- GET /wp/v2/posts (initial + polling)
- POST /wp/v2/posts (create/update)
- GET /wp/v2/comments (thread fetch)
- POST /wp/v2/comments (top-level + reply)

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
   - new-post banner and comment refresh behavior are sane.

## Working Conventions

- Keep enhancement additive; do not replace the theme loop rendering.
- Reuse existing store selectors/actions before introducing new state paths.
- Keep i18n text domain as p2-next.
- Keep build output generated only.
- Prefer capability checks through centralized helpers in p2-next.php.

## Performance and Scale Notes

This section captures current hotspots and preferred mitigations.

### Current Request Profile

- Post polling: one GET /wp/v2/posts per client every POLL_INTERVAL seconds (default 15).
- Expanded-thread refresh: one GET /wp/v2/comments per expanded post on a jittered timer (20s + up to 8s).
- Comment expand action: one GET /wp/v2/comments?post={id}&per_page=100 per toggle-open.

Rough request-rate model:

- Post polling RPS ~= active_clients / poll_interval_seconds.
- Expanded comment refresh RPS ~= (active_clients_with_open_threads * average_open_threads) / average_refresh_seconds.

### Hotspots in Current Implementation

- Posts polling always requests _embed; payload size can be high at scale.
- Comments fetch uses per_page=100 and full-thread replacement on every refresh.
- Expanded-thread refresh runs all open post IDs in parallel for each cycle.
- No client-side backoff on repeated endpoint failures.

### Preferred Mitigations for Future Changes

- Keep jitter on all periodic timers; never introduce lockstep intervals.
- Add exponential backoff for pollForNewPosts and comment refresh after transient failures.
- Consider splitting feed polling into lighter payload mode for heartbeat checks, then hydrate on reveal.
- Cap concurrently refreshed expanded threads per cycle when many are open.
- Favor incremental comment fetch patterns when backend support exists (for example, after=<timestamp> or modified-since).
- Keep visibility-state checks for all interval work.

### Profiling and Validation Expectations

When touching polling/comment refresh logic:

1. Measure request counts in browser devtools over 60s with 1, 5, and 10 expanded threads.
2. Confirm timers stop on unmount and do not duplicate after rerenders.
3. Verify failure paths do not spin retry loops.
4. Smoke-test with a large thread (100 comments) to observe render and network behavior.
