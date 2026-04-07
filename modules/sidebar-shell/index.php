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
