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
 * Get configured GitHub update channel.
 *
 * @return string
 */
function p2026_github_updates_channel() {
	$channel = get_option( 'p2026_github_updates_channel', '' );
	if ( ! is_string( $channel ) ) {
		$channel = '';
	}

	if ( in_array( $channel, array( 'default', 'prerelease', 'trunk' ), true ) ) {
		return $channel;
	}

	// Backward compatibility for the previous checkbox-based setting.
	return '1' === get_option( 'p2026_github_updates_allow_prerelease', '0' )
		? 'prerelease'
		: 'default';
}

/**
 * Get last installed trunk SHA for a repository.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @return string
 */
function p2026_get_installed_trunk_sha( $owner, $repo ) {
	$all = get_option( 'p2026_github_updates_installed_trunk_sha', array() );
	if ( ! is_array( $all ) ) {
		return '';
	}

	$key = $owner . '/' . $repo;

	return isset( $all[ $key ] ) && is_string( $all[ $key ] )
		? $all[ $key ]
		: '';
}

/**
 * Persist installed trunk SHA for a repository.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @param string $sha   Installed commit SHA.
 * @return void
 */
function p2026_set_installed_trunk_sha( $owner, $repo, $sha ) {
	if ( '' === $sha ) {
		return;
	}

	$all = get_option( 'p2026_github_updates_installed_trunk_sha', array() );
	if ( ! is_array( $all ) ) {
		$all = array();
	}

	$all[ $owner . '/' . $repo ] = $sha;
	update_option( 'p2026_github_updates_installed_trunk_sha', $all );
}

/**
 * Fetch repository metadata from GitHub API.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @return array<string, mixed>|null
 */
function p2026_get_github_repository_meta( $owner, $repo ) {
	$cache_key = 'p2026_github_repo_meta_' . md5( $owner . '/' . $repo );
	$cached    = get_site_transient( $cache_key );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$response = wp_remote_get(
		sprintf( 'https://api.github.com/repos/%1$s/%2$s', rawurlencode( $owner ), rawurlencode( $repo ) ),
		array(
			'timeout' => 10,
		)
	);

	if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		return null;
	}

	$meta = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $meta ) ) {
		return null;
	}

	set_site_transient( $cache_key, $meta, 30 * MINUTE_IN_SECONDS );

	return $meta;
}

/**
 * Fetch default branch HEAD information.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @return array<string, string>|null
 */
function p2026_get_default_branch_head( $owner, $repo ) {
	$cache_key = 'p2026_github_trunk_head_' . md5( $owner . '/' . $repo );
	$cached    = get_site_transient( $cache_key );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$repo_meta = p2026_get_github_repository_meta( $owner, $repo );
	$branch    = is_array( $repo_meta ) && ! empty( $repo_meta['default_branch'] )
		? (string) $repo_meta['default_branch']
		: 'main';

	$response = wp_remote_get(
		sprintf( 'https://api.github.com/repos/%1$s/%2$s/commits/%3$s', rawurlencode( $owner ), rawurlencode( $repo ), rawurlencode( $branch ) ),
		array(
			'timeout' => 10,
		)
	);

	if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		return null;
	}

	$data = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $data ) ) {
		return null;
	}

	$head = array(
		'branch'       => $branch,
		'sha'          => isset( $data['sha'] ) && is_string( $data['sha'] ) ? $data['sha'] : '',
		'published_at' => isset( $data['commit']['committer']['date'] ) && is_string( $data['commit']['committer']['date'] )
			? $data['commit']['committer']['date']
			: '',
		'html_url'     => isset( $data['html_url'] ) && is_string( $data['html_url'] ) ? $data['html_url'] : '',
		'message'      => isset( $data['commit']['message'] ) && is_string( $data['commit']['message'] ) ? $data['commit']['message'] : '',
	);

	set_site_transient( $cache_key, $head, 10 * MINUTE_IN_SECONDS );

	return $head;
}

/**
 * Fetch GitHub releases for the configured repository.
 *
 * @param string $owner Repository owner.
 * @param string $repo  Repository name.
 * @return array<int, array<string, mixed>>
 */
function p2026_get_github_releases( $owner, $repo ) {
	$cache_key = 'p2026_github_releases_' . md5( $owner . '/' . $repo );
	$cached    = get_site_transient( $cache_key );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$response = wp_remote_get(
		sprintf( 'https://api.github.com/repos/%1$s/%2$s/releases?per_page=100', rawurlencode( $owner ), rawurlencode( $repo ) ),
		array(
			'timeout' => 10,
		)
	);

	if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		return array();
	}

	$releases = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $releases ) ) {
		return array();
	}

	set_site_transient( $cache_key, $releases, 30 * MINUTE_IN_SECONDS );

	return $releases;
}

/**
 * Pick the best release to offer based on prerelease setting.
 *
 * @param array<int, array<string, mixed>> $releases Releases list.
 * @param bool                             $allow_prerelease Whether prereleases are allowed.
 * @return array<string, mixed>|null
 */
function p2026_select_release_offer( $releases, $allow_prerelease ) {
	if ( ! is_array( $releases ) ) {
		return null;
	}

	foreach ( $releases as $release ) {
		if ( ! is_array( $release ) ) {
			continue;
		}

		$is_draft      = ! empty( $release['draft'] );
		$is_prerelease = ! empty( $release['prerelease'] );

		if ( $is_draft ) {
			continue;
		}

		if ( $is_prerelease && ! $allow_prerelease ) {
			continue;
		}

		return $release;
	}

	return null;
}

/**
 * Build package URL from release metadata.
 *
 * @param array<string, mixed> $release Release payload.
 * @param string               $owner   Repository owner.
 * @param string               $repo    Repository name.
 * @return string
 */
function p2026_release_package_url( $release, $owner, $repo ) {
	if ( ! empty( $release['assets'] ) && is_array( $release['assets'] ) ) {
		foreach ( $release['assets'] as $asset ) {
			if ( ! is_array( $asset ) ) {
				continue;
			}

			$name = isset( $asset['name'] ) ? (string) $asset['name'] : '';
			$url  = isset( $asset['browser_download_url'] ) ? (string) $asset['browser_download_url'] : '';

			if ( '' !== $name && '' !== $url && '.zip' === strtolower( substr( $name, -4 ) ) ) {
				return $url;
			}
		}
	}

	$tag = isset( $release['tag_name'] ) ? (string) $release['tag_name'] : '';
	if ( '' === $tag ) {
		return '';
	}

	return sprintf( 'https://github.com/%1$s/%2$s/archive/refs/tags/%3$s.zip', rawurlencode( $owner ), rawurlencode( $repo ), rawurlencode( $tag ) );
}

/**
 * Build a normalized update payload object from a GitHub release.
 *
 * @param string               $plugin_file Plugin basename.
 * @param array                $plugin_data Plugin headers.
 * @param array<string, mixed> $release     Release payload.
 * @param string               $update_uri  Update URI value.
 * @param string               $owner       Repository owner.
 * @param string               $repo        Repository name.
 * @return stdClass|null
 */
function p2026_build_update_payload( $plugin_file, $plugin_data, $release, $update_uri, $owner, $repo ) {
	if ( ! is_array( $release ) ) {
		return null;
	}

	$tag_name = isset( $release['tag_name'] ) ? (string) $release['tag_name'] : '';
	if ( '' === $tag_name ) {
		return null;
	}

	$latest_version = ltrim( $tag_name, 'vV' );
	if ( '' === $latest_version ) {
		return null;
	}

	$package = p2026_release_package_url( $release, $owner, $repo );
	if ( '' === $package ) {
		return null;
	}

	$payload              = new stdClass();
	$payload->id          = $update_uri;
	$payload->slug        = dirname( $plugin_file );
	$payload->plugin      = $plugin_file;
	$payload->new_version = $latest_version;
	$payload->url         = isset( $release['html_url'] ) && is_string( $release['html_url'] )
		? $release['html_url']
		: $update_uri;
	$payload->package     = $package;

	if ( isset( $plugin_data['Requires'] ) && is_string( $plugin_data['Requires'] ) && '' !== $plugin_data['Requires'] ) {
		$payload->requires = $plugin_data['Requires'];
	}

	if ( isset( $plugin_data['RequiresPHP'] ) && is_string( $plugin_data['RequiresPHP'] ) && '' !== $plugin_data['RequiresPHP'] ) {
		$payload->requires_php = $plugin_data['RequiresPHP'];
	}

	if ( isset( $plugin_data['Tested'] ) && is_string( $plugin_data['Tested'] ) && '' !== $plugin_data['Tested'] ) {
		$payload->tested = $plugin_data['Tested'];
	}

	return $payload;
}

/**
 * Build update payload from default branch HEAD (nightly/trunk mode).
 *
 * @param string               $plugin_file Plugin basename.
 * @param array                $plugin_data Plugin headers.
 * @param array<string, mixed> $head        Default branch head payload.
 * @param string               $update_uri  Update URI value.
 * @param string               $owner       Repository owner.
 * @param string               $repo        Repository name.
 * @return stdClass|null
 */
function p2026_build_trunk_update_payload( $plugin_file, $plugin_data, $head, $update_uri, $owner, $repo ) {
	if ( ! is_array( $head ) || empty( $head['sha'] ) || empty( $head['branch'] ) ) {
		return null;
	}

	$current_version = isset( $plugin_data['Version'] ) && is_string( $plugin_data['Version'] )
		? $plugin_data['Version']
		: P2026_VERSION;

	$published_at = isset( $head['published_at'] ) && is_string( $head['published_at'] ) ? $head['published_at'] : '';
	$timestamp    = '' !== $published_at ? gmdate( 'YmdHis', strtotime( $published_at ) ) : gmdate( 'YmdHis' );
	$short_sha    = substr( (string) $head['sha'], 0, 8 );

	$payload                     = new stdClass();
	$payload->id                 = $update_uri;
	$payload->slug               = dirname( $plugin_file );
	$payload->plugin             = $plugin_file;
	$payload->new_version        = $current_version . '.' . $timestamp;
	$payload->url                = ! empty( $head['html_url'] ) && is_string( $head['html_url'] )
		? $head['html_url']
		: sprintf( 'https://github.com/%1$s/%2$s/tree/%3$s', rawurlencode( $owner ), rawurlencode( $repo ), rawurlencode( (string) $head['branch'] ) );
	$payload->package            = sprintf( 'https://github.com/%1$s/%2$s/archive/refs/heads/%3$s.zip', rawurlencode( $owner ), rawurlencode( $repo ), rawurlencode( (string) $head['branch'] ) );
	$payload->p2026_trunk_sha    = (string) $head['sha'];
	$payload->p2026_trunk_branch = (string) $head['branch'];
	$payload->p2026_trunk_label  = $short_sha;

	if ( isset( $plugin_data['Requires'] ) && is_string( $plugin_data['Requires'] ) && '' !== $plugin_data['Requires'] ) {
		$payload->requires = $plugin_data['Requires'];
	}

	if ( isset( $plugin_data['RequiresPHP'] ) && is_string( $plugin_data['RequiresPHP'] ) && '' !== $plugin_data['RequiresPHP'] ) {
		$payload->requires_php = $plugin_data['RequiresPHP'];
	}

	if ( isset( $plugin_data['Tested'] ) && is_string( $plugin_data['Tested'] ) && '' !== $plugin_data['Tested'] ) {
		$payload->tested = $plugin_data['Tested'];
	}

	return $payload;
}

/**
 * Get update offer context for the configured channel.
 *
 * @param string               $plugin_file Plugin basename.
 * @param array                $plugin_data Plugin headers.
 * @param string               $update_uri  Update URI value.
 * @param array<string,string> $repo        Repository tuple.
 * @return array<string,mixed>|null
 */
function p2026_get_update_offer_context( $plugin_file, $plugin_data, $update_uri, $repo ) {
	$channel = p2026_github_updates_channel();

	if ( 'trunk' === $channel ) {
		$head = p2026_get_default_branch_head( $repo['owner'], $repo['repo'] );
		if ( ! is_array( $head ) ) {
			return null;
		}

		$payload = p2026_build_trunk_update_payload( $plugin_file, $plugin_data, $head, $update_uri, $repo['owner'], $repo['repo'] );
		if ( ! $payload instanceof stdClass ) {
			return null;
		}

		return array(
			'channel' => 'trunk',
			'payload' => $payload,
			'head'    => $head,
		);
	}

	$release = p2026_select_release_offer(
		p2026_get_github_releases( $repo['owner'], $repo['repo'] ),
		'prerelease' === $channel
	);
	if ( ! is_array( $release ) ) {
		return null;
	}

	$payload = p2026_build_update_payload( $plugin_file, $plugin_data, $release, $update_uri, $repo['owner'], $repo['repo'] );
	if ( ! $payload instanceof stdClass ) {
		return null;
	}

	return array(
		'channel' => $channel,
		'payload' => $payload,
		'release' => $release,
	);
}

/**
 * Whether an update should be offered for the selected channel.
 *
 * @param array                $plugin_data Plugin headers.
 * @param array<string,string> $repo        Repository tuple.
 * @param array<string,mixed>  $context     Offer context.
 * @return bool
 */
function p2026_should_offer_update( $plugin_data, $repo, $context ) {
	if ( ! is_array( $context ) || empty( $context['payload'] ) || ! $context['payload'] instanceof stdClass ) {
		return false;
	}

	if ( 'trunk' === ( $context['channel'] ?? '' ) ) {
		$remote_sha = isset( $context['head']['sha'] ) && is_string( $context['head']['sha'] ) ? $context['head']['sha'] : '';
		if ( '' === $remote_sha ) {
			return false;
		}

		return p2026_get_installed_trunk_sha( $repo['owner'], $repo['repo'] ) !== $remote_sha;
	}

	$current_version = isset( $plugin_data['Version'] ) && is_string( $plugin_data['Version'] )
		? $plugin_data['Version']
		: P2026_VERSION;

	return version_compare( $context['payload']->new_version, $current_version, '>' );
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

	$context = p2026_get_update_offer_context( $our_plugin_file, $plugin_data, $update_uri, $repo );
	if ( ! is_array( $context ) || empty( $context['payload'] ) || ! $context['payload'] instanceof stdClass ) {
		return $update;
	}

	if ( ! p2026_should_offer_update( $plugin_data, $repo, $context ) ) {
		return $update;
	}

	return $context['payload'];
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

	$context = p2026_get_update_offer_context( $plugin_file, $plugin_data, $update_uri, $repo );
	if ( ! is_array( $context ) || empty( $context['payload'] ) || ! $context['payload'] instanceof stdClass ) {
		return $transient;
	}

	$payload = $context['payload'];

	if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
		$transient->response = array();
	}
	if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
		$transient->no_update = array();
	}

	if ( p2026_should_offer_update( $plugin_data, $repo, $context ) ) {
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

	$context = p2026_get_update_offer_context( $plugin_file, $plugin_data, $update_uri, $repo );
	if ( ! is_array( $context ) || empty( $context['payload'] ) || ! $context['payload'] instanceof stdClass ) {
		return $result;
	}

	$payload = $context['payload'];

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
	if ( 'trunk' === ( $context['channel'] ?? '' ) ) {
		$head               = isset( $context['head'] ) && is_array( $context['head'] ) ? $context['head'] : array();
		$branch_label       = isset( $head['branch'] ) && is_string( $head['branch'] ) ? $head['branch'] : 'trunk';
		$sha_label          = isset( $head['sha'] ) && is_string( $head['sha'] ) ? substr( $head['sha'], 0, 8 ) : '';
		$info->last_updated = isset( $head['published_at'] ) && is_string( $head['published_at'] )
			? $head['published_at']
			: '';
		$info->sections     = array(
			'description' => ! empty( $plugin_data['Description'] ) ? $plugin_data['Description'] : '',
			'changelog'   => wp_kses_post(
				wpautop(
					sprintf(
						/* translators: 1: branch name, 2: short commit hash. */
						__( 'Nightly build from branch %1$s at commit %2$s.', 'p2026' ),
						$branch_label,
						$sha_label
					)
				)
			),
		);
	} else {
		$release            = isset( $context['release'] ) && is_array( $context['release'] ) ? $context['release'] : array();
		$info->last_updated = isset( $release['published_at'] ) && is_string( $release['published_at'] )
			? $release['published_at']
			: '';
		$info->sections     = array(
			'description' => ! empty( $plugin_data['Description'] ) ? $plugin_data['Description'] : '',
			'changelog'   => isset( $release['body'] ) && is_string( $release['body'] )
				? wp_kses_post( wpautop( $release['body'] ) )
				: '',
		);
	}

	return $info;
}
add_filter( 'plugins_api', 'p2026_plugin_api_details', 20, 3 );

/**
 * Persist installed trunk SHA after successful plugin updates.
 *
 * @param WP_Upgrader $upgrader   Upgrader object.
 * @param array       $hook_extra Hook context.
 * @return void
 */
function p2026_track_installed_trunk_sha( $upgrader, $hook_extra ) {
	if ( ! is_array( $hook_extra ) ) {
		return;
	}

	if ( empty( $hook_extra['type'] ) || 'plugin' !== $hook_extra['type'] ) {
		return;
	}

	if ( empty( $hook_extra['action'] ) || 'update' !== $hook_extra['action'] ) {
		return;
	}

	if ( empty( $hook_extra['plugins'] ) || ! is_array( $hook_extra['plugins'] ) ) {
		return;
	}

	$our_plugin_file = plugin_basename( P2026_DIR . 'p2026.php' );
	if ( ! in_array( $our_plugin_file, $hook_extra['plugins'], true ) ) {
		return;
	}

	if ( 'trunk' !== p2026_github_updates_channel() ) {
		return;
	}

	$update_uri = p2026_get_update_uri_from_header();
	$repo       = p2026_parse_github_repo_from_update_uri( $update_uri );
	if ( ! is_array( $repo ) || empty( $repo['owner'] ) || empty( $repo['repo'] ) ) {
		return;
	}

	// Prefer the exact SHA from the update payload when available.
	if ( isset( $hook_extra['p2026_trunk_sha'] ) && is_string( $hook_extra['p2026_trunk_sha'] ) && '' !== $hook_extra['p2026_trunk_sha'] ) {
		$sha = $hook_extra['p2026_trunk_sha'];
	} else {
		$head = p2026_get_default_branch_head( $repo['owner'], $repo['repo'] );
		$sha  = is_array( $head ) && ! empty( $head['sha'] ) && is_string( $head['sha'] )
			? $head['sha']
			: '';
	}

	p2026_set_installed_trunk_sha( $repo['owner'], $repo['repo'], $sha );
}
add_action( 'upgrader_process_complete', 'p2026_track_installed_trunk_sha', 20, 2 );

/**
 * Register updater settings tab.
 *
 * @param array<string, string> $tabs Existing settings tabs.
 * @return array<string, string>
 */
function p2026_github_updates_register_settings_tab( $tabs ) {
	if ( ! is_array( $tabs ) ) {
		$tabs = array();
	}

	$tabs['github-updates'] = __( 'GitHub Updates', 'p2026' );

	return $tabs;
}
add_filter( 'p2026_settings_tabs', 'p2026_github_updates_register_settings_tab' );

/**
 * Save updater settings tab.
 */
function p2026_github_updates_save_settings_tab() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$nonce = isset( $_POST['p2026_github_updates_settings_nonce'] )
		? sanitize_text_field( wp_unslash( $_POST['p2026_github_updates_settings_nonce'] ) )
		: '';
	if ( ! wp_verify_nonce( $nonce, 'p2026_github_updates_settings_save' ) ) {
		return;
	}

	$channel = isset( $_POST['p2026_github_updates_channel'] )
		? sanitize_key( wp_unslash( $_POST['p2026_github_updates_channel'] ) )
		: 'default';

	if ( ! in_array( $channel, array( 'default', 'prerelease', 'trunk' ), true ) ) {
		$channel = 'default';
	}

	update_option( 'p2026_github_updates_channel', $channel );
	update_option( 'p2026_github_updates_allow_prerelease', 'prerelease' === $channel ? '1' : '0' );
}
add_action( 'p2026_settings_save_tab_github-updates', 'p2026_github_updates_save_settings_tab' );

/**
 * Render updater settings tab.
 */
function p2026_github_updates_render_settings_tab() {
	$channel = p2026_github_updates_channel();
	?>
	<?php wp_nonce_field( 'p2026_github_updates_settings_save', 'p2026_github_updates_settings_nonce' ); ?>
	<h2 class="title"><?php esc_html_e( 'GitHub Updates', 'p2026' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'Configure which GitHub source is used for update offers.', 'p2026' ); ?>
	</p>

	<table class="form-table" role="presentation">
		<tr>
			<th scope="row">
				<?php esc_html_e( 'Update channel', 'p2026' ); ?>
			</th>
			<td>
				<label for="p2026_github_updates_channel_default">
					<input
						type="radio"
						id="p2026_github_updates_channel_default"
						name="p2026_github_updates_channel"
						value="default"
						<?php checked( 'default', $channel ); ?>
					/>
					<?php esc_html_e( 'Default (stable releases only)', 'p2026' ); ?>
				</label>
				<br />
				<label for="p2026_github_updates_channel_prerelease">
					<input
						type="radio"
						id="p2026_github_updates_channel_prerelease"
						name="p2026_github_updates_channel"
						value="prerelease"
						<?php checked( 'prerelease', $channel ); ?>
					/>
					<?php esc_html_e( 'Pre-release (include prerelease tags)', 'p2026' ); ?>
				</label>
				<br />
				<label for="p2026_github_updates_channel_trunk">
					<input
						type="radio"
						id="p2026_github_updates_channel_trunk"
						name="p2026_github_updates_channel"
						value="trunk"
						<?php checked( 'trunk', $channel ); ?>
					/>
					<?php esc_html_e( 'Trunk (nightly default-branch updates)', 'p2026' ); ?>
				</label>
				<p class="description">
					<?php esc_html_e( 'Trunk mode offers updates when the repository default branch HEAD commit changes.', 'p2026' ); ?>
				</p>
			</td>
		</tr>
	</table>

	<?php submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings', false ); ?>
	<?php
}
add_action( 'p2026_settings_render_tab_github-updates', 'p2026_github_updates_render_settings_tab' );
