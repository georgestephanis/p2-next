# Plan: Reactions On Posts And Comments

Status: In Progress (0.1.0 backend scaffold complete)

Priority: Later

Implementation Areas:

-   Frontend UI (React components, mounting, state)
-   REST API ✓
-   Data model and storage ✓ (custom comment type)
-   Notifications (future phase)
-   Admin settings ✓

Depends on:

-   No hard dependency.
-   Optional dependency: [Following Threads](./10-following-threads.md) if reacting should be able to auto-follow a thread.
-   Coordination: [H2 Emoji Reactions](https://github.com/humanmade/h2-emoji-reactions) for reference on multi-emoji support patterns.

## Estimated Size

Medium (core done; UI remains)

## Risk

Medium → Lower. Core mechanics are stable via custom comment type storage; main remaining risk is frontend state management and permissions edge cases.

Issue Reference:

-   GitHub issue `#13` — Reaction / Like on Posts and Comments

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/13

## Summary

Add lightweight emoji reactions for posts and comments, with configurable emoji sets (single, curated, or any), counts, and participant listings.

## Why This Exists

Reactions provide low-effort acknowledgement without inflating comment volume. The issue also suggests optional subscription behavior tied to a reaction.

## Goals

-   Support a configurable reaction model for posts and comments.
-   Show aggregate counts and who reacted.
-   Keep the system simple enough to coexist with Jetpack or other optional reaction providers.
-   Allow administrators to curate emoji or restrict to single emoji.

## Non-Goals

-   Full third-party provider replacement; reactions are optional alongside Jetpack.
-   Automatic digest aggregation or notification frequency management (future phase).

## Proposed Approach

### Storage: Custom Comment Type

Reactions stored as comments with `comment_type = p2026_reaction`, based on WordPress discussion in ticket #12668:

-   Leverages existing WordPress comment infrastructure.
-   Reactions queryable via `WP_Comment_Query` with type filter.
-   Supports both post and comment reactions (comment reactions stored as parent comments).
-   Self-service removal (user can remove their own reaction).
-   Custom comment agent tag (`p2026-reactions`) for audit/filtering.

### Admin Configuration: Three Modes

1. **Single Emoji**: Only 👍 allowed (default).
2. **Curated Emoji**: Administrator specifies space-separated list (e.g., `👍 ❤️ 🎉 🚀`).
3. **Any Emoji**: Users can react with any emoji character.

Configuration managed via **P2026 Settings → Reactions** tab.

### REST API

-   `POST /p2026/v1/reactions` — Add reaction
-   `GET /p2026/v1/reactions` — Fetch reactions for object
-   `DELETE /p2026/v1/reactions` — Remove reaction

All endpoints support `object_id` + `object_type` (post|comment) + `emoji`.

### Frontend Implementation (WIP)

-   `useReactions()` hook for state management and REST integration.
-   React components to mount on post/comment enhancement portals.
-   Optimistic UI updates; re-fetch on success for consistency.
-   Voting UI: emoji buttons + count display + participant hover/expand.

## Implementation Status

### Complete ✓

-   `modules/reactions/index.php` — Full backend with:
  - Custom comment type registration.
  - CRUD functions: `p2026_reactions_add()`, `p2026_reactions_remove()`, `p2026_reactions_get_for_object()`, `p2026_reactions_count()`.
  - REST endpoints (POST/GET/DELETE).
  - Admin settings tab with mode selection and emoji configuration.
  - Permission checks (respects `require_name_email` for anonymous reactions).
-   `modules/reactions/README.md` — Complete API and feature documentation.
-   `src/modules/reactions/index.js` — Scaffold with `useReactions()` hook.

### Todo

-   Frontend React components: ReactionUI, ReactionBadge, ParticipantList.
-   Integration with PostEnhancement and comment UI.
-   Debouncing/rate limiting.
-   Styling (reactions.scss).
-   End-to-end smoke test.

## Open Questions (Partially Resolved)

-   **Single vs. multi-emoji?** → Resolved: Support all three modes via admin toggle.
-   **Anonymous users?** → Resolved: Yes, respects `require_name_email` option.
-   **Reaction history/undo?** → Resolved: Self-service removal via DELETE endpoint.
-   **Notifications?** → Deferred to phase 2; hooks available for event-driven integration.
-   **Jetpack coexistence?** → Addressed via separate comment type; can coexist without conflict.

## Acceptance Criteria

-   ✓ Reactions stored in custom comment type.
-   ✓ REST endpoints functional.
-   ✓ Admin settings tab allows emoji configuration.
-   Users can add and remove reactions on supported objects (UI needed).
-   Counts update in UI without full page reload (UI needed).
-   Users can see who reacted (UI needed).
-   Works on both posts and comments (UI needed).
-   Optional Jetpack coexistence verified (testable after UI).

## Architecture Notes

### Why Custom Comment Type?

1. **Standards-based**: WordPress pattern for comment-like objects; used by Jetpack Comments API.
2. **Query-friendly**: Can filter reactions out of regular comment counts via `comment_type` query param.
3. **Minimal schema**: No new database tables; leverages existing comment infrastructure.
4. **Permissions**: Inherits comment-level access controls; self-service removal via user_id match.

### Comment-on-Comment Support

Reactions on comments are stored as parent comments on the same post:
- `comment_post_ID` = post housing the comment
- `comment_parent` = comment being reacted to
- User perceives it as a reaction on a comment; technically a child comment targeting the post.

This avoids nested comment trees while maintaining semantic clarity.

### Admin Settings Integration

Uses p2026 settings tab filter and hook system:
- `p2026_settings_tabs` filter to register "Reactions" tab.
- `p2026_settings_render_tab_reactions` hook to render UI.
- `p2026_settings_save_tab_reactions` hook to save configuration.
- Configuration stored in `p2026_reactions_config` option.
