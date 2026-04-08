<?php
/**
 * P2026 abilities and permission helpers.
 *
 * @package P2026
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register a dedicated abilities category for p2026, when the API is available.
 */
function p2026_register_ability_categories() {
	if ( ! function_exists( 'wp_register_ability_category' ) ) {
		return;
	}

	wp_register_ability_category(
		'p2026',
		array(
			'label'       => __( 'P2026', 'p2026' ),
			'description' => __( 'Abilities exposed by the P2026 plugin.', 'p2026' ),
		)
	);
}
add_action( 'wp_abilities_api_categories_init', 'p2026_register_ability_categories' );

/**
 * Permission callback for creating posts.
 *
 * @return bool
 */
function p2026_ability_can_create_post() {
	return current_user_can( 'publish_posts' );
}

/**
 * Permission callback for updating posts.
 *
 * @param array|null $input Optional input payload.
 * @return bool
 */
function p2026_ability_can_update_post( $input = null ) {
	$post_id = isset( $input['post_id'] ) ? (int) $input['post_id'] : 0;

	if ( $post_id > 0 ) {
		return current_user_can( 'edit_post', $post_id );
	}

	return current_user_can( 'edit_posts' );
}

/**
 * Permission callback for creating reactions.
 *
 * @param array|null $input Optional input payload.
 * @return bool
 */
function p2026_ability_can_create_reaction( $input = null ) {
	// Reactions are low-friction; same permission as commenting.
	return p2026_ability_can_create_comment( $input );
}

/**
 * Permission callback for removing reactions.
 *
 * @param array|null $input Optional input payload.
 * @return bool
 */
function p2026_ability_can_remove_reaction( $input = null ) {
	// User can remove their own reactions (self-service).
	// Handled at endpoint level by comparing user_id.
	return true;
}

/**
 * Permission callback for creating comments.
 *
 * @param array|null $input Optional input payload.
 * @return bool
 */
function p2026_ability_can_create_comment( $input = null ) {
	$post_id = isset( $input['post_id'] ) ? (int) $input['post_id'] : 0;

	if ( $post_id > 0 && ! comments_open( $post_id ) ) {
		return false;
	}

	if ( is_user_logged_in() ) {
		return true;
	}

	return get_option( 'comment_registration' ) === '0';
}

/**
 * Permission callback for updating comments.
 *
 * @param array|null $input Optional input payload.
 * @return bool
 */
function p2026_ability_can_update_comment( $input = null ) {
	$comment_id = isset( $input['comment_id'] ) ? (int) $input['comment_id'] : 0;

	if ( $comment_id > 0 ) {
		return current_user_can( 'edit_comment', $comment_id );
	}

	return current_user_can( 'edit_posts' );
}

/**
 * Register p2026 abilities, if the Abilities API is available.
 */
function p2026_register_abilities() {
	if ( ! function_exists( 'wp_register_ability' ) ) {
		return;
	}

	wp_register_ability(
		'p2026/post-create',
		array(
			'label'               => __( 'Create Post', 'p2026' ),
			'description'         => __( 'Checks whether the current user can create and publish posts via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether post creation is allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_create_post',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => true,
				),
			),
		)
	);

	wp_register_ability(
		'p2026/post-update',
		array(
			'label'               => __( 'Update Post', 'p2026' ),
			'description'         => __( 'Checks whether the current user can update posts via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'input_schema'        => array(
				'type'                 => 'object',
				'properties'           => array(
					'post_id' => array(
						'type'        => 'integer',
						'description' => __( 'Optional post ID to check edit permission against.', 'p2026' ),
						'minimum'     => 1,
					),
				),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether post updates are allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_update_post',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => true,
				),
			),
		)
	);

	wp_register_ability(
		'p2026/comment-create',
		array(
			'label'               => __( 'Create Comment', 'p2026' ),
			'description'         => __( 'Checks whether the current user can create comments via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'input_schema'        => array(
				'type'                 => 'object',
				'properties'           => array(
					'post_id' => array(
						'type'        => 'integer',
						'description' => __( 'Optional post ID to check commentability against.', 'p2026' ),
						'minimum'     => 1,
					),
				),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether comment creation is allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_create_comment',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => true,
				),
			),
		)
	);

	wp_register_ability(
		'p2026/comment-update',
		array(
			'label'               => __( 'Update Comment', 'p2026' ),
			'description'         => __( 'Checks whether the current user can update comments via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'input_schema'        => array(
				'type'                 => 'object',
				'properties'           => array(
					'comment_id' => array(
						'type'        => 'integer',
						'description' => __( 'Optional comment ID to check edit permission against.', 'p2026' ),
						'minimum'     => 1,
					),
				),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether comment updates are allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_update_comment',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => true,
				),
			),
		)
	);

	wp_register_ability(
		'p2026/reaction-create',
		array(
			'label'               => __( 'Create Reaction', 'p2026' ),
			'description'         => __( 'Checks whether the current user can create reactions on posts and comments via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'input_schema'        => array(
				'type'                 => 'object',
				'properties'           => array(
					'post_id' => array(
						'type'        => 'integer',
						'description' => __( 'Optional post ID to check reactions are allowed.', 'p2026' ),
						'minimum'     => 1,
					),
				),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether reaction creation is allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_create_reaction',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => false,
				),
			),
		)
	);

	wp_register_ability(
		'p2026/reaction-remove',
		array(
			'label'               => __( 'Remove Reaction', 'p2026' ),
			'description'         => __( 'Checks whether the current user can remove their reactions via P2026.', 'p2026' ),
			'category'            => 'p2026',
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'allowed' => array(
						'type'        => 'boolean',
						'description' => __( 'Whether reaction removal is allowed.', 'p2026' ),
					),
				),
			),
			'execute_callback'    => static function () {
				return array( 'allowed' => true );
			},
			'permission_callback' => 'p2026_ability_can_remove_reaction',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => true,
					'destructive' => true,
					'idempotent'  => true,
				),
			),
		)
	);
}
add_action( 'wp_abilities_api_init', 'p2026_register_abilities' );

/**
 * Resolve a permission check via Abilities API when available, otherwise fallback.
 *
 * @param string   $ability_name      Ability identifier.
 * @param callable $fallback_callback Legacy capability callback.
 * @param array    $input             Optional ability input.
 * @return bool
 */
function p2026_check_permission( $ability_name, $fallback_callback, $input = array() ) {
	if ( function_exists( 'wp_has_ability' ) && function_exists( 'wp_get_ability' ) && wp_has_ability( $ability_name ) ) {
		$ability = wp_get_ability( $ability_name );
		if ( $ability && method_exists( $ability, 'check_permissions' ) ) {
			$allowed = $ability->check_permissions( $input );
			if ( true === $allowed ) {
				return true;
			}
			if ( false === $allowed ) {
				return false;
			}
			if ( is_wp_error( $allowed ) ) {
				return false;
			}
		}
	}

	return (bool) call_user_func( $fallback_callback );
}

/**
 * Whether current user can create posts.
 *
 * @return bool
 */
function p2026_can_create_posts() {
	return p2026_check_permission(
		'p2026/post-create',
		static function () {
			return current_user_can( 'publish_posts' );
		}
	);
}

/**
 * Whether current user can update posts.
 *
 * @param int $post_id Optional post ID for object-level checks.
 * @return bool
 */
function p2026_can_update_posts( $post_id = 0 ) {
	$input = $post_id > 0 ? array( 'post_id' => (int) $post_id ) : array();

	return p2026_check_permission(
		'p2026/post-update',
		static function () use ( $post_id ) {
			if ( $post_id > 0 ) {
				return current_user_can( 'edit_post', $post_id );
			}
			return current_user_can( 'edit_posts' );
		},
		$input
	);
}

/**
 * Whether current user can create comments.
 *
 * @param int $post_id Optional post ID for object-level checks.
 * @return bool
 */
function p2026_can_create_comments( $post_id = 0 ) {
	$input = $post_id > 0 ? array( 'post_id' => (int) $post_id ) : array();

	return p2026_check_permission(
		'p2026/comment-create',
		static function () use ( $post_id ) {
			if ( $post_id > 0 && ! comments_open( $post_id ) ) {
				return false;
			}

			if ( is_user_logged_in() ) {
				return true;
			}

			return get_option( 'comment_registration' ) === '0';
		},
		$input
	);
}

/**
 * Whether current user can update comments.
 *
 * @param int $comment_id Optional comment ID for object-level checks.
 * @return bool
 */
function p2026_can_update_comments( $comment_id = 0 ) {
	$input = $comment_id > 0 ? array( 'comment_id' => (int) $comment_id ) : array();

	return p2026_check_permission(
		'p2026/comment-update',
		static function () use ( $comment_id ) {
			if ( $comment_id > 0 ) {
				return current_user_can( 'edit_comment', $comment_id );
			}
			return current_user_can( 'edit_posts' );
		},
		$input
	);
}

/**
 * Whether current user can create reactions.
 *
 * @param int $post_id Optional post ID for object-level checks.
 * @return bool
 */
function p2026_can_create_reactions( $post_id = 0 ) {
	$input = $post_id > 0 ? array( 'post_id' => (int) $post_id ) : array();

	return p2026_check_permission(
		'p2026/reaction-create',
		static function () use ( $post_id ) {
			if ( $post_id > 0 && ! comments_open( $post_id ) ) {
				return false;
			}

			if ( is_user_logged_in() ) {
				return true;
			}

			return get_option( 'comment_registration' ) === '0';
		},
		$input
	);
}

/**
 * Whether current user can remove reactions.
 *
 * @return bool
 */
function p2026_can_remove_reactions() {
	return p2026_check_permission(
		'p2026/reaction-remove',
		static function () {
			return is_user_logged_in() || get_option( 'comment_registration' ) === '0';
		}
	);
}
