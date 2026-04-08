<?php
/**
 * P2026 Module: Sidebar Shell
 *
 * Module Name:        Sidebar Shell
 * Module Description: Optional fallback sidebar shell for themes that do not expose a native sidebar.
 * Module Version:     0.4.0
 *
 * @package P2026\Modules\SidebarShell
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether the current theme is block-capable enough to render fallback blocks.
 *
 * @return bool
 */
function p2026_sidebar_shell_supports_blocks() {
	if ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ) {
		return true;
	}

	return file_exists( get_stylesheet_directory() . '/theme.json' ) || file_exists( get_template_directory() . '/theme.json' );
}

/**
 * Register a dedicated widget area for the sidebar shell.
 */
function p2026_sidebar_shell_register_sidebar() {
	register_sidebar(
		array(
			'name'          => __( 'P2026 Sidebar Shell', 'p2026' ),
			'id'            => 'p2026-sidebar-shell',
			'description'   => __( 'Widgets displayed in the optional P2026 sidebar shell.', 'p2026' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s p2026-sidebar-shell__widget">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="p2026-sidebar-shell__title widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'p2026_sidebar_shell_register_sidebar' );

/**
 * Return default Sidebar Shell block markup.
 *
 * @return string
 */
function p2026_sidebar_shell_get_default_block_content() {
	$saved = get_option( 'p2026_sidebar_shell_default_blocks', '' );
	if ( is_string( $saved ) && '' !== trim( $saved ) ) {
		return trim( $saved );
	}

	$default  = '<!-- wp:search {"label":"' . esc_attr__( 'Search', 'p2026' ) . '","buttonText":"' . esc_attr__( 'Search', 'p2026' ) . '"} /-->';
	$default .= '<!-- wp:latest-posts {"displayPostDate":true,"postsToShow":8} /-->';
	$default .= '<!-- wp:latest-comments {"commentsToShow":5,"displayAvatar":false,"displayDate":true,"displayExcerpt":true} /-->';

	return $default;
}

/**
 * Whether the Sidebar Shell should default to visible on page load.
 *
 * @return bool
 */
function p2026_sidebar_shell_default_visible() {
	$value = get_option( 'p2026_sidebar_shell_default_visible', '1' );
	return '0' !== (string) $value;
}

/**
 * Whether visitors are allowed to collapse the Sidebar Shell.
 *
 * @return bool
 */
function p2026_sidebar_shell_allow_collapse() {
	$value = get_option( 'p2026_sidebar_shell_allow_collapse', '1' );
	return '0' !== (string) $value;
}

/**
 * Print the sidebar shell container near the end of the page.
 */
function p2026_sidebar_shell_render() {
	if ( is_admin() ) {
		return;
	}

	$interactivity_asset_file      = P2026_DIR . 'build/interactivity.module.asset.php';
	$supports_interactivity_module = function_exists( 'wp_register_script_module' ) && function_exists( 'wp_enqueue_script_module' ) && file_exists( $interactivity_asset_file );

	$has_widgets    = is_active_sidebar( 'p2026-sidebar-shell' );
	$supports_block = p2026_sidebar_shell_supports_blocks();
	$block_markup   = '';
	$allow_collapse = p2026_sidebar_shell_allow_collapse();
	$default_open   = p2026_sidebar_shell_default_visible();

	if ( ! $allow_collapse ) {
		$default_open = true;
	}

	if ( $supports_block ) {
		$default_block_markup = ! $has_widgets ? p2026_sidebar_shell_get_default_block_content() : '';
		$block_markup         = (string) apply_filters( 'p2026_sidebar_shell_block_content', $default_block_markup );
	}

	if ( ! $has_widgets && '' === trim( $block_markup ) ) {
		return;
	}
	$classes = array( 'p2026-sidebar-shell', 'is-initializing' );
	if ( ! $default_open ) {
		$classes[] = 'is-collapsed';
	}
	?>
	<div
		class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>"
		data-p2026-sidebar-shell
		data-default-open="<?php echo esc_attr( $default_open ? '1' : '0' ); ?>"
		data-allow-collapse="<?php echo esc_attr( $allow_collapse ? '1' : '0' ); ?>"
		<?php if ( $supports_interactivity_module ) : ?>
			data-wp-interactive="p2026/sidebar-shell"
			data-wp-init="actions.init"
			data-wp-on-document--keydown="actions.handleDocumentKeydown"
		<?php endif; ?>
	>
		<?php if ( $allow_collapse ) : ?>
			<button
				type="button"
				class="p2026-sidebar-shell__toggle"
				aria-expanded="<?php echo $default_open ? 'true' : 'false'; ?>"
				aria-controls="p2026-sidebar-shell-panel"
				<?php if ( $supports_interactivity_module ) : ?>
					data-wp-on--click="actions.toggle"
				<?php endif; ?>
			>
				<span class="screen-reader-text"><?php esc_html_e( 'Toggle sidebar', 'p2026' ); ?></span>
			</button>
		<?php endif; ?>
		<aside id="p2026-sidebar-shell-panel" class="p2026-sidebar-shell__panel" aria-labelledby="p2026-sidebar-shell-title">
			<div class="p2026-sidebar-shell__inner">
				<h2 id="p2026-sidebar-shell-title" class="screen-reader-text"><?php esc_html_e( 'Sidebar', 'p2026' ); ?></h2>
				<div class="p2026-sidebar-shell__tools">
					<?php echo do_blocks( '<!-- wp:p2026/feed-tools /-->' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>

				<?php if ( $has_widgets ) : ?>
					<div class="p2026-sidebar-shell__widgets" data-sidebar-shell-widgets>
						<?php dynamic_sidebar( 'p2026-sidebar-shell' ); ?>
					</div>
				<?php endif; ?>

				<?php if ( '' !== trim( $block_markup ) ) : ?>
					<div class="p2026-sidebar-shell__blocks" data-sidebar-shell-blocks>
						<?php echo do_blocks( $block_markup ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</div>
				<?php endif; ?>
			</div>
		</aside>
	</div>
	<noscript>
		<style>
			.p2026-sidebar-shell.is-initializing {
				visibility: visible !important;
			}
		</style>
	</noscript>
	<?php
}
add_action( 'wp_footer', 'p2026_sidebar_shell_render', 20 );

/**
 * Register a dedicated settings tab for the Sidebar Shell module.
 *
 * @param array<string, string> $tabs Existing settings tabs.
 * @return array<string, string>
 */
function p2026_sidebar_shell_settings_tab( $tabs ) {
	$tabs['sidebar-shell'] = __( 'Sidebar Shell', 'p2026' );
	return $tabs;
}
add_filter( 'p2026_settings_tabs', 'p2026_sidebar_shell_settings_tab' );

/**
 * Save Sidebar Shell settings when the dedicated tab is submitted.
 */
function p2026_sidebar_shell_save_settings() {
	$value = isset( $_POST['p2026_sidebar_shell_default_blocks'] )
		? wp_unslash( $_POST['p2026_sidebar_shell_default_blocks'] )
		: '';
	$default_visible = isset( $_POST['p2026_sidebar_shell_default_visible'] ) ? '1' : '0';
	$allow_collapse  = isset( $_POST['p2026_sidebar_shell_allow_collapse'] ) ? '1' : '0';

	if ( '1' !== $allow_collapse ) {
		$default_visible = '1';
	}

	if ( ! is_string( $value ) ) {
		$value = '';
	}

	update_option( 'p2026_sidebar_shell_default_blocks', trim( str_replace( "\0", '', $value ) ) );
	update_option( 'p2026_sidebar_shell_default_visible', $default_visible );
	update_option( 'p2026_sidebar_shell_allow_collapse', $allow_collapse );
}
add_action( 'p2026_settings_save_tab_sidebar-shell', 'p2026_sidebar_shell_save_settings' );

/**
 * Enqueue block editor assets on the Sidebar Shell settings tab.
 *
 * Loads wp-block-library (which registers all core block types as a side
 * effect) and the compiled sidebar-shell-admin bundle produced by webpack.
 * Only runs on the P2026 settings page with the sidebar-shell tab active.
 *
 * @param string $hook Current admin page hook suffix.
 */
function p2026_sidebar_shell_enqueue_admin_assets( $hook ) {
	if ( 'toplevel_page_p2026-settings' !== $hook ) {
		return;
	}

	$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : '';
	if ( 'sidebar-shell' !== $tab ) {
		return;
	}

	// wp-block-library registers all core block types when it runs.
	wp_enqueue_script( 'wp-block-library' );
	wp_enqueue_style( 'wp-block-library' );
	wp_enqueue_style( 'wp-block-library-theme' ); // Editorial presentation styles for each block type.
	wp_enqueue_style( 'wp-block-editor' );
	wp_enqueue_style( 'wp-edit-blocks' );          // Block editing chrome: selection, toolbar, placeholders.
	wp_enqueue_style( 'wp-components' );
	wp_enqueue_style( 'wp-format-library' );

	$asset_file = P2026_DIR . 'build/sidebar-shell-admin.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = require $asset_file;

	wp_enqueue_script(
		'p2026-sidebar-shell-admin',
		P2026_URL . 'build/sidebar-shell-admin.js',
		array_merge( $asset['dependencies'], array( 'wp-block-library' ) ),
		$asset['version'],
		true
	);

	if ( file_exists( P2026_DIR . 'build/sidebar-shell-admin.css' ) ) {
		wp_enqueue_style(
			'p2026-sidebar-shell-admin',
			P2026_URL . 'build/sidebar-shell-admin.css',
			array( 'wp-edit-blocks', 'wp-block-editor', 'wp-components' ),
			$asset['version']
		);
		wp_style_add_data( 'p2026-sidebar-shell-admin', 'rtl', 'replace' );
	}
}
add_action( 'admin_enqueue_scripts', 'p2026_sidebar_shell_enqueue_admin_assets' );

/**
 * Render the Sidebar Shell settings tab content.
 */
function p2026_sidebar_shell_render_settings_tab() {
	$current         = (string) get_option( 'p2026_sidebar_shell_default_blocks', '' );
	$default_visible = p2026_sidebar_shell_default_visible();
	$allow_collapse  = p2026_sidebar_shell_allow_collapse();
	?>
	<h2 class="title"><?php esc_html_e( 'Sidebar Shell', 'p2026' ); ?></h2>

	<h3><?php esc_html_e( 'Display Behavior', 'p2026' ); ?></h3>
	<fieldset style="max-width:1000px; margin:0 0 16px;">
		<label style="display:block; margin:0 0 8px;">
			<input
				type="checkbox"
				name="p2026_sidebar_shell_default_visible"
				value="1"
				<?php checked( $default_visible ); ?>
			/>
			<?php esc_html_e( 'Default to visible on page load', 'p2026' ); ?>
		</label>
		<label style="display:block;">
			<input
				type="checkbox"
				name="p2026_sidebar_shell_allow_collapse"
				value="1"
				<?php checked( $allow_collapse ); ?>
			/>
			<?php esc_html_e( 'Allow visitors to collapse the sidebar shell', 'p2026' ); ?>
		</label>
		<p class="description" style="margin:8px 0 0;">
			<?php esc_html_e( 'If collapse is disabled, the sidebar remains permanently visible.', 'p2026' ); ?>
		</p>
	</fieldset>

	<h3><?php esc_html_e( 'Default Block Content', 'p2026' ); ?></h3>
	<p class="description" style="max-width:1000px; margin:0 0 10px;">
		<?php esc_html_e( 'Block markup rendered in the Sidebar Shell when no sidebar widgets are active. Add or remove blocks using the editor below; leave empty to use the built-in defaults (search, latest posts, latest comments).', 'p2026' ); ?>
	</p>

	<div class="p2026-sidebar-shell-admin-shell">
		<div id="p2026-sidebar-shell-block-editor" data-default-content="<?php echo esc_attr( p2026_sidebar_shell_get_default_block_content() ); ?>"></div>

		<textarea
			id="p2026-sidebar-shell-blocks-field"
			name="p2026_sidebar_shell_default_blocks"
			rows="10"
			class="large-text code p2026-sidebar-shell-admin-fallback"
		><?php echo esc_textarea( $current ); ?></textarea>
	</div>
	<?php
	submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings' );
}
add_action( 'p2026_settings_render_tab_sidebar-shell', 'p2026_sidebar_shell_render_settings_tab' );
