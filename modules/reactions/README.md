# P2026 Module: Reactions

Status: Active (WIP)

Provides lightweight emoji reactions for posts and comments, with configurable emoji sets and admin settings.

## Features

-   Add/remove emoji reactions on posts and comments.
-   Configurable emoji mode: single emoji (👍), curated set, or any emoji.
-   Aggregate reaction counts and participant listings.
-   Custom comment type storage based on WordPress ticket #12668 patterns.
-   REST API endpoints for frontend integration.
-   Admin settings tab for emoji configuration.

## Storage Model

Reactions are stored as comments with a custom type (`p2026_reaction`), leveraging WordPress's existing comment infrastructure while keeping reactions semantically distinct from regular discussion comments.

Each reaction is a comment row where:

-   `comment_type` = `p2026_reaction`
-   `comment_content` = emoji character (e.g., `👍`)
-   `comment_post_ID` = the post being reacted to
-   `comment_parent` = 0 (for post reactions) or comment ID (for comment reactions)
-   `user_id` = the reacting user (0 for anonymous)
-   `comment_approved` = 1 (always)
-   `comment_agent` = `p2026-reactions`

This design allows:

-   Filtering reactions out of regular comment queries.
-   Leveraging existing comment REST endpoints if needed.
-   Per-object reaction aggregation via standard comment queries.
-   Reacting to both posts and comments without schema changes.

## Configuration

Accessed via **P2026 Settings → Reactions** tab:

### Mode: Single Emoji

Default mode. Only one emoji (👍) is allowed as a reaction.

### Mode: Curated Emoji Set

Administrator specifies a space-separated list of allowed emoji characters. Users can only react with these emoji.

Example:

```
👍 ❤️ 🎉 🚀 😂
```

### Mode: Any Emoji

Users can react with any emoji character. No restrictions.

## REST Endpoints

### POST /wp-json/p2026/v1/reactions

Add a reaction to a post or comment.

Query parameters:

-   `object_id` (int, required) — Post or comment ID
-   `object_type` (string, required, enum: post|comment) — Target type
-   `emoji` (string, required) — Emoji character

Response:

```json
{
	"success": true,
	"comment_id": 42
}
```

### GET /wp-json/p2026/v1/reactions

Retrieve all reactions for a post or comment.

Query parameters:

-   `object_id` (int, required) — Post or comment ID
-   `object_type` (string, required, enum: post|comment) — Target type

Response:

```json
{
	"👍": {
		"emoji": "👍",
		"count": 3,
		"users": [
			{ "id": 1, "name": "Alice", "url": "" },
			{ "id": 2, "name": "Bob", "url": "" }
		]
	},
	"❤️": {
		"emoji": "❤️",
		"count": 1,
		"users": [ { "id": 3, "name": "Carol", "url": "" } ]
	}
}
```

### DELETE /wp-json/p2026/v1/reactions

Remove a reaction.

Query parameters:

-   `object_id` (int, required) — Post or comment ID
-   `object_type` (string, required, enum: post|comment) — Target type
-   `emoji` (string, required) — Emoji character

Response:

```json
{
	"success": true
}
```

## PHP Functions

### p2026_reactions_add( $object_id, $emoji, $user_id = 0, $target_type = 'post' )

Create or retrieve a reaction. Returns comment ID on success, false on failure.

### p2026_reactions_remove( $object_id, $emoji, $user_id = 0, $target_type = 'post' )

Remove a reaction. Returns bool.

### p2026_reactions_get_for_object( $object_id, $target_type = 'post' )

Get all reactions for an object, grouped by emoji. Returns array of emoji => WP_Comment[].

### p2026_reactions_count( $object_id, $target_type = 'post' )

Get aggregate reaction counts. Returns array of emoji => count.

### p2026_reactions_get_config()

Get the current reactions configuration. Returns { mode: string, emoji: string[] }.

## Frontend

### Architecture

The reactions module uses a layered approach:

1. **Hooks** (`src/modules/reactions/hooks.js`):

    - `useReactions(objectId, objectType)` — Manages reactions state, fetching, and CRUD operations via REST API.
    - Handles async state management, debouncing, and error handling.

2. **Components** (`src/modules/reactions/`):

    - `ReactionUI.js` — Main container displaying reactions for a post or comment.
    - `ReactionButton.js` — Individual emoji button with count and active state.
    - `ReactionPicker.js` — Popover picker for selecting emoji to add.
    - `ParticipantList.js` — Tooltip/popover showing users who reacted.
    - `PostReactionsWrapper.js` — Wrapper mounting reactions on posts.
    - `CommentReactionsWrapper.js` — Wrapper mounting reactions on comments.

3. **Initialization** (`src/modules/reactions/index.js`):
    - `initReactionsModule()` — Auto-discovers and mounts reaction UIs on all posts and comments.
    - Runs on DOM ready and handles initial component mounting.

### Features

-   **Config-aware rendering**: Respects `window.p2026Config.reactionsConfig` for emoji mode (single/curated/any).
-   **Debounced interactions**: Rapid clicks are debounced to prevent request flooding.
-   **Optimistic updates**: State updates before API response for snappier UX.
-   **Participant visibility**: Hover/focus on emoji count to show participant names.
-   **Accessibility**: Proper ARIA labels, keyboard navigation, and focus management.
-   **Responsive layout**: Flex-based layout adapts to screen size and reaction count.

### Styling

All styles in SCSS format with sensible defaults:

-   `_reaction-ui.scss` — Button containers, counts, picker trigger.
-   `_reaction-picker.scss` — Emoji picker grid.
-   `_participant-list.scss` — Participant tooltip styling.

Easily customizable via CSS overrides. Built with CSS custom properties for theming.

### Configuration (window.p2026Config)

The frontend automatically reads:

-   `reactionsConfig` — Backend config object with `mode` and `emoji` array.
-   `currentUser` — Current user info (to gate permissions).
-   `canComment` — Whether user can leave reactions.
-   `requireNameEmail` — Whether anonymous reactions require name/email.

Example in theme:

```javascript
if ( window.p2026Config?.reactionsConfig?.mode === 'any' ) {
	// Any emoji allowed
}
```

## Permissions

-   Anonymous users can react if `require_name_email` is not set.
-   Reactions are not gated by post/comment edit capabilities (low-friction acknowledgement).
-   Reaction removal requires same user ID (self-service cleanup).

## Interaction with Other Modules

-   **Notifications:** Consider optional auto-notification on reaction (exploratory; see plan #10).
-   **Following Threads:** Consider optional auto-follow on reaction (exploratory; see plan #10).
-   **Audit Log:** Reactions may be eligible for audit events if admin desires reaction activity tracking.

## Known Limitations

-   Comments are limited to posts; reactions on comments default to the comment's post_id.
-   Reaction history is not persisted separately; only the current reaction set is queryable.
-   No built-in rate limiting on reaction creation (relies on REST/general WordPress security).

## Future Enhancements

-   Reaction summary views (e.g., "View who reacted with 👍").
-   Coexistence strategies with Jetpack Reactions or other third-party systems.
-   Optional reaction-triggered notifications and digest summaries.
-   Reaction analytics (popular emoji over time, etc.).
