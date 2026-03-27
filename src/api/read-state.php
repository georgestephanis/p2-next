<?php
/**
 * P2026 — Read/Unread State API
 *
 * Tracks per-user read state and provides REST endpoints for syncing.
 *
 * @package P2026
 */

const P2026_USER_LAST_ACTIVITY_META_KEY = 'p2026_last_activity';

/**
 * Initialize user's last activity on login.
 *
 * @param string $user_login Username.
 * @param object $user       User object.
 */
function p2026_on_user_login( $user_login, $user ) {
	p2026_update_user_last_activity( $user->ID );
}
add_action( 'wp_login', 'p2026_on_user_login', 10, 2 );

/**
 * Update the user's last activity timestamp.
 *
 * @param int    $user_id User ID.
 * @param string $timestamp ISO 8601 timestamp, defaults to now.
 */
function p2026_update_user_last_activity( $user_id, $timestamp = null ) {
	if ( ! $user_id ) {
		return;
	}
	if ( ! $timestamp ) {
		$timestamp = current_time( 'c' );
	}
	update_user_meta( $user_id, P2026_USER_LAST_ACTIVITY_META_KEY, $timestamp );
}

/**
 * Get the user's last activity timestamp.
 *
 * @param int $user_id User ID.
 * @return string|null ISO 8601 timestamp, or null if not set.
 */
function p2026_get_user_last_activity( $user_id ) {
	if ( ! $user_id ) {
		return null;
	}
	return get_user_meta( $user_id, P2026_USER_LAST_ACTIVITY_META_KEY, true );
}

/**
 * Count unread posts for a user (capped at 100).
 *
 * @param int $user_id User ID.
 * @return int
 */
function p2026_count_unread_posts( $user_id ) {
	global $wpdb;

	$last_activity = p2026_get_user_last_activity( $user_id );
	if ( ! $last_activity ) {
		return 0;
	}

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$count = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_type = 'post' AND post_date_gmt > %s",
			$last_activity
		)
	);

	// Cap at 100 for performance and UI reasons.
	return min( $count, 100 );
}

/**
 * Register read-state REST routes.
 *
 * - GET    /wp-json/p2026/v1/read-state            — get user's read state
 * - POST   /wp-json/p2026/v1/read-state/sync        — sync activity timestamp
 */
function p2026_read_state_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/read-state',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_get_read_state',
			'permission_callback' => 'is_user_logged_in',
		)
	);

	register_rest_route(
		'p2026/v1',
		'/read-state/sync',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'p2026_sync_read_state',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'timestamp' => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => null,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_read_state_register_routes' );

/**
 * Get the current user's read state.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_get_read_state( $request ) {
	$user_id       = get_current_user_id();
	$last_activity = p2026_get_user_last_activity( $user_id );
	$unread_count  = p2026_count_unread_posts( $user_id );

	return rest_ensure_response(
		array(
			'lastActivity'  => $last_activity,
			'unreadCount'   => $unread_count,
		)
	);
}

/**
 * Sync the user's last activity timestamp.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_sync_read_state( $request ) {
	$user_id   = get_current_user_id();
	$timestamp = $request['timestamp'] ?? current_time( 'c' );

	p2026_update_user_last_activity( $user_id, $timestamp );

	// Return updated unread count.
	$unread_count = p2026_count_unread_posts( $user_id );

	return rest_ensure_response(
		array(
			'unreadCount'   => $unread_count,
			'lastActivity'  => $timestamp,
		)
	);
}
