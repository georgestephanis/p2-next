# P2026 Planning Backlog

This folder captures feature plans derived from the audit of the `p2020` theme and the legacy `o2` plugin.

These are planning documents only. They are intended to support later evaluation, prioritization, and implementation.

## Suggested Evaluation Order

1. [Sidebar Shell And Layout](./02-sidebar-shell.md)
2. [View Modes](./01-view-modes.md)
3. [Quick-Link Filters And Saved Views](./05-quick-link-filters.md)
4. [Recent Activity Widget](./06-recent-activity-widget.md)
5. [Sidebar Directory And Navigation Widgets](./07-sidebar-directory-widgets.md)
6. [Frontend Comment Editing](./08-frontend-comment-editing.md)
7. [Checklists](./09-checklists.md)
8. [Following Threads](./10-following-threads.md)
9. [Sticky Posts](./11-sticky-posts.md)
10. [Offline Indicator](./12-offline-indicator.md)
11. [Pages Index](./03-pages-index.md)
12. [Drafts Index](./04-drafts-index.md)
13. [Time Shortcode](./13-time-shortcode.md)
14. [Page Contributors](./14-page-contributors.md)

## Dependency Notes

- The sidebar-related plans are not strict prerequisites for all other work, but they are a practical dependency if the goal is to recreate the `p2020` experience rather than offer theme-agnostic equivalents.
- [Checklists](./09-checklists.md) is partly independent, but full parity for comment-hosted checklists becomes easier after [Frontend Comment Editing](./08-frontend-comment-editing.md).
- [Following Threads](./10-following-threads.md) should build on the existing notifications module rather than invent a second notification system.
- [Quick-Link Filters And Saved Views](./05-quick-link-filters.md) should be evaluated before or alongside widget work because it affects whether filters belong in a sidebar, header, command palette, or user-specific saved views UI.
- [Pages Index](./03-pages-index.md) and [Drafts Index](./04-drafts-index.md) are special-purpose views that can be built independently, but they need a shared decision about routing, capabilities, and how much `p2026` should own page-oriented workflows.

## Themes For Review

- Preserve `p2026`'s theme-agnostic design unless there is a deliberate decision to add optional layout opinionation.
- Prefer feature modules and REST endpoints over theme-coupled PHP templates where possible.
- Reuse the existing post menu, notifications, mentions, audit-log, and read-state systems instead of creating parallel infrastructure.