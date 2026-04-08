# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

-   Added Reactions module (`modules/reactions/`) with full backend and frontend: emoji reactions on posts and comments, configurable modes (single 👍, curated set, or any emoji), aggregate counts, participant listings, and self-service removal.
-   Added `includes/abilities.php` consolidating all Abilities API registration and permission helpers. New abilities: `p2026/comment-create`, `p2026/comment-update`, `p2026/reaction-create`, `p2026/reaction-remove`. New helpers: `p2026_can_create_comments()`, `p2026_can_update_comments()`, `p2026_can_create_reactions()`, `p2026_can_remove_reactions()`.
-   Added `src/slots/reactions.js` — shared SlotFill registry (`PostFooterMetaSlot`, `PostFooterMetaFill`, `CommentFooterMetaSlot`, `CommentFooterMetaFill`) for cross-module UI injection into post and comment footers.
-   Added Reactions Interactivity API store (`src/interactivity/reactions.js`) under namespace `p2026/reactions` for lightweight, Script-Module-compatible reactions state.
-   Added `reactionsConfig` (emoji mode and allowed emoji) to `window.p2026Config` when the reactions module is active.
-   Added Admin settings tab for Reactions configuration (mode selection, custom emoji list).

### Changed

-   Refactored `PostEnhancement.js` comment summary bar: moved post-footer meta (including reactions) into a `PostFooterMetaSlot` fill so reaction and future footer items compose without tight coupling.
-   Improved comment count label in `PostEnhancement.js`: "Loading comments…" shown while loading, count summary shown when collapsed, "Hide discussion" shown when expanded.
-   Simplified `Comment.js` `useEffect` dependency array for edit content sync to track the full `comment` object rather than individual fields.
-   Reactions require a logged-in user (`is_user_logged_in()`); anonymous reaction creation is intentionally unsupported to avoid user_id=0 identity collisions.

## 0.4.0 - 2026-04-07

### Added

-   Added a shared frontend Interactivity API layer under `src/interactivity/` for reusable store namespaces and directive host wiring.
-   Added `src/utils/on-dom-ready.js` to standardize DOM-ready-safe module/bootstrap initialization.
-   Added a Script Module interactivity entrypoint (`build/interactivity.module.js`) and module asset metadata (`build/interactivity.module.asset.php`).
-   Added a classic-to-module interactivity bridge (`src/interactivity/client-bridge.js`) and script-module bootstrap entry (`src/interactivity/module-entry.js`).
-   Added and expanded the Sidebar Shell module for themes without native sidebar support, including configurable default content and collapse/visibility settings.
-   Added markdown-capable comment editing flows in the Comment Editor module for both new and existing comments.

### Changed

-   Migrated lightweight frontend interaction wiring from ad hoc event listeners toward Interactivity API directive hosts while preserving existing React + `@wordpress/data` behavior for editor-heavy and async state flows.
-   Updated notification dock interactions to use Interactivity API actions backed by shared store state.
-   Consolidated mentions and link-preview interactivity host wiring into shared interactivity modules while keeping feature logic in module directories.
-   Moved interactivity runtime loading from classic script dependencies to WordPress Script Modules API registration/enqueue flow.
-   Updated classic frontend callers to use bridge exports instead of importing interactivity implementation modules directly.
-   Updated architecture and contributor documentation to describe the new JS hierarchy, interactivity placement rules, naming conventions, and bootstrap conventions.
-   Updated build tooling and package metadata for the `0.4.0` release line.

### Fixed

-   Improved sidebar shell accessibility and behavior around focus management, no-JS fallback behavior, and persisted collapse state handling.
-   Fixed comment editing and toolbar edge cases, including null/zero comment identifier handling and edit-action visibility.

## 0.3.0 - 2026-04-03

### Added

-   Added an admin audit-log browser app (DataViews) with day filtering, search/sort, and enriched actor/post/comment labels.
-   Added audit-log admin REST endpoints for day shards and paged entries (`/p2026/v1/audit-log/days`, `/p2026/v1/audit-log/entries`).
-   Added module-aware hover integrations inside the audit viewer by initializing link previews and mention hovercards in admin context.
-   Added a local plugin SVG icon (`assets/p2026-icon.svg`) and updater metadata wiring so plugin/update screens can resolve icon artwork.

### Changed

-   Reworked audit-log loading to prefer preloaded data and stable display-state updates to reduce visual flashing during refreshes.
-   Migrated audit-log related record hydration to core-data entity patterns (`useEntityRecords`) for users/posts/comments.
-   Updated updater behavior for Git checkouts: automatic zip install remains disabled and UI messaging points to manual git update flow.
-   Expanded architecture and agent documentation to reflect audit-log admin flow, module integration points, and dynamic import chunk naming rules.
-   Updated webpack chunk output naming to keep module split chunks human-readable and deterministic.

### Fixed

-   Fixed missing DataViews styling and related admin presentation issues in the audit-log viewer.
-   Fixed mention hovercard styling/initialization regressions in admin audit-log context.
-   Fixed React/admin warning noise in the audit viewer by aligning rendering and control usage with current APIs.

## 0.2.0 - 2026-04-03

### Added

-   Renamed the plugin from P2 Next to P2026 across the plugin bootstrap, namespaces, runtime config, and package metadata.
-   Added an admin bar "New Post" action that scrolls to an existing editor when present or opens the modal editor fallback when the block is absent.
-   Added the JS/PHP module system with active-module gating from `window.p2026Config.activeModules`.
-   Added the mentions module, including user lookup endpoints, editor and textarea autocomplete, hovercards, and mention event hooks.
-   Added unified search, unread/read-state tracking, and notifications infrastructure for logged-in users.
-   Added the notifications dock with mention and reply notifications, read state management, and starter Playground seed data.
-   Added post-state workflow controls and the audit-log module with file/CPT persistence backends.
-   Added the link-previews module for internal post/comment hover cards backed by cached REST responses.
-   Added native GitHub update handling for GitHub-hosted installs, including release, prerelease, and trunk channel support.

### Changed

-   Expanded the README and architecture docs to cover modules, search, unread state, notifications, link previews, audit logging, and intranet deployment guidance.
-   Improved the new-post editor UX and frontend editor shell behavior.
-   Improved notification queries, pagination, actor metadata, and dock placement.
-   Tightened search mounting rules so search/unread UI only appears on the main archive-like query.
-   Refined Playground setup, seeded richer demo content, and updated the Home template integration.

### Fixed

-   Fixed stale fetch handling in mentions autocomplete.
-   Fixed notification creation/query edge cases and unread count handling.
-   Fixed several search UX issues around loading state, modal opening, and result refinement.
-   Fixed comment and editor integration details across the frontend enhancement flow.
-   Fixed GitHub updater error handling when filesystem moves fail during upgrades.

## 0.1.0 - 2026-03-25

### Added

-   Initial release of the plugin as P2 Next.
-   Progressive enhancement of theme-rendered feeds with polling-based new-post discovery.
-   Inline threaded comments with top-level and reply posting.
-   Frontend post editing and frontend new-post creation with a dynamic block.
-   Capability-aware UI driven by WordPress permissions and optional Abilities API integration.
-   WordPress Playground blueprint for one-click local evaluation.
