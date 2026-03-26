<?php
/**
 * P2026 Module: Mentions
 *
 * Module Name:        Mentions
 * Module Description: Parses @username references in posts and comments, notifies mentioned users, and provides autocomplete in the editor.
 * Module Version:     0.1.0
 *
 * Provides @username mention support:
 *   - REST endpoint for mention autocomplete (logged-in users only).
 *   - Server-side parsing of @username tokens after a post or comment is saved.
 *   - Fires `p2026_mentions_found` so third-party plugins can send notifications.
 *
 * @package P2026\Modules\Mentions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// REST endpoint: user search for mention autocomplete
// ---------------------------------------------------------------------------

/**
 * Register the mentions user-search REST route.
 *
 * GET /wp-json/p2026/v1/users?search={query}&per_page={n}
 */
function p2026_mentions_register_routes() {
	register_rest_route(
		'p2026/v1',
		'/users',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_mentions_search_users',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'search'   => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				'per_page' => array(
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
					'default'           => 10,
					'minimum'           => 1,
					'maximum'           => 20,
				),
			),
		)
	);

	register_rest_route(
		'p2026/v1',
		'/users/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'p2026_mentions_user_detail',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'id' => array(
					'type'    => 'integer',
					'minimum' => 1,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_mentions_register_routes' );

/**
 * Return rich profile data for a single user (used by the hovercard).
 *
 * Response: { id, slug, name, bio, avatar_url, profile_url, post_count }
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response|WP_Error
 */
function p2026_mentions_user_detail( $request ) {
	$user = get_user_by( 'id', (int) $request['id'] );
	if ( ! $user ) {
		return new WP_Error(
			'p2026_user_not_found',
			__( 'User not found.', 'p2026' ),
			array( 'status' => 404 )
		);
	}

	return rest_ensure_response(
		array(
			'id'          => $user->ID,
			'slug'        => $user->user_login,
			'name'        => $user->display_name,
			'bio'         => (string) get_user_meta( $user->ID, 'description', true ),
			'avatar_url'  => get_avatar_url( $user->ID, array( 'size' => 64 ) ),
			'profile_url' => get_author_posts_url( $user->ID ),
			'post_count'  => (int) count_user_posts( $user->ID, 'post', true ),
		)
	);
}

/**
 * Return a list of users matching the search query.
 *
 * Response items: { id, slug, name, avatar_url }
 *
 * @param WP_REST_Request $request REST request object.
 * @return WP_REST_Response
 */
function p2026_mentions_search_users( $request ) {
	$search   = $request->get_param( 'search' );
	$per_page = $request->get_param( 'per_page' );

	if ( '' === $search ) {
		return rest_ensure_response( array() );
	}

	$query = new WP_User_Query(
		array(
			'search'         => '*' . $search . '*',
			'search_columns' => array( 'user_login', 'display_name' ),
			'number'         => $per_page,
			'orderby'        => 'display_name',
			'order'          => 'ASC',
			'fields'         => array( 'ID', 'user_login', 'display_name' ),
		)
	);

	$users = array_map(
		static function ( $user ) {
			return array(
				'id'         => (int) $user->ID,
				'slug'       => $user->user_login,
				'name'       => $user->display_name,
				'avatar_url' => get_avatar_url( $user->ID, array( 'size' => 32 ) ),
			);
		},
		$query->get_results()
	);

	return rest_ensure_response( $users );
}

// ---------------------------------------------------------------------------
// Mention parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract @username slugs from a content string.
 *
 * Uses a negative lookbehind to skip email addresses (user@example.com).
 * Minimum slug length of 2 characters to avoid false positives.
 *
 * @param string $content Raw post or comment content (may contain HTML).
 * @return string[] Deduplicated, lowercase array of candidate user_login slugs.
 */
function p2026_mentions_parse_usernames( $content ) {
	// Strip HTML and decode entities before parsing so we don't match
	// attribute values or URLs that happen to contain @.
	$text    = html_entity_decode( wp_strip_all_tags( $content ), ENT_QUOTES, 'UTF-8' );
	$matches = array();
	preg_match_all(
		'/(?<![a-zA-Z0-9.@])@([a-zA-Z0-9_-]{2,60})/',
		$text,
		$matches
	);

	return array_values( array_unique( array_map( 'strtolower', $matches[1] ) ) );
}

/**
 * Resolve an array of slug candidates to real WordPress users.
 *
 * Only exact user_login matches are returned, which guards against
 * injecting arbitrary strings and ensures the hook receives genuine users.
 *
 * @param string[] $slugs Candidate user_login slugs.
 * @return WP_User[] Matched user objects.
 */
function p2026_mentions_resolve_users( $slugs ) {
	if ( empty( $slugs ) ) {
		return array();
	}

	$query = new WP_User_Query(
		array(
			'login__in' => $slugs,
			'number'    => count( $slugs ),
		)
	);

	return $query->get_results();
}

// ---------------------------------------------------------------------------
// Post save hook
// ---------------------------------------------------------------------------

/**
 * Parse @mentions from a published post and fire the notification hook.
 *
 * Skips autosaves, revisions, and non-publish transitions so the hook fires
 * only when content is visible to readers.
 *
 * @param int     $post_id Post ID.
 * @param WP_Post $post    Post object.
 */
function p2026_mentions_on_post_save( $post_id, $post ) {
	// Skip autosave meta-saves.
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// Skip revisions and non-public types.
	if ( wp_is_post_revision( $post_id ) || 'post' !== $post->post_type ) {
		return;
	}

	if ( 'publish' !== $post->post_status ) {
		return;
	}

	$slugs = p2026_mentions_parse_usernames( $post->post_content );
	$users = p2026_mentions_resolve_users( $slugs );

	if ( empty( $users ) ) {
		return;
	}

	/**
	 * Fires when one or more users are @-mentioned in a published post.
	 *
	 * Third-party plugins should hook here to send email or in-app notifications.
	 * p2026 itself does not send notifications — that is intentionally left to
	 * dedicated notification plugins.
	 *
	 * @param WP_User[] $users       Users who were @-mentioned.
	 * @param string    $object_type Always 'post' in this context.
	 * @param int       $object_id   The post ID.
	 * @param int       $author_id   User ID of the post author.
	 */
	do_action( 'p2026_mentions_found', $users, 'post', $post_id, (int) $post->post_author );
}
add_action( 'save_post', 'p2026_mentions_on_post_save', 20, 2 );

// ---------------------------------------------------------------------------
// Comment save hook
// ---------------------------------------------------------------------------

/**
 * Parse @mentions from an approved comment and fire the notification hook.
 *
 * @param int        $comment_id  Comment ID.
 * @param int|string $approved    1 if approved, 0 if not, 'spam' if spam.
 */
function p2026_mentions_on_comment_post( $comment_id, $approved ) {
	if ( 1 !== (int) $approved ) {
		return;
	}

	$comment = get_comment( $comment_id );
	if ( ! $comment ) {
		return;
	}

	$slugs = p2026_mentions_parse_usernames( $comment->comment_content );
	$users = p2026_mentions_resolve_users( $slugs );

	if ( empty( $users ) ) {
		return;
	}

	/**
	 * Fires when one or more users are @-mentioned in an approved comment.
	 *
	 * @param WP_User[] $users       Users who were @-mentioned.
	 * @param string    $object_type Always 'comment' in this context.
	 * @param int       $object_id   The comment ID.
	 * @param int       $author_id   User ID of the comment author (0 for guests).
	 */
	do_action( 'p2026_mentions_found', $users, 'comment', $comment_id, (int) $comment->user_id );
}
add_action( 'comment_post', 'p2026_mentions_on_comment_post', 20, 2 );

// ---------------------------------------------------------------------------
// Content linkification — render @mentions as linked profile anchors
// ---------------------------------------------------------------------------

/**
 * Replace @username tokens in HTML content with profile links.
 *
 * Splits the content on HTML tags and HTML comments so that attribute values
 * and tag contents are never mutated — only bare text nodes are processed.
 * A single WP_User_Query batch-resolves all slugs found in the content.
 *
 * The generated anchor carries `data-user-id` and `data-user-slug` so the
 * frontend hovercard script can fetch rich profile data without re-parsing
 * the username from the href.
 *
 * @param string $content Post content or comment text (may already contain HTML).
 * @return string Content with @mentions replaced by profile links.
 */
function p2026_mentions_linkify( $content ) {
	$slugs = p2026_mentions_parse_usernames( $content );
	if ( empty( $slugs ) ) {
		return $content;
	}

	$users = p2026_mentions_resolve_users( $slugs );
	if ( empty( $users ) ) {
		return $content;
	}

	// Build a slug → user map for O(1) lookup.
	$map = array();
	foreach ( $users as $user ) {
		$map[ strtolower( $user->user_login ) ] = $user;
	}

	// Parse the HTML so we can only linkify safe text nodes and avoid nested anchors
	// or modifying script/style/code/pre contents.
	if ( '' === $content ) {
		return $content;
	}

	$dom = new DOMDocument();

	// Suppress HTML parsing warnings for fragments.
	$prev_use_errors = libxml_use_internal_errors( true );

	// Wrap with an explicit UTF-8 charset declaration so DOMDocument parses
	// multibyte characters correctly without the deprecated mb_convert_encoding
	// HTML-ENTITIES conversion (removed in PHP 8.2+).
	$loaded = $dom->loadHTML(
		'<html><head><meta charset="UTF-8"/></head><body>' . $content . '</body></html>'
	);

	libxml_clear_errors();
	libxml_use_internal_errors( $prev_use_errors );

	if ( ! $loaded ) {
		// If parsing fails, fall back to the original content rather than risk mangling it.
		return $content;
	}

	$body_list = $dom->getElementsByTagName( 'body' );
	if ( 0 === $body_list->length ) {
		return $content;
	}

	$body       = $body_list->item( 0 );
	$forbidden  = array( 'a', 'script', 'style', 'code', 'pre' );
	$mention_re = '/(?<![a-zA-Z0-9.@])@([a-zA-Z0-9_-]{2,60})/u';

	$process_node = static function ( DOMNode $node ) use ( &$process_node, $dom, $map, $forbidden, $mention_re ) {
		if ( ! $node->hasChildNodes() ) {
			return;
		}

		// We need to iterate over a static list because we'll potentially replace nodes.
		$children = array();
		foreach ( $node->childNodes as $child ) {
			$children[] = $child;
		}

		foreach ( $children as $child ) {
			if ( XML_TEXT_NODE === $child->nodeType ) {
				// Skip text nodes that live inside forbidden containers.
				$ancestor = $child->parentNode;
				$skip     = false;
				while ( $ancestor instanceof DOMNode ) {
					if ( XML_ELEMENT_NODE === $ancestor->nodeType ) {
						$name = strtolower( $ancestor->nodeName );
						if ( in_array( $name, $forbidden, true ) ) {
							$skip = true;
							break;
						}
					}
					$ancestor = $ancestor->parentNode;
				}

				if ( $skip ) {
					continue;
				}

				$text = $child->nodeValue;

				// Quick check to avoid regex work when there is no '@' at all.
				if ( false === strpos( $text, '@' ) ) {
					continue;
				}

				if ( ! preg_match_all( $mention_re, $text, $matches, PREG_OFFSET_CAPTURE ) ) {
					continue;
				}

				$fragment = $dom->createDocumentFragment();
				$last_pos = 0;

				foreach ( $matches[0] as $index => $match ) {
					$match_text   = $match[0];
					$match_offset = $match[1];
					$match_length = strlen( $match_text );

					// Append text before the match.
					if ( $match_offset > $last_pos ) {
						$fragment->appendChild(
							$dom->createTextNode( substr( $text, $last_pos, $match_offset - $last_pos ) )
						);
					}

					$slug_original = $matches[1][ $index ][0];
					$slug          = strtolower( $slug_original );

					if ( ! isset( $map[ $slug ] ) ) {
						// Unknown user: keep the original @text as plain text.
						$fragment->appendChild( $dom->createTextNode( $match_text ) );
					} else {
						$user = $map[ $slug ];

						$link = $dom->createElement( 'a' );
						$link->setAttribute( 'class', 'p2026-mention' );
						$link->setAttribute( 'href', esc_url( get_author_posts_url( $user->ID ) ) );
						$link->setAttribute( 'data-user-id', (string) (int) $user->ID );
						$link->setAttribute( 'data-user-slug', esc_attr( $user->user_login ) );
						$link->appendChild(
							$dom->createTextNode( '@' . $user->user_login )
						);

						$fragment->appendChild( $link );
					}

					$last_pos = $match_offset + $match_length;
				}

				// Append any trailing text after the last match.
				$text_length = strlen( $text );
				if ( $last_pos < $text_length ) {
					$fragment->appendChild(
						$dom->createTextNode( substr( $text, $last_pos ) )
					);
				}

				if ( $child->parentNode ) {
					$child->parentNode->replaceChild( $fragment, $child );
				}
			} elseif ( XML_ELEMENT_NODE === $child->nodeType ) {
				$process_node( $child );
			}
		}
	};

	$process_node( $body );

	// Serialize the body children back into an HTML fragment.
	$result = '';
	foreach ( $body->childNodes as $child ) {
		$result .= $dom->saveHTML( $child );
	}

	return $result;
}
add_filter( 'the_content', 'p2026_mentions_linkify' );
add_filter( 'comment_text', 'p2026_mentions_linkify' );
