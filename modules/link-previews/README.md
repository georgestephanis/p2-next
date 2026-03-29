# P2026 Module: Link Previews

Adds internal link preview cards for links to posts or comments on the same site.

## What It Does

- Detects internal links in post/comment content.
- On hover/focus, requests preview data from the module REST endpoint.
- Shows a preview card with:
  - post title
  - author avatar
  - date
  - excerpt
- Shows a fallback "Preview unavailable" card when a target cannot be resolved.

## REST API

### Endpoint

- `GET /wp-json/p2026/v1/link-preview?url={absolute_url}`

### Behavior

- Accepts only internal URLs (same host as `home_url`).
- Resolves comment links first (`#comment-{id}`), then post links.
- Returns `404` when preview data is not available.
- Returns `400` for invalid or external URLs.

### Response Shape

Successful post preview:

```json
{
  "type": "post",
  "postId": 123,
  "commentId": 0,
  "url": "https://example.test/?p=123",
  "postTitle": "Example Post",
  "authorName": "Admin User",
  "authorAvatar": "https://example.test/avatar.jpg",
  "date": "2026-03-28T14:26:00+00:00",
  "excerpt": "Short summary text..."
}
```

Successful comment preview:

```json
{
  "type": "comment",
  "postId": 123,
  "commentId": 456,
  "url": "https://example.test/?p=123#comment-456",
  "postTitle": "Example Post",
  "authorName": "Comment Author",
  "authorAvatar": "https://example.test/avatar.jpg",
  "date": "2026-03-28T15:04:00+00:00",
  "excerpt": "Comment excerpt text..."
}
```

## Caching

- Server-side cache uses WordPress transients.
- TTL: 3 days (`3 * DAY_IN_SECONDS`).
- Cache key format is based on target type + target ID.

## Files

- PHP module: `modules/link-previews/index.php`
- Frontend module: `src/modules/link-previews/index.js`
- Frontend styles: `src/modules/link-previews/_link-previews.scss`
