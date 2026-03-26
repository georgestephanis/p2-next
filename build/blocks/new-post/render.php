<?php
/**
 * Server-side render for the p2026/new-post block.
 *
 * Only rendered for logged-in users who can publish posts.
 *
 * @package P2026
 */

if ( ! is_user_logged_in() || ! p2026_can_create_posts() ) {
	return;
}
?>
<div <?php echo get_block_wrapper_attributes( array( 'id' => 'p2026-new-post' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is a core escaping function. ?>></div>
