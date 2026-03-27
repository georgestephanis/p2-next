<?php
/**
 * P2026 Module: Post State
 *
 * Module Name:        Post State
 * Module Description: Adds Normal/Unresolved/Resolved workflow states to posts with a carousel UI, #todo auto-assignment, and audit event hooks.
 * Module Version:     0.1.0
 *
 * Provides:
 * - Taxonomy-backed post state (normal|unresolved|resolved)
 * - REST field exposure for post objects
 * - REST endpoint for cycling/setting state
 * - Core audit event hooks for optional logging modules
 *
 * @package P2026\Modules\PostState
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const P2026_POST_STATE_TAXONOMY = 'p2026_post_state';
const P2026_AUDIT_EVENT_VERSION = 1;

/**
 * Return valid post-state slugs in carousel order.
 *
 * @return string[]
 */
function p2026_get_post_state_slugs() {
	return array( 'normal', 'unresolved', 'resolved' );
}

/**
 * Register post-state taxonomy.
 *
 * The taxonomy is non-public, exposed to REST, and intended for
 * workflow state only (not content categorization).
 */
function p2026_register_post_state_taxonomy() {
	register_taxonomy(
		P2026_POST_STATE_TAXONOMY,
		'post',
		array(
			'labels'            => array(
				'name'          => __( 'Post States', 'p2026' ),
				'singular_name' => __( 'Post State', 'p2026' ),
			),
			'public'            => false,
			'show_ui'           => false,
			'show_admin_column' => false,
			'show_in_nav_menus' => false,
			'show_tagcloud'     => false,
			'show_in_rest'      => true,
			'rest_base'         => 'p2026-post-state',
			'hierarchical'      => false,
			'rewrite'           => false,
		)
	);
}
add_action( 'init', 'p2026_register_post_state_taxonomy' );

/**
 * Seed required post-state terms.
 */
function p2026_seed_post_state_terms() {
	$labels = array(
		'normal'     => __( 'Normal', 'p2026' ),
		'unresolved' => __( 'Unresolved', 'p2026' ),
		'resolved'   => __( 'Resolved', 'p2026' ),
	);

	foreach ( $labels as $slug => $label ) {
		if ( ! term_exists( $slug, P2026_POST_STATE_TAXONOMY ) ) {
			wp_insert_term( $label, P2026_POST_STATE_TAXONOMY, array( 'slug' => $slug ) );
		}
	}
}
add_action( 'init', 'p2026_seed_post_state_terms', 20 );

/**
 * Register post REST field for easy state consumption in frontend code.
 */
function p2026_register_post_state_rest_field() {
	register_rest_field(
		'post',
		'p2026State',
		array(
			'get_callback' => static function ( $post_arr ) {
				$post_id = (int) $post_arr['id'];
				return p2026_get_post_state_data( $post_id );
			},
			'schema'       => array(
				'description' => __( 'P2026 post state.', 'p2026' ),
				'type'        => 'object',
				'context'     => array( 'view', 'edit' ),
				'properties'  => array(
					'slug'  => array(
						'type' => 'string',
					),
					'label' => array(
						'type' => 'string',
					),
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_register_post_state_rest_field' );

/**
 * Register post-state mutation route.
 */
function p2026_register_post_state_routes() {
	register_rest_route(
		'p2026/v1',
		'/posts/(?P<post_id>\d+)/state',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'p2026_update_post_state_rest',
			'permission_callback' => static function ( $request ) {
				return p2026_can_update_posts( (int) $request['post_id'] );
			},
			'args'                => array(
				'post_id' => array(
					'type'     => 'integer',
					'minimum'  => 1,
					'required' => true,
				),
				'state'   => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
				),
				'source'  => array(
					'type'              => 'string',
					'default'           => 'manual',
					'sanitize_callback' => 'sanitize_key',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_register_post_state_routes' );

/**
 * Get structured post-state data.
 *
 * @param int $post_id Post ID.
 * @return array{slug:string,label:string}
 */
function p2026_get_post_state_data( $post_id ) {
	$slug = p2026_get_post_state_slug( $post_id );
	$term = get_term_by( 'slug', $slug, P2026_POST_STATE_TAXONOMY );

	return array(
		'slug'  => $slug,
		'label' => $term instanceof WP_Term ? $term->name : ucfirst( $slug ),
	);
}

/**
 * Get post-state slug for a post (defaults to normal).
 *
 * @param int $post_id Post ID.
 * @return string
 */
function p2026_get_post_state_slug( $post_id ) {
	$terms = wp_get_object_terms(
		(int) $post_id,
		P2026_POST_STATE_TAXONOMY,
		array( 'fields' => 'slugs' )
	);

	if ( is_wp_error( $terms ) || empty( $terms ) ) {
		return 'normal';
	}

	$slug = sanitize_key( (string) $terms[0] );
	return in_array( $slug, p2026_get_post_state_slugs(), true ) ? $slug : 'normal';
}

/**
 * Set post state by slug.
 *
 * @param int    $post_id Post ID.
 * @param string $slug    Target state slug.
 * @return true|WP_Error
 */
function p2026_set_post_state_slug( $post_id, $slug ) {
	$slug = sanitize_key( (string) $slug );
	if ( ! in_array( $slug, p2026_get_post_state_slugs(), true ) ) {
		return new WP_Error(
			'p2026_invalid_post_state',
			__( 'Invalid post state.', 'p2026' ),
			array( 'status' => 400 )
		);
	}

	$term = get_term_by( 'slug', $slug, P2026_POST_STATE_TAXONOMY );
	if ( ! $term instanceof WP_Term ) {
		return new WP_Error(
			'p2026_missing_post_state_term',
			__( 'Post state term does not exist.', 'p2026' ),
			array( 'status' => 500 )
		);
	}

	$result = wp_set_object_terms( (int) $post_id, array( (int) $term->term_id ), P2026_POST_STATE_TAXONOMY, false );
	if ( is_wp_error( $result ) ) {
		return $result;
	}

	return true;
}

/**
 * Return next state in carousel order.
 *
 * @param string $current Current state slug.
 * @return string
 */
function p2026_get_next_post_state_slug( $current ) {
	$states = p2026_get_post_state_slugs();
	$index  = array_search( sanitize_key( (string) $current ), $states, true );
	if ( false === $index ) {
		return 'unresolved';
	}
	return $states[ ( $index + 1 ) % count( $states ) ];
}

/**
 * Emit post-state and generic audit events.
 *
 * Public hook contract (stable):
 * - `p2026_post_state_changed( $post_id, $old_state, $new_state, $actor_id, $source, $context )`
 * - `p2026_audit_log_event( $event_type, $payload )`
 *
 * @param int    $post_id   Post ID.
 * @param string $old_state Previous state slug.
 * @param string $new_state New state slug.
 * @param string $source    Source key (manual|auto_todo|api|etc).
 * @param array  $context   Additional metadata.
 */
function p2026_emit_post_state_audit_event( $post_id, $old_state, $new_state, $source, $context = array() ) {
	$payload = array(
		'version'   => P2026_AUDIT_EVENT_VERSION,
		'post_id'   => (int) $post_id,
		'old_state' => $old_state,
		'new_state' => $new_state,
		'actor_id'  => get_current_user_id(),
		'timestamp' => current_time( 'c' ),
		'source'    => sanitize_key( (string) $source ),
		'context'   => is_array( $context ) ? $context : array(),
	);

	do_action( 'p2026_post_state_changed', (int) $post_id, $old_state, $new_state, (int) $payload['actor_id'], $payload['source'], $payload['context'] );
	do_action( 'p2026_audit_log_event', 'post_state_changed', $payload );
}

/**
 * REST callback: cycle or set post state.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function p2026_update_post_state_rest( $request ) {
	$post_id = (int) $request['post_id'];
	$post    = get_post( $post_id );
	if ( ! $post || 'post' !== $post->post_type ) {
		return new WP_Error(
			'p2026_post_not_found',
			__( 'Post not found.', 'p2026' ),
			array( 'status' => 404 )
		);
	}

	$old_state    = p2026_get_post_state_slug( $post_id );
	$requested    = sanitize_key( (string) ( $request['state'] ?? '' ) );
	$target_state = $requested ? $requested : p2026_get_next_post_state_slug( $old_state );
	$source       = sanitize_key( (string) ( $request['source'] ?? 'manual' ) );

	$result = p2026_set_post_state_slug( $post_id, $target_state );
	if ( is_wp_error( $result ) ) {
		return $result;
	}

	if ( $old_state !== $target_state ) {
		p2026_emit_post_state_audit_event(
			$post_id,
			$old_state,
			$target_state,
			$source,
			array( 'transport' => 'rest' )
		);
	}

	return rest_ensure_response(
		array(
			'postId'     => $post_id,
			'changed'    => $old_state !== $target_state,
			'p2026State' => p2026_get_post_state_data( $post_id ),
		)
	);
}

/**
 * Auto-assign post state on create.
 *
 * Posts containing #todo are initialized as unresolved.
 * Other posts default to normal.
 *
 * @param WP_Post         $post     Post object.
 * @param WP_REST_Request $request  Request object.
 * @param bool            $creating Whether this is a create operation.
 */
function p2026_set_initial_post_state( $post, $request, $creating ) {
	if ( ! $creating || 'post' !== $post->post_type ) {
		return;
	}

	$current = p2026_get_post_state_slug( $post->ID );

	$content = '';
	if ( isset( $request['content'] ) ) {
		if ( is_array( $request['content'] ) ) {
			$content = (string) ( $request['content']['raw'] ?? $request['content']['rendered'] ?? '' );
		} else {
			$content = (string) $request['content'];
		}
	}
	if ( '' === $content ) {
		$content = (string) $post->post_content;
	}

	// Detect #todo as a standalone hashtag: must not be preceded by a word
	// character or slash (URL fragment), and must end at a word boundary.
	// Mirrors the negative-lookbehind approach used in the mentions module.
	$target = preg_match( '/(?<![a-zA-Z0-9\/_])#todo\b/i', wp_strip_all_tags( $content ) ) ? 'unresolved' : 'normal';

	$result = p2026_set_post_state_slug( $post->ID, $target );
	if ( is_wp_error( $result ) ) {
		return;
	}

	if ( $current !== $target ) {
		p2026_emit_post_state_audit_event(
			$post->ID,
			$current,
			$target,
			'auto_todo',
			array( 'transport' => 'rest_create' )
		);
	}
}
add_action( 'rest_insert_post', 'p2026_set_initial_post_state', 10, 3 );
