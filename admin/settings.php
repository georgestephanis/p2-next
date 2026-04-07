<?php
/**
 * P2026 Admin Settings Page.
 *
 * Registers the top-level "P2" menu and renders the settings page, which
 * lists all discovered modules and lets administrators enable or disable them.
 *
 * @package P2026\Admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the top-level "P2" admin menu.
 */
function p2026_admin_menu() {
	add_menu_page(
		__( 'P2026 Settings', 'p2026' ),
		'P2026',
		'manage_options',
		'p2026-settings',
		'p2026_render_settings_page',
		'dashicons-groups',
		80
	);
}
add_action( 'admin_menu', 'p2026_admin_menu' );

/**
 * Return settings tabs, including module-provided tabs.
 *
 * @return array<string, string> Tab slug => label.
 */
function p2026_get_settings_tabs() {
	$tabs = array(
		'modules' => __( 'Modules', 'p2026' ),
	);

	/**
	 * Filter the list of settings tabs shown on the P2026 settings screen.
	 *
	 * Modules can use this filter to register additional tabs by returning an
	 * associative array of tab slugs mapped to human‑readable labels:
	 * `array<string, string> $tabs { $tab_slug => $label }`.
	 *
	 * For each registered tab slug, modules are expected to:
	 * - Hook into `p2026_settings_save_tab_{$tab_slug}` to handle saving any
	 *   submitted settings when that tab is active.
	 * - Hook into `p2026_settings_render_tab_{$tab_slug}` to render the tab's
	 *   settings UI on the settings page.
	 *
	 * @since 1.0.0
	 *
	 * @param array<string, string> $tabs Associative array of tab slugs to labels.
	 */
	$tabs = apply_filters( 'p2026_settings_tabs', $tabs );
	if ( ! is_array( $tabs ) ) {
		return array(
			'modules' => __( 'Modules', 'p2026' ),
		);
	}

	$normalized = array();
	foreach ( $tabs as $slug => $label ) {
		$key = sanitize_key( (string) $slug );
		if ( '' === $key ) {
			continue;
		}

		$normalized[ $key ] = is_string( $label ) && '' !== $label
			? $label
			: ucfirst( $key );
	}

	if ( ! isset( $normalized['modules'] ) ) {
		$normalized = array_merge(
			array( 'modules' => __( 'Modules', 'p2026' ) ),
			$normalized
		);
	}

	return $normalized;
}

/**
 * Discover all modules and read their file-header metadata.
 *
 * Reads the following doc-block headers from each modules/whatever/index.php:
 *   Module Name:        Human-readable name.
 *   Module Description: One-line description shown in the settings table.
 *   Module Version:     Semver string, e.g. 0.2.0.
 *
 * Falls back to the slug as the name when the header is absent.
 *
 * @return array<string, array{ slug: string, name: string, description: string, version: string, file: string }>
 */
function p2026_get_modules() {
	$modules = array();

	foreach ( glob( P2026_DIR . 'modules/*/index.php' ) ?: array() as $file ) {
		$slug    = basename( dirname( $file ) );
		$headers = get_file_data(
			$file,
			array(
				'name'        => 'Module Name',
				'description' => 'Module Description',
				'version'     => 'Module Version',
			)
		);

		if ( empty( $headers['name'] ) ) {
			$headers['name'] = ucfirst( $slug );
		}

		$modules[ $slug ] = array_merge(
			$headers,
			array(
				'slug' => $slug,
				'file' => $file,
			)
		);
	}

	ksort( $modules );
	return $modules;
}

/**
 * Handle settings saves via admin-post endpoint.
 */
function p2026_handle_settings_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Sorry, you are not allowed to manage these settings.', 'p2026' ) );
	}

	check_admin_referer( 'p2026_settings_save' );

	$tabs       = p2026_get_settings_tabs();
	$valid_tabs = array_keys( $tabs );
	$posted_tab = isset( $_POST['p2026_settings_tab'] ) ? sanitize_key( wp_unslash( $_POST['p2026_settings_tab'] ) ) : 'modules';
	if ( ! in_array( $posted_tab, $valid_tabs, true ) ) {
		$posted_tab = 'modules';
	}

	if ( 'modules' === $posted_tab ) {
		$modules = p2026_get_modules();
		$posted  = isset( $_POST['p2026_modules'] ) && is_array( $_POST['p2026_modules'] )
			? array_map( 'sanitize_key', array_keys( $_POST['p2026_modules'] ) )
			: array();

		$disabled = array();
		$enabled  = array();

		foreach ( array_keys( $modules ) as $slug ) {
			$is_checked     = in_array( $slug, $posted, true );
			$default_active = p2026_module_default_is_active( $slug );

			if ( $default_active ) {
				if ( ! $is_checked ) {
					$disabled[] = $slug;
				}
			} elseif ( $is_checked ) {
				$enabled[] = $slug;
			}
		}

		update_option( 'p2026_disabled_modules', array_values( array_unique( $disabled ) ) );
		update_option( 'p2026_enabled_modules', array_values( array_unique( $enabled ) ) );

		if ( isset( $modules['sidebar-shell'] ) ) {
			$sidebar_default_blocks = isset( $_POST['p2026_sidebar_shell_default_blocks'] )
				? wp_unslash( $_POST['p2026_sidebar_shell_default_blocks'] )
				: '';

			if ( ! is_string( $sidebar_default_blocks ) ) {
				$sidebar_default_blocks = '';
			}

			$sidebar_default_blocks = str_replace( "\0", '', $sidebar_default_blocks );
			update_option( 'p2026_sidebar_shell_default_blocks', trim( $sidebar_default_blocks ) );
		}
	} else {
		/**
		 * Allow module tabs to process saves for their own settings.
		 *
		 * @param string $posted_tab Active tab slug being saved.
		 */
		do_action( 'p2026_settings_save_tab_' . $posted_tab, $posted_tab );
	}

	$redirect_url = add_query_arg(
		array(
			'page'             => 'p2026-settings',
			'tab'              => $posted_tab,
			'settings-updated' => '1',
		),
		admin_url( 'admin.php' )
	);

	wp_safe_redirect( $redirect_url );
	exit;
}
add_action( 'admin_post_p2026_save_settings', 'p2026_handle_settings_save' );

/**
 * Render the P2026 settings page.
 *
 * Handles the module-toggle form (save on POST) then outputs the UI.
 */
function p2026_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$tabs       = p2026_get_settings_tabs();
	$valid_tabs = array_keys( $tabs );
	$active_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'modules';
	if ( ! in_array( $active_tab, $valid_tabs, true ) ) {
		$active_tab = 'modules';
	}

	$modules = p2026_get_modules();
	$saved   = isset( $_GET['settings-updated'] ) && '1' === sanitize_text_field( wp_unslash( $_GET['settings-updated'] ) );

	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'P2026 Settings', 'p2026' ); ?></h1>

		<h2 class="nav-tab-wrapper">
			<?php foreach ( $tabs as $tab_slug => $tab_label ) : ?>
				<?php
				$tab_url = add_query_arg(
					array(
						'page' => 'p2026-settings',
						'tab'  => $tab_slug,
					),
					admin_url( 'admin.php' )
				);
				?>
				<a href="<?php echo esc_url( $tab_url ); ?>" class="nav-tab <?php echo $tab_slug === $active_tab ? 'nav-tab-active' : ''; ?>">
					<?php echo esc_html( $tab_label ); ?>
				</a>
			<?php endforeach; ?>
		</h2>

		<?php if ( $saved ) : ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Settings saved.', 'p2026' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'p2026_settings_save' ); ?>
			<input type="hidden" name="action" value="p2026_save_settings" />
			<input type="hidden" name="p2026_settings_tab" value="<?php echo esc_attr( $active_tab ); ?>" />

			<?php if ( 'modules' === $active_tab ) : ?>
				<h2 class="title"><?php esc_html_e( 'Modules', 'p2026' ); ?></h2>
				<p class="description">
					<?php esc_html_e( 'Enable or disable individual P2026 feature modules. Most modules are active by default; some modules use context-aware defaults.', 'p2026' ); ?>
				</p>

				<?php if ( empty( $modules ) ) : ?>
					<p><?php esc_html_e( 'No modules found.', 'p2026' ); ?></p>
				<?php else : ?>
					<table class="wp-list-table widefat fixed striped plugins" style="margin:1em 0 1.25em; max-width: 1000px;">
						<thead>
							<tr>
								<td class="manage-column check-column"></td>
								<th class="manage-column column-name column-primary"><?php esc_html_e( 'Module', 'p2026' ); ?></th>
								<th class="manage-column column-description"><?php esc_html_e( 'Description', 'p2026' ); ?></th>
								<th class="manage-column" style="width:6em;"><?php esc_html_e( 'Version', 'p2026' ); ?></th>
							</tr>
						</thead>
						<tbody id="the-list">
							<?php foreach ( $modules as $slug => $module ) :
								$is_active  = p2026_is_module_active( $slug );
								$field_name = 'p2026_modules[' . esc_attr( $slug ) . ']';
							?>
							<tr class="<?php echo $is_active ? 'active' : 'inactive'; ?>">
								<td class="check-column">
									<input
										type="checkbox"
										id="module-<?php echo esc_attr( $slug ); ?>"
										name="<?php echo esc_attr( $field_name ); ?>"
										value="1"
										<?php checked( $is_active ); ?>
									/>
								</td>
								<td class="plugin-title column-primary">
									<label for="module-<?php echo esc_attr( $slug ); ?>">
										<strong><?php echo esc_html( $module['name'] ); ?></strong>
									</label>
									<div class="row-actions visible">
										<?php if ( $is_active ) : ?>
											<span class="active"><strong><?php esc_html_e( 'Active', 'p2026' ); ?></strong></span>
										<?php else : ?>
											<span class="inactive"><?php esc_html_e( 'Inactive', 'p2026' ); ?></span>
										<?php endif; ?>
									</div>
								</td>
								<td class="column-description desc">
									<div class="plugin-description">
										<?php echo esc_html( $module['description'] ); ?>
									</div>
								</td>
								<td><?php echo esc_html( $module['version'] ); ?></td>
							</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<?php if ( isset( $modules['sidebar-shell'] ) ) : ?>
						<?php $sidebar_default_blocks = (string) get_option( 'p2026_sidebar_shell_default_blocks', '' ); ?>
						<h3><?php esc_html_e( 'Sidebar Shell Default Blocks', 'p2026' ); ?></h3>
						<p class="description" style="max-width:1000px; margin:0 0 10px;">
							<?php esc_html_e( 'Optional block markup used by the Sidebar Shell module when no sidebar widgets are active. Leave blank to use the built-in defaults (search, latest posts, latest comments).', 'p2026' ); ?>
						</p>
						<textarea
							name="p2026_sidebar_shell_default_blocks"
							rows="7"
							class="large-text code"
							style="max-width:1000px;"
						><?php echo esc_textarea( $sidebar_default_blocks ); ?></textarea>
					<?php endif; ?>
				<?php endif; ?>

				<?php submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings', false ); ?>
			<?php else : ?>
				<?php
				$render_hook = 'p2026_settings_render_tab_' . $active_tab;
				if ( has_action( $render_hook ) ) {
					do_action( $render_hook, $active_tab );
				} else {
					?>
					<p><?php esc_html_e( 'This settings tab is not available.', 'p2026' ); ?></p>
					<?php
				}
				?>
			<?php endif; ?>
		</form>
	</div>
	<?php
}
