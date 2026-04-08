<?php
/**
 * P2026 comment-editor module markdown handling for REST create/update.
 *
 * @package P2026\Modules\CommentEditor
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Comment meta key used to retain raw markdown source.
 */
const P2026_COMMENT_MARKDOWN_META_KEY = '_p2026_markdown_source';

/**
 * Extract raw comment content from a REST request.
 *
 * @param WP_REST_Request $request REST request.
 * @return string
 */
function p2026_rest_comment_request_content_raw( $request ) {
	$content = $request->get_param( 'content' );

	if ( is_array( $content ) ) {
		if ( isset( $content['raw'] ) && is_string( $content['raw'] ) ) {
			return $content['raw'];
		}
		if ( isset( $content['rendered'] ) && is_string( $content['rendered'] ) ) {
			return wp_strip_all_tags( $content['rendered'] );
		}
		return '';
	}

	if ( is_string( $content ) ) {
		return $content;
	}

	return '';
}

/**
 * Render a markdown-like comment body to safe HTML.
 *
 * @param string $markdown Raw markdown text.
 * @return string
 */
function p2026_render_comment_markdown( $markdown ) {
	$text = trim( str_replace( array( "\r\n", "\r" ), "\n", (string) $markdown ) );
	if ( '' === $text ) {
		return '';
	}

	$text = esc_html( $text );

	$text = preg_replace_callback(
		'/```([\s\S]*?)```/',
		static function ( $matches ) {
			$code = trim( (string) $matches[1], "\n" );
			return "\n\n<pre><code>{$code}</code></pre>\n\n";
		},
		$text
	);

	$text = preg_replace( '/^######\s+(.+)$/m', '<h6>$1</h6>', $text );
	$text = preg_replace( '/^#####\s+(.+)$/m', '<h5>$1</h5>', $text );
	$text = preg_replace( '/^####\s+(.+)$/m', '<h4>$1</h4>', $text );
	$text = preg_replace( '/^###\s+(.+)$/m', '<h3>$1</h3>', $text );
	$text = preg_replace( '/^##\s+(.+)$/m', '<h2>$1</h2>', $text );
	$text = preg_replace( '/^#\s+(.+)$/m', '<h1>$1</h1>', $text );

	$text = preg_replace( '/^&gt;\s?(.+)$/m', '<blockquote>$1</blockquote>', $text );

	$text = preg_replace( '/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text );
	$text = preg_replace( '/__(.+?)__/s', '<strong>$1</strong>', $text );
	$text = preg_replace( '/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $text );
	$text = preg_replace( '/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/s', '<em>$1</em>', $text );

	$text = preg_replace( '/`([^`\n]+)`/', '<code>$1</code>', $text );

	$text = preg_replace_callback(
		'/\[([^\]]+)\]\(([^\)\s]+)\)/',
		static function ( $matches ) {
			$label = $matches[1];
			$url   = esc_url( html_entity_decode( $matches[2], ENT_QUOTES ) );
			if ( '' === $url ) {
				return $label;
			}
			return sprintf( '<a href="%1$s">%2$s</a>', $url, $label );
		},
		$text
	);

	$text = preg_replace( '/^\s*[-\*]\s+(.+)$/m', '<li>$1</li>', $text );
	$text = preg_replace( '/(?:<li>.*<\/li>\n?)+/m', '<ul>$0</ul>', $text );

	$text = wpautop( $text );

	return wp_kses( $text, wp_kses_allowed_html( 'post' ) );
}

/**
 * Convert markdown content to rendered HTML before REST comment insert/update.
 *
 * @param stdClass        $prepared_comment Prepared comment object.
 * @param WP_REST_Request $request          Request object.
 * @return stdClass
 */
function p2026_rest_pre_insert_comment_markdown( $prepared_comment, $request ) {
	$format = (string) $request->get_param( 'p2026_format' );
	if ( 'markdown' !== $format ) {
		return $prepared_comment;
	}

	$raw_content = p2026_rest_comment_request_content_raw( $request );
	$rendered    = p2026_render_comment_markdown( $raw_content );

	$prepared_comment['comment_content'] = $rendered;

	return $prepared_comment;
}
add_filter( 'rest_pre_insert_comment', 'p2026_rest_pre_insert_comment_markdown', 10, 2 );

/**
 * Persist markdown source meta for REST comment create/update.
 *
 * @param WP_Comment      $comment  Comment object.
 * @param WP_REST_Request $request  Request object.
 * @param bool            $creating Whether creating or updating.
 */
function p2026_rest_after_insert_comment_markdown_meta( $comment, $request, $creating ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	$format = (string) $request->get_param( 'p2026_format' );
	if ( 'markdown' !== $format ) {
		return;
	}

	$raw_content = p2026_rest_comment_request_content_raw( $request );
	update_comment_meta( $comment->comment_ID, P2026_COMMENT_MARKDOWN_META_KEY, $raw_content );
}
add_action( 'rest_after_insert_comment', 'p2026_rest_after_insert_comment_markdown_meta', 10, 3 );
