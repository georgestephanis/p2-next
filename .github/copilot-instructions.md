# Copilot Instructions for p2-next

Scope: wp-content/plugins/p2-next.

## Purpose

p2-next adds P2/o2-style collaboration UX by progressively enhancing theme-rendered post lists.

Primary stack:

- WordPress REST API for posts/comments.
- Frontend Block Editor primitives for editing and publishing.
- React portals mounted into existing DOM.
- Shared @wordpress/data store for state.

Do not convert this plugin into a full SPA. Preserve theme ownership of initial markup.

## Core Entry Points

- p2-next.php: bootstrap, abilities registration, permission helpers, config injection, block registration.
- src/frontend.js: finds post list + post nodes and mounts FeedEnhancer.
- src/blocks/new-post/render.php: server-gated mount point for new-post UI.
- src/blocks/new-post/view.js: frontend mount for new-post editor.
- src/store/index.js: canonical state/actions/selectors.
- src/components/FeedEnhancer.js: post polling + comment refresh scheduling.

## Permission and Capability Rules

Use centralized helpers in p2-next.php for post capabilities:

- p2next_can_create_posts()
- p2next_can_update_posts()

These are abilities-first and fallback to current_user_can when abilities are unavailable.

Frontend capability flags come from window.p2NextConfig. Prefer these flags over ad hoc checks in JS:

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
- Reuse window.__p2NextStore anti-duplication pattern.
- Maintain i18n coverage with text domain p2-next.
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

## High-Risk Areas

- p2-next.php config keys and helper naming: changing these can silently break frontend gating.
- src/store/index.js action signatures: createComment authorData support must be preserved.
- src/components/Comments.js and src/components/Comment.js: keep top-level/reply forms behavior aligned.
- src/components/FeedEnhancer.js timers: avoid introducing synchronized polling bursts.
