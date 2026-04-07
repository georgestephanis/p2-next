# Plan: Pages Index

Status: Draft

Priority: Exploratory

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage
-   Theme integration

Depends on:

-   No hard dependency.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) if a navigation-heavy layout is desired.

## Estimated Size

Architectural

## Risk

High. This introduces a page-centric workflow that is meaningfully different from the current posts-first collaboration model.

## Summary

Add a pages-focused index view inspired by `p2020`, including hierarchical display and optional page reordering.

## Why This Exists

`p2020` has a specialized page-browser mode that turns the site into a lightweight documentation tree, not just a posts feed.

## Goals

-   Decide whether page workflows belong in `p2026` scope.
-   If yes, support hierarchical browsing of pages.
-   Evaluate drag-and-drop reordering as a second phase rather than a baseline requirement.

## Non-Goals

-   Reproducing `p2020`'s exact query-var routing.
-   Taking over WordPress page editing entirely.

## Proposed Approach

-   Start with a read-focused page tree view backed by REST.
-   Support visibility of page hierarchy, current page, and child counts.
-   Consider reordering only after the browsing model is stable.
-   Keep this distinct from the posts feed so feed-specific assumptions do not leak into page UI.

## Open Questions

-   Should this be a dedicated admin-adjacent screen, a frontend view, or a block?
-   Is drag-and-drop ordering required for the first milestone?
-   How should capabilities map for editors versus authors?

## Acceptance Criteria

-   Users with access can browse pages in hierarchical order.
-   The view is clearly distinct from the posts feed.
-   Reordering, if included, respects menu order and capability checks.

## Source References

-   [https://wpcom-themes.svn.automattic.com/p2020/inc/pages-index/class-pages-index.php](https://wpcom-themes.svn.automattic.com/p2020/inc/pages-index/class-pages-index.php)
