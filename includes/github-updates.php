<?php
/**
 * GitHub updater integration for P2026.
 *
 * @package P2026
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read the Update URI value from this plugin's header.
 *
 * @return string
 */
function p2026_get_update_uri_from_header() {
	$plugin_data = get_file_data(
		P2026_DIR . 'p2026.php',
		array(
			'UpdateURI' => 'Update URI',
		)
	);

	return isset( $plugin_data['UpdateURI'] ) && is_string( $plugin_data['UpdateURI'] )
		? trim( $plugin_data['UpdateURI'] )
		: '';
}

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

	$plugin_file = plugin_basename( P2026_DIR . 'p2026.php' );
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
	$our_plugin_file = plugin_basename( P2026_DIR . 'p2026.php' );
	if ( $our_plugin_file !== $plugin_file ) {
		return $update;
	}

	$update_uri = isset( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : p2026_get_update_uri_from_header();
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

	$plugin_file = plugin_basename( P2026_DIR . 'p2026.php' );
	$file_path   = P2026_DIR . 'p2026.php';
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

	$update_uri = ! empty( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : p2026_get_update_uri_from_header();
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

	$plugin_file = plugin_basename( P2026_DIR . 'p2026.php' );
	$slug        = dirname( $plugin_file );
	if ( $slug !== $args->slug ) {
		return $result;
	}

	$plugin_data = get_file_data(
		P2026_DIR . 'p2026.php',
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

	$update_uri = ! empty( $plugin_data['UpdateURI'] ) ? (string) $plugin_data['UpdateURI'] : p2026_get_update_uri_from_header();
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
