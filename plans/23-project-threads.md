# Plan: Project Threads

Status: Draft

Depends on:

-   Optional dependency: [Sticky Posts](./11-sticky-posts.md) if both features share grouped top-of-feed presentation.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) depending on final placement and controls.

Issue Reference:

-   GitHub issue `#11` — Pinned / Sticky Posts and Project Threads

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/11

## Summary

Add explicit project-thread grouping or promotion behavior for posts tagged or typed as ongoing project threads.

## Why This Exists

The open issue combines ordinary sticky posts with a separate concept: project threads promoted into a dedicated Projects group above the normal feed.

## Goals

-   Define whether project threads are a taxonomy, post state, or dedicated content type.
-   Let the feed surface them separately from standard chronological posts.
-   Preserve per-user collapsed and expanded state if grouped presentation is adopted.

## Non-Goals

-   A full project-management suite.
-   Duplicating sticky-post behavior without a distinct project concept.

## Proposed Approach

-   Model project threads explicitly, likely via taxonomy.
-   Add a dedicated feed group above standard posts when project threads exist.
-   Evaluate whether group collapse state belongs in user meta or local storage.
-   Keep grouping compatible with filters and unread state.

## Open Questions

-   Is a project thread just a tag with special treatment, or a stronger content concept?
-   Should project threads support custom badges, summaries, or child posts later?
-   How does project grouping interact with archives, search, and mobile layouts?

## Acceptance Criteria

-   Project-thread posts can be identified distinctly from ordinary posts.
-   The feed can render a dedicated project group without breaking normal post ordering.
-   Group visibility state persists per user if collapse behavior is included.
