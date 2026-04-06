/**
 * Interactivity: mentions hover event wiring.
 *
 * Keeps directive/store host wiring centralized while mentions module retains
 * hovercard-specific behavior.
 */
import { store } from '@wordpress/interactivity';

const NAMESPACE = 'p2026/mentions-hover';
const HOST_ID = 'p2026-mentions-hover-interactive';

let handlers = {
	onMouseOver: () => {},
	onMouseOut: () => {},
};

store( NAMESPACE, {
	actions: {
		handleMouseOver: ( event ) => handlers.onMouseOver( event ),
		handleMouseOut: ( event ) => handlers.onMouseOut( event ),
	},
} );

/**
 * Initialize mentions hover interactivity host and bind handlers.
 *
 * @param {Object} nextHandlers Event handlers.
 */
export function initMentionsHoverInteractivity( nextHandlers = {} ) {
	handlers = {
		...handlers,
		...nextHandlers,
	};

	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	const host = document.createElement( 'div' );
	host.id = HOST_ID;
	host.setAttribute( 'data-wp-interactive', NAMESPACE );
	host.setAttribute(
		'data-wp-on-document--mouseover',
		'actions.handleMouseOver'
	);
	host.setAttribute(
		'data-wp-on-document--mouseout',
		'actions.handleMouseOut'
	);
	host.hidden = true;
	document.body.appendChild( host );
}
