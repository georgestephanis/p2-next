# Plan: External Integrations

Status: Draft

Depends on:

-   No hard dependency.
-   Optional dependency: [Following Threads](./10-following-threads.md), notifications, and audit-log primitives for event routing.

Issue Reference:

-   GitHub issue `#17` — External Integration Connections (Slack, GitHub)

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/17

## Summary

Build a connections framework for integrating `p2026` with external systems such as Slack and GitHub.

## Why This Exists

The issue frames `p2026` as a hub rather than a silo, with outbound posting, inbound mirrored activity, and cross-linking to external development workflows.

## Goals

-   Define a reusable integration architecture rather than one-off webhook features.
-   Support outbound events first, then evaluate inbound mirroring.
-   Keep security, secrets management, and capability boundaries explicit.

## Non-Goals

-   Shipping every possible integration at once.
-   Treating inbound mirrored content as indistinguishable from authored posts without clear UX decisions.

## Proposed Approach

-   Start with a generic connections model and provider abstraction.
-   Likely first providers:
    -   Slack outbound post notifications
    -   GitHub outbound links for commits, pull requests, and issues
-   Evaluate inbound mirroring as a second phase because it changes authorship, moderation, and feed semantics.

## Open Questions

-   Are integrations modules, settings-driven providers, or companion plugins?
-   What audit surface is needed for webhook deliveries and failures?
-   How should mirrored external activity appear in the feed?

## Acceptance Criteria

-   A provider can be configured without hardcoding credentials in source.
-   Outbound events can be enabled and disabled per provider.
-   Delivery failures are observable and recoverable.
