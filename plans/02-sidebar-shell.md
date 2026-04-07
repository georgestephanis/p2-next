# Plan: Sidebar Shell And Layout

Status: Draft

Depends on:

-   No hard dependency.

## Summary

Evaluate whether `p2026` should offer an optional collapsible sidebar shell for themes that want a `p2020`-like workspace layout.

## Why This Exists

`p2020` assumes a sidebar-first information architecture. Several other missing features, especially widgets and quick-link views, fit naturally into that shell.

## Goals

-   Decide whether sidebar layout is inside `p2026` scope.
-   If yes, provide an optional, theme-safe shell rather than baking layout assumptions into core enhancement code.
-   Support persisted collapsed and expanded state.

## Non-Goals

-   Forcing all themes into a sidebar layout.
-   Replacing a theme's overall page structure.

## Proposed Approach

-   Treat the sidebar shell as an optional layout module.
-   Provide a mount target and CSS variables rather than rigid markup requirements.
-   Store collapsed state per user or in local storage.
-   Ensure all sidebar consumers can also render elsewhere if the shell is disabled.

## Open Questions

-   Should this be a block, a template part helper, or a frontend enhancement module?
-   How does this work in block themes versus classic themes?
-   Does `p2026` want to own sidebar rendering at all, or should this be a companion theme concern?

## Acceptance Criteria

-   A theme can opt into a `p2026` sidebar shell without losing compatibility.
-   The sidebar can be collapsed and expanded.
-   Collapsed state persists across page loads.
-   Core `p2026` features still work when the sidebar shell is absent.

## Source References

-   `wp-content/themes/p2020/inc/toggle-sidebar/toggle-sidebar.php`
