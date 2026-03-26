/**
 * P2026 Module: Mentions — frontend initialisation.
 *
 * Registers two things on module load (side-effect import from src/modules/index.js):
 *
 *   1. `p2026/mention` rich-text format type — so that mentions inserted by the
 *      autocomplete completer are stored as highlighted <span> elements inside
 *      serialized block content and styled on the frontend.
 *
 *   2. `editor.Autocomplete.completers` filter — adds an `@` trigger to the
 *      Block Editor's built-in autocomplete system. Works inside any RichText
 *      field (paragraph, heading, etc.) rendered by BlockEditorProvider.
 *
 * Comment textarea autocomplete is handled by MentionTextareaControl, which
 * Comments.js and Comment.js import directly.
 */
import { registerFormatType } from '@wordpress/rich-text';
import { addFilter } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';

// ---------------------------------------------------------------------------
// Format type: p2026/mention
//
// Wraps mention text in <span class="p2026-mention" data-user-id="…">.
// No toolbar button — the format is applied only via the autocomplete completer.
// ---------------------------------------------------------------------------
registerFormatType( 'p2026/mention', {
	title: 'Mention',
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
			 * Returns a plain string; the p2026/mention format is applied around it
			 * server-side when the post renders (PHP parses the slug).
			 *
			 * @param {Object} user Suggestion item `{ id, slug, name, avatar_url }`.
			 * @return {string} The @username string to insert.
			 */
			getOptionCompletion: ( user ) => `@${ user.slug }`,

			/** Let @wordpress/block-editor debounce the options() call automatically. */
			isDebounced: true,
		},
	]
);
