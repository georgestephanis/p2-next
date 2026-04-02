<?php
/**
 * Plugin Name: P2026
 * Plugin URI:  https://github.com/georgestephanis/p2026
 * Update URI:  https://github.com/georgestephanis/p2026
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
define( 'P2026_UPDATE_URI', 'https://github.com/georgestephanis/p2026' );

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
 * Discover all available p2026 modules by scanning the modules directory.
 *
 * @return array Associative array of module slug => module dir path.
 */
function p2026_discover_modules() {
	$modules = glob( P2026_DIR . 'modules/*/index.php' );
	if ( ! $modules ) {
		return array();
	}
	$discovered = array();
	foreach ( $modules as $module_file ) {
		$slug                = basename( dirname( $module_file ) );
		$discovered[ $slug ] = dirname( $module_file );
	}
	return $discovered;
}

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
	$is_archive_view    = is_home() || is_front_page() || is_archive() || is_search();

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
				'isArchiveView'    => $is_archive_view,
				'debugTelemetry'   => $debug_telemetry,
				'currentUser'      => $user_data,
				'canCreatePosts'   => $can_publish,
				'canUpdatePosts'   => $can_update_posts,
				'canComment'       => $can_comment,
				'requireNameEmail' => $require_name_email,
				'threadDepth'      => (int) get_option( 'thread_comments_depth', 5 ),
				'activeModules'    => array_values( array_diff( array_keys( p2026_discover_modules() ), p2026_get_disabled_modules() ) ),
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

/**
 * Parse a GitHub owner/repo tuple from an Update URI value.
 *
 * @param string $update_uri Update URI header value.
 * @return array{owner: string, repo: string}|null
 */
function p2026_parse_github_repo_from_update_uri( $update_uri ) {
	if ( ! is_string( $update_uri ) || '' === $update_uri ) {
		return null;
	}

	$parts = wp_parse_url( $update_uri );
	if ( ! is_array( $parts ) || empty( $parts['host'] ) || 'github.com' !== strtolower( (string) $parts['host'] ) ) {
		return null;
	}

	$path = isset( $parts['path'] ) ? trim( (string) $parts['path'], '/' ) : '';
	if ( '' === $path ) {
		return null;
	}

	$segments = array_values( array_filter( explode( '/', $path ) ) );
	if ( count( $segments ) < 2 ) {
		return null;
	}

	return array(
		'owner' => sanitize_key( $segments[0] ),
		'repo'  => sanitize_key( preg_replace( '/\.git$/i', '', $segments[1] ) ),
	);
}

/**
 * Fetch the remote update offerings manifest from GitHub contents API.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @return array<string, mixed>|null
 */
function p2026_get_remote_update_manifest( $owner, $repo ) {
	$cache_key = 'p2026_update_manifest_' . md5( $owner . '/' . $repo );
	$cached    = get_site_transient( $cache_key );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$response = wp_remote_get(
		sprintf( 'https://api.github.com/repos/%1$s/%2$s/contents/.github/update-offerings.json', rawurlencode( $owner ), rawurlencode( $repo ) ),
		array(
			'timeout' => 10,
		)
	);

	if ( is_wp_error( $response ) ) {
		return null;
	}

	$code = wp_remote_retrieve_response_code( $response );
	if ( 200 !== (int) $code ) {
		return null;
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $body ) || empty( $body['download_url'] ) || ! is_string( $body['download_url'] ) ) {
		return null;
	}

	$manifest_response = wp_remote_get(
		$body['download_url'],
		array(
			'timeout' => 10,
		)
	);
	if ( is_wp_error( $manifest_response ) ) {
		return null;
	}

	if ( 200 !== (int) wp_remote_retrieve_response_code( $manifest_response ) ) {
		return null;
	}

	$manifest = json_decode( wp_remote_retrieve_body( $manifest_response ), true );
	if ( ! is_array( $manifest ) ) {
		return null;
	}

	set_site_transient( $cache_key, $manifest, 30 * MINUTE_IN_SECONDS );

	return $manifest;
}

/**
 * Build a normalized update payload object from manifest data.
 *
 * @param string $plugin_file Plugin basename.
 * @param array  $plugin_data Plugin headers.
 * @param array  $latest      Latest manifest payload.
 * @param string $update_uri  Update URI value.
 * @return stdClass|null
 */
function p2026_build_update_payload( $plugin_file, $plugin_data, $latest, $update_uri ) {
	if ( ! is_array( $latest ) ) {
		return null;
	}

	$latest_version = '';
	if ( isset( $latest['wordpress_update']['new_version'] ) && is_string( $latest['wordpress_update']['new_version'] ) ) {
		$latest_version = $latest['wordpress_update']['new_version'];
	} elseif ( isset( $latest['version'] ) && is_string( $latest['version'] ) ) {
		$latest_version = $latest['version'];
	}

	if ( '' === $latest_version ) {
		return null;
	}

	$package = '';
	if ( isset( $latest['wordpress_update']['package'] ) && is_string( $latest['wordpress_update']['package'] ) ) {
		$package = $latest['wordpress_update']['package'];
	} elseif ( isset( $latest['package'] ) && is_string( $latest['package'] ) ) {
		$package = $latest['package'];
	}

	if ( '' === $package ) {
		return null;
	}

	$payload              = new stdClass();
	$payload->id          = $update_uri;
	$payload->slug        = dirname( $plugin_file );
	$payload->plugin      = $plugin_file;
	$payload->new_version = $latest_version;
	$payload->url         = isset( $latest['release_url'] ) && is_string( $latest['release_url'] )
		? $latest['release_url']
		: $update_uri;
	$payload->package     = $package;

	if ( isset( $latest['wordpress_update']['requires'] ) && is_string( $latest['wordpress_update']['requires'] ) && '' !== $latest['wordpress_update']['requires'] ) {
		$payload->requires = $latest['wordpress_update']['requires'];
	} elseif ( isset( $plugin_data['Requires'] ) && is_string( $plugin_data['Requires'] ) && '' !== $plugin_data['Requires'] ) {
		$payload->requires = $plugin_data['Requires'];
	}

	if ( isset( $latest['wordpress_update']['requires_php'] ) && is_string( $latest['wordpress_update']['requires_php'] ) && '' !== $latest['wordpress_update']['requires_php'] ) {
		$payload->requires_php = $latest['wordpress_update']['requires_php'];
	} elseif ( isset( $plugin_data['RequiresPHP'] ) && is_string( $plugin_data['RequiresPHP'] ) && '' !== $plugin_data['RequiresPHP'] ) {
		$payload->requires_php = $plugin_data['RequiresPHP'];
	}

	if ( isset( $latest['wordpress_update']['tested'] ) && is_string( $latest['wordpress_update']['tested'] ) && '' !== $latest['wordpress_update']['tested'] ) {
		$payload->tested = $latest['wordpress_update']['tested'];
	} elseif ( isset( $plugin_data['Tested'] ) && is_string( $plugin_data['Tested'] ) && '' !== $plugin_data['Tested'] ) {
		$payload->tested = $plugin_data['Tested'];
	}

	return $payload;
}

/**
 * Ensure zip extraction folder is renamed to expected plugin slug on updates.
 *
 * @param string|WP_Error $source        Source path.
 * @param string          $remote_source Remote path.
 * @param WP_Upgrader     $upgrader      Upgrader object.
 * @param array           $hook_extra    Hook context.
 * @return string|WP_Error
 */
function p2026_upgrader_source_selection( $source, $remote_source, $upgrader, $hook_extra = array() ) {
	global $wp_filesystem;

	if ( is_wp_error( $source ) ) {
		return $source;
	}

	if ( isset( $hook_extra['action'] ) && 'install' === $hook_extra['action'] ) {
		return $source;
	}

	if ( ! $upgrader instanceof Plugin_Upgrader ) {
		return $source;
	}

	$plugin_file = plugin_basename( __FILE__ );
	if ( empty( $hook_extra['plugin'] ) || $plugin_file !== $hook_extra['plugin'] ) {
		return $source;
	}

	$slug       = dirname( $plugin_file );
	$new_source = trailingslashit( $remote_source ) . $slug;

	if ( basename( $source ) === $slug ) {
		return $source;
	}

	if ( trailingslashit( strtolower( $source ) ) !== trailingslashit( strtolower( $new_source ) )
		&& is_object( $wp_filesystem )
		&& method_exists( $wp_filesystem, 'move' )
	) {
		$wp_filesystem->move( $source, $new_source, true );
	}

	return trailingslashit( $new_source );
}
add_filter( 'upgrader_source_selection', 'p2026_upgrader_source_selection', 10, 4 );

/**
 * Supply update metadata for this plugin via the Update URI host filter.
 *
 * @param false|array|object $update      Existing update payload.
 * @param array              $plugin_data Current plugin headers.
 * @param string             $plugin_file Plugin basename.
 * @param string[]           $locales     Installed locales.
 * @return false|object
 */
function p2026_filter_github_plugin_update( $update, $plugin_data, $plugin_file, $locales ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	$our_plugin_file = plugin_basename( __FILE__ );
	if ( $our_plugin_file !== $plugin_file ) {
		return $update;
	}

	$update_uri = isset( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : P2026_UPDATE_URI;
	$repo       = p2026_parse_github_repo_from_update_uri( $update_uri );
	if ( ! is_array( $repo ) || empty( $repo['owner'] ) || empty( $repo['repo'] ) ) {
		return $update;
	}

	$manifest = p2026_get_remote_update_manifest( $repo['owner'], $repo['repo'] );
	if ( ! is_array( $manifest ) || empty( $manifest['latest'] ) || ! is_array( $manifest['latest'] ) ) {
		return $update;
	}

	$update_data = p2026_build_update_payload( $our_plugin_file, $plugin_data, $manifest['latest'], $update_uri );
	if ( ! $update_data instanceof stdClass ) {
		return $update;
	}

	$current_version = isset( $plugin_data['Version'] ) ? (string) $plugin_data['Version'] : '';
	if ( '' === $current_version || ! version_compare( $update_data->new_version, $current_version, '>' ) ) {
		return $update;
	}

	return $update_data;
}
add_filter( 'update_plugins_github.com', 'p2026_filter_github_plugin_update', 10, 4 );

/**
 * Populate response/no_update entries for better plugin list update UX.
 *
 * @param stdClass $transient Update transient.
 * @return stdClass
 */
function p2026_enrich_update_plugins_transient( $transient ) {
	if ( ! is_object( $transient ) ) {
		$transient = new stdClass();
	}

	$plugin_file = plugin_basename( __FILE__ );
	$file_path   = P2026_DIR . basename( __FILE__ );
	$plugin_data = get_file_data(
		$file_path,
		array(
			'Name'        => 'Plugin Name',
			'Version'     => 'Version',
			'UpdateURI'   => 'Update URI',
			'PluginURI'   => 'Plugin URI',
			'Requires'    => 'Requires at least',
			'RequiresPHP' => 'Requires PHP',
			'Tested'      => 'Tested up to',
		)
	);

	$update_uri = ! empty( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : P2026_UPDATE_URI;
	$repo       = p2026_parse_github_repo_from_update_uri( $update_uri );
	if ( ! is_array( $repo ) || empty( $repo['owner'] ) || empty( $repo['repo'] ) ) {
		return $transient;
	}

	$manifest = p2026_get_remote_update_manifest( $repo['owner'], $repo['repo'] );
	if ( ! is_array( $manifest ) || empty( $manifest['latest'] ) || ! is_array( $manifest['latest'] ) ) {
		return $transient;
	}

	$payload = p2026_build_update_payload( $plugin_file, $plugin_data, $manifest['latest'], $update_uri );
	if ( ! $payload instanceof stdClass ) {
		return $transient;
	}

	if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
		$transient->response = array();
	}
	if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
		$transient->no_update = array();
	}

	$current_version = isset( $plugin_data['Version'] ) ? (string) $plugin_data['Version'] : P2026_VERSION;
	if ( version_compare( $payload->new_version, $current_version, '>' ) ) {
		$transient->response[ $plugin_file ] = $payload;
		unset( $transient->no_update[ $plugin_file ] );
	} else {
		$transient->no_update[ $plugin_file ] = $payload;
		unset( $transient->response[ $plugin_file ] );
	}

	return $transient;
}
add_filter( 'site_transient_update_plugins', 'p2026_enrich_update_plugins_transient', 20, 1 );

/**
 * Provide plugin details modal data from manifest payload.
 *
 * @param false|object|array $result Existing result.
 * @param string             $action Requested action.
 * @param object             $args   Request args.
 * @return false|object|array
 */
function p2026_plugin_api_details( $result, $action, $args ) {
	if ( 'plugin_information' !== $action || ! is_object( $args ) || empty( $args->slug ) ) {
		return $result;
	}

	$plugin_file = plugin_basename( __FILE__ );
	$slug        = dirname( $plugin_file );
	if ( $slug !== $args->slug ) {
		return $result;
	}

	$plugin_data = get_file_data(
		P2026_DIR . basename( __FILE__ ),
		array(
			'Name'        => 'Plugin Name',
			'Version'     => 'Version',
			'UpdateURI'   => 'Update URI',
			'PluginURI'   => 'Plugin URI',
			'Author'      => 'Author',
			'Description' => 'Description',
			'Requires'    => 'Requires at least',
			'RequiresPHP' => 'Requires PHP',
			'Tested'      => 'Tested up to',
		)
	);

	$update_uri = ! empty( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : P2026_UPDATE_URI;
	$repo       = p2026_parse_github_repo_from_update_uri( $update_uri );
	if ( ! is_array( $repo ) || empty( $repo['owner'] ) || empty( $repo['repo'] ) ) {
		return $result;
	}

	$manifest = p2026_get_remote_update_manifest( $repo['owner'], $repo['repo'] );
	if ( ! is_array( $manifest ) || empty( $manifest['latest'] ) || ! is_array( $manifest['latest'] ) ) {
		return $result;
	}

	$payload = p2026_build_update_payload( $plugin_file, $plugin_data, $manifest['latest'], $update_uri );
	if ( ! $payload instanceof stdClass ) {
		return $result;
	}

	$info                = new stdClass();
	$info->name          = ! empty( $plugin_data['Name'] ) ? $plugin_data['Name'] : 'P2026';
	$info->slug          = $slug;
	$info->version       = $payload->new_version;
	$info->author        = ! empty( $plugin_data['Author'] ) ? $plugin_data['Author'] : '';
	$info->homepage      = ! empty( $plugin_data['PluginURI'] ) ? $plugin_data['PluginURI'] : $update_uri;
	$info->download_link = $payload->package;
	$info->requires      = isset( $payload->requires ) ? $payload->requires : ( $plugin_data['Requires'] ?? '' );
	$info->requires_php  = isset( $payload->requires_php ) ? $payload->requires_php : ( $plugin_data['RequiresPHP'] ?? '' );
	$info->tested        = isset( $payload->tested ) ? $payload->tested : ( $plugin_data['Tested'] ?? '' );
	$info->last_updated  = isset( $manifest['latest']['published_at'] ) && is_string( $manifest['latest']['published_at'] )
		? $manifest['latest']['published_at']
		: '';
	$info->sections      = array(
		'description' => ! empty( $plugin_data['Description'] ) ? $plugin_data['Description'] : '',
		'changelog'   => isset( $manifest['latest']['body'] ) && is_string( $manifest['latest']['body'] )
			? wp_kses_post( wpautop( $manifest['latest']['body'] ) )
			: '',
	);

	return $info;
}
add_filter( 'plugins_api', 'p2026_plugin_api_details', 20, 3 );



// ---------------------------------------------------------------------------
// Core feature APIs (REST endpoints and backend logic).
// ---------------------------------------------------------------------------

// Search API — unified search across posts and comments.
require_once P2026_DIR . 'includes/api/search.php';

// Read/Unread state tracking — per-user last activity and unread counts.
require_once P2026_DIR . 'includes/api/read-state.php';

// ---------------------------------------------------------------------------
// Modules — self-contained feature extensions loaded from modules/*/index.php.
// ---------------------------------------------------------------------------


/**
 * Return the list of explicitly disabled module slugs.
 *
 * An empty array (or unset option) means all discovered modules are active.
 * Modules are active by default; only slugs in this list are inactive.
 *
 * @return string[]
 */
function p2026_get_disabled_modules() {
	$stored = get_option( 'p2026_disabled_modules', null );
	return is_array( $stored ) ? $stored : array();
}

/**
 * Whether a given module slug is currently active.
 *
 * A module is active unless its slug appears in the explicit deny list
 * (p2026_disabled_modules option). New modules default to active.
 *
 * @param string $slug Module directory slug.
 * @return bool
 */
function p2026_is_module_active( $slug ) {
	return ! in_array( $slug, p2026_get_disabled_modules(), true );
}

// Load each module whose slug is in the active list (all by default).
$modules = glob( P2026_DIR . 'modules/*/index.php' );
if ( ! $modules ) {
	$modules = array();
}
foreach ( $modules as $p2026_module ) {
	if ( p2026_is_module_active( basename( dirname( $p2026_module ) ) ) ) {
		require_once $p2026_module;
	}
}
unset( $p2026_module );

/**
 * Migrate from the legacy opt-in (p2026_active_modules) schema to the
 * current opt-out (p2026_disabled_modules) schema.
 *
 * On first run after upgrade the old allow-list is deleted and an empty
 * deny-list is written, making all discovered modules active. Any module
 * the admin had previously disabled will need to be re-toggled off via the
 * settings page — a one-time inconvenience in exchange for correct
 * default-active behaviour for newly added modules.
 */
function p2026_migrate_module_activation_schema() {
	if ( null !== get_option( 'p2026_disabled_modules', null ) ) {
		return; // Already on the new schema.
	}
	if ( null !== get_option( 'p2026_active_modules', null ) ) {
		delete_option( 'p2026_active_modules' );
	}
	update_option( 'p2026_disabled_modules', array() );
}
add_action( 'init', 'p2026_migrate_module_activation_schema', 1 );
// Admin settings page (menu registration, module management UI).
if ( is_admin() ) {
	require_once P2026_DIR . 'admin/settings.php';
}
