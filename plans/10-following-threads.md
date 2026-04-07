# Plan: Following Threads

Status: Draft

Depends on:
- Hard dependency: the existing notifications module as the delivery mechanism.

## Summary

Add explicit follow and unfollow behavior for posts or comment threads.

## Why This Exists

`o2` exposes a thread-following model. `p2026` can notify on mentions and replies, but users cannot explicitly subscribe to a conversation.

## Goals

- Let users opt into notifications for specific posts or threads.
- Reuse the current notifications storage and UI.
- Make follow state visible in the existing post menu or nearby controls.

## Non-Goals

- Replacing site-wide email subscription plugins.
- Introducing a second notification center.

## Proposed Approach

- Define subscription records keyed by user and post, with possible thread granularity later.
- Add follow and unfollow actions to the post menu.
- Route resulting events through the existing notifications pipeline and settings.

## Open Questions

- Is post-level subscription enough, or is comment-thread granularity required?
- Should following trigger only in-app notifications, email, or both?
- How should site-wide defaults interact with explicit follows?

## Acceptance Criteria

- A user can follow and unfollow a post from the frontend UI.
- New qualifying activity on that post generates notifications for followers.
- Notification volume is bounded to avoid spammy duplicate events.

## Source References

- `wp-content/plugins/o2/modules/follow/load.php`
- `wp-content/plugins/p2026/modules/notifications/index.php`
