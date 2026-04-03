<?php
/**
 * P2026 Module: Link Previews
 *
 * Module Name:        Link Previews
 * Module Description: REST endpoint for internal post/comment preview cards with server-side caching.
 * Module Version:     0.3.0
 *
 * @package P2026\Modules\LinkPreviews
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const P2026_LINK_PREVIEW_TTL = 3 * DAY_IN_SECONDS;

/**
 * Register REST routes for link previews.
 */
function p2026_link_previews_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/link-preview',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_link_previews_rest',
			'permission_callback' => '__return_true',
			'args'                => array(
				'url' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'esc_url_raw',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_link_previews_register_routes' );

/**
 * Build transient cache key for a preview target.
 *
 * @param string $target_type Target type: post|comment.
 * @param int    $target_id   Post/comment ID.
 * @return string
 */
function p2026_link_previews_cache_key( $target_type, $target_id ) {
	return 'p2026_link_preview_' . md5( $target_type . ':' . (int) $target_id );
}

/**
 * Return true when URL is internal to this site.
 *
 * @param string $url Absolute URL.
 * @return bool
 */
function p2026_link_previews_is_internal_url( $url ) {
	$parsed_url  = wp_parse_url( $url );
	$parsed_home = wp_parse_url( home_url( '/' ) );

	if ( ! is_array( $parsed_url ) || ! is_array( $parsed_home ) ) {
		return false;
	}

	if ( empty( $parsed_url['host'] ) || empty( $parsed_home['host'] ) ) {
		return false;
	}

	return strtolower( $parsed_url['host'] ) === strtolower( $parsed_home['host'] );
}

/**
 * Resolve a post ID from an internal URL.
 *
 * @param string $url Internal absolute URL.
 * @return int
 */
function p2026_link_previews_resolve_post_id( $url ) {
	$without_fragment = strtok( $url, '#' );
	$post_id          = (int) url_to_postid( $without_fragment );

	if ( $post_id > 0 ) {
		return $post_id;
	}

	$query = wp_parse_url( $without_fragment, PHP_URL_QUERY );
	if ( ! is_string( $query ) || '' === $query ) {
		return 0;
	}

	parse_str( $query, $query_vars );
	return isset( $query_vars['p'] ) ? absint( $query_vars['p'] ) : 0;
}

/**
 * Resolve a comment ID from an internal URL fragment.
 *
 * @param string $url Internal absolute URL.
 * @return int
 */
function p2026_link_previews_resolve_comment_id( $url ) {
	if ( ! preg_match( '/#comment-(\d+)$/', $url, $matches ) ) {
		return 0;
	}

	return absint( $matches[1] );
}

/**
 * Build preview payload for a post.
 *
 * @param int $post_id Post ID.
 * @return array|null
 */
function p2026_link_previews_build_post_preview( $post_id ) {
	$post = get_post( $post_id );
	if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
		return null;
	}

	if ( post_password_required( $post ) ) {
		return null;
	}

	$author_id = (int) $post->post_author;
	$title     = get_the_title( $post );
	$raw_text  = $post->post_excerpt ? $post->post_excerpt : $post->post_content;

	return array(
		'type'         => 'post',
		'postId'       => (int) $post->ID,
		'commentId'    => 0,
		'url'          => get_permalink( $post ),
		'postTitle'    => '' !== trim( (string) $title ) ? $title : __( '(Untitled)', 'p2026' ),
		'authorName'   => get_the_author_meta( 'display_name', $author_id ),
		'authorAvatar' => get_avatar_url( $author_id, array( 'size' => 64 ) ),
		'date'         => get_post_time( 'c', true, $post ),
		'excerpt'      => wp_trim_words( wp_strip_all_tags( (string) $raw_text ), 24, '…' ),
	);
}

/**
 * Build preview payload for a comment.
 *
 * @param int $comment_id Comment ID.
 * @return array|null
 */
function p2026_link_previews_build_comment_preview( $comment_id ) {
	$comment = get_comment( $comment_id );
	if ( ! $comment || '1' !== (string) $comment->comment_approved ) {
		return null;
	}

	$post = get_post( (int) $comment->comment_post_ID );
	if ( ! $post || 'publish' !== $post->post_status ) {
		return null;
	}

	if ( post_password_required( $post ) ) {
		return null;
	}

	return array(
		'type'         => 'comment',
		'postId'       => (int) $post->ID,
		'commentId'    => (int) $comment->comment_ID,
		'url'          => get_comment_link( $comment ),
		'postTitle'    => get_the_title( $post ),
		'authorName'   => get_comment_author( $comment ),
		'authorAvatar' => get_avatar_url( $comment, array( 'size' => 64 ) ),
		'date'         => get_comment_date( 'c', $comment ),
		'excerpt'      => wp_trim_words( wp_strip_all_tags( (string) $comment->comment_content ), 24, '…' ),
	);
}

/**
 * Resolve and cache a preview payload for a URL.
 *
 * @param string $url Internal absolute URL.
 * @return array|null
 */
function p2026_link_previews_get_preview_for_url( $url ) {
	$comment_id = p2026_link_previews_resolve_comment_id( $url );
	if ( $comment_id > 0 ) {
		$cache_key = p2026_link_previews_cache_key( 'comment', $comment_id );
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$preview = p2026_link_previews_build_comment_preview( $comment_id );
		if ( is_array( $preview ) ) {
			set_transient( $cache_key, $preview, P2026_LINK_PREVIEW_TTL );
		}

		return $preview;
	}

	$post_id = p2026_link_previews_resolve_post_id( $url );
	if ( $post_id <= 0 ) {
		return null;
	}

	$cache_key = p2026_link_previews_cache_key( 'post', $post_id );
	$cached    = get_transient( $cache_key );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$preview = p2026_link_previews_build_post_preview( $post_id );
	if ( is_array( $preview ) ) {
		set_transient( $cache_key, $preview, P2026_LINK_PREVIEW_TTL );
	}

	return $preview;
}

/**
 * REST callback for internal link previews.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function p2026_link_previews_rest( $request ) {
	$url = esc_url_raw( (string) $request->get_param( 'url' ) );
	if ( '' === $url ) {
		return new WP_Error(
			'p2026_link_preview_invalid_url',
			__( 'A valid URL is required.', 'p2026' ),
			array( 'status' => 400 )
		);
	}

	if ( ! p2026_link_previews_is_internal_url( $url ) ) {
		return new WP_Error(
			'p2026_link_preview_external_url',
			__( 'Only internal URLs are supported.', 'p2026' ),
			array( 'status' => 400 )
		);
	}

	$preview = p2026_link_previews_get_preview_for_url( $url );
	if ( ! is_array( $preview ) ) {
		return new WP_Error(
			'p2026_link_preview_not_found',
			__( 'Preview not available for this link.', 'p2026' ),
			array( 'status' => 404 )
		);
	}

	return rest_ensure_response( $preview );
}
