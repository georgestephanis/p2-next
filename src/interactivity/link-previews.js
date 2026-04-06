/**
 * Interactivity: link preview delegated event wiring.
 *
 * Centralizes directive/store host wiring while link-preview module keeps
 * preview-specific logic.
 */
import { store } from '@wordpress/interactivity';

const NAMESPACE = 'p2026/link-previews';
const HOST_ID = 'p2026-link-previews-interactive';

let handlers = {
	onMouseOver: () => {},
	onMouseOut: () => {},
	onFocusIn: () => {},
	onFocusOut: () => {},
	onWindowScroll: () => {},
	onWindowResize: () => {},
};

store( NAMESPACE, {
	actions: {
		handleMouseOver: ( event ) => handlers.onMouseOver( event ),
		handleMouseOut: ( event ) => handlers.onMouseOut( event ),
		handleFocusIn: ( event ) => handlers.onFocusIn( event ),
		handleFocusOut: ( event ) => handlers.onFocusOut( event ),
		handleWindowScroll: () => handlers.onWindowScroll(),
		handleWindowResize: () => handlers.onWindowResize(),
	},
} );

/**
 * Initialize link preview interactivity host and bind handlers.
 *
 * @param {Object} nextHandlers Event handlers.
 */
export function initLinkPreviewInteractivity( nextHandlers = {} ) {
	handlers = {
		...handlers,
		...nextHandlers,
	};

	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	const host = document.createElement( 'div' );
	host.id = HOST_ID;
	host.hidden = true;
	host.setAttribute( 'data-wp-interactive', NAMESPACE );
	host.setAttribute(
		'data-wp-on-document--mouseover',
		'actions.handleMouseOver'
	);
	host.setAttribute(
		'data-wp-on-document--mouseout',
		'actions.handleMouseOut'
	);
	host.setAttribute(
		'data-wp-on-document--focusin',
		'actions.handleFocusIn'
	);
	host.setAttribute(
		'data-wp-on-document--focusout',
		'actions.handleFocusOut'
	);
	host.setAttribute(
		'data-wp-on-window--scroll',
		'actions.handleWindowScroll'
	);
	host.setAttribute(
		'data-wp-on-window--resize',
		'actions.handleWindowResize'
	);
	document.body.appendChild( host );
}
