# Plan: View Modes

Status: Draft

Priority: Later

Implementation Areas:

-   Frontend UI
-   Data model and storage
-   Theme integration

Depends on:

-   No hard dependency.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) if the UI should match `p2020` closely.

## Estimated Size

Medium

## Risk

Medium. The feature touches feed rendering, user preferences, and theme-agnostic UI placement at the same time.

## Summary

Add user-selectable feed display modes comparable to `p2020`'s Default, Expanded, and Compact views.

## Why This Exists

`p2020` offers three feed-density modes that materially change how much content is visible at once and whether comments are expanded by default.

## Goals

-   Define what display modes `p2026` should support.
-   Persist the preference per user, with graceful anonymous fallback if needed.
-   Keep the implementation theme-agnostic.
-   Make the mode affect both initial render and hydrated enhancements.

## Non-Goals

-   Reproducing `p2020` markup exactly.
-   Introducing theme-specific CSS assumptions into core components.

## Proposed Approach

-   Add a small view-preference model to `p2026` runtime config and store.
-   Support a minimum of:
    -   Default: current `p2026` behavior.
    -   Expanded: auto-expand comments for visible posts or always show comment counts plus open threads.
    -   Compact: denser cards, trimmed excerpts, reduced vertical spacing, and fewer inline controls.
-   Decide whether preference storage belongs in user meta, local storage, or both.
-   Mount the control in a location that works across themes, likely near search and unread controls.

## Open Questions

-   Should Expanded auto-fetch comments for all visible posts, or only default-open cached threads?
-   Should Compact change post content rendering or only visual density?
-   Is this a global site preference or per-device preference?

## Acceptance Criteria

-   A logged-in user can switch between supported modes.
-   The selected mode persists across page loads.
-   The feed visibly changes density or expansion behavior per mode.
-   The default mode remains the current behavior when no preference is set.

## Source References

-   `wp-content/themes/p2020/inc/view-selector/class-view-selector.php`
