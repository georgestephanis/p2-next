/**
 * Classic-script bridge to module-loaded interactivity implementations.
 *
 * Frontend bundles call these functions. The actual implementations are
 * provided by the script-module entrypoint and exposed on window.
 */

function getApi() {
	return window.__p2026InteractivityApi || null;
}

function queueCall( method, args = [] ) {
	window.__p2026InteractivityQueue = window.__p2026InteractivityQueue || [];
	window.__p2026InteractivityQueue.push( { method, args } );
}

function callOrQueue( method, args = [] ) {
	const api = getApi();
	if ( api && typeof api[ method ] === 'function' ) {
		api[ method ]( ...args );
		return true;
	}

	queueCall( method, args );
	return false;
}

export function initAdminBarInteractivity() {
	callOrQueue( 'initAdminBarInteractivity' );
}

export function initPostMenuInteractivity() {
	callOrQueue( 'initPostMenuInteractivity' );
}

export function initLinkPreviewInteractivity( nextHandlers = {} ) {
	callOrQueue( 'initLinkPreviewInteractivity', [ nextHandlers ] );
}

export function initMentionsHoverInteractivity( nextHandlers = {} ) {
	callOrQueue( 'initMentionsHoverInteractivity', [ nextHandlers ] );
}

export function registerPollingVisibilityCallback( callback ) {
	const api = getApi();
	if ( api && typeof api.registerPollingVisibilityCallback === 'function' ) {
		return api.registerPollingVisibilityCallback( callback );
	}

	// Fallback keeps behavior sane if script modules are unavailable.
	const handleVisibilityChange = () => {
		if ( document.visibilityState !== 'visible' ) {
			return;
		}

		try {
			callback();
		} catch {
			// Ignore callback failures so one poller doesn't break others.
		}
	};

	document.addEventListener( 'visibilitychange', handleVisibilityChange );

	return () => {
		document.removeEventListener(
			'visibilitychange',
			handleVisibilityChange
		);
	};
}

export function initReactionsInteractivity() {
	callOrQueue( 'initReactionsInteractivity' );
}
