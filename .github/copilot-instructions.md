# Copilot Instructions for p2026

Scope: wp-content/plugins/p2026.

## Purpose

p2026 adds P2/o2-style collaboration UX by progressively enhancing theme-rendered post lists.

Primary stack:

- WordPress REST API for posts/comments.
- Frontend Block Editor primitives for editing and publishing.
- React portals mounted into existing DOM.
- Shared @wordpress/data store for state.

Do not convert this plugin into a full SPA. Preserve theme ownership of initial markup.

## Core Entry Points

- p2026.php: bootstrap, abilities registration, permission helpers, config injection, block registration, admin bar node, PHP module glob-loader.
- src/frontend.js: finds post list + post nodes, mounts FeedEnhancer, mounts NewPostModal root, wires admin bar button, imports all JS modules via `src/modules/index.js`.
- src/enhancer.js: exports `setupPostToolbar` (mounts PostEnhancement React root per post for menu/comments/editing) and `observePosts` (no-op stub kept for API compatibility).
- src/blocks/new-post/render.php: server-gated mount point for new-post UI.
- src/blocks/new-post/view.js: frontend mount for new-post editor.
- src/store/index.js: canonical state/actions/selectors (includes newPostModalOpen).
- src/components/FeedEnhancer.js: post polling + comment refresh scheduling.
- src/components/NewPostModal.js: modal driven by newPostModalOpen store state; wraps NewPostEditor.
- src/modules/index.js: side-effect imports for all active JS modules; add new modules here.
- modules/mentions/index.php: REST user-search + hovercard endpoints, @mention linkification on `the_content`/`comment_text`, `p2026_mentions_found` action hook for third-party notifications.
- src/modules/mentions/: JS mentions module — `p2026/mention` rich-text format, Block Editor `@` completer, `MentionTextareaControl` for plain textareas, hovercard host.

## Permission and Capability Rules

Use centralized helpers in p2026.php for post capabilities:

- p2026_can_create_posts()
- p2026_can_update_posts()

These are abilities-first and fallback to current_user_can when abilities are unavailable.

Frontend capability flags come from window.p2026Config. Prefer these flags over ad hoc checks in JS:

- canCreatePosts
- canUpdatePosts
- canComment
- requireNameEmail

For logged-in users, currentUser includes canPublish/canUpdatePosts/canComment.

## Comment UX Rules

- Comment threads should remain visible to visitors.
- Top-level comment form and reply forms are gated by canComment.
- Anonymous forms must support name/email/url payload fields.
- Respect requireNameEmail for anonymous commenters before POST.
- Keep thread refresh scoped to expanded threads only.

## Architectural Guardrails

- Keep portal-based injection; avoid replacing post loop HTML.
- Reuse window.__p2026Store anti-duplication pattern.
- Maintain i18n coverage with text domain p2026.
- Avoid editing build/ directly.
- Keep API calls in store thunks unless there is a strong reason to move them.

## Build and Validation

Run from plugin root:

- npm run build
- npm run lint:js
- npm run lint:php

Manual smoke checks expected after behavior changes:

1. Theme-rendered posts remain intact.
2. Comment expand, post, and reply work for logged-in and eligible logged-out users.
3. New-post editor visibility matches permissions.
4. Inline edit visibility matches permissions.
5. Polling and new-post banner still behave correctly.
6. Admin bar "New Post" button appears for users who can create posts; opens modal when block is absent, scrolls/focuses editor when block is present.

## High-Risk Areas

- p2026.php config keys and helper naming: changing these can silently break frontend gating.
- src/store/index.js action signatures: createComment authorData support must be preserved.
- src/components/Comments.js and src/components/Comment.js: keep top-level/reply forms behavior aligned.
- src/components/FeedEnhancer.js timers: avoid introducing synchronized polling bursts.
- src/components/NewPostModal.js + src/store/index.js: newPostModalOpen state and the savingPost context key ('new') are coupled; keep them in sync.
- modules/mentions/index.php `p2026_mentions_found` hook: this is the public notification contract for third-party plugins; its parameter signature (`$users`, `$object_type`, `$object_id`, `$author_id`) must not change.
- src/modules/mentions/ REST paths (`/p2026/v1/users`, `/p2026/v1/users/<id>`): changing these breaks both autocomplete surfaces and the hovercard fetch.

## Performance Guardrails

- Treat polling and refresh cadence as part of public behavior; do not tighten intervals casually.
- Preserve jitter on periodic timers.
- Keep document.visibilityState checks around background network work.
- Avoid fanout bursts: do not issue unbounded parallel comment refresh requests when many posts are expanded.
- Keep request payloads minimal where possible; _embed and per_page=100 are expensive defaults.
- Prefer additive optimizations over architectural rewrites.

When editing polling or refresh logic, explicitly consider:

1. Request rate impact: active_clients / interval.
2. Burst behavior on tab focus/visibility restore.
3. Failure behavior: backoff vs immediate repeated retries.
4. Timer lifecycle correctness on rerender/unmount.

## Optional Optimization Backlog

- Add backoff/cooldown for repeated poll failures.
- Add max-concurrency limit for expanded-thread refresh loops.
- Add lightweight feed heartbeat mode before full post hydration.
- Add incremental comment refresh mode when backend supports cursor/timestamp filters.
