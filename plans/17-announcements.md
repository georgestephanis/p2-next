# Plan: Announcements

Status: Draft

Priority: Now

Implementation Areas:

-   Frontend UI
-   Data model and storage
-   Admin and settings

Depends on:

-   No hard dependency.
-   Optional dependency: [Sidebar Shell And Layout](./02-sidebar-shell.md) if announcements should have a persistent layout slot.

## Estimated Size

Small

## Risk

Low. The main work is choosing the right content model and ensuring dismissal state is per-user and predictable.

Issue Reference:

-   GitHub issue `#14` — Announcements

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/14

## Summary

Add a site-wide announcement surface that stays visible until dismissed per user.

## Why This Exists

Some information should not scroll away in the normal feed. Announcements need more persistence and prominence than ordinary posts.

## Goals

-   Support a dedicated announcement model or post type.
-   Allow per-user dismiss state.
-   Keep announcements visibly separate from the normal chronological stream.

## Non-Goals

-   Replacing email or incident-management tooling.
-   Building a full enterprise notification center.

## Proposed Approach

-   Decide between a flagged post state, dedicated taxonomy, or custom post type.
-   Render active announcements in a distinct top-of-page surface.
-   Store dismiss state in user meta for logged-in users.

## Open Questions

-   Should announcements expire automatically?
-   Should there be more than one simultaneous announcement?
-   Is this best modeled as content in the feed or as a separate banner system?

## Acceptance Criteria

-   Authorized users can publish an announcement.
-   Active announcements are visibly distinct from normal feed items.
-   A user can dismiss an announcement without affecting other users.
