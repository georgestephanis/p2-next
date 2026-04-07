# Plan: Sticky Posts

Status: Draft

Depends on:

-   No hard dependency.
-   Optional dependency: reuse current post menu placement and audit-log hooks.

## Summary

Expose sticky and unsticky controls for posts from the frontend UI.

## Why This Exists

`o2` provides a quick way to pin important posts to the top of the home feed. `p2026` already has a post menu, so this is a natural extension.

## Goals

-   Let authorized users stick and unstick posts from the frontend.
-   Reflect sticky state in the feed and in post metadata.
-   Keep capability checks aligned with WordPress sticky-post permissions.

## Non-Goals

-   Custom ranking algorithms beyond native sticky behavior.
-   Per-user pinning semantics.

## Proposed Approach

-   Add sticky state awareness to post enhancement data.
-   Add a menu action for eligible users.
-   Use native WordPress sticky post APIs and emit audit events.

## Open Questions

-   Should sticky state be shown visually in the card UI as well as in the menu?
-   Should archives and filtered views preserve native sticky ordering or normalize it?

## Acceptance Criteria

-   Eligible users can stick and unstick a post from the frontend.
-   Sticky state persists and is reflected on reload.
-   Non-eligible users do not see the control.

## Source References

-   `wp-content/plugins/o2/modules/sticky-posts/load.php`
