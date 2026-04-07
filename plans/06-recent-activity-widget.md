# Plan: Recent Activity Widget

Status: Draft

Priority: Later

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage

Depends on:

-   No hard dependency.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) if the feature should appear as a sidebar widget rather than a standalone panel.

## Estimated Size

Medium

## Risk

Medium. The UI is manageable, but the event model needs to avoid becoming a second feed implementation.

## Summary

Add a live recent-activity surface for posts and comments, similar to the `p2020` widget.

## Why This Exists

The current `p2026` feed shows new posts in context, but it does not offer a separate activity stream that can be scanned independently of the main loop.

## Goals

-   Provide a compact, continuously refreshed activity list.
-   Support posts-only, comments-only, or combined activity.
-   Keep click-through behavior aligned with existing post and comment anchors.

## Non-Goals

-   Rebuilding the full feed inside a widget.
-   Introducing a second source of truth for posts and comments.

## Proposed Approach

-   Create a REST endpoint or selectors that return recent post and comment events in a normalized list.
-   Build a small React panel that can live in a sidebar, drawer, or dashboard area.
-   Reuse existing polling utilities and visibility-aware backoff.

## Open Questions

-   Is this a widget, module, or admin/settings surface?
-   Should activity include edits, state changes, and other audit events, or only posts and comments?
-   Should unread markers be integrated with read-state or remain separate?

## Acceptance Criteria

-   Users can view recent post and comment activity in one compact stream.
-   Clicking an item opens the related post or comment in context.
-   The stream refreshes without requiring full-page reloads.

## Source References

-   `wp-content/themes/p2020/widgets/activity/activity.php`
