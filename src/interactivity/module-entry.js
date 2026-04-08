/**
 * Script-module entrypoint for p2026 interactivity implementations.
 *
 * Per WordPress script-modules limitations, modules cannot depend on script
 * handles like wp-data/wp-api-fetch. These implementations use window.wp.*
 * globals for script interoperability.
 */
import { store, withSyncEvent } from '@wordpress/interactivity';
import onDomReady from '../utils/on-dom-ready';

function flushQueuedCalls( api ) {
	const queue = Array.isArray( window.__p2026InteractivityQueue )
		? window.__p2026InteractivityQueue
		: [];

	window.__p2026InteractivityQueue = [];
	queue.forEach( ( item ) => {
		const method = item?.method;
		const args = Array.isArray( item?.args ) ? item.args : [];
		if ( method && typeof api[ method ] === 'function' ) {
			api[ method ]( ...args );
		}
	} );
}

async function bootstrap() {
	window.wp = window.wp || {};
	window.wp.interactivity = window.wp.interactivity || {
		store,
		withSyncEvent,
	};

	const [
		adminBarModule,
		postMenuModule,
		linkPreviewsModule,
		mentionsHoverModule,
		pollingVisibilityModule,
		reactionsModule,
	] = await Promise.all( [
		import( /* webpackChunkName: "admin-bar" */ './admin-bar' ),
		import( /* webpackChunkName: "post-menu" */ './post-menu' ),
		import( /* webpackChunkName: "link-previews" */ './link-previews' ),
		import( /* webpackChunkName: "mentions-hover" */ './mentions-hover' ),
		import(
			/* webpackChunkName: "polling-visibility" */ './polling-visibility'
		),
		import( /* webpackChunkName: "reactions" */ './reactions' ),
		import( /* webpackChunkName: "sidebar-shell" */ './sidebar-shell' ),
		import( /* webpackChunkName: "new-post-modal" */ './new-post-modal' ),
		import( /* webpackChunkName: "unread-badge" */ './unread-badge' ),
		import(
			/* webpackChunkName: "notifications-dock" */ './notifications-dock'
		),
	] );

	const api = {
		initAdminBarInteractivity: adminBarModule.initAdminBarInteractivity,
		initPostMenuInteractivity: postMenuModule.initPostMenuInteractivity,
		initLinkPreviewInteractivity:
			linkPreviewsModule.initLinkPreviewInteractivity,
		initMentionsHoverInteractivity:
			mentionsHoverModule.initMentionsHoverInteractivity,
		initReactionsInteractivity: reactionsModule.initReactionsInteractivity,
		registerPollingVisibilityCallback:
			pollingVisibilityModule.registerPollingVisibilityCallback,
	};

	window.__p2026InteractivityApi = api;
	flushQueuedCalls( api );

	onDomReady( () => {
		api.initAdminBarInteractivity();
		api.initPostMenuInteractivity();
	} );
}

bootstrap().catch( () => {
	// Avoid blocking other frontend behavior if module bootstrap fails.
} );
