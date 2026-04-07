<?php
/**
 * P2026 comment/post permission REST fields.
 *
 * @package P2026
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Extract a comment ID from REST field callback payloads.
 *
 * @param mixed $comment_obj Comment payload passed by register_rest_field.
 * @return int
 */
function p2026_rest_comment_id( $comment_obj ) {
	if ( is_array( $comment_obj ) && isset( $comment_obj['id'] ) ) {
		return (int) $comment_obj['id'];
	}

	if ( is_object( $comment_obj ) && isset( $comment_obj->id ) ) {
		return (int) $comment_obj->id;
	}

	if ( $comment_obj instanceof WP_Comment ) {
		return (int) $comment_obj->comment_ID;
	}

	return 0;
}

/**
 * Extract a post ID from REST field callback payloads.
 *
 * @param mixed $post_obj Post payload passed by register_rest_field.
 * @return int
 */
function p2026_rest_post_id( $post_obj ) {
	if ( is_array( $post_obj ) && isset( $post_obj['id'] ) ) {
		return (int) $post_obj['id'];
	}

	if ( is_object( $post_obj ) && isset( $post_obj->id ) ) {
		return (int) $post_obj->id;
	}

	if ( $post_obj instanceof WP_Post ) {
		return (int) $post_obj->ID;
	}

	return 0;
}

/**
 * Register additional comment REST fields used by the frontend UI.
 */
function p2026_register_comment_rest_fields() {
	register_rest_field(
		'post',
		'p2026CanCreateComment',
		array(
			'get_callback' => static function ( $post_obj ) {
				$post_id = p2026_rest_post_id( $post_obj );
				if ( $post_id <= 0 ) {
					return false;
				}

				return p2026_can_create_comments( $post_id );
			},
			'schema'       => array(
				'description' => __( 'Whether the current user can create comments on this post.', 'p2026' ),
				'type'        => 'boolean',
				'context'     => array( 'view', 'edit' ),
			),
		)
	);

	register_rest_field(
		'comment',
		'p2026CanEdit',
		array(
			'get_callback' => static function ( $comment_obj ) {
				$comment_id = p2026_rest_comment_id( $comment_obj );
				if ( $comment_id <= 0 ) {
					return false;
				}

				return p2026_can_update_comments( $comment_id );
			},
			'schema'       => array(
				'description' => __( 'Whether the current user can edit this comment.', 'p2026' ),
				'type'        => 'boolean',
				'context'     => array( 'view', 'edit' ),
			),
		)
	);

	register_rest_field(
		'comment',
		'p2026EditableContent',
		array(
			'get_callback' => static function ( $comment_obj ) {
				$comment_id = p2026_rest_comment_id( $comment_obj );
				if ( $comment_id <= 0 || ! p2026_can_update_comments( $comment_id ) ) {
					return '';
				}

				$comment = get_comment( $comment_id );
				if ( ! $comment instanceof WP_Comment ) {
					return '';
				}

				return (string) $comment->comment_content;
			},
			'schema'       => array(
				'description' => __( 'Raw comment content for edit-capable users.', 'p2026' ),
				'type'        => 'string',
				'context'     => array( 'view', 'edit' ),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_register_comment_rest_fields' );
