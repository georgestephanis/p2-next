<?php
/**
 * P2026 Module: Sidebar Shell
 *
 * Module Name:        Sidebar Shell
 * Module Description: Optional fallback sidebar shell for themes that do not expose a native sidebar.
 * Module Version:     0.1.0
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
 * Print the sidebar shell container near the end of the page.
 */
function p2026_sidebar_shell_render() {
	if ( is_admin() ) {
		return;
	}

	$has_widgets    = is_active_sidebar( 'p2026-sidebar-shell' );
	$supports_block = p2026_sidebar_shell_supports_blocks();
	$block_markup   = '';

	if ( $supports_block ) {
		$default_block_markup = ! $has_widgets ? p2026_sidebar_shell_get_default_block_content() : '';
		$block_markup         = (string) apply_filters( 'p2026_sidebar_shell_block_content', $default_block_markup );
	}

	if ( ! $has_widgets && '' === trim( $block_markup ) ) {
		return;
	}
	?>
	<div class="p2026-sidebar-shell is-collapsed" data-p2026-sidebar-shell>
		<button
			type="button"
			class="p2026-sidebar-shell__toggle"
			aria-expanded="false"
			aria-controls="p2026-sidebar-shell-panel"
		>
			<span class="screen-reader-text"><?php esc_html_e( 'Toggle sidebar', 'p2026' ); ?></span>
		</button>
		<aside id="p2026-sidebar-shell-panel" class="p2026-sidebar-shell__panel" aria-label="<?php esc_attr_e( 'Sidebar', 'p2026' ); ?>">
			<div class="p2026-sidebar-shell__inner">
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

	if ( ! is_string( $value ) ) {
		$value = '';
	}

	update_option( 'p2026_sidebar_shell_default_blocks', trim( str_replace( "\0", '', $value ) ) );
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
	}
}
add_action( 'admin_enqueue_scripts', 'p2026_sidebar_shell_enqueue_admin_assets' );

/**
 * Render the Sidebar Shell settings tab content.
 */
function p2026_sidebar_shell_render_settings_tab() {
	$current = (string) get_option( 'p2026_sidebar_shell_default_blocks', '' );
	?>
	<h2 class="title"><?php esc_html_e( 'Sidebar Shell', 'p2026' ); ?></h2>
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
