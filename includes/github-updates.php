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
 * Whether prerelease updates are enabled.
 *
 * @return bool
 */
function p2026_github_updates_allow_prerelease() {
	return '1' === get_option( 'p2026_github_updates_allow_prerelease', '0' );
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

	$release = p2026_select_release_offer( p2026_get_github_releases( $repo['owner'], $repo['repo'] ), p2026_github_updates_allow_prerelease() );
	if ( ! is_array( $release ) ) {
		return $update;
	}

	$update_data = p2026_build_update_payload( $our_plugin_file, $plugin_data, $release, $update_uri, $repo['owner'], $repo['repo'] );
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

	$release = p2026_select_release_offer( p2026_get_github_releases( $repo['owner'], $repo['repo'] ), p2026_github_updates_allow_prerelease() );
	if ( ! is_array( $release ) ) {
		return $transient;
	}

	$payload = p2026_build_update_payload( $plugin_file, $plugin_data, $release, $update_uri, $repo['owner'], $repo['repo'] );
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

	$release = p2026_select_release_offer( p2026_get_github_releases( $repo['owner'], $repo['repo'] ), p2026_github_updates_allow_prerelease() );
	if ( ! is_array( $release ) ) {
		return $result;
	}

	$payload = p2026_build_update_payload( $plugin_file, $plugin_data, $release, $update_uri, $repo['owner'], $repo['repo'] );
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
	$info->last_updated  = isset( $release['published_at'] ) && is_string( $release['published_at'] )
		? $release['published_at']
		: '';
	$info->sections      = array(
		'description' => ! empty( $plugin_data['Description'] ) ? $plugin_data['Description'] : '',
		'changelog'   => isset( $release['body'] ) && is_string( $release['body'] )
			? wp_kses_post( wpautop( $release['body'] ) )
			: '',
	);

	return $info;
}
add_filter( 'plugins_api', 'p2026_plugin_api_details', 20, 3 );

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

	$allow_prerelease = isset( $_POST['p2026_github_updates_allow_prerelease'] ) ? '1' : '0';
	update_option( 'p2026_github_updates_allow_prerelease', $allow_prerelease );
}
add_action( 'p2026_settings_save_tab_github-updates', 'p2026_github_updates_save_settings_tab' );

/**
 * Render updater settings tab.
 */
function p2026_github_updates_render_settings_tab() {
	$allow_prerelease = p2026_github_updates_allow_prerelease();
	?>
	<?php wp_nonce_field( 'p2026_github_updates_settings_save', 'p2026_github_updates_settings_nonce' ); ?>
	<h2 class="title"><?php esc_html_e( 'GitHub Updates', 'p2026' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'Configure how update offers are selected from GitHub Releases.', 'p2026' ); ?>
	</p>

	<table class="form-table" role="presentation">
		<tr>
			<th scope="row">
				<?php esc_html_e( 'Offer prerelease updates', 'p2026' ); ?>
			</th>
			<td>
				<label for="p2026_github_updates_allow_prerelease">
					<input
						type="checkbox"
						id="p2026_github_updates_allow_prerelease"
						name="p2026_github_updates_allow_prerelease"
						value="1"
						<?php checked( $allow_prerelease ); ?>
					/>
					<?php esc_html_e( 'Enable updates from prerelease GitHub versions.', 'p2026' ); ?>
				</label>
				<p class="description">
					<?php esc_html_e( 'When disabled, only non-draft stable releases are considered for updates.', 'p2026' ); ?>
				</p>
			</td>
		</tr>
	</table>

	<?php submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings', false ); ?>
	<?php
}
add_action( 'p2026_settings_render_tab_github-updates', 'p2026_github_updates_render_settings_tab' );
