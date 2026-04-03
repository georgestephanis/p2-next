<?php
/**
 * Shared batched lookups for user, post, and comment display metadata.
 *
 * @package P2026
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Parse and sanitize a CSV list of IDs.
 *
 * @param mixed $raw_ids Raw request value.
 * @param int   $limit   Maximum IDs to keep.
 * @return int[]
 */
function p2026_parse_lookup_ids( $raw_ids, $limit = 100 ) {
	if ( is_array( $raw_ids ) ) {
		$raw_ids = implode( ',', $raw_ids );
	}

	if ( ! is_string( $raw_ids ) || '' === trim( $raw_ids ) ) {
		return array();
	}

	$ids = array_map( 'absint', array_map( 'trim', explode( ',', $raw_ids ) ) );
	$ids = array_values( array_unique( array_filter( $ids ) ) );

	if ( count( $ids ) > $limit ) {
		$ids = array_slice( $ids, 0, $limit );
	}

	return $ids;
}

/**
 * Build user lookup map keyed by ID.
 *
 * @param int[] $user_ids User IDs.
 * @return array<string,array<string,mixed>>
 */
function p2026_build_user_lookup_map( $user_ids ) {
	if ( empty( $user_ids ) ) {
		return array();
	}

	$users = get_users(
		array(
			'include' => $user_ids,
			'fields'  => array( 'ID', 'display_name' ),
		)
	);

	$map = array();
	foreach ( $users as $user ) {
		if ( ! $user instanceof WP_User ) {
			continue;
		}

		$map[ (string) $user->ID ] = array(
			'id'         => (int) $user->ID,
			'name'       => (string) $user->display_name,
			'avatar_url' => esc_url_raw( (string) get_avatar_url( $user->ID, array( 'size' => 32 ) ) ),
			'profile_url'=> esc_url_raw( (string) get_author_posts_url( $user->ID ) ),
		);
	}

	return $map;
}

/**
 * Build post lookup map keyed by ID.
 *
 * @param int[] $post_ids Post IDs.
 * @return array<string,array<string,mixed>>
 */
function p2026_build_post_lookup_map( $post_ids ) {
	$map = array();
	foreach ( $post_ids as $post_id ) {
		$post = get_post( (int) $post_id );
		if ( ! $post instanceof WP_Post ) {
			continue;
		}

		if ( ! current_user_can( 'read_post', $post->ID ) ) {
			continue;
		}

		$map[ (string) $post->ID ] = array(
			'id'        => (int) $post->ID,
			'title'     => wp_strip_all_tags( get_the_title( $post ) ),
			'permalink' => esc_url_raw( (string) get_permalink( $post ) ),
		);
	}

	return $map;
}

/**
 * Build comment lookup map keyed by ID.
 *
 * @param int[] $comment_ids Comment IDs.
 * @return array<string,array<string,mixed>>
 */
function p2026_build_comment_lookup_map( $comment_ids ) {
	$map = array();
	foreach ( $comment_ids as $comment_id ) {
		$comment = get_comment( (int) $comment_id );
		if ( ! $comment instanceof WP_Comment ) {
			continue;
		}

		if ( ! current_user_can( 'edit_comment', $comment->comment_ID ) && '1' !== (string) $comment->comment_approved ) {
			continue;
		}

		$map[ (string) $comment->comment_ID ] = array(
			'id'        => (int) $comment->comment_ID,
			'post_id'   => (int) $comment->comment_post_ID,
			'excerpt'   => wp_trim_words( wp_strip_all_tags( (string) $comment->comment_content ), 16, '...' ),
			'permalink' => esc_url_raw( (string) get_comment_link( $comment ) ),
		);
	}

	return $map;
}

/**
 * REST callback for shared entity lookups.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function p2026_rest_entity_lookups( WP_REST_Request $request ) {
	$user_ids    = p2026_parse_lookup_ids( $request->get_param( 'user_ids' ) );
	$post_ids    = p2026_parse_lookup_ids( $request->get_param( 'post_ids' ) );
	$comment_ids = p2026_parse_lookup_ids( $request->get_param( 'comment_ids' ) );

	return rest_ensure_response(
		array(
			'users'    => p2026_build_user_lookup_map( $user_ids ),
			'posts'    => p2026_build_post_lookup_map( $post_ids ),
			'comments' => p2026_build_comment_lookup_map( $comment_ids ),
		)
	);
}

/**
 * Register shared lookup endpoint.
 */
function p2026_register_lookup_routes() {
	register_rest_route(
		'p2026/v1',
		'/lookups',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_rest_entity_lookups',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'user_ids'    => array(
					'type'     => 'string',
					'required' => false,
				),
				'post_ids'    => array(
					'type'     => 'string',
					'required' => false,
				),
				'comment_ids' => array(
					'type'     => 'string',
					'required' => false,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_register_lookup_routes' );
