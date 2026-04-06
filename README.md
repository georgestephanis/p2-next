# P2026

A modern WordPress plugin that adds P2/o2-style team collaboration features by progressively enhancing theme-rendered post lists using React, the Block Editor, and the WordPress REST API.

Current release: 0.3.0. See [CHANGELOG.md](CHANGELOG.md) for release notes.

[![Try in WordPress Playground](https://img.shields.io/badge/Try%20in-WordPress%20Playground-3858e9?logo=wordpress)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/georgestephanis/p2026/HEAD/.github/blueprint.json)

## What It Does

-   **Real-time feed** — Polls for new posts and surfaces them behind a reveal banner without auto-scrolling.
-   **Unified search** — Searches authored posts and comments with a debounced modal UI for logged-in users on main archive-like feeds.
-   **Unread tracking** — Tracks per-user read state and shows an unread badge that reveals pending posts.
-   **Inline threaded comments** — Expand comment threads per post; post top-level comments and replies without leaving the page.
-   **Inline post editing** — Edit existing posts using the Block Editor directly on the front end.
-   **Post-state workflow module** — Optional Normal/Unresolved/Resolved state controls in the post menu, plus an "Open only" feed filter.
-   **New post creation** — A `p2026/new-post` dynamic block provides a front-end Block Editor for publishing posts. An admin bar "New Post" button opens the same editor in a modal when the block isn't on the page.
-   **Capability-aware UX** — All controls are gated by WordPress capabilities (and an optional Abilities API), so guests, contributors, and editors each see the appropriate UI.
-   **Mentions module** — `@username` autocomplete and hovercards, server-side linkification, and mention hook emission for downstream notifications.
-   **Notifications module** — Bottom-right notification dock for mentions/replies with polling and read management.
-   **Link-previews module** — Internal post/comment links get hover preview cards (title, avatar, date, excerpt) with REST-backed server-side caching.
-   **Audit-log module** — Persists core audit events and provides an admin DataViews browser (day filter, search, sorting, related actor/post/comment links) backed by REST endpoints.
-   **GitHub-based updates** — Supports native `Update URI` checks against GitHub releases, prereleases, and a `trunk` channel for direct installs from GitHub.
-   **Theme-agnostic** — Works with any block or classic theme without replacing the theme loop.

Recent frontend interaction work now uses a hybrid model:

-   React + `@wordpress/data` continue to power editor-heavy flows and shared async state.
-   The WordPress Interactivity API now powers delegated event wiring for lightweight interaction islands (for example admin-bar trigger behavior, menu close behavior, notification dock actions, hover interactions, and visibility-driven callbacks).
-   Interactivity wiring is loaded via a dedicated Script Module entry (`build/interactivity.module.js`) instead of classic script dependencies.
-   Classic frontend code calls a small bridge API (`src/interactivity/client-bridge.js`), while Script Module implementations live under `src/interactivity/*`.

## Building a Company Intranet

P2026 works well as the collaboration layer for a private internal site. A few companion plugins round out the setup:

### Access control

-   **[WP Force Login](https://wordpress.org/plugins/wp-force-login/)** — redirects all unauthenticated visitors to the login page, keeping every page of the site internal. Essential first step.
-   **[Domain Restricted Registration](https://github.com/georgestephanis/domain-restricted-registration/)** — lets you whitelist an email domain (e.g. `@yourcompany.com`) so coworkers can self-register without opening the door to outsiders.
-   **[WP SAML Auth](https://wordpress.org/plugins/wp-saml-auth/)** — single sign-on via your company's identity provider (Google Workspace, Azure AD, Okta, etc.). Employees log in with their existing corporate credentials and never need a separate WordPress password.

### People

-   **[Simple Local Avatars](https://wordpress.org/plugins/simple-local-avatars/)** — lets users upload profile photos that are stored on your own server. Avoids the Gravatar dependency, which matters on an intranet where employees may not have public Gravatar accounts and external requests are undesirable.

### Visibility and compliance

-   **[Stream](https://wordpress.org/plugins/stream/)** — keeps a full audit log of who created, edited, or deleted content and when. Useful for regulated industries or any team that needs an activity trail.

## Requirements

-   WordPress 6.0+
-   Any active theme (block or classic)

## Installation

1. Upload the plugin folder to `wp-content/plugins/`.
2. Activate **P2026** in the WordPress admin.
3. Add the **P2026: New Post** block to a page or template to enable front-end post creation.

### Classic (non-FSE) themes

For traditional PHP themes, render the new-post block above the loop in your `home.php`:

```php
<?php
// Render the P2026 new-post editor above the post loop.
if ( function_exists( 'p2026_can_create_posts' ) && p2026_can_create_posts() ) {
    echo do_blocks( '<!-- wp:p2026/new-post /-->' );
}
?>
```

Place this snippet just before your `while ( have_posts() )` loop. The block outputs nothing for users who lack the `publish_posts` capability, so the `p2026_can_create_posts()` guard is optional but avoids the `do_blocks()` call for guests entirely.

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

## Releases

-   Current stable release: `0.3.0`
-   Initial release baseline: `0.1.0` maps to commit `dbf2205587f73c66e3d63a46449ff64b39dc2a2f`
-   Release notes: [CHANGELOG.md](CHANGELOG.md)

## Architecture

p2026 uses progressive enhancement:

-   Theme markup remains the source of truth for initial rendering.
-   React portals inject controls into existing post DOM nodes.
-   A shared `@wordpress/data` store (`p2026`) manages posts, comments, and editor state.
-   All data flows through the WordPress REST API (`/wp/v2/posts`, `/wp/v2/comments`).
-   PHP injects `window.p2026Config` at page load with capability flags, nonce, and current user data.
-   Search header widgets mount only when the discovered loop is the main query and the current page is archive-like.
-   Shared Interactivity API host wiring lives under `src/interactivity/`.
-   Feature modules keep feature logic and pass handlers into shared interactivity initializers.
-   Interactivity implementations are loaded through the Script Modules API and registered in PHP with `wp_register_script_module` / `wp_enqueue_script_module` when available.
-   `src/utils/on-dom-ready.js` is the standard DOM-ready bootstrap helper.

### Interactivity Loading Model

-   `build/frontend.js` remains a classic script bundle for React/editor/store features.
-   `build/interactivity.module.js` is a separate Script Module bundle for Interactivity API stores/host wiring.
-   `p2026.php` enqueues both: classic frontend script + interactivity module (when Script Modules API is available).
-   Script-module limitations are respected: module dependencies are module IDs, not script handles.
-   Interactivity module code uses `window.wp.*` for script interoperability where needed (for example `window.wp.data`).

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full request/data flow diagram and file-level responsibility map.

## Search Notes

Current search implementation details:

-   Endpoint: `GET /p2026/v1/search`.
-   Auth: logged-in users only.
-   Scope: currently filters to authored posts/comments for the current user.
-   Query model: SQL `LIKE` matching with pagination caps.

## Module System

p2026 modules are discovered from `modules/*/index.php` and are active by default.

-   Option key: `p2026_disabled_modules`
-   Model: opt-out deny-list (new modules auto-enable unless explicitly disabled)
-   Settings UI: WP Admin → **P2026** menu

Current modules:

-   `mentions` — `@username` parsing, linkification, and user lookup REST endpoints
-   `notifications` — per-user notifications REST API and dock UI
-   `link-previews` — internal post/comment link preview REST endpoint + hover card UI
-   `post-state` — Normal/Unresolved/Resolved workflow state + REST endpoint
-   `audit-log` — audit event persistence backend (file or internal CPT)

### Module Matrix

| Module          | PHP Backend File                  | Frontend Entrypoint                                       | REST Routes                                                                                                      |
| --------------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mentions`      | `modules/mentions/index.php`      | `src/modules/mentions/index.js`                           | `GET /p2026/v1/users`, `GET /p2026/v1/users/{id}`                                                                |
| `notifications` | `modules/notifications/index.php` | `src/modules/notifications/index.js`                      | `GET /p2026/v1/notifications`, `POST /p2026/v1/notifications/{id}/read`, `POST /p2026/v1/notifications/read-all` |
| `link-previews` | `modules/link-previews/index.php` | `src/modules/link-previews/index.js`                      | `GET /p2026/v1/link-preview?url=...`                                                                             |
| `post-state`    | `modules/post-state/index.php`    | Core UI integration (`src/components/PostEnhancement.js`) | `POST /p2026/v1/posts/{id}/state`                                                                                |
| `audit-log`     | `modules/audit-log/index.php`     | `src/modules/audit-log/audit-log-viewer.js`               | `GET /p2026/v1/audit-log/days`, `GET /p2026/v1/audit-log/entries`                                                |

## Key Files

| File                                        | Role                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `p2026.php`                                 | Bootstrap, block registration, frontend enqueue, config injection, abilities                           |
| `src/frontend.js`                           | Entry point; discovers post nodes and mounts enhancement                                               |
| `src/store/index.js`                        | Redux-style store: state, actions, selectors, async thunks                                             |
| `src/api/index.js`                          | `apiFetch` middleware setup and polling utility                                                        |
| `src/components/FeedEnhancer.js`            | Polling orchestration and new-posts banner                                                             |
| `src/components/SearchWidget.js`            | Debounced post/comment search modal                                                                    |
| `src/components/UnreadBadge.js`             | Per-user unread count badge and read-state sync                                                        |
| `src/components/PostEnhancement.js`         | Per-post controls (comments toggle, edit/delete)                                                       |
| `src/components/Comments.js` + `Comment.js` | Threaded comment tree and reply forms                                                                  |
| `src/components/PostEditor.js`              | Inline Block Editor for editing existing posts                                                         |
| `src/components/NewPostEditor.js`           | Block Editor for creating new posts                                                                    |
| `src/components/NewPostModal.js`            | Modal wrapper opened by the admin bar "New Post" button                                                |
| `src/blocks/new-post/`                      | Dynamic block metadata, server render gate, and frontend mount                                         |
| `modules/post-state/index.php`              | Post-state taxonomy, REST field/endpoint, and audit event emission                                     |
| `modules/audit-log/index.php`               | Audit event persistence (uploads JSONL or CPT backend)                                                 |
| `src/modules/audit-log/audit-log-viewer.js` | Admin Audit Log browser app (DataViews + entity-backed related lookups)                                |
| `modules/mentions/index.php`                | Mention user search/detail endpoints and server-side content linkification                             |
| `modules/notifications/index.php`           | Notifications REST API + auto-create hooks                                                             |
| `modules/link-previews/index.php`           | Internal link preview REST endpoint + 3-day transient caching                                          |
| `admin/settings.php`                        | Module toggles and audit backend configuration UI                                                      |
| `includes/github-updates.php`               | GitHub release/update channel integration for the plugin `Update URI`                                  |
| `src/modules/link-previews/`                | Hover/focus preview card UI for internal post/comment links                                            |
| `src/modules/notifications/`                | Notification dock frontend UI                                                                          |
| `src/interactivity/`                        | Interactivity API stores + directive host wiring                                                       |
| `src/interactivity/client-bridge.js`        | Classic-script bridge API used by frontend/modules to call module-loaded interactivity implementations |
| `src/interactivity/module-entry.js`         | Script-module entry that boots interactivity stores/hosts and flushes queued bridge calls              |
| `src/utils/on-dom-ready.js`                 | Shared helper for DOM-ready bootstrap without ad hoc listeners                                         |

## Update Behavior (Git Checkouts)

-   Sites deployed from a git checkout are shown a manual update notice in plugin update UI.
-   Automatic update package install is intentionally blocked for git checkouts to protect local branch and worktree state.
-   For these installs, updates should be performed via normal git workflows (`git fetch`, `git checkout`/`git merge`/`git pull`) based on site policy.

Playground note: `.github/setup.php` seeds sample users, posts, comments, and starter notifications for the default logged-in `admin` user.

## Permission Model

PHP helpers in `p2026.php` centralize all capability checks:

-   `p2026_can_create_posts()` — checks `publish_posts` (abilities-first, falls back to `current_user_can`)
-   `p2026_can_update_posts($post_id)` — checks `edit_post` or `edit_posts`

If the WordPress Abilities API is available, the plugin registers:

-   `p2026/post-create`
-   `p2026/post-update`

Frontend gating uses `window.p2026Config` flags: `canCreatePosts`, `canUpdatePosts`, `canComment`, `requireNameEmail`, `isArchiveView`, `currentUser`.

## License

GPL-2.0-or-later
