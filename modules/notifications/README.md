# P2026 Module: Notifications

Provides a persistent notification dock for mentions and comment replies. Includes polling-based updates and read management.

## Features

-   **Persistent Notification Dock** — Users see an unread count badge in the corner; click to expand and view recent notifications.
-   **Viewport-edge Positioning** — Dock is fixed at the bottom-right edge of the viewport.
-   **Polling with Backoff** — Polls every 10 seconds via the shared polling helper with visibility-aware scheduling and exponential backoff.
-   **Notification Types:**
    -   **mention** — User was @mentioned in a post or comment.
    -   **reply** — User's post or comment received a reply.
-   **Mark as Read** — Click a notification item to mark it read and navigate to its source, or use bulk "mark all as read".

## REST Endpoints

### GET `/wp-json/p2026/v1/notifications`

Retrieve user's notifications.

**Query Parameters:**

-   `unread_only` (boolean, default false) — Only return unread notifications.
-   `limit` (integer, default 20, max 100) — Number of notifications to return.
-   `offset` (integer, default 0) — Pagination offset.

**Response:**

```json
{
	"notifications": [
		{
			"type": "mention",
			"post_id": 42,
			"comment_id": 0,
			"from_user": 3,
			"unread": true,
			"created_at": "2026-03-27T14:30:00+00:00",
			"meta_key": "p2026_notification_abc123"
		}
	],
	"unreadCount": 5
}
```

### POST `/wp-json/p2026/v1/notifications/{id}/read`

Mark a specific notification as read.

-   `id` is the UUID suffix from the notification meta key.
-   Example: for `p2026_notification_abc123`, use `/notifications/abc123/read`.

**Response:**

```json
{
	"success": true,
	"unreadCount": 4
}
```

### POST `/wp-json/p2026/v1/notifications/read-all`

Mark all notifications as read.

**Response:**

```json
{
	"success": true,
	"unreadCount": 0
}
```

## Hooks

### `p2026_create_notification( $user_id, $type, $post_id, $comment_id, $from_user_id )`

Programmatically create a notification for a user. Called automatically for mentions and replies.

### `p2026_mentions_found`

Notifications module listens to this hook and creates `mention` notifications for mentioned users.

## Configuration

Notifications are enabled by default. To disable the notifications module:

```php
// Add 'notifications' to the deny-list; all other modules remain active.
update_option( 'p2026_disabled_modules', array( 'notifications' ) );
```

This can be set in code or via the settings page if available.

## Frontend Mount

-   JS entrypoint: `src/modules/notifications/index.js`
-   Mount target: `#p2026-notification-dock-root` appended to `document.body`
-   Component: `src/modules/notifications/NotificationDock.js`

## Future Enhancements

-   WebSocket support for instant notifications (replace polling)
-   Email digest notifications (batch mentions/replies into daily digest)
-   Notification type filtering in the dock
-   Browser push notifications (via Service Worker)
