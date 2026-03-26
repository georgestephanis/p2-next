<?php
/**
 * P2026 Module: Mentions
 *
 * Module Name:        Mentions
 * Module Description: Parses @username references in posts and comments, notifies mentioned users, and provides autocomplete in the editor.
 * Module Version:     0.1.0
 *
 * @package P2026\Modules\Mentions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST endpoint: search users by display name or login for mention autocomplete.
 *
 * GET /wp/v2/p2026/mentions/users?search=alice
 *
 * @todo Register route and implement query.
 */
function p2026_mentions_register_routes() {
	// TODO: register_rest_route( 'wp/v2', '/p2026/mentions/users', [ ... ] );
}
add_action( 'rest_api_init', 'p2026_mentions_register_routes' );

/**
 * Parse @mentions in post content and queue notifications after a post is saved.
 *
 * @todo Extract @username tokens from post_content, resolve to user IDs,
 *       and trigger wp_notify_postauthor-style emails.
 *
 * @param int     $post_id Post ID.
 * @param WP_Post $post    Post object.
 */
function p2026_mentions_on_post_save( $post_id, $post ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	// TODO: parse_mentions( $post->post_content ) and notify.
}
add_action( 'save_post', 'p2026_mentions_on_post_save', 20, 2 );

/**
 * Parse @mentions in comment content and queue notifications after a comment
 * is approved.
 *
 * @todo Extract @username tokens from comment_content, resolve to user IDs,
 *       and notify if they haven't already received a reply notification.
 *
 * @param string     $comment_approved 1|0|'spam'
 * @param array      $comment_data     Comment data array.
 */
function p2026_mentions_on_comment_post( $comment_approved, $comment_data ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	if ( '1' !== (string) $comment_approved ) {
		return;
	}
	// TODO: parse_mentions( $comment_data['comment_content'] ) and notify.
}
add_action( 'comment_post', 'p2026_mentions_on_comment_post', 20, 2 );
