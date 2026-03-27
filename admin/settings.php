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
 * Discover all modules and read their file-header metadata.
 *
 * Reads the following doc-block headers from each modules/whatever/index.php:
 *   Module Name:        Human-readable name.
 *   Module Description: One-line description shown in the settings table.
 *   Module Version:     Semver string, e.g. 0.1.0.
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
 * Render the P2026 settings page.
 *
 * Handles the module-toggle form (save on POST) then outputs the UI.
 */
function p2026_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$modules = p2026_get_modules();
	$saved   = false;
	$audit_backend = get_option( 'p2026_audit_log_backend', 'file' );
	if ( ! in_array( $audit_backend, array( 'file', 'cpt' ), true ) ) {
		$audit_backend = 'file';
	}

	// Process form submission.
	if ( isset( $_POST['p2026_save_settings'] ) && check_admin_referer( 'p2026_settings_save' ) ) {
		$posted  = isset( $_POST['p2026_modules'] ) && is_array( $_POST['p2026_modules'] )
			? array_map( 'sanitize_key', array_keys( $_POST['p2026_modules'] ) )
			: array();
		$active  = array_values( array_intersect( array_keys( $modules ), $posted ) );
		$backend = isset( $_POST['p2026_audit_log_backend'] ) ? sanitize_key( wp_unslash( $_POST['p2026_audit_log_backend'] ) ) : 'file';
		if ( ! in_array( $backend, array( 'file', 'cpt' ), true ) ) {
			$backend = 'file';
		}

		update_option( 'p2026_active_modules', $active );
		update_option( 'p2026_audit_log_backend', $backend );
		$audit_backend = $backend;
		$saved = true;
	}

	$active = p2026_get_active_modules();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'P2026 Settings', 'p2026' ); ?></h1>

		<?php if ( $saved ) : ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Settings saved.', 'p2026' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="">
			<?php wp_nonce_field( 'p2026_settings_save' ); ?>

			<h2 class="title"><?php esc_html_e( 'Modules', 'p2026' ); ?></h2>
			<p class="description">
				<?php esc_html_e( 'Enable or disable individual P2026 feature modules. All modules are active by default.', 'p2026' ); ?>
			</p>

			<?php if ( empty( $modules ) ) : ?>
				<p><?php esc_html_e( 'No modules found.', 'p2026' ); ?></p>
			<?php else : ?>
				<table class="wp-list-table widefat fixed striped plugins" style="margin-top:1em;">
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
							$is_active  = p2026_is_module_active( $slug, $active );
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
			<?php endif; ?>

			<p class="submit">
				<input
					type="submit"
					name="p2026_save_settings"
					class="button button-primary"
					value="<?php esc_attr_e( 'Save Changes', 'p2026' ); ?>"
				/>
			</p>

			<h2 class="title"><?php esc_html_e( 'Audit Log', 'p2026' ); ?></h2>
			<p class="description">
				<?php esc_html_e( 'Choose where audit events are persisted when the Audit Log module is enabled.', 'p2026' ); ?>
			</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">
						<label for="p2026_audit_log_backend"><?php esc_html_e( 'Audit backend', 'p2026' ); ?></label>
					</th>
					<td>
						<select id="p2026_audit_log_backend" name="p2026_audit_log_backend">
							<option value="file" <?php selected( 'file', $audit_backend ); ?>><?php esc_html_e( 'Uploads file (JSONL)', 'p2026' ); ?></option>
							<option value="cpt" <?php selected( 'cpt', $audit_backend ); ?>><?php esc_html_e( 'Custom post type', 'p2026' ); ?></option>
						</select>
						<p class="description">
							<?php esc_html_e( 'File backend appends newline-delimited JSON in uploads. CPT backend stores each event as an internal post.', 'p2026' ); ?>
						</p>
					</td>
				</tr>
			</table>
		</form>
	</div>
	<?php
}
