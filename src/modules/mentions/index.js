/**
 * P2026 Module: Mentions — frontend initialisation.
 *
 * Registers three things on module load (side-effect import from src/modules/index.js):
 *
 *   1. `p2026/mention` rich-text format type — so that mentions inserted by the
 *      autocomplete completer are stored as highlighted <span> elements inside
 *      serialized block content and styled on the frontend.
 *
 *   2. `editor.Autocomplete.completers` filter — adds an `@` trigger to the
 *      Block Editor's built-in autocomplete system. Works inside any RichText
 *      field (paragraph, heading, etc.) rendered by BlockEditorProvider.
 *
 *   3. Hovercard host — a React component mounted to a portal div on the body.
 *      Event delegation on `document` shows a profile hovercard when the user
 *      hovers over any `.p2026-mention[data-user-id]` anchor, whether rendered
 *      by the PHP theme loop or injected by React via dangerouslySetInnerHTML.
 *
 * Comment textarea autocomplete is handled by MentionTextareaControl, which
 * Comments.js and Comment.js import directly.
 */
import { registerFormatType } from '@wordpress/rich-text';
import { addFilter } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import onDomReady from '../../utils/on-dom-ready';
import { initMentionsHovercards } from './hovercards';
import './_mentions.scss';

// ---------------------------------------------------------------------------
// Format type: p2026/mention
//
// Wraps mention text in <span class="p2026-mention" data-user-id="…">.
// No toolbar button — the format is applied only via the autocomplete completer.
// ---------------------------------------------------------------------------
registerFormatType( 'p2026/mention', {
	title: __( 'Mention', 'p2026' ),
	tagName: 'span',
	className: 'p2026-mention',
	attributes: {
		'data-user-id': 'data-user-id',
		'data-user-slug': 'data-user-slug',
	},
	// No edit UI — applied programmatically by the autocomplete completer.
	edit: () => null,
} );

// ---------------------------------------------------------------------------
// Block Editor autocomplete: `@` trigger
//
// Hooks into the built-in Gutenberg autocomplete system via the
// editor.Autocomplete.completers filter exposed by @wordpress/block-editor.
// The options callback is debounced automatically (isDebounced: true).
// ---------------------------------------------------------------------------
addFilter(
	'editor.Autocomplete.completers',
	'p2026/mentions',
	( completers ) => [
		...completers,
		{
			name: 'p2026-mention',
			triggerPrefix: '@',

			/**
			 * Fetch matching users from the mentions REST endpoint.
			 *
			 * Returns an empty array when:
			 *   - The query is shorter than 1 character.
			 *   - The user is not logged in (endpoint requires auth).
			 *
			 * @param {string} query Text typed after `@`.
			 * @return {Promise<Array>} Matching user objects { id, slug, name, avatar_url }.
			 */
			options: async ( query ) => {
				if ( ! query || query.length < 1 ) {
					return [];
				}
				if ( ! window.p2026Config?.currentUser ) {
					return [];
				}
				try {
					return await apiFetch( {
						path: `/p2026/v1/users?search=${ encodeURIComponent(
							query
						) }&per_page=5`,
					} );
				} catch {
					return [];
				}
			},

			/**
			 * Label rendered in the autocomplete dropdown.
			 * @param {Object} user Suggestion item.
			 * @return {string} Display name.
			 */
			getOptionLabel: ( user ) => user.name,

			/**
			 * Keywords used for client-side filtering of already-fetched results.
			 * @param {Object} user Suggestion item.
			 * @return {string[]} Keywords to match against.
			 */
			getOptionKeywords: ( user ) => [ user.slug, user.name ],

			/**
			 * Text inserted into the RichText field when the user picks a suggestion.
			 * Inserts a plain `@username` string; PHP server-side linkification
			 * converts it to a `<a class="p2026-mention" data-user-id="…">` anchor
			 * when the post or comment is rendered. The registered `p2026/mention`
			 * format type lets the editor recognise and round-trip existing formatted
			 * mention spans when a previously-saved post is re-opened for editing.
			 *
			 * @param {Object} user Suggestion item `{ id, slug, name, avatar_url }`.
			 * @return {string} The @username string to insert.
			 */
			getOptionCompletion: ( user ) => `@${ user.slug }`,
			allowContext: ( before ) => ! /[a-zA-Z0-9.]@$/.test( before ),

			/** Let @wordpress/block-editor debounce the options() call automatically. */
			isDebounced: true,
		},
	]
);

onDomReady( () => initMentionsHovercards() );
