# Plan: Checklists

Status: Draft

Depends on:

-   No hard dependency for post-level checklists.
-   Optional dependency: [Frontend Comment Editing](./08-frontend-comment-editing.md) for full comment-level parity.

## Summary

Add interactive checklist support inside posts and comments.

## Why This Exists

`o2` supports task-like list items that can be checked, edited, deleted, and reordered inline. This is one of the more distinctive collaboration features missing from `p2026`.

## Goals

-   Define a modern checklist data model compatible with the Block Editor.
-   Support check and uncheck interactions without corrupting surrounding content.
-   Decide whether the feature should work in both posts and comments from day one.

## Non-Goals

-   Markdown parser parity for every legacy bullet syntax on the first pass.
-   A separate project-management product.

## Proposed Approach

-   Prefer block-native or structured content over brittle text parsing where possible.
-   For comments, evaluate a lighter syntax enhancement if block-based content is not practical.
-   Support permissions for toggling checklist state independently from full content editing if desired.
-   Emit audit events for checklist mutations if the interaction is treated as workflow state.

## Open Questions

-   Is a dedicated checklist block enough for posts?
-   Should comment checklists be parsed from plain text, or deferred to a later phase?
-   Do checklist toggles count as content edits or lightweight state changes?

## Acceptance Criteria

-   Users can create and interact with checklist items in at least one supported content surface.
-   Toggling items is reflected immediately in the UI and persisted.
-   The stored representation is stable enough to survive editing and rendering cycles.

## Source References

-   `wp-content/plugins/o2/modules/checklists/load.php`
