# P2026 Module: Notifications

Reviewed: March 27, 2026

Provides a persistent notification dock for mentions and comment replies, including polling updates and read management.

## Features

- Persistent dock with unread badge.
- Paginated notification list.
- Polling with visibility-aware scheduling and backoff behavior in the frontend module.
- Notification types currently used: mention and reply.
- Mark a single notification as read or mark all as read.

## Storage Model

Notifications are stored in user meta.

- Meta key format: p2026_notification_<uuid>
- Meta value JSON fields:
  - type
  - post_id
  - comment_id
  - from_user
  - unread
  - created_at

## REST Endpoints

### GET /wp-json/p2026/v1/notifications

Returns notifications for the current user.

Query parameters:

- unread_only (bool, default false)
- limit (int, default 20, max 100)
- offset (int, default 0)

Response shape:

```json
{
  "notifications": [],
  "unreadCount": 0
}
```

### POST /wp-json/p2026/v1/notifications/{id}/read

Marks one notification as read.

- id is the suffix after p2026_notification_.

### POST /wp-json/p2026/v1/notifications/read-all

Marks all notifications for the current user as read.

## Hooks And Integrations

### p2026_create_notification( $user_id, $type, $post_id, $comment_id, $from_user_id )

Creates a notification row for a user.

### p2026_mentions_found

This module listens for mention events and creates mention notifications.

### comment_post

This module also creates reply notifications when users receive replies.

## Frontend

- JS entrypoint: src/modules/notifications/index.js
- Root mount: #p2026-notification-dock-root appended to document.body
- Main component: src/modules/notifications/NotificationDock.js

## Activation

Enabled by default. Disable by adding notifications to p2026_disabled_modules (or via the P2026 settings page).
