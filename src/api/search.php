<?php
/**
 * P2026 — Search API
 *
 * Provides unified REST endpoint for searching across posts and comments.
 *
 * @package P2026
 */

/**
 * Register the search REST route.
 *
 * GET /wp-json/p2026/v1/search?q={query}&type={posts|comments|all}&limit=20
 */
function p2026_search_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/search',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_search_posts_and_comments',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'q'      => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'required'          => true,
				),
				'type'   => array(
					'type'              => 'string',
					'enum'              => array( 'posts', 'comments', 'all' ),
					'default'           => 'all',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'limit'  => array(
					'type'              => 'integer',
					'default'           => 20,
					'minimum'           => 1,
					'maximum'           => 50,
					'sanitize_callback' => 'absint',
				),
				'offset' => array(
					'type'              => 'integer',
					'default'           => 0,
					'minimum'           => 0,
					'sanitize_callback' => 'absint',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_search_register_routes' );

/**
 * Search posts and comments by query string.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_search_posts_and_comments( $request ) {
	global $wpdb;

	$query      = $request['q'];
	$type       = $request['type'];
	$limit      = $request['limit'];
	$offset     = $request['offset'];
	$current_id = get_current_user_id();

	if ( empty( $query ) || strlen( $query ) < 2 ) {
		return rest_ensure_response( array() );
	}

	// Prepare the search query with basic LIKE matching.
	$search_term  = '%' . $wpdb->esc_like( $query ) . '%';
	$results      = array();

	// Search posts.
	if ( 'posts' === $type || 'all' === $type ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$post_results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT 'post' as result_type, ID as id, post_title as title, post_content as content, post_date_gmt as date, post_author as author_id, post_title as match_context FROM {$wpdb->posts} WHERE (post_title LIKE %s OR post_content LIKE %s) AND post_type = 'post' AND post_status = 'publish' AND post_author = %d ORDER BY post_date_gmt DESC LIMIT %d OFFSET %d",
				$search_term,
				$search_term,
				$current_id,
				$limit,
				$offset
			)
		);

		if ( $post_results ) {
			$results = array_merge( $results, $post_results );
		}
	}

	// Search comments.
	if ( 'comments' === $type || 'all' === $type ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$comment_results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT 'comment' as result_type, c.comment_ID as id, p.post_title as title, c.comment_content as content, c.comment_date_gmt as date, c.user_id as author_id, p.post_title as match_context FROM {$wpdb->comments} c INNER JOIN {$wpdb->posts} p ON c.comment_post_ID = p.ID WHERE c.comment_content LIKE %s AND p.post_status = 'publish' AND c.comment_approved = 1 AND c.user_id = %d ORDER BY c.comment_date_gmt DESC LIMIT %d OFFSET %d",
				$search_term,
				$current_id,
				$limit,
				$offset
			)
		);

		if ( $comment_results ) {
			$results = array_merge( $results, $comment_results );
		}
	}

	// Sort combined results by date descending (newest first).
	usort(
		$results,
		function ( $a, $b ) {
			return strcmp( $b->date, $a->date );
		}
	);

	// Truncate to limit.
	$results = array_slice( $results, 0, $limit );

	// Enrich with author and excerpt information.
	$enriched = array_map(
		function ( $result ) {
			$excerpt = wp_trim_words( $result->content, 20, '...' );
			$author  = get_user_by( 'id', $result->author_id );

			return array(
				'type'            => $result->result_type,
				'id'              => (int) $result->id,
				'title'           => $result->title,
				'excerpt'         => $excerpt,
				'matchContext'    => $result->match_context,
				'date'            => $result->date,
				'author'          => $author ? $author->display_name : __( 'Unknown', 'p2026' ),
				'postId'          => 'post' === $result->result_type ? (int) $result->id : null,
				'commentId'       => 'comment' === $result->result_type ? (int) $result->id : null,
				'parentPostId'    => 'comment' === $result->result_type ? (int) get_comment_meta( $result->id, 'comment_post_ID', true ) : null,
			);
		},
		$results
	);

	return rest_ensure_response( $enriched );
}
