# Changelog

All notable changes to this project will be documented in this file.

## 0.2.0 - 2026-04-03

### Added

- Renamed the plugin from P2 Next to P2026 across the plugin bootstrap, namespaces, runtime config, and package metadata.
- Added an admin bar "New Post" action that scrolls to an existing editor when present or opens the modal editor fallback when the block is absent.
- Added the JS/PHP module system with active-module gating from `window.p2026Config.activeModules`.
- Added the mentions module, including user lookup endpoints, editor and textarea autocomplete, hovercards, and mention event hooks.
- Added unified search, unread/read-state tracking, and notifications infrastructure for logged-in users.
- Added the notifications dock with mention and reply notifications, read state management, and starter Playground seed data.
- Added post-state workflow controls and the audit-log module with file/CPT persistence backends.
- Added the link-previews module for internal post/comment hover cards backed by cached REST responses.
- Added native GitHub update handling for GitHub-hosted installs, including release, prerelease, and trunk channel support.

### Changed

- Expanded the README and architecture docs to cover modules, search, unread state, notifications, link previews, audit logging, and intranet deployment guidance.
- Improved the new-post editor UX and frontend editor shell behavior.
- Improved notification queries, pagination, actor metadata, and dock placement.
- Tightened search mounting rules so search/unread UI only appears on the main archive-like query.
- Refined Playground setup, seeded richer demo content, and updated the Home template integration.

### Fixed

- Fixed stale fetch handling in mentions autocomplete.
- Fixed notification creation/query edge cases and unread count handling.
- Fixed several search UX issues around loading state, modal opening, and result refinement.
- Fixed comment and editor integration details across the frontend enhancement flow.
- Fixed GitHub updater error handling when filesystem moves fail during upgrades.

## 0.1.0 - 2026-03-25

### Added

- Initial release of the plugin as P2 Next.
- Progressive enhancement of theme-rendered feeds with polling-based new-post discovery.
- Inline threaded comments with top-level and reply posting.
- Frontend post editing and frontend new-post creation with a dynamic block.
- Capability-aware UI driven by WordPress permissions and optional Abilities API integration.
- WordPress Playground blueprint for one-click local evaluation.