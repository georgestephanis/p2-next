<?php
/**
 * P2026 Module: Notifications
 *
 * Module Name:        Notifications
 * Module Description: Persistent notifications dock for mentions, replies, and new posts.
 * Module Version:     0.1.0
 *
 * Provides a notification system:
 *   - REST endpoints for fetching and managing notifications.
 *   - Hooks for third-party plugins to create notifications.
 *   - Integration with @mentions and comment replies.
 *
 * @package P2026\Modules\Notifications
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Create a new notification for a user.
 *
 * @param int    $user_id      Recipient user ID.
 * @param string $type         Notification type (mention|reply|new_post).
 * @param int    $post_id      Source post ID.
 * @param int    $comment_id   Source comment ID (0 if post-level).
 * @param int    $from_user_id User who triggered the notification.
 * @return int|false Notification meta ID on success, false on failure.
 */
function p2026_create_notification( $user_id, $type, $post_id, $comment_id, $from_user_id ) {
	$meta_key   = 'p2026_notification_' . wp_generate_uuid4();
	$meta_value = wp_json_encode(
		array(
			'type'        => sanitize_text_field( $type ),
			'post_id'     => (int) $post_id,
			'comment_id'  => (int) $comment_id,
			'from_user'   => (int) $from_user_id,
			'unread'      => true,
			'created_at'  => current_time( 'c' ),
		)
	);

	// Bail if JSON encoding failed.
	if ( false === $meta_value ) {
		return false;
	}

	$meta_id = add_user_meta( (int) $user_id, $meta_key, $meta_value, false );

	// add_user_meta returns false on failure, int meta_id on success.
	return $meta_id ? (int) $meta_id : false;
}

/**
 * Get the user's notifications with efficient database queries.
 *
 * @param int    $user_id      User ID.
 * @param bool   $unread_only  Whether to return only unread notifications.
 * @param int    $limit        Maximum number of notifications to return.
 * @param int    $offset       Offset for pagination.
 * @return array
 */
function p2026_get_notifications( $user_id, $unread_only = false, $limit = 20, $offset = 0 ) {
	global $wpdb;

	// Query notifications meta directly with proper LIMIT/OFFSET without loading all meta.
	$notifications = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT meta_key, meta_value FROM {$wpdb->usermeta}
			WHERE user_id = %d AND meta_key LIKE 'p2026_notification_%'
			ORDER BY meta_key DESC
			LIMIT %d OFFSET %d",
			$user_id,
			$limit,
			$offset
		)
	);

	if ( ! $notifications ) {
		return array();
	}

	$result = array();
	foreach ( $notifications as $row ) {
		$notification = json_decode( $row->meta_value, true );
		if ( ! is_array( $notification ) ) {
			continue;
		}
		if ( $unread_only && ! $notification['unread'] ) {
			continue;
		}
		$notification['meta_key'] = $row->meta_key;
		$result[] = $notification;
	}

	// Sort by created_at descending (most recent first).
	usort(
		$result,
		function ( $a, $b ) {
			return strcmp( $b['created_at'], $a['created_at'] );
		}
	);

	return $result;
}

/**
 * Count total unread notifications for a user with an efficient database query.
 *
 * @param int $user_id User ID.
 * @return int
 */
function p2026_count_unread_notifications( $user_id ) {
	global $wpdb;

	// Count unread notifications directly using wpdb, without loading all meta.
	$count = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->usermeta}
			WHERE user_id = %d
			AND meta_key LIKE 'p2026_notification_%'
			AND meta_value LIKE '%\"unread\":true%'",
			$user_id
		)
	);

	return (int) $count;
}

/**
 * Mark a notification as read/unread.
 *
 * @param int    $user_id  User ID.
 * @param string $meta_key Notification meta key.
 * @param bool   $unread   Whether to mark as unread (false = read).
 * @return bool
 */
function p2026_set_notification_read( $user_id, $meta_key, $unread = false ) {
	$notification = get_user_meta( $user_id, $meta_key, true );
	if ( ! is_string( $notification ) ) {
		return false;
	}

	$data = json_decode( $notification, true );
	if ( ! is_array( $data ) ) {
		return false;
	}

	$data['unread'] = (bool) $unread;

	return update_user_meta( $user_id, $meta_key, wp_json_encode( $data ) );
}

/**
 * Register the notifications REST routes.
 *
 * - GET    /wp-json/p2026/v1/notifications              — list user's notifications
 * - POST   /wp-json/p2026/v1/notifications/{id}/read     — mark as read
 * - POST   /wp-json/p2026/v1/notifications/read-all      — mark all as read
 */
function p2026_notifications_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/notifications',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_get_notifications_rest',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'unread_only' => array(
					'type'              => 'boolean',
					'default'           => false,
					'sanitize_callback' => 'rest_sanitize_boolean',
				),
				'limit'       => array(
					'type'              => 'integer',
					'default'           => 20,
					'minimum'           => 1,
					'maximum'           => 100,
					'sanitize_callback' => 'absint',
				),
				'offset'      => array(
					'type'              => 'integer',
					'default'           => 0,
					'minimum'           => 0,
					'sanitize_callback' => 'absint',
				),
			),
		)
	);

	register_rest_route(
		'p2026/v1',
		'/notifications/read-all',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'p2026_mark_all_notifications_read',
			'permission_callback' => 'is_user_logged_in',
		)
	);

	register_rest_route(
		'p2026/v1',
		'/notifications/(?P<id>[a-z0-9_-]+)/read',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'p2026_mark_notification_read_rest',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'id' => array(
					'description'       => 'Notification ID (meta key).',
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_notifications_register_routes' );

/**
 * REST endpoint: get notifications.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_get_notifications_rest( $request ) {
	$user_id      = get_current_user_id();
	$unread_only  = rest_sanitize_boolean( $request['unread_only'] ?? false );
	$limit        = (int) $request['limit'] ?? 20;
	$offset       = (int) $request['offset'] ?? 0;

	$notifications = p2026_get_notifications( $user_id, $unread_only, $limit, $offset );
	$unread_count  = p2026_count_unread_notifications( $user_id );

	return rest_ensure_response(
		array(
			'notifications'  => $notifications,
			'unreadCount'    => $unread_count,
		)
	);
}

/**
 * REST endpoint: mark a single notification as read.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response|WP_Error
 */
function p2026_mark_notification_read_rest( $request ) {
	$user_id  = get_current_user_id();
	$meta_key = 'p2026_notification_' . $request['id'];

	$success = p2026_set_notification_read( $user_id, $meta_key, false );

	if ( ! $success ) {
		return new WP_Error(
			'p2026_notification_not_found',
			__( 'Notification not found.', 'p2026' ),
			array( 'status' => 404 )
		);
	}

	$unread_count = p2026_count_unread_notifications( $user_id );

	return rest_ensure_response(
		array(
			'success'     => true,
			'unreadCount' => $unread_count,
		)
	);
}

/**
 * REST endpoint: mark all notifications as read.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_mark_all_notifications_read( $request ) {
	$user_id     = get_current_user_id();
	$meta_values = get_user_meta( $user_id );

	if ( ! empty( $meta_values ) ) {
		foreach ( $meta_values as $meta_key => $meta_value ) {
			if ( strpos( $meta_key, 'p2026_notification_' ) === 0 ) {
				p2026_set_notification_read( $user_id, $meta_key, false );
			}
		}
	}

	return rest_ensure_response(
		array(
			'success'     => true,
			'unreadCount' => 0,
		)
	);
}

/**
 * Hook into @mentions to create notifications.
 *
 * This hook is fired when mentions are detected in post/comment content.
 *
 * @param array  $users      Array of mentioned user objects.
 * @param string $object_type Post type ('post' or 'comment').
 * @param int    $object_id  Post or comment ID.
 * @param int    $author_id  User ID who created the post/comment.
 */
function p2026_notifications_on_mentions_found( $users, $object_type, $object_id, $author_id ) {
	foreach ( $users as $user ) {
		$post_id    = 'post' === $object_type ? $object_id : get_comment( $object_id )->comment_post_ID;
		$comment_id = 'comment' === $object_type ? $object_id : 0;

		// Don't notify the author.
		if ( $user->ID === $author_id ) {
			continue;
		}

		p2026_create_notification(
			$user->ID,
			'mention',
			$post_id,
			$comment_id,
			$author_id
		);
	}
}
add_action( 'p2026_mentions_found', 'p2026_notifications_on_mentions_found', 10, 4 );

/**
 * Hook into comment creation to notify parent comment authors and post authors.
 *
 * Uses comment_post hook which provides comment approval status directly.
 *
 * @param int       $comment_id       Comment ID.
 * @param int|bool  $comment_approved Comment approval status (1 = approved, 0 = pending, 'spam' = spam).
 * @param array     $commentdata      Comment data array.
 */
function p2026_notifications_on_comment_created( $comment_id, $comment_approved, $commentdata ) {
	if ( 1 !== $comment_approved ) {
		return; // Only notify for approved comments.
	}

	$comment = get_comment( $comment_id );
	if ( ! $comment ) {
		return;
	}

	$post_id  = $comment->comment_post_ID;
	$author   = get_user_by( 'id', $comment->user_id );

	if ( ! $author ) {
		return; // Anonymous comments don't trigger notifications.
	}

	// Notify parent comment author if this is a reply.
	if ( $comment->comment_parent ) {
		$parent = get_comment( $comment->comment_parent );
		if ( $parent && $parent->user_id && $parent->user_id !== $author->ID ) {
			p2026_create_notification(
				$parent->user_id,
				'reply',
				$post_id,
				$comment_id,
				$author->ID
			);
		}
	}

	// Notify post author if comment is not from them.
	$post = get_post( $post_id );
	if ( $post && $post->post_author && $post->post_author !== $author->ID ) {
		p2026_create_notification(
			$post->post_author,
			'reply',
			$post_id,
			$comment_id,
			$author->ID
		);
	}
}
add_action( 'comment_post', 'p2026_notifications_on_comment_created', 10, 3 );
