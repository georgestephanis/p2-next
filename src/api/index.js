/**
 * P2 Next — API bootstrap.
 *
 * Configures @wordpress/api-fetch middleware using the runtime config injected
 * by p2-next.php. Import this module once (from a view.js entry point) before
 * making any apiFetch calls.
 */
import apiFetch from '@wordpress/api-fetch';

let initialised = false;

export function initApiFetch() {
	if ( initialised ) {
		return;
	}
	initialised = true;

	const { nonce, restUrl } = window.p2NextConfig ?? {};

	if ( restUrl ) {
		apiFetch.use( apiFetch.createRootURLMiddleware( restUrl ) );
	}
	if ( nonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
	}
}

/**
 * Start polling for new posts on a fixed interval.
 *
 * @param {Function} pollFn       Thunk dispatch call (e.g. dispatch( actions.pollForNewPosts() ))
 * @param {number}   intervalSecs Polling cadence in seconds.
 * @return {Function} Cleanup function — call to stop polling.
 */
export function startPolling( pollFn, intervalSecs = 15 ) {
	// Poll immediately on visibility restore.
	const onVisible = () => {
		if ( document.visibilityState === 'visible' ) {
			pollFn();
		}
	};
	document.addEventListener( 'visibilitychange', onVisible );

	const id = setInterval( pollFn, intervalSecs * 1000 );

	return () => {
		clearInterval( id );
		document.removeEventListener( 'visibilitychange', onVisible );
	};
}
