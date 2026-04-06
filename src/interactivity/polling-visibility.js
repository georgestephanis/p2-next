/**
 * Interactivity: shared polling visibility listeners.
 *
 * Polling consumers can register a callback that runs whenever the document
 * becomes visible. This keeps visibilitychange wiring centralized.
 */
import { interactivityStore } from './runtime';
import onDomReady from '../utils/on-dom-ready';

const HOST_ID = 'p2026-polling-visibility-interactive';
const NAMESPACE = 'p2026/polling-visibility';
const callbacks = new Set();

interactivityStore( NAMESPACE, {
	actions: {
		handleVisibilityChange: () => {
			if ( document.visibilityState !== 'visible' ) {
				return;
			}

			callbacks.forEach( ( callback ) => {
				try {
					callback();
				} catch {
					// Ignore callback failures so one poller doesn't break others.
				}
			} );
		},
	},
} );

function mountHost() {
	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	const host = document.createElement( 'div' );
	host.id = HOST_ID;
	host.hidden = true;
	host.setAttribute( 'data-wp-interactive', NAMESPACE );
	host.setAttribute(
		'data-wp-on-document--visibilitychange',
		'actions.handleVisibilityChange'
	);
	document.body.appendChild( host );
}

function ensureHost() {
	if ( document.getElementById( HOST_ID ) ) {
		return;
	}

	if ( document.body ) {
		mountHost();
		return;
	}

	onDomReady( mountHost );
}

/**
 * Register a callback for visibility restore events.
 *
 * @param {Function} callback Callback to run when visibility becomes visible.
 * @return {Function} Cleanup function.
 */
export function registerPollingVisibilityCallback( callback ) {
	ensureHost();
	callbacks.add( callback );

	return () => {
		callbacks.delete( callback );
	};
}
