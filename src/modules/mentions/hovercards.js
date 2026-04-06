/**
 * Mentions hovercards — lightweight frontend/admin initializer.
 *
 * Keeps hovercard behavior isolated so consumers that only need mention
 * hovercards (for example, audit-log viewer) don't pull in editor autocomplete
 * and rich-text format registration code.
 */
import { createRoot, createElement } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { initMentionsHoverInteractivity } from '../../interactivity/mentions-hover';
import HovercardHost, { showHovercard, hideHovercard } from './Hovercard';
import './_mentions.scss';

// Per-user profile cache — keyed by numeric user ID.
const hovercardCache = new Map();

// Timers shared across both mention-hover and hovercard-hover handlers.
let showTimer = null;
let hideTimer = null;
let hovercardMounted = false;

// The anchor element currently being hovered — used to guard stale fetches.
let currentAnchor = null;

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

	// Event delegation runs via Interactivity API directives.
	initMentionsHoverInteractivity( {
		onMouseOver: handleHoverMouseOver,
		onMouseOut: handleHoverMouseOut,
	} );
}
