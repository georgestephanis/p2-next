# P2026 Module: Notifications

Provides a persistent notification dock for mentions, comment replies, and new posts. Includes real-time polling and marking notifications as read.

## Features

-   **Persistent Notification Dock** — Users see an unread count badge in the corner; click to expand and view recent notifications.
-   **Real-time Polling** — Polls for new notifications every 10-15 seconds when the tab is visible.
-   **Flash Notifications** — Transient toast popups for high-priority events (e.g., mentions).
-   **Notification Types:**
    -   **mention** — User was @mentioned in a post or comment.
    -   **reply** — User's post or comment received a reply.
-   **Mark as Read** — Individual notifications and bulk "mark all as read" actions.

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

## Configuration

Notifications are enabled by default. To disable:

```php
update_option( 'p2026_active_modules', array( 'mentions' ) ); // excludes 'notifications'
```

Or add to `wp-config.php`:

```php
define( 'P2026_NOTIFICATIONS_DISABLED', true );
```

## Future Enhancements

-   WebSocket support for instant notifications (replace polling)
-   Email digest notifications (batch mentions/replies into daily digest)
-   Notification type filtering in the dock
-   Browser push notifications (via Service Worker)
