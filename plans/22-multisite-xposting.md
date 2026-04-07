# Plan: Multisite Xposting

Status: Draft

Depends on:
- No hard dependency.
- Practical dependency: a deliberate decision that multisite belongs in `p2026` scope.
- Optional dependency: [External Integrations](./20-external-integrations.md) if shared event-routing patterns are useful.

Issue Reference:
- GitHub issue `#19` — Multisite Support with xposting

## Summary

Evaluate multisite-aware publishing and cross-posting between multiple P2 sites, potentially including a workspace hub or digest layer.

## Why This Exists

The issue envisions a workplace hub spanning multiple P2 sites, with xposting and possibly digest-oriented notifications across those sites.

## Goals

- Determine whether multisite is a first-class product direction for `p2026`.
- If yes, define a safe and comprehensible xposting model.
- Avoid premature coupling of single-site assumptions into future multisite workflows.

## Non-Goals

- Full network administration tooling.
- Silent replication of posts across sites without clear authorship and permission decisions.

## Proposed Approach

- Treat this as an architectural discovery item before implementation.
- Define the basic entities and permissions for:
  - source site
  - destination site
  - original author
  - mirrored or linked copy
- Separate read aggregation, xposting, and digest delivery into phases rather than one large project.

## Open Questions

- Should xposts be full copies, linked references, or federated views?
- How are comments handled across source and destination sites?
- Is this core plugin scope or a higher-level multisite companion?

## Acceptance Criteria

- The project has a documented architectural direction before any implementation begins.
- Any implementation phase preserves clear authorship, permissions, and source attribution.
- Single-site installs do not inherit unnecessary complexity.
