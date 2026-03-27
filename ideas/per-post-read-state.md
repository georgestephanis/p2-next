# Per-Post Read/Unread Tracking (Proposal)

Status: Proposed only, not implemented as of March 27, 2026.

## Goal

Add manual per-post read/unread toggling to complement global `lastActivity` read-state behavior.

## Current Implemented Behavior

- Global read state uses user meta key `p2026_last_activity`.
- Unread count is based on published posts newer than that timestamp.
- Users can sync read state via the unread badge, but cannot currently mark individual posts unread.

## Proposed Behavior

- Add menu actions in post controls:
  - Mark as unread
  - Mark as read
- Persist per-user unread overrides.
- Merge override list with timestamp-based unread logic for badge/count behavior.

## Candidate API

- `POST /p2026/v1/posts/{post_id}/read-state`
- `GET /p2026/v1/posts/read-state`

## Suggested Data Model

User meta option storing an array of unread post ids, for example:

```json
[1245, 1248, 1251]
```

## Notes

This remains a design proposal and should not be documented as shipped behavior in user-facing docs until implemented.
