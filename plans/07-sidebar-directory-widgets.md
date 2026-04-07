# Plan: Sidebar Directory And Navigation Widgets

Status: Draft

Priority: Later

Implementation Areas:

-   Frontend UI
-   REST API
-   Theme integration

Depends on:

-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md)

## Estimated Size

Medium

## Risk

Medium. The work is modular, but the harder question is deciding which widgets belong in core plugin scope versus a theme or companion package.

## Summary

Evaluate a set of lightweight people, taxonomy, and navigation widgets inspired by `p2020`: Team, Tags, Page Menu, and Nav Menu.

## Why This Exists

`p2020` treats these widgets as part of the collaboration product, not just theme chrome. They help users discover coworkers, tags, and site structure quickly.

## Goals

-   Decide which widgets belong in `p2026` versus a companion theme or plugin.
-   If adopted, implement them as optional, self-contained modules.
-   Keep rendering flexible so the same module can appear in a sidebar, drawer, or other mount point.

## Non-Goals

-   Replacing native WordPress menu management.
-   Shipping every widget regardless of usage.

## Proposed Approach

-   Treat each widget as an individually toggled module under one planning umbrella.
-   Suggested sub-features:
    -   Team directory surface with avatars and profile links.
    -   Tags list by popularity.
    -   Page tree navigation.
    -   Nav menu rendering for existing WP menus.
-   Reuse existing mentions and profile endpoints where possible for team data.

## Open Questions

-   Which of these are core collaboration features versus theme concerns?
-   Should team data come from user queries or a dedicated directory API?
-   Should menus render as blocks instead of classic widgets?

## Acceptance Criteria

-   Each adopted widget can be enabled or disabled independently.
-   Each widget can render outside a `p2020`-style sidebar.
-   Team and tag widgets respect permissions and public site settings.

## Source References

-   [https://wpcom-themes.svn.automattic.com/p2020/widgets/load.php](https://wpcom-themes.svn.automattic.com/p2020/widgets/load.php)
-   [https://wpcom-themes.svn.automattic.com/p2020/widgets/my-team/my-team.php](https://wpcom-themes.svn.automattic.com/p2020/widgets/my-team/my-team.php)
-   [https://wpcom-themes.svn.automattic.com/p2020/widgets/tags/tags.php](https://wpcom-themes.svn.automattic.com/p2020/widgets/tags/tags.php)
-   [https://wpcom-themes.svn.automattic.com/p2020/widgets/sidebar-menus/page-menu.php](https://wpcom-themes.svn.automattic.com/p2020/widgets/sidebar-menus/page-menu.php)
-   [https://wpcom-themes.svn.automattic.com/p2020/widgets/sidebar-menus/nav-menu.php](https://wpcom-themes.svn.automattic.com/p2020/widgets/sidebar-menus/nav-menu.php)
