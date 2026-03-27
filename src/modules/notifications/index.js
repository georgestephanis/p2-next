/**
 * P2026 module: Notifications
 *
 * Mounts the notification dock component on the frontend.
 */
import { createRoot } from '@wordpress/element';
import NotificationDock from './NotificationDock';

// Mount the notification dock after the page loads.
document.addEventListener( 'DOMContentLoaded', () => {
	const dockContainer = document.createElement( 'div' );
	dockContainer.id = 'p2026-notification-dock-root';
	document.body.appendChild( dockContainer );

	const root = createRoot( dockContainer );
	root.render( <NotificationDock /> );
} );
