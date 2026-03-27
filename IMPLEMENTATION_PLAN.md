# P2026 Implementation Plan (Current)

Updated: March 27, 2026

This plan reflects remaining work after the currently shipped feature set.

## Objective

Improve reliability and scale while preserving progressive enhancement and module isolation.

## Priority 1 - Feed/Comment Scalability

1. Lighter post poll payload
- Keep heartbeat polling cheap (avoid `_embed` when possible).
- Hydrate details only when posts are revealed.

2. Incremental comment refresh
- Support delta fetches for expanded threads where backend support exists.
- Fallback to full-thread fetch when a cursor/after token is unavailable.

3. Better refresh observability
- Extend telemetry buckets to group by feature area (feed poll, comments refresh, notifications).

## Priority 2 - Search Quality

1. Clarify and optionally widen search scope
- Current implementation scopes results to authored content.
- Decide whether to keep that constraint or switch to permission-based visibility search.

2. Improve search performance
- Add optional indexing/caching strategy for larger sites.
- Keep response caps and pagination guardrails.

## Priority 3 - Notifications And Audit

1. Notification UX polish
- Optional filters by type.
- Optional unread-only toggle in dock.

2. Audit-log ergonomics
- Add admin-facing browsing/export tooling for file backend and CPT backend.

## Priority 4 - Documentation And Tests

1. Keep module READMEs in lockstep with API contracts.
2. Add smoke-test checklists for each module.
3. Add end-to-end fixture docs for Playground seed data.

## Non-Goals

- Replacing theme rendering with an SPA.
- Removing REST API boundaries.
- Coupling optional modules into mandatory core behavior.
