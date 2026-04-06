/**
 * Interactivity: post action menu behavior.
 *
 * Centralizes outside-click and Escape handling for all post menu <details>
 * elements. This avoids attaching per-post document listeners.
 */
import { store } from '@wordpress/interactivity';

const HOST_ID = 'p2026-post-menu-interactive';
const MENU_SELECTOR = 'details.p2026-menu-wrap';
const OPEN_MENU_SELECTOR = `${ MENU_SELECTOR }[open]`;

store( 'p2026/post-menu', {
	actions: {
		handleDocumentClick: ( event ) => {
			if ( ! ( event.target instanceof window.Element ) ) {
				return;
			}

			document
				.querySelectorAll( OPEN_MENU_SELECTOR )
				.forEach( ( details ) => {
					if ( ! details.contains( event.target ) ) {
						details.open = false;
					}
				} );
		},

		handleDocumentKeydown: ( event ) => {
			if ( event.key !== 'Escape' ) {
				return;
			}

			document
				.querySelectorAll( OPEN_MENU_SELECTOR )
				.forEach( ( details ) => {
					details.open = false;
				} );
		},
	},
} );

/**
 * Mount interactivity host for post menu document-level handlers.
 */
export function initPostMenuInteractivity() {
	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	const host = document.createElement( 'div' );
	host.id = HOST_ID;
	host.setAttribute( 'data-wp-interactive', 'p2026/post-menu' );
	host.setAttribute(
		'data-wp-on-document--click',
		'actions.handleDocumentClick'
	);
	host.setAttribute(
		'data-wp-on-document--keydown',
		'actions.handleDocumentKeydown'
	);
	host.hidden = true;
	document.body.appendChild( host );
}
