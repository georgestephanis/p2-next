# Mentions Module (PHP)

Server-side half of the p2026 mentions feature. Handles REST endpoints for autocomplete and hovercard data, parses `@username` tokens from saved content, linkifies them for display, and fires an action hook so third-party plugins can send notifications.

The JavaScript counterpart lives in [`src/modules/mentions/`](../../src/modules/mentions/).

---

## Files

| File        | Purpose                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `index.php` | Everything: REST routes, mention parsing, linkification, notification hooks |

---

## How It Works

### REST endpoints

Two routes are registered on `rest_api_init`. Both require the user to be logged in.

#### `GET /wp-json/p2026/v1/users`

User search for autocomplete dropdowns.

| Parameter  | Type    | Default | Max  | Description                                               |
| ---------- | ------- | ------- | ---- | --------------------------------------------------------- |
| `search`   | string  | `""`    | —    | Substring matched against `user_login` and `display_name` |
| `per_page` | integer | `10`    | `20` | Number of results to return                               |

Returns an empty array when `search` is blank. Response items:

```json
[
	{
		"id": 42,
		"slug": "jane",
		"name": "Jane Smith",
		"avatar_url": "https://…"
	}
]
```

#### `GET /wp-json/p2026/v1/users/<id>`

Full profile for a single user, used by the frontend hovercard.

```json
{
	"id": 42,
	"slug": "jane",
	"name": "Jane Smith",
	"bio": "Writes things.",
	"avatar_url": "https://…",
	"profile_url": "https://example.com/author/jane/",
	"post_count": 17
}
```

Returns a `404` WP_Error if the user ID does not exist.

### Mention parsing

Two internal helpers are used by both the save hooks and the linkifier.

**`p2026_mentions_parse_usernames( $content )`**

Strips HTML and decodes entities, then extracts `@slug` tokens with a regex that:

-   Requires a minimum slug length of 2 characters.
-   Uses a negative lookbehind to skip email addresses (`user@example.com`).

Returns a deduplicated, lowercased array of candidate `user_login` slugs.

**`p2026_mentions_resolve_users( $slugs )`**

Runs a single `WP_User_Query` with `login__in` to batch-resolve slug candidates against real accounts. Only exact `user_login` matches are returned, so arbitrary strings never reach the notification hook.

### Save hooks

Both hooks parse the relevant content, resolve matching users, and fire `p2026_mentions_found` if any are found. They skip unapproved/spam content and autosaves.

| Hook                         | Condition                                                              |
| ---------------------------- | ---------------------------------------------------------------------- |
| `save_post` (priority 20)    | Published posts only; skips autosaves, revisions, and non-`post` types |
| `comment_post` (priority 20) | Comments with `$approved === 1` only                                   |

### Notification action: `p2026_mentions_found`

p2026 itself does **not** send notifications. That responsibility is intentionally delegated to whatever notification plugin is active on the site. Hook in like this:

```php
add_action( 'p2026_mentions_found', function ( $users, $object_type, $object_id, $author_id ) {
    foreach ( $users as $user ) {
        // e.g. wp_mail( $user->user_email, … )
    }
}, 10, 4 );
```

| Parameter      | Type        | Description                                    |
| -------------- | ----------- | ---------------------------------------------- |
| `$users`       | `WP_User[]` | Users who were @-mentioned                     |
| `$object_type` | `string`    | `'post'` or `'comment'`                        |
| `$object_id`   | `int`       | Post ID or comment ID                          |
| `$author_id`   | `int`       | User ID of the author (0 for guest commenters) |

### Linkification

`p2026_mentions_linkify()` is attached to `the_content` and `comment_text`. It replaces each `@slug` token that resolves to a real user with a profile anchor:

```html
<a
	class="p2026-mention"
	href="https://example.com/author/jane/"
	data-user-id="42"
	data-user-slug="jane"
	>@jane</a
>
```

The `data-user-id` attribute is what the frontend hovercard script uses to fetch rich profile data. The function parses content as an HTML fragment via `DOMDocument`, then walks text nodes while skipping forbidden containers (`a`, `script`, `style`, `code`, `pre`), so attributes and existing markup are not mutated.
