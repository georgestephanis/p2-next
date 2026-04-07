# Plan: Time Shortcode

Status: Draft

Priority: Exploratory

Implementation Areas:

-   Editor UX
-   Frontend UI
-   Content rendering

Depends on:

-   No hard dependency.

## Estimated Size

Small

## Risk

Medium. The implementation is not large, but the feature may cut against the plugin's more modern editor direction.

## Summary

Evaluate support for an author-friendly time shortcode that renders in the viewer's local timezone.

## Why This Exists

Legacy `o2` includes a `[time]...[/time]` shortcode for collaboration posts and comments where timezone localization matters.

## Goals

-   Decide whether shortcode support belongs in `p2026` at all.
-   If yes, support a modern implementation that is safe in both posts and comments.
-   Keep rendering consistent with current date formatting expectations.

## Non-Goals

-   Building a complete scheduling language.
-   Supporting arbitrary shortcode ecosystems inside comments.

## Proposed Approach

-   Evaluate whether a shortcode, block transform, or inline format is the right long-term model.
-   If implemented, parse trusted time strings and render semantic markup with client-side localization.
-   Scope to explicit author intent rather than automatic time detection.

## Open Questions

-   Does shortcode syntax fit `p2026`'s modern editor direction?
-   Should this be post-only at first, with comment support later?
-   Is a block or slash-command experience preferable to raw shortcode markup?

## Acceptance Criteria

-   Authors can express a time that renders in the viewer's locale.
-   Invalid input fails safely without breaking surrounding content.
-   Output is stable in both rendering and editing contexts.

## Source References

-   `wp-content/plugins/o2/modules/time-shortcode/load.php`
