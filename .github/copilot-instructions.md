# Copilot Instructions for p2-next

This document is scoped to the `wp-content/plugins/p2-next` plugin.

## Purpose

`p2-next` is a modern P2/o2-style collaboration plugin that uses:

- WordPress REST API (`/wp/v2/posts`, `/wp/v2/comments`)
- Frontend Block Editor components
- Progressive enhancement of theme-rendered post lists

The plugin does not fully replace the theme output. It layers React-based controls on top of existing loop markup.

## Key Entry Points

- `p2-next.php`: plugin bootstrap, block registration, frontend script enqueue, REST nonce/config injection, and auto-title filter.
- `src/frontend.js`: enhancement entrypoint for existing post lists.
- `src/blocks/new-post/view.js`: frontend mount for the new post editor block.
- `src/store/index.js`: shared `@wordpress/data` store (`p2-next`) for posts/comments/UI state.
- `src/api/index.js`: `@wordpress/api-fetch` middleware init and polling helper.

## Architecture Notes

- The dynamic block `p2-next/new-post` is registered from built metadata in `build/blocks/new-post`.
- `render.php` only renders the new post editor mount point for logged-in users who can `publish_posts`.
- `frontend.js` discovers loop containers in both block themes and classic themes and mounts a hidden React root that renders portals into live DOM locations.
- State is centralized in `src/store/index.js` and reused by both view bundles using `window.__p2NextStore` to avoid duplicate store registration.
- Runtime config is injected by PHP as `window.p2NextConfig` and includes nonce, REST URL, current user metadata, and thread depth.

## Build and Lint

Run commands from `wp-content/plugins/p2-next`:

- `npm run build`: production build to `build/`.
- `npm run start`: watch build to `build/`.
- `npm run lint:js`: JavaScript linting.
- `composer install`: install PHP tooling.
- `npm run lint:php`: PHP CodeSniffer (`vendor/bin/phpcs`).

## Coding Guidelines for this Plugin

- Keep progressive-enhancement behavior intact: do not assume exclusive ownership of post markup.
- Prefer additive DOM behavior via portals over replacing theme HTML.
- Use the existing `p2-next` data store selectors/actions for post/comment interactions.
- Preserve REST permission expectations (post/comment creation and edit are permission-gated by core endpoints).
- Ensure all user-facing strings are wrapped with i18n functions and the `p2-next` text domain.
- Keep build artifacts in `build/` generated, not hand-edited.

## Common Change Areas

- Inline editing behavior: `src/components/PostEditor.js`, `src/components/PostEnhancement.js`.
- Comment threading and replies: `src/components/Comments.js`, `src/components/Comment.js`.
- New-post frontend editor behavior: `src/components/NewPostEditor.js` and block `view.js`.
- Polling and feed updates: `src/api/index.js`, `src/store/index.js`, `src/components/FeedEnhancer.js`.

## Validation Checklist

After changes:

1. Run `npm run build` and confirm no bundling errors.
2. Run `npm run lint:js`.
3. Run `npm run lint:php`.
4. Smoke-test a page with a post loop:
   - Existing posts still render from theme.
   - Comments can be expanded/replied to.
   - Inline post edit works for authorized users.
   - New-post block mounts and publishes for authorized users.
   - Polling banner appears when new posts exist.
