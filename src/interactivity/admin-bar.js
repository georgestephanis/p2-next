/**
 * Interactivity: admin bar "New Post" behavior.
 *
 * This replaces the bespoke DOM click listener in frontend.js with
 * Interactivity API actions so this interaction can evolve with other
 * directive-driven enhancements.
 */
import { store, withSyncEvent } from '@wordpress/interactivity';
import { dispatch } from '@wordpress/data';
import { STORE_NAME } from '../store';

const HOST_ID = 'p2026-adminbar-interactive';
const NEW_POST_LINK_SELECTOR = '#wp-admin-bar-p2026-new-post > a';

store( 'p2026/admin-bar', {
	actions: {
		handleDocumentClick: withSyncEvent( ( event ) => {
			if ( ! ( event.target instanceof window.Element ) ) {
				return;
			}

			const link = event.target.closest( NEW_POST_LINK_SELECTOR );
			if ( ! link ) {
				return;
			}

			event.preventDefault();

			const existing = document.querySelector( '.p2026-new-post-editor' );
			if ( existing ) {
				existing.scrollIntoView( {
					behavior: 'smooth',
					block: 'nearest',
				} );
				window.requestAnimationFrame( () => {
					const canvas = existing.querySelector(
						'[contenteditable="true"]'
					);
					( canvas ?? existing ).focus();
				} );
				return;
			}

			dispatch( STORE_NAME ).openNewPostModal();
		} ),
	},
} );

/**
 * Mount a tiny interactivity host that listens for document-level click events.
 *
 * @return {void}
 */
export function initAdminBarInteractivity() {
	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	const host = document.createElement( 'div' );
	host.id = HOST_ID;
	host.setAttribute( 'data-wp-interactive', 'p2026/admin-bar' );
	host.setAttribute(
		'data-wp-on-document--click',
		'actions.handleDocumentClick'
	);
	host.hidden = true;
	document.body.appendChild( host );
}
