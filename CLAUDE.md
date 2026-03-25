# CLAUDE.md

This file documents the architecture and working conventions for the `p2-next` plugin.

## What This Is

`p2-next` is a WordPress plugin that modernizes P2/o2-style collaboration using:

- Block Editor components on the frontend
- WordPress REST API for posts/comments
- Progressive enhancement over theme-rendered post lists

It is not a full SPA replacement for the theme loop.

## Top-Level Layout

- `p2-next.php` - plugin bootstrap and WordPress hooks.
- `src/` - JavaScript source for frontend behavior, block setup, API helpers, and state.
- `src/blocks/new-post/` - dynamic block definition and frontend mount logic.
- `src/components/` - React UI for feed enhancements, comments, and inline editing.
- `src/store/` - centralized `@wordpress/data` store.
- `src/api/` - `apiFetch` middleware setup and polling helper.
- `build/` - compiled output from `@wordpress/scripts` (generated).
- `webpack.config.js` - extends WordPress scripts config with `frontend` entry.
- `package.json` - JS build/lint scripts.
- `composer.json` + `phpcs.xml.dist` - PHP linting/tooling.

## Runtime Flow

1. `p2-next.php` registers dynamic block metadata from `build/blocks-manifest.php`.
2. Public pages enqueue `build/frontend.js` when `build/frontend.asset.php` exists.
3. PHP injects `window.p2NextConfig` (nonce, restUrl, currentUser, site metadata).
4. `src/frontend.js` finds loop containers and current post nodes, then mounts `FeedEnhancer` via a hidden root and portals.
5. `FeedEnhancer` seeds `lastFetched`, starts polling, and reveals pending posts using a banner.
6. `PostEnhancement` injects per-post controls for comments and inline editing.
7. `PostEditor` and `NewPostEditor` use frontend block editor primitives for content editing/creation.

## State and Data

All interactive behavior flows through `src/store/index.js` (`STORE_NAME = 'p2-next'`).

State shape includes:

- `posts`
- `comments` keyed by `postId`
- `lastFetched`
- `pendingCount` and `pendingPosts`
- UI state for expanded posts, active editor, and saving flags

REST usage:

- `GET /wp/v2/posts` for feed and polling (`after=`)
- `POST /wp/v2/posts` for create/update
- `GET /wp/v2/comments` for per-post threads
- `POST /wp/v2/comments` for replies

## Build and Tooling

From plugin root:

```bash
npm install
npm run build
npm run start
npm run lint:js
composer install
npm run lint:php
```

Notes:

- `WP_BLOCKS_MANIFEST=true` is used in build scripts for block manifest generation.
- Do not edit `build/` directly.

## Important Conventions

- Keep enhancement non-destructive: theme output remains primary.
- Prefer portals into existing DOM over replacing loop markup.
- Reuse `window.__p2NextStore` pattern to avoid duplicate store registration across bundles.
- Keep i18n text domain as `p2-next`.
- Keep capability-sensitive UI gated by current user capabilities from config and REST permissions.

## Quick File Guide

- `src/frontend.js` - enhancement bootstrap and page discovery.
- `src/components/FeedEnhancer.js` - polling orchestration, banner, and per-post enhancement mounts.
- `src/components/PostEnhancement.js` - controls injected into each post element.
- `src/components/Comments.js` and `src/components/Comment.js` - threaded comment rendering and replies.
- `src/components/PostEditor.js` - inline edit existing posts.
- `src/components/NewPostEditor.js` - create new posts from frontend block.
- `src/blocks/new-post/view.js` - block-specific frontend mount.
- `src/blocks/new-post/render.php` - capability-gated mount markup.

## Validation Expectations

After functional changes:

1. Build passes (`npm run build`).
2. JS lint passes (`npm run lint:js`).
3. PHP lint passes (`npm run lint:php`).
4. Manual checks on a page with posts confirm:
   - enhancement controls attach correctly,
   - comments and replies work,
   - inline editing works,
   - new-post block works,
   - polling banner behavior is correct.
