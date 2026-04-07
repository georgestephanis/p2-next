<?php
/**
 * Server-side render for the p2026/feed-tools block.
 *
 * @package P2026
 */

if ( ! is_user_logged_in() ) {
	return;
}
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is a core escaping function. ?> data-p2026-feed-tools></div>
