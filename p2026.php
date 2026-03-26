<?php
/**
 * Plugin Name: P2026
 * Plugin URI:  https://github.com/georgestephanis/p2026
 * Description: Modern P2/o2 replacement using the Block Editor and REST API.
 * Version:     0.1.0
 * Author:      George Stephanis
 * License:     GPL-2.0-or-later
 * Text Domain: p2026
 *
 * @package P2026
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'P2026_VERSION', '0.1.0' );
define( 'P2026_DIR', plugin_dir_path( __FILE__ ) );
define( 'P2026_URL', plugin_dir_url( __FILE__ ) );

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
 * Register the new-post FSE block.
 *
 * Uses the block manifest generated by @wordpress/scripts for efficient
 * metadata loading, then registers the block from the build directory.
 */
function p2026_register_blocks() {
	$manifest = P2026_DIR . 'build/blocks-manifest.php';
	if ( file_exists( $manifest ) ) {
		wp_register_block_metadata_collection( P2026_DIR . 'build', $manifest );
	}
	register_block_type( P2026_DIR . 'build/blocks/new-post' );
}
add_action( 'init', 'p2026_register_blocks' );

/**
 * Enqueue the frontend enhancement script on all public pages.
 *
 * This script progressively enhances whatever post list the theme renders
 * (Query Loop block or classic loop) with live polling, inline comments,
 * and inline post editing — without replacing the theme's own output.
 */
function p2026_enqueue_frontend() {
	$asset_file = P2026_DIR . 'build/frontend.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = require $asset_file;

	// Enqueue WordPress editor/components CSS that frontend components depend on.
	// These provide the base styles for buttons, inputs, blocks, layouts, etc.
	wp_enqueue_style( 'wp-components' );
	wp_enqueue_style( 'wp-block-editor' );
	wp_enqueue_style( 'wp-block-library' );

	// Enqueue the compiled custom styles (p2026-specific layouts and containers).
	wp_enqueue_style(
		'p2026-frontend',
		P2026_URL . 'build/frontend.css',
		array( 'wp-components', 'wp-block-editor', 'wp-block-library' ),
		$asset['version']
	);
	wp_style_add_data( 'p2026-frontend', 'rtl', 'replace' );

	wp_enqueue_script(
		'p2026-frontend',
		P2026_URL . 'build/frontend.js',
		$asset['dependencies'],
		$asset['version'],
		array( 'strategy' => 'defer' )
	);

	$current_user       = wp_get_current_user();
	$user_data          = null;
	$can_publish        = p2026_can_create_posts();
	$can_update_posts   = p2026_can_update_posts();
	$can_comment        = is_user_logged_in() || get_option( 'comment_registration' ) === '0';
	$require_name_email = get_option( 'require_name_email' ) === '1';
	$debug_telemetry    = defined( 'WP_DEBUG' ) && WP_DEBUG;

	if ( $current_user->ID ) {
		$user_data = array(
			'id'             => $current_user->ID,
			'name'           => $current_user->display_name,
			'avatar'         => get_avatar_url( $current_user->ID, array( 'size' => 48 ) ),
			'canPublish'     => $can_publish,
			'canUpdatePosts' => $can_update_posts,
			'canComment'     => $can_comment,
		);
	}

	wp_add_inline_script(
		'p2026-frontend',
		'window.p2026Config = ' . wp_json_encode(
			array(
				'nonce'            => wp_create_nonce( 'wp_rest' ),
				'restUrl'          => esc_url_raw( rest_url() ),
				'siteTitle'        => get_bloginfo( 'name' ),
				'debugTelemetry'   => $debug_telemetry,
				'currentUser'      => $user_data,
				'canCreatePosts'   => $can_publish,
				'canUpdatePosts'   => $can_update_posts,
				'canComment'       => $can_comment,
				'requireNameEmail' => $require_name_email,
				'threadDepth'      => (int) get_option( 'thread_comments_depth', 5 ),
			)
		) . ';',
		'before'
	);
}
add_action( 'wp_enqueue_scripts', 'p2026_enqueue_frontend' );

/**
 * Auto-generate post title from the first line of content when none is provided.
 * Mirrors o2 behaviour for status-style posts.
 *
 * @param stdClass        $prepared_post Prepared post data.
 * @param WP_REST_Request $request       REST request.
 * @return stdClass
 */
function p2026_auto_title( $prepared_post, $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	if ( empty( $prepared_post->post_title ) && ! empty( $prepared_post->post_content ) ) {
		$first_line                = strtok( wp_strip_all_tags( $prepared_post->post_content ), "\n" );
		$prepared_post->post_title = wp_trim_words( $first_line, 10, '' );
	}
	return $prepared_post;
}
add_filter( 'rest_pre_insert_post', 'p2026_auto_title', 10, 2 );

/**
 * Add a "New Post" node to the admin bar on the front-end blog index.
 *
 * Only shown to users who can create posts. The JS click handler in
 * frontend.js either scrolls to an existing new-post editor on the page
 * or opens the React modal.
 *
 * @param WP_Admin_Bar $wp_admin_bar Admin bar instance.
 */
function p2026_admin_bar_new_post( $wp_admin_bar ) {
	if ( ! is_home() && ! is_front_page() ) {
		return;
	}
	if ( ! p2026_can_create_posts() ) {
		return;
	}
	$wp_admin_bar->add_node(
		array(
			'id'    => 'p2026-new-post',
			'title' => __( 'New Post', 'p2026' ),
			'href'  => '#',
			'meta'  => array( 'class' => 'p2026-adminbar-new-post' ),
		)
	);
}
add_action( 'admin_bar_menu', 'p2026_admin_bar_new_post', 100 );
