# P2026 Module: Post State

Adds workflow state to posts using a private taxonomy and REST integration.

## Features

-   Taxonomy-backed post state with three slugs:
    -   `normal`
    -   `unresolved`
    -   `resolved`
-   REST field on post responses: `p2026State` with `{ slug, label }`
-   REST mutation endpoint to set or cycle state
-   Auto-initialization on post create:
    -   posts containing `#todo` become `unresolved`
    -   all other posts default to `normal`
-   Audit hook emission on state changes

## REST API

### POST `/wp-json/p2026/v1/posts/{post_id}/state`

Set an explicit state or cycle to the next state.

Request body:

```json
{
	"state": "resolved",
	"source": "menu"
}
```

Notes:

-   `state` is optional. When omitted, state cycles in order: `normal -> unresolved -> resolved -> normal`.
-   `source` is optional and defaults to `manual`.
-   Requires post-update permissions (`p2026_can_update_posts( post_id )`).

Response:

```json
{
	"postId": 123,
	"changed": true,
	"p2026State": {
		"slug": "resolved",
		"label": "Resolved"
	}
}
```

## Hooks

### `p2026_post_state_changed`

Fires when a post state changes.

```php
do_action( 'p2026_post_state_changed', $post_id, $old_state, $new_state, $actor_id, $source, $context );
```

Arguments:

-   `$post_id` (int)
-   `$old_state` (string)
-   `$new_state` (string)
-   `$actor_id` (int)
-   `$source` (string)
-   `$context` (array)

### `p2026_audit_log_event`

Emits a normalized audit payload for logging backends.

```php
do_action( 'p2026_audit_log_event', 'post_state_changed', $payload );
```

## Frontend Integration

-   Post menu state actions are rendered by `src/components/PostEnhancement.js`.
-   Feed-level state filter controls are rendered by `src/components/FeedEnhancer.js`.
-   Store thunks live in `src/store/index.js` (`setPostState`, `cyclePostState`).

## Module Activation

Enabled by default. Disable by adding `post-state` to the `p2026_disabled_modules` option (or via the P2026 settings page).
