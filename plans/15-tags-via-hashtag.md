# Plan: Support Tags Via Hashtag

Status: Draft

Depends on:

-   No hard dependency.
-   Optional dependency: [Quick-Link Filters And Saved Views](./05-quick-link-filters.md) if hashtag support should immediately power tag-specific views.

Issue Reference:

-   GitHub issue `#3` — Support tags on posts via `#tag`

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/3

## Summary

Allow authors to create or assign post tags directly from inline `#tag` syntax in post content.

## Why This Exists

Tagging via natural inline syntax is part of the classic P2 interaction model and makes categorization much faster during composition.

## Goals

-   Parse `#tag` patterns from authored content.
-   Convert those patterns into real WordPress tags on save.
-   Decide whether tags should also be linkified in rendered content.

## Non-Goals

-   Parsing every hashtag-like token in all contexts.
-   Turning comments into tag-assignment surfaces unless explicitly desired.

## Proposed Approach

-   Start with post content only.
-   Add a content parsing layer on create and update that extracts candidate tags.
-   Normalize tags against WordPress taxonomy rules.
-   Decide whether inline `#tag` remains visible as typed, is linked, or is transformed in-editor.

## Open Questions

-   Should hashtags in comments create or apply post tags?
-   How should duplicate, multiword, or punctuation-adjacent tags be handled?
-   Does the editor need autocomplete or discovery for existing tags?

## Acceptance Criteria

-   A post containing supported `#tag` syntax results in corresponding WordPress tags.
-   Tag assignment does not break normal block serialization.
-   Rendered content behavior for hashtags is consistent and documented.
