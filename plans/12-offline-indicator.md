# Plan: Offline Indicator

Status: Draft

Depends on:

-   No hard dependency.

## Summary

Add a visible offline and reconnect status indicator for frontend collaboration workflows.

## Why This Exists

`o2` surfaces connection loss explicitly. `p2026` has polling and async saves, but little user-facing status when connectivity degrades.

## Goals

-   Detect offline and degraded connectivity states.
-   Surface clear user feedback for pending or failed actions.
-   Integrate gracefully with existing polling and save flows.

## Non-Goals

-   Full offline-first editing or conflict resolution.
-   Background sync queueing in the first phase.

## Proposed Approach

-   Start with browser online and offline events plus request-failure tracking.
-   Add a small persistent status banner or toast when the app loses connectivity.
-   Suppress noisy repeated alerts when the user is already aware of the issue.

## Open Questions

-   Should saves retry automatically or stay user-initiated?
-   Do we need per-action pending state for comments and posts before showing this feature?
-   Is a global banner enough, or do we need inline error states too?

## Acceptance Criteria

-   Users receive clear feedback when the app is offline or cannot reach the server.
-   The indicator disappears or resolves when connectivity returns.
-   Failed actions provide enough context to recover.

## Source References

-   `wp-content/plugins/o2/modules/offline/load.php`
