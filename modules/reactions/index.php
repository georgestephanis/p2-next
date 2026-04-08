<?php
/**
 * P2026 Module: Reactions
 *
 * Module Name:        Reactions
 * Module Description: Emoji reactions for posts and comments with configurable emoji set.
 * Module Version:     0.1.0
 *
 * Provides emoji reactions using a custom comment type, with administrative configuration
 * for single emoji, curated emoji subset, or any emoji support.
 *
 * @package P2026\Modules\Reactions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const P2026_REACTION_COMMENT_TYPE = 'p2026_reaction';
const P2026_REACTIONS_OPTION      = 'p2026_reactions_config';

/**
 * Register the custom comment type for reactions.
 *
 * Reactions are stored as comments with a custom type, allowing us to leverage
 * WordPress's existing comment storage and REST API while keeping reactions
 * semantically distinct from regular comments.
 */
function p2026_reactions_register_comment_type() {
	// Register custom comment type.
	add_filter(
		'get_comments_number_text',
		'p2026_reactions_filter_comment_count',
		10,
		3
	);
}
add_action( 'init', 'p2026_reactions_register_comment_type' );

/**
 * Get reactions configuration.
 *
 * @return array {
 *   'mode'  => 'single' | 'curated' | 'any',
 *   'emoji' => array (for single/curated modes, the list of allowed emoji)
 * }
 */
function p2026_reactions_get_config() {
	$default = array(
		'mode'  => 'single',
		'emoji' => array( '👍' ),
	);

	$config = get_option( P2026_REACTIONS_OPTION );
	if ( ! is_array( $config ) ) {
		return $default;
	}

	$config['mode'] = isset( $config['mode'] ) && in_array( $config['mode'], array( 'single', 'curated', 'any' ), true )
		? $config['mode']
		: 'single';

	if ( isset( $config['emoji'] ) && is_array( $config['emoji'] ) ) {
		$config['emoji'] = array_filter(
			array_map( 'sanitize_text_field', $config['emoji'] ),
			fn ( $e ) => ! empty( $e ) && mb_strlen( $e ) <= 5
		);
	} else {
		$config['emoji'] = $default['emoji'];
	}

	return $config;
}

/**
 * Create or update a reaction.
 *
 * @param int    $post_or_comment_id The post or comment ID being reacted to.
 * @param string $emoji             The emoji character being used.
 * @param int    $user_id           The user ID adding the reaction (0 for anonymous).
 * @param string $target_type       'post' or 'comment'.
 * @return int|false Comment ID on success, false on failure.
 */
function p2026_reactions_add(
	$post_or_comment_id,
	$emoji,
	$user_id = 0,
	$target_type = 'post'
) {
	// Validate inputs.
	$post_or_comment_id = (int) $post_or_comment_id;
	$user_id            = (int) $user_id;
	$emoji              = sanitize_text_field( $emoji );
	$target_type        = in_array( $target_type, array( 'post', 'comment' ), true )
		? $target_type
		: 'post';

	if ( ! $post_or_comment_id || empty( $emoji ) ) {
		return false;
	}

	// Check if user is allowed to react.
	if ( ! $user_id && ! is_user_logged_in() ) {
		$require_name_email = (bool) get_option( 'require_name_email' );
		if ( $require_name_email ) {
			return false;
		}
	}

	// Verify emoji is allowed.
	$config = p2026_reactions_get_config();
	if ( 'any' !== $config['mode'] && ! in_array( $emoji, $config['emoji'], true ) ) {
		return false;
	}

	// Check for existing reaction by this user on this object.
	$existing = p2026_reactions_get_user_reaction(
		$post_or_comment_id,
		$emoji,
		$user_id,
		$target_type
	);

	if ( $existing ) {
		return $existing->comment_ID;
	}

	// Create new reaction comment.
	$comment_id = wp_insert_comment(
		array(
			'comment_post_ID'  => 'post' === $target_type ? $post_or_comment_id : get_comment_post_id( $post_or_comment_id ),
			'comment_parent'   => 'comment' === $target_type ? $post_or_comment_id : 0,
			'comment_type'     => P2026_REACTION_COMMENT_TYPE,
			'comment_content'  => $emoji,
			'user_id'          => $user_id,
			'comment_date_gmt' => current_time( 'mysql', true ),
			'comment_approved' => 1,
			'comment_agent'    => 'p2026-reactions',
		)
	);

	if ( $comment_id ) {
		update_comment_meta( $comment_id, 'p2026_reaction_target_type', $target_type );
	}

	return $comment_id ? $comment_id : false;
}

/**
 * Remove a reaction.
 *
 * @param int    $post_or_comment_id The post or comment ID reacted to.
 * @param string $emoji             The emoji character.
 * @param int    $user_id           The user ID (0 for anonymous).
 * @param string $target_type       'post' or 'comment'.
 * @return bool True if removed, false otherwise.
 */
function p2026_reactions_remove(
	$post_or_comment_id,
	$emoji,
	$user_id = 0,
	$target_type = 'post'
) {
	$reaction = p2026_reactions_get_user_reaction(
		$post_or_comment_id,
		$emoji,
		$user_id,
		$target_type
	);

	if ( ! $reaction ) {
		return false;
	}

	wp_delete_comment( $reaction->comment_ID, true );
	return true;
}

/**
 * Get a user's reaction on a post or comment.
 *
 * @param int    $post_or_comment_id The post or comment ID.
 * @param string $emoji             The emoji character.
 * @param int    $user_id           The user ID (0 for anonymous).
 * @param string $target_type       'post' or 'comment'.
 * @return WP_Comment|null
 */
function p2026_reactions_get_user_reaction(
	$post_or_comment_id,
	$emoji,
	$user_id = 0,
	$target_type = 'post'
) {
	global $wpdb;

	if ( 'comment' === $target_type ) {
		$comment_parent = $post_or_comment_id;
		$post_id        = (int) get_comment_post_id( $post_or_comment_id );
	} else {
		$comment_parent = 0;
		$post_id        = (int) $post_or_comment_id;
	}

	$comment = $wpdb->get_row(
		$wpdb->prepare(
			"SELECT * FROM {$wpdb->comments}
			WHERE comment_post_ID = %d
			AND comment_parent = %d
			AND comment_type = %s
			AND comment_content = %s
			AND user_id = %d
			LIMIT 1",
			$post_id,
			$comment_parent,
			P2026_REACTION_COMMENT_TYPE,
			$emoji,
			$user_id
		)
	);

	return $comment ? new WP_Comment( $comment ) : null;
}

/**
 * Get all reactions for a post or comment, grouped by emoji.
 *
 * @param int    $post_or_comment_id The post or comment ID.
 * @param string $target_type       'post' or 'comment'.
 * @return array<string, array> Emoji => array of comment objects.
 */
function p2026_reactions_get_for_object( $post_or_comment_id, $target_type = 'post' ) {
	global $wpdb;

	if ( 'comment' === $target_type ) {
		$comment_parent = $post_or_comment_id;
		$post_id        = (int) get_comment_post_id( $post_or_comment_id );
	} else {
		$comment_parent = 0;
		$post_id        = (int) $post_or_comment_id;
	}

	$reactions = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT * FROM {$wpdb->comments}
			WHERE comment_post_ID = %d
			AND comment_parent = %d
			AND comment_type = %s
			ORDER BY comment_date_gmt ASC",
			$post_id,
			$comment_parent,
			P2026_REACTION_COMMENT_TYPE
		)
	);

	$grouped = array();
	foreach ( $reactions as $reaction ) {
		$emoji = $reaction->comment_content;
		if ( ! isset( $grouped[ $emoji ] ) ) {
			$grouped[ $emoji ] = array();
		}
		$grouped[ $emoji ][] = new WP_Comment( $reaction );
	}

	return $grouped;
}

/**
 * Get aggregate reaction counts for a post or comment.
 *
 * @param int    $post_or_comment_id The post or comment ID.
 * @param string $target_type       'post' or 'comment'.
 * @return array<string, int> Emoji => count.
 */
function p2026_reactions_count( $post_or_comment_id, $target_type = 'post' ) {
	$grouped = p2026_reactions_get_for_object( $post_or_comment_id, $target_type );
	return array_map( 'count', $grouped );
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

/**
 * Register REST routes for reactions.
 */
function p2026_reactions_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/reactions',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'p2026_reactions_rest_add',
			'permission_callback' => 'p2026_can_create_reactions',
			'args'                => array(
				'object_id'   => array(
					'type'              => 'integer',
					'required'          => true,
					'sanitize_callback' => 'absint',
				),
				'object_type' => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_key',
					'enum'              => array( 'post', 'comment' ),
				),
				'emoji'       => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);

	register_rest_route(
		'p2026/v1',
		'/reactions',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_reactions_rest_get',
			'permission_callback' => '__return_true',
			'args'                => array(
				'object_id'   => array(
					'type'              => 'integer',
					'required'          => true,
					'sanitize_callback' => 'absint',
				),
				'object_type' => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_key',
					'enum'              => array( 'post', 'comment' ),
				),
			),
		)
	);

	register_rest_route(
		'p2026/v1',
		'/reactions',
		array(
			'methods'             => WP_REST_Server::DELETABLE,
			'callback'            => 'p2026_reactions_rest_remove',
			'permission_callback' => 'p2026_can_remove_reactions',
			'args'                => array(
				'object_id'   => array(
					'type'              => 'integer',
					'required'          => true,
					'sanitize_callback' => 'absint',
				),
				'object_type' => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_key',
					'enum'              => array( 'post', 'comment' ),
				),
				'emoji'       => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_reactions_register_routes' );

/**
 * REST callback: Add a reaction.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response|WP_Error
 */
function p2026_reactions_rest_add( WP_REST_Request $request ) {
	$user_id     = get_current_user_id();
	$object_id   = $request->get_param( 'object_id' );
	$object_type = $request->get_param( 'object_type' );
	$emoji       = $request->get_param( 'emoji' );
	$post_id     = 'post' === $object_type ? $object_id : (int) get_comment_post_id( $object_id );

	// Check permission via Abilities API (or fallback).
	if ( ! p2026_can_create_reactions( $post_id ) ) {
		return new WP_Error(
			'p2026_reaction_forbidden',
			__( 'You are not allowed to add reactions.', 'p2026' ),
			array( 'status' => 403 )
		);
	}

	$comment_id = p2026_reactions_add(
		$object_id,
		$emoji,
		$user_id,
		$object_type
	);

	if ( ! $comment_id ) {
		return new WP_Error(
			'p2026_reaction_failed',
			__( 'Unable to add reaction.', 'p2026' ),
			array( 'status' => 400 )
		);
	}

	return rest_ensure_response(
		array(
			'success'    => true,
			'comment_id' => $comment_id,
		)
	);
}

/**
 * REST callback: Get reactions for an object.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response
 */
function p2026_reactions_rest_get( WP_REST_Request $request ) {
	$object_id   = $request->get_param( 'object_id' );
	$object_type = $request->get_param( 'object_type' );

	$reactions = p2026_reactions_get_for_object( $object_id, $object_type );
	$counts    = p2026_reactions_count( $object_id, $object_type );

	// Transform reactions to include user info.
	$formatted = array();
	foreach ( $reactions as $emoji => $comments ) {
		$formatted[ $emoji ] = array(
			'emoji' => $emoji,
			'count' => count( $comments ),
			'users' => array_map(
				fn ( $c ) => array(
					'id'   => (int) $c->user_id,
					'name' => $c->comment_author,
					'url'  => $c->comment_author_url,
				),
				$comments
			),
		);
	}

	return rest_ensure_response( $formatted );
}

/**
 * REST callback: Remove a reaction.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response|WP_Error
 */
function p2026_reactions_rest_remove( WP_REST_Request $request ) {
	$user_id     = get_current_user_id();
	$object_id   = $request->get_param( 'object_id' );
	$object_type = $request->get_param( 'object_type' );
	$emoji       = $request->get_param( 'emoji' );

	// Check permission via Abilities API (or fallback).
	if ( ! p2026_can_remove_reactions() ) {
		return new WP_Error(
			'p2026_reaction_forbidden',
			__( 'You are not allowed to remove reactions.', 'p2026' ),
			array( 'status' => 403 )
		);
	}

	// Verify user owns this reaction.
	$reaction = p2026_reactions_get_user_reaction(
		$object_id,
		$emoji,
		$user_id,
		$object_type
	);

	if ( ! $reaction ) {
		return new WP_Error(
			'p2026_reaction_not_found',
			__( 'Reaction not found.', 'p2026' ),
			array( 'status' => 404 )
		);
	}

	$removed = p2026_reactions_remove(
		$object_id,
		$emoji,
		$user_id,
		$object_type
	);

	if ( ! $removed ) {
		return new WP_Error(
			'p2026_reaction_removal_failed',
			__( 'Unable to remove reaction.', 'p2026' ),
			array( 'status' => 400 )
		);
	}

	return rest_ensure_response( array( 'success' => true ) );
}

// ---------------------------------------------------------------------------
// Admin Settings Tab
// ---------------------------------------------------------------------------

/**
 * Register the Reactions settings tab.
 *
 * @param array $tabs Existing tabs.
 * @return array
 */
function p2026_reactions_register_tab( $tabs ) {
	$tabs['reactions'] = __( 'Reactions', 'p2026' );
	return $tabs;
}
add_filter( 'p2026_settings_tabs', 'p2026_reactions_register_tab' );

/**
 * Render the Reactions settings tab.
 */
function p2026_reactions_render_settings_tab() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$config = p2026_reactions_get_config();
	?>
	<div class="p2026-settings-tab p2026-reactions-settings">
		<h2><?php esc_html_e( 'Emoji Reactions Configuration', 'p2026' ); ?></h2>

		<?php wp_nonce_field( 'p2026_reactions_settings', 'p2026_reactions_nonce' ); ?>

		<table class="form-table">
			<tr>
				<th scope="row">
					<label for="p2026-reactions-mode">
						<?php esc_html_e( 'Reaction Mode', 'p2026' ); ?>
					</label>
				</th>
				<td>
					<select id="p2026-reactions-mode" name="p2026_reactions_mode">
						<option value="single" <?php selected( 'single', $config['mode'] ); ?>>
							<?php esc_html_e( 'Single emoji (thumbs up only)', 'p2026' ); ?>
						</option>
						<option value="curated" <?php selected( 'curated', $config['mode'] ); ?>>
							<?php esc_html_e( 'Curated emoji set', 'p2026' ); ?>
						</option>
						<option value="any" <?php selected( 'any', $config['mode'] ); ?>>
							<?php esc_html_e( 'Any emoji allowed', 'p2026' ); ?>
						</option>
					</select>
					<p class="description">
						<?php esc_html_e( 'Choose which emoji reactions are allowed.', 'p2026' ); ?>
					</p>
				</td>
			</tr>

			<tr id="p2026-reactions-emoji-row" style="display: <?php echo 'any' === $config['mode'] ? 'none' : 'table-row'; ?>;">
				<th scope="row">
					<label for="p2026-reactions-emoji">
						<?php esc_html_e( 'Allowed Emoji', 'p2026' ); ?>
					</label>
				</th>
				<td>
					<textarea
						id="p2026-reactions-emoji"
						name="p2026_reactions_emoji"
						rows="3"
						placeholder="👍 ❤️ 🎉 🚀"
						class="large-text code"
					><?php echo esc_textarea( implode( ' ', $config['emoji'] ) ); ?></textarea>
					<p class="description">
						<?php esc_html_e( 'Space-separated emoji characters. Only used in "Single" and "Curated" modes.', 'p2026' ); ?>
					</p>
				</td>
			</tr>
		</table>

		<script type="text/javascript">
			(function() {
				const modeSelect = document.getElementById( 'p2026-reactions-mode' );
				const emojiRow = document.getElementById( 'p2026-reactions-emoji-row' );

				function updateEmojiVisibility() {
					emojiRow.style.display = 'any' === modeSelect.value ? 'none' : 'table-row';
				}

				modeSelect.addEventListener( 'change', updateEmojiVisibility );
			})();
		</script>

		<?php submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings', false ); ?>
	</div>
	<?php
}
add_action( 'p2026_settings_render_tab_reactions', 'p2026_reactions_render_settings_tab' );

/**
 * Handle saving Reactions settings.
 */
function p2026_reactions_save_settings() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Verify nonce for security.
	$nonce = isset( $_POST['p2026_reactions_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['p2026_reactions_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'p2026_reactions_settings' ) ) {
		return;
	}

	$mode = isset( $_POST['p2026_reactions_mode'] ) ? sanitize_key( wp_unslash( $_POST['p2026_reactions_mode'] ) ) : 'single';
	if ( ! in_array( $mode, array( 'single', 'curated', 'any' ), true ) ) {
		$mode = 'single';
	}

	$emoji = array();
	if ( 'any' !== $mode && isset( $_POST['p2026_reactions_emoji'] ) ) {
		$emoji_input = sanitize_text_field( wp_unslash( $_POST['p2026_reactions_emoji'] ) );
		$emoji       = array_filter(
			array_map( 'trim', preg_split( '/\s+/', $emoji_input ) ),
			fn ( $e ) => ! empty( $e ) && mb_strlen( $e ) <= 5
		);
	}

	// Ensure we have default emoji for single mode.
	if ( empty( $emoji ) ) {
		$emoji = array( '👍' );
	}

	$config = array(
		'mode'  => $mode,
		'emoji' => $emoji,
	);

	update_option( P2026_REACTIONS_OPTION, $config );
}
add_action( 'p2026_settings_save_tab_reactions', 'p2026_reactions_save_settings' );
