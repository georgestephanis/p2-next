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
import { createRoot, createElement } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { initMentionsHoverInteractivity } from '../../interactivity';
import onDomReady from '../../utils/on-dom-ready';
import HovercardHost, { showHovercard, hideHovercard } from './Hovercard';
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

// ---------------------------------------------------------------------------
// Hovercard: mount host + wire event delegation
// ---------------------------------------------------------------------------

// Per-user profile cache — keyed by numeric user ID.
const hovercardCache = new Map();

/**
 * Fetch rich profile data for a user, using the in-memory cache.
 *
 * @param {number} userId Numeric WordPress user ID.
 * @return {Promise<Object>} Resolved user profile object.
 */
async function fetchUserDetail( userId ) {
	if ( hovercardCache.has( userId ) ) {
		return hovercardCache.get( userId );
	}
	const user = await apiFetch( { path: `/p2026/v1/users/${ userId }` } );
	hovercardCache.set( userId, user );
	return user;
}

// Timers shared across both mention-hover and hovercard-hover handlers.
let showTimer = null;
let hideTimer = null;
let hovercardMounted = false;

// The anchor element currently being hovered — used to guard stale fetches.
let currentAnchor = null;

/**
 * Schedule a show after a short delay, cancelling any pending hide.
 * If the user moves away before the fetch resolves, the card is not shown.
 *
 * @param {number}  userId   WordPress user ID from data-user-id.
 * @param {Element} anchorEl The .p2026-mention link element.
 */
function scheduleShow( userId, anchorEl ) {
	currentAnchor = anchorEl;
	if ( hideTimer ) {
		clearTimeout( hideTimer );
		hideTimer = null;
	}
	if ( showTimer ) {
		clearTimeout( showTimer );
	}
	showTimer = setTimeout( async () => {
		showTimer = null;
		if ( currentAnchor !== anchorEl ) {
			return; // Moved away before the timer fired.
		}
		try {
			const user = await fetchUserDetail( userId );
			if ( currentAnchor === anchorEl ) {
				showHovercard( user, anchorEl );
			}
		} catch {
			// Ignore network errors — silently skip the hovercard.
		}
	}, 300 );
}

/**
 * Schedule hiding after a short delay, allowing the pointer to travel
 * into the hovercard without it disappearing.
 */
function scheduleHide() {
	currentAnchor = null;
	if ( showTimer ) {
		clearTimeout( showTimer );
		showTimer = null;
	}
	if ( hideTimer ) {
		clearTimeout( hideTimer );
		hideTimer = null;
	}
	hideTimer = setTimeout( () => {
		hideTimer = null;
		hideHovercard();
	}, 200 );
}

/** Cancel a pending hide (called when pointer enters the hovercard). */
function cancelHide() {
	if ( hideTimer ) {
		clearTimeout( hideTimer );
		hideTimer = null;
	}
}

function handleHoverMouseOver( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	// Entering a hovercard — cancel any pending hide.
	if ( event.target.closest( '.p2026-hovercard' ) ) {
		cancelHide();
		return;
	}

	const mention = event.target.closest( 'a.p2026-mention[data-user-id]' );
	if ( mention ) {
		const userId = parseInt( mention.dataset.userId, 10 );
		if ( userId ) {
			scheduleShow( userId, mention );
		}
	}
}

function handleHoverMouseOut( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	// Leaving the hovercard itself — schedule a hide.
	const card = event.target.closest( '.p2026-hovercard' );
	if ( card && ! card.contains( event.relatedTarget ) ) {
		scheduleHide();
		return;
	}

	// Leaving a mention anchor — schedule a hide (unless entering the card).
	const mention = event.target.closest( 'a.p2026-mention[data-user-id]' );
	if ( mention && ! mention.contains( event.relatedTarget ) ) {
		// Don't hide if the pointer is moving into the hovercard.
		if ( ! event.relatedTarget?.closest( '.p2026-hovercard' ) ) {
			scheduleHide();
		}
	}
}

/**
 * Mount hovercard host and delegated events once.
 *
 * @param {Object}  [options]             Options.
 * @param {boolean} [options.force=false]
 *                                        Allow mount outside frontend p2026Config context.
 */
export function initMentionsHovercards( { force = false } = {} ) {
	if ( hovercardMounted ) {
		return;
	}

	// Only show hovercards for logged-in users (the detail endpoint requires auth).
	if ( ! force && ! window.p2026Config?.currentUser ) {
		return;
	}

	hovercardMounted = true;

	const hostEl = document.createElement( 'div' );
	hostEl.id = 'p2026-hovercard-root';
	document.body.appendChild( hostEl );
	createRoot( hostEl ).render( createElement( HovercardHost ) );

	// Event delegation now runs via Interactivity API directives.
	initMentionsHoverInteractivity( {
		onMouseOver: handleHoverMouseOver,
		onMouseOut: handleHoverMouseOut,
	} );
}

onDomReady( () => initMentionsHovercards() );
