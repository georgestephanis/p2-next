/**
 * Interactivity runtime helpers used by script-module implementations.
 */

const STORE_NAME = 'p2026';

export function getInteractivityApi() {
	return window.wp?.interactivity ?? null;
}

export function interactivityStore( namespace, definition ) {
	const api = getInteractivityApi();
	if ( ! api?.store ) {
		return null;
	}

	return api.store( namespace, definition );
}

export function interactivityWithSyncEvent( handler ) {
	const api = getInteractivityApi();
	if ( ! api?.withSyncEvent ) {
		return handler;
	}

	return api.withSyncEvent( handler );
}

export function dispatchStore() {
	return window.wp?.data?.dispatch?.( STORE_NAME ) ?? null;
}

export function selectStore() {
	return window.wp?.data?.select?.( STORE_NAME ) ?? null;
}
