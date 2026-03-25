<?php
/**
 * Server-side render for the p2-next/new-post block.
 *
 * Only rendered for logged-in users who can publish posts.
 *
 * @package P2Next
 */

if ( ! is_user_logged_in() || ! current_user_can( 'publish_posts' ) ) {
	return;
}
?>
<div <?php echo get_block_wrapper_attributes( array( 'id' => 'p2-next-new-post' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is a core escaping function. ?>></div>
