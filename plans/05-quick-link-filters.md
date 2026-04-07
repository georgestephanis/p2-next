# Plan: Quick-Link Filters And Saved Views

Status: Draft

Priority: Now

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage
-   Theme integration

Depends on:

-   No hard dependency.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) depending on placement.

## Estimated Size

Medium

## Risk

Medium. The main challenge is defining a durable filter model that works across themes and continues to cooperate with polling and unread state.

## Summary

Add quick access to canned feed views such as unread posts, unread comments, recent comments, no replies, my posts, and my mentions.

## Why This Exists

`p2020` and `o2` provide filter links and widgets that are more task-oriented than `p2026`'s current search and unread badge.

## Goals

-   Define a durable filter model that works across themes.
-   Support both URL-addressable filters and mountable quick-access UI.
-   Reuse current search, mentions, read-state, and post-state infrastructure where possible.

## Non-Goals

-   Building a fully generic report builder.
-   Tying filters exclusively to a sidebar UI.

## Proposed Approach

-   Define a small filter registry with labels, capabilities, URL state, and resolver logic.
-   Start with a limited set:
    -   Unread posts
    -   Unread comments
    -   Recent comments
    -   No replies
    -   My posts
    -   My mentions
    -   Open only or unresolved-only, where it aligns with existing post-state work
-   Expose the filters in one or more UI surfaces:
    -   Header dropdown
    -   Sidebar widget or panel
    -   Saved views entry point

## Open Questions

-   Should filters be implemented as URL params, REST presets, or both?
-   Should anonymous users get any quick-link views?
-   Does search expand into a command palette instead of a filter menu?

## Acceptance Criteria

-   Each supported filter is directly navigable.
-   Filtered results remain compatible with polling and unread state where applicable.
-   The UI can be rendered without assuming `p2020` theme structure.

## Source References

-   [https://wpcom-themes.svn.automattic.com/p2020/inc/filter/controls.php](https://wpcom-themes.svn.automattic.com/p2020/inc/filter/controls.php)
-   [https://wpcom-themes.svn.automattic.com/p2020/inc/filter/view.php](https://wpcom-themes.svn.automattic.com/p2020/inc/filter/view.php)
-   `wp-content/plugins/o2/modules/filter-widget/load.php`
-   `wp-content/plugins/o2/modules/recent-comments/load.php`
-   `wp-content/plugins/o2/modules/unreplied-posts/load.php`
