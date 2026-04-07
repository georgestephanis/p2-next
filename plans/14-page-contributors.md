# Plan: Page Contributors

Status: Draft

Priority: Exploratory

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage

Depends on:

-   No hard dependency.

## Estimated Size

Small

## Risk

Low. The technical work is limited, but the bigger question is whether this belongs in core plugin scope.

## Summary

Evaluate a page-level contributors panel derived from revision history.

## Why This Exists

`p2020` highlights the top contributors to a page based on revisions, which is useful for documentation-heavy sites.

## Goals

-   Decide whether this belongs in `p2026` or in a companion theme layer.
-   If adopted, expose contributor rollups without requiring direct wp-admin access.
-   Keep the UI lightweight and useful for collaborative documentation.

## Non-Goals

-   Full revision browsing UI.
-   Replacing WordPress revision comparisons.

## Proposed Approach

-   Start with a read-only contributor summary based on revision counts.
-   Render it only on pages or page-like content where it adds value.
-   Reuse existing user display data and profile links.

## Open Questions

-   Should this be visible only for pages, or also long-lived posts?
-   Is this a theme concern rather than a core collaboration feature?
-   Should the panel link to richer revision history screens?

## Acceptance Criteria

-   Eligible pages can show a contributors summary based on revision data.
-   The feature fails gracefully on sites with little or no revision history.
-   The UI does not require a `p2020`-specific template structure.

## Source References

-   `wp-content/themes/p2020/inc/contributors.php`
