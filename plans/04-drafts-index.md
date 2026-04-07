# Plan: Drafts Index

Status: Draft

Priority: Later

Implementation Areas:

-   Frontend UI
-   REST API
-   Editor UX

Depends on:

-   No hard dependency.

## Estimated Size

Medium

## Risk

Medium. The feature is straightforward conceptually, but it needs clear capability and resume-edit behavior to avoid awkward draft flows.

## Summary

Add a dedicated drafts view for the current user, separate from the public feed.

## Why This Exists

`p2020` exposes a purpose-built drafts index that surfaces in-progress work without mixing it into the main collaboration feed.

## Goals

-   Provide a clean place to view and resume draft posts.
-   Scope results to the current user unless a deliberate editorial workflow expands that.
-   Make the UX consistent with `p2026` inline editing and new-post flows.

## Non-Goals

-   Replacing wp-admin post list tables.
-   Building a multi-user editorial dashboard in the first pass.

## Proposed Approach

-   Expose a REST-backed drafts view showing title, modified time, excerpt, and quick actions.
-   Add resume-edit support that opens the existing frontend editor.
-   Evaluate whether draft creation should route directly into this view.

## Open Questions

-   Should editors see only their own drafts or all drafts?
-   Should scheduled and pending posts also appear here?
-   Is a dedicated URL needed, or can this be modal or panel based?

## Acceptance Criteria

-   A user can see their drafts without leaving the frontend collaboration experience.
-   Selecting a draft opens the existing editing experience.
-   Draft visibility respects capabilities.

## Source References

-   [https://wpcom-themes.svn.automattic.com/p2020/inc/drafts-index/class-drafts-index.php](https://wpcom-themes.svn.automattic.com/p2020/inc/drafts-index/class-drafts-index.php)
