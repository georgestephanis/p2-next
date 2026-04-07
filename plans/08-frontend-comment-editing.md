# Plan: Frontend Comment Editing

Status: Draft

Priority: Now

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage

Depends on:

-   No hard dependency.
-   Optional dependency: existing audit-log module for recording edits.

## Estimated Size

Medium

## Risk

Medium. The behavior is bounded, but comment permissions, anonymous authorship, and edit-state UX need careful handling.

## Summary

Add the ability to edit existing comments from the frontend collaboration UI.

## Why This Exists

Legacy `o2` allows comment authors and privileged users to edit comments inline. `p2026` currently supports comment creation and replies only.

## Goals

-   Support inline editing for comment authors and authorized moderators.
-   Keep permission checks aligned with WordPress capabilities.
-   Preserve mentions and rendered comment formatting.

## Non-Goals

-   Full moderation workflow redesign.
-   Reintroducing legacy admin-ajax architecture.

## Proposed Approach

-   Extend the comment UI with an edit action when permissions allow.
-   Add REST support for comment updates if core endpoints are insufficient for current frontend needs.
-   Reuse `MentionTextareaControl` for editing content.
-   Emit audit events when comments are updated.

## Open Questions

-   Should comment deletion and trash restore also be added at the same time?
-   Are there moderation edge cases for anonymous comments that need special handling?
-   Should edit history be visible in the UI?

## Acceptance Criteria

-   Eligible users can edit a comment inline and save it without leaving the page.
-   The updated comment re-renders in place.
-   Unauthorized users do not see the edit affordance.

## Source References

-   `wp-content/plugins/o2/inc/tpl/comment-edit.php`
-   `wp-content/plugins/o2/js/views/comment.js`
-   `wp-content/plugins/p2026/src/components/Comment.js`
