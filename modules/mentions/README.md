# Mentions Module (PHP)

Server-side half of p2026 mentions. It provides REST endpoints for autocomplete and hovercards, parses `@username` tokens from saved content, linkifies mentions for display, and emits a hook consumed by notification systems.

JS counterpart: `src/modules/mentions/`.

## File

| File | Purpose |
| --- | --- |
| `index.php` | REST routes, mention parsing, mention resolution, save hooks, linkification |

## REST Endpoints

Both endpoints require authentication.

### `GET /wp-json/p2026/v1/users`

Autocomplete user search.

- `search` (string)
- `per_page` (int, default `10`, max `20`)

Returns slim records: `{ id, slug, name, avatar_url }`.

### `GET /wp-json/p2026/v1/users/<id>`

Hovercard detail endpoint.

Returns: `{ id, slug, name, bio, avatar_url, profile_url, post_count }`.

## Mention Parsing

### `p2026_mentions_parse_usernames( $content )`

- Strips HTML and decodes entities.
- Extracts `@slug` tokens using regex with email-safe negative lookbehind.
- Minimum slug length: 2.
- Returns normalized, unique slugs.

### `p2026_mentions_resolve_users( $slugs )`

- Resolves candidates in one `WP_User_Query` using `login__in`.
- Only exact `user_login` matches are returned.

## Save Hooks

- `save_post` (published `post` objects; skips autosave/revision)
- `comment_post` (approved comments only)

Each hook parses mentions, resolves users, then emits `p2026_mentions_found`.

## Public Hook: `p2026_mentions_found`

```php
do_action( 'p2026_mentions_found', $users, $object_type, $object_id, $author_id );
```

Arguments:

- `$users` (`WP_User[]`) mentioned users
- `$object_type` (`post|comment`)
- `$object_id` (post or comment id)
- `$author_id` (0 for anonymous comment author)

Note: this module only emits the hook. Notification creation is handled elsewhere (for example, by the notifications module).

## Linkification

`p2026_mentions_linkify()` runs on:

- `the_content`
- `comment_text`

It rewrites resolved `@slug` tokens to anchor markup:

```html
<a class="p2026-mention" href="..." data-user-id="42" data-user-slug="jane">@jane</a>
```

Implementation parses the HTML fragment with `DOMDocument` and only rewrites text nodes, skipping protected containers (`a`, `script`, `style`, `code`, `pre`).
