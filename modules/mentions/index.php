<?php
/**
 * P2026 Module: Mentions
 *
 * Module Name:        Mentions
 * Module Description: Parses @username references in posts and comments, notifies mentioned users, and provides autocomplete in the editor.
 * Module Version:     0.1.0
 *
 * Provides @username mention support:
 *   - REST endpoint for mention autocomplete (logged-in users only).
 *   - Server-side parsing of @username tokens after a post or comment is saved.
 *   - Fires `p2026_mentions_found` so third-party plugins can send notifications.
 *
 * @package P2026\Modules\Mentions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// REST endpoint: user search for mention autocomplete
// ---------------------------------------------------------------------------

/**
 * Register the mentions user-search REST route.
 *
 * GET /wp-json/p2026/v1/users?search={query}&per_page={n}
 */
function p2026_mentions_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/users',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_mentions_search_users',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'search'   => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				'per_page' => array(
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
					'default'           => 10,
					'minimum'           => 1,
					'maximum'           => 20,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_mentions_register_routes' );

/**
 * Return a list of users matching the search query.
 *
 * Response items: { id, slug, name, avatar_url }
 *
 * @param WP_REST_Request $request REST request object.
 * @return WP_REST_Response
 */
function p2026_mentions_search_users( $request ) {
	$search   = $request->get_param( 'search' );
	$per_page = $request->get_param( 'per_page' );

	if ( '' === $search ) {
		return rest_ensure_response( array() );
	}

	$query = new WP_User_Query(
		array(
			'search'         => '*' . $search . '*',
			'search_columns' => array( 'user_login', 'display_name' ),
			'number'         => $per_page,
			'orderby'        => 'display_name',
			'order'          => 'ASC',
			'fields'         => array( 'ID', 'user_login', 'display_name' ),
		)
	);

	$users = array_map(
		static function ( $user ) {
			return array(
				'id'         => (int) $user->ID,
				'slug'       => $user->user_login,
				'name'       => $user->display_name,
				'avatar_url' => get_avatar_url( $user->ID, array( 'size' => 32 ) ),
			);
		},
		$query->get_results()
	);

	return rest_ensure_response( $users );
}

// ---------------------------------------------------------------------------
// Mention parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract @username slugs from a content string.
 *
 * Uses a negative lookbehind to skip email addresses (user@example.com).
 * Minimum slug length of 2 characters to avoid false positives.
 *
 * @param string $content Raw post or comment content (may contain HTML).
 * @return string[] Deduplicated, lowercase array of candidate user_login slugs.
 */
function p2026_mentions_parse_usernames( $content ) {
	// Strip HTML and decode entities before parsing so we don't match
	// attribute values or URLs that happen to contain @.
	$text    = html_entity_decode( wp_strip_all_tags( $content ), ENT_QUOTES, 'UTF-8' );
	$matches = array();
	preg_match_all(
		'/(?<![a-zA-Z0-9.@])@([a-zA-Z0-9_-]{2,60})/',
		$text,
		$matches
	);

	return array_values( array_unique( array_map( 'strtolower', $matches[1] ) ) );
}

/**
 * Resolve an array of slug candidates to real WordPress users.
 *
 * Only exact user_login matches are returned, which guards against
 * injecting arbitrary strings and ensures the hook receives genuine users.
 *
 * @param string[] $slugs Candidate user_login slugs.
 * @return WP_User[] Matched user objects.
 */
function p2026_mentions_resolve_users( $slugs ) {
	if ( empty( $slugs ) ) {
		return array();
	}

	$query = new WP_User_Query(
		array(
			'login__in' => $slugs,
			'number'    => count( $slugs ),
		)
	);

	return $query->get_results();
}

// ---------------------------------------------------------------------------
// Post save hook
// ---------------------------------------------------------------------------

/**
 * Parse @mentions from a published post and fire the notification hook.
 *
 * Skips autosaves, revisions, and non-publish transitions so the hook fires
 * only when content is visible to readers.
 *
 * @param int     $post_id Post ID.
 * @param WP_Post $post    Post object.
 */
function p2026_mentions_on_post_save( $post_id, $post ) {
	// Skip autosave meta-saves.
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// Skip revisions and non-public types.
	if ( wp_is_post_revision( $post_id ) || 'post' !== $post->post_type ) {
		return;
	}

	if ( 'publish' !== $post->post_status ) {
		return;
	}

	$slugs = p2026_mentions_parse_usernames( $post->post_content );
	$users = p2026_mentions_resolve_users( $slugs );

	if ( empty( $users ) ) {
		return;
	}

	/**
	 * Fires when one or more users are @-mentioned in a published post.
	 *
	 * Third-party plugins should hook here to send email or in-app notifications.
	 * p2026 itself does not send notifications — that is intentionally left to
	 * dedicated notification plugins.
	 *
	 * @param WP_User[] $users       Users who were @-mentioned.
	 * @param string    $object_type Always 'post' in this context.
	 * @param int       $object_id   The post ID.
	 * @param int       $author_id   User ID of the post author.
	 */
	do_action( 'p2026_mentions_found', $users, 'post', $post_id, (int) $post->post_author );
}
add_action( 'save_post', 'p2026_mentions_on_post_save', 20, 2 );

// ---------------------------------------------------------------------------
// Comment save hook
// ---------------------------------------------------------------------------

/**
 * Parse @mentions from an approved comment and fire the notification hook.
 *
 * @param int        $comment_id  Comment ID.
 * @param int|string $approved    1 if approved, 0 if not, 'spam' if spam.
 */
function p2026_mentions_on_comment_post( $comment_id, $approved ) {
	if ( 1 !== (int) $approved ) {
		return;
	}

	$comment = get_comment( $comment_id );
	if ( ! $comment ) {
		return;
	}

	$slugs = p2026_mentions_parse_usernames( $comment->comment_content );
	$users = p2026_mentions_resolve_users( $slugs );

	if ( empty( $users ) ) {
		return;
	}

	/**
	 * Fires when one or more users are @-mentioned in an approved comment.
	 *
	 * @param WP_User[] $users       Users who were @-mentioned.
	 * @param string    $object_type Always 'comment' in this context.
	 * @param int       $object_id   The comment ID.
	 * @param int       $author_id   User ID of the comment author (0 for guests).
	 */
	do_action( 'p2026_mentions_found', $users, 'comment', $comment_id, (int) $comment->user_id );
}
add_action( 'comment_post', 'p2026_mentions_on_comment_post', 20, 2 );
