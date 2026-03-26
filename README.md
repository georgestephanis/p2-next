# P2 Next

A modern WordPress plugin that adds P2/o2-style team collaboration features by progressively enhancing theme-rendered post lists using React, the Block Editor, and the WordPress REST API.

[![Open in WordPress Playground](https://playground.wordpress.net/assets/playground-badge.svg)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/georgestephanis/p2-next/HEAD/.github/blueprint.json)

## What It Does

- **Real-time feed** — Polls for new posts and surfaces them behind a reveal banner without auto-scrolling.
- **Inline threaded comments** — Expand comment threads per post; post top-level comments and replies without leaving the page.
- **Inline post editing** — Edit existing posts using the Block Editor directly on the front end.
- **New post creation** — A `p2-next/new-post` dynamic block provides a front-end Block Editor for publishing posts.
- **Capability-aware UX** — All controls are gated by WordPress capabilities (and an optional Abilities API), so guests, contributors, and editors each see the appropriate UI.
- **Theme-agnostic** — Works with any block or classic theme without replacing the theme loop.

## Requirements

- WordPress 6.0+
- Any active theme (block or classic)

## Installation

1. Upload the plugin folder to `wp-content/plugins/`.
2. Activate **P2 Next** in the WordPress admin.
3. Add the **P2 Next: New Post** block to a page or template to enable front-end post creation.

## Development

From the plugin root:

```bash
npm install
composer install

npm run build       # Production build
npm run start       # Watch mode
npm run lint:js     # JavaScript lint
npm run lint:css    # CSS lint
npm run lint:php    # PHP lint
npm run format:js   # Auto-fix JS formatting
```

Build output goes to `build/`. Do not hand-edit files there.

## Architecture

p2-next uses progressive enhancement:

- Theme markup remains the source of truth for initial rendering.
- React portals inject controls into existing post DOM nodes.
- A shared `@wordpress/data` store (`p2-next`) manages posts, comments, and editor state.
- All data flows through the WordPress REST API (`/wp/v2/posts`, `/wp/v2/comments`).
- PHP injects `window.p2NextConfig` at page load with capability flags, nonce, and current user data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full request/data flow diagram and file-level responsibility map.

## Key Files

| File | Role |
|------|------|
| `p2-next.php` | Bootstrap, block registration, frontend enqueue, config injection, abilities |
| `src/frontend.js` | Entry point; discovers post nodes and mounts enhancement |
| `src/store/index.js` | Redux-style store: state, actions, selectors, async thunks |
| `src/api/index.js` | `apiFetch` middleware setup and polling utility |
| `src/components/FeedEnhancer.js` | Polling orchestration and new-posts banner |
| `src/components/PostEnhancement.js` | Per-post controls (comments toggle, edit/delete) |
| `src/components/Comments.js` + `Comment.js` | Threaded comment tree and reply forms |
| `src/components/PostEditor.js` | Inline Block Editor for editing existing posts |
| `src/components/NewPostEditor.js` | Block Editor for creating new posts |
| `src/blocks/new-post/` | Dynamic block metadata, server render gate, and frontend mount |

## Permission Model

PHP helpers in `p2-next.php` centralize all capability checks:

- `p2next_can_create_posts()` — checks `publish_posts` (abilities-first, falls back to `current_user_can`)
- `p2next_can_update_posts($post_id)` — checks `edit_post` or `edit_posts`

If the WordPress Abilities API is available, the plugin registers:
- `p2-next/post-create`
- `p2-next/post-update`

Frontend gating uses `window.p2NextConfig` flags: `canCreatePosts`, `canUpdatePosts`, `canComment`, `requireNameEmail`, `currentUser`.

## License

GPL-2.0-or-later
