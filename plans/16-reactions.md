# Plan: Reactions On Posts And Comments

Status: Draft

Depends on:

-   No hard dependency.
-   Optional dependency: [Following Threads](./10-following-threads.md) if reacting should be able to auto-follow a thread.

Issue Reference:

-   GitHub issue `#13` — Reaction / Like on Posts and Comments

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/13

## Summary

Add lightweight reactions for posts and comments, with counts and participant listings.

## Why This Exists

Reactions provide low-effort acknowledgement without inflating comment volume. The issue also suggests optional subscription behavior tied to a reaction.

## Goals

-   Support a minimal first-party reaction model for posts and comments.
-   Show aggregate counts and who reacted.
-   Keep the system simple enough to coexist with Jetpack or other optional reaction providers.

## Non-Goals

-   Full emoji reaction matrix in the first pass.
-   Replacing third-party social plugins comprehensively.

## Proposed Approach

-   Start with one reaction type, effectively a like or thumbs-up.
-   Store reactions in a dedicated per-object model rather than overloading comments.
-   Add lightweight UI to post and comment controls.
-   If thread-following exists, evaluate optional auto-follow on reaction.

## Open Questions

-   Should the first version be a single reaction or multiple emoji types?
-   Should anonymous users be allowed to react?
-   How should notifications and digests handle reaction volume?

## Acceptance Criteria

-   Users can add and remove a reaction on supported objects.
-   Counts update in the UI without a full page reload.
-   A user can see who reacted to a post or comment.
