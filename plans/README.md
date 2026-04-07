# P2026 Planning Backlog

This folder captures feature plans derived from the audit of the `p2020` theme and the legacy `o2` plugin.

These are planning documents only. They are intended to support later evaluation, prioritization, and implementation.

## Backlog Buckets

These buckets are rough planning sizes, not delivery commitments.

### Small

-   [Sticky Posts](./11-sticky-posts.md)
-   [Offline Indicator](./12-offline-indicator.md)
-   [Time Shortcode](./13-time-shortcode.md)
-   [Page Contributors](./14-page-contributors.md)
-   [Support Tags Via Hashtag](./15-tags-via-hashtag.md)
-   [Announcements](./17-announcements.md)
-   [Keyboard Shortcuts](./19-keyboard-shortcuts.md)

### Medium

-   [View Modes](./01-view-modes.md)
-   [Quick-Link Filters And Saved Views](./05-quick-link-filters.md)
-   [Recent Activity Widget](./06-recent-activity-widget.md)
-   [Sidebar Directory And Navigation Widgets](./07-sidebar-directory-widgets.md)
-   [Frontend Comment Editing](./08-frontend-comment-editing.md)
-   [Checklists](./09-checklists.md)
-   [Following Threads](./10-following-threads.md)
-   [Drafts Index](./04-drafts-index.md)
-   [Reactions On Posts And Comments](./16-reactions.md)
-   [Draft Auto-Save And Preview](./18-draft-autosave-preview.md)
-   [Glossary And Knowledge Base](./21-glossary-knowledge-base.md)
-   [Project Threads](./23-project-threads.md)

### Architectural

-   [Sidebar Shell And Layout](./02-sidebar-shell.md)
-   [Pages Index](./03-pages-index.md)
-   [External Integrations](./20-external-integrations.md)
-   [Multisite Xposting](./22-multisite-xposting.md)

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
13. [Draft Auto-Save And Preview](./18-draft-autosave-preview.md)
14. [Support Tags Via Hashtag](./15-tags-via-hashtag.md)
15. [Glossary And Knowledge Base](./21-glossary-knowledge-base.md)
16. [Reactions On Posts And Comments](./16-reactions.md)
17. [Announcements](./17-announcements.md)
18. [Keyboard Shortcuts](./19-keyboard-shortcuts.md)
19. [Project Threads](./23-project-threads.md)
20. [Time Shortcode](./13-time-shortcode.md)
21. [Page Contributors](./14-page-contributors.md)
22. [External Integrations](./20-external-integrations.md)
23. [Multisite Xposting](./22-multisite-xposting.md)

## Dependency Notes

-   The sidebar-related plans are not strict prerequisites for all other work, but they are a practical dependency if the goal is to recreate the `p2020` experience rather than offer theme-agnostic equivalents.
-   [Checklists](./09-checklists.md) is partly independent, but full parity for comment-hosted checklists becomes easier after [Frontend Comment Editing](./08-frontend-comment-editing.md).
-   [Following Threads](./10-following-threads.md) should build on the existing notifications module rather than invent a second notification system.
-   [Quick-Link Filters And Saved Views](./05-quick-link-filters.md) should be evaluated before or alongside widget work because it affects whether filters belong in a sidebar, header, command palette, or user-specific saved views UI.
-   [Pages Index](./03-pages-index.md) and [Drafts Index](./04-drafts-index.md) are special-purpose views that can be built independently, but they need a shared decision about routing, capabilities, and how much `p2026` should own page-oriented workflows.
-   [Support Tags Via Hashtag](./15-tags-via-hashtag.md) should be evaluated before [Glossary And Knowledge Base](./21-glossary-knowledge-base.md) if both need shared inline-term parsing or editor transforms.
-   [Reactions On Posts And Comments](./16-reactions.md) has a practical relationship with [Following Threads](./10-following-threads.md) because the open issue suggests optional auto-follow behavior.
-   [Draft Auto-Save And Preview](./18-draft-autosave-preview.md) overlaps with [Drafts Index](./04-drafts-index.md) and should share persistence and resume-edit decisions.
-   [Keyboard Shortcuts](./19-keyboard-shortcuts.md) should be layered after the main interaction model is stable so shortcuts target settled UI affordances.
-   [External Integrations](./20-external-integrations.md) becomes much easier if notification and audit event surfaces remain reusable and documented.
-   [Multisite Xposting](./22-multisite-xposting.md) is the most architectural item in the backlog and should be treated as late-stage work unless it becomes a product-level priority.

## Themes For Review

-   Preserve `p2026`'s theme-agnostic design unless there is a deliberate decision to add optional layout opinionation.
-   Prefer feature modules and REST endpoints over theme-coupled PHP templates where possible.
-   Reuse the existing post menu, notifications, mentions, audit-log, and read-state systems instead of creating parallel infrastructure.

## Open Issues Already Represented Elsewhere

-   Open issue `#8` overlaps with [Quick-Link Filters And Saved Views](./05-quick-link-filters.md).
-   Open issue `#7` overlaps with [Checklists](./09-checklists.md).
-   Open issue `#11` partially overlaps with [Sticky Posts](./11-sticky-posts.md); the remaining gap is tracked in [Project Threads](./23-project-threads.md).

## Open Issue Links

-   Issue `#3`: https://github.com/georgestephanis/p2026/issues/3
-   Issue `#7`: https://github.com/georgestephanis/p2026/issues/7
-   Issue `#8`: https://github.com/georgestephanis/p2026/issues/8
-   Issue `#11`: https://github.com/georgestephanis/p2026/issues/11
-   Issue `#13`: https://github.com/georgestephanis/p2026/issues/13
-   Issue `#14`: https://github.com/georgestephanis/p2026/issues/14
-   Issue `#15`: https://github.com/georgestephanis/p2026/issues/15
-   Issue `#16`: https://github.com/georgestephanis/p2026/issues/16
-   Issue `#17`: https://github.com/georgestephanis/p2026/issues/17
-   Issue `#18`: https://github.com/georgestephanis/p2026/issues/18
-   Issue `#19`: https://github.com/georgestephanis/p2026/issues/19
