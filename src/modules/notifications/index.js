/**
 * P2026 module: Notifications
 *
 * Mounts the notification dock component on the frontend.
 */
import { createRoot } from '@wordpress/element';
import NotificationDock from './NotificationDock';

function mountNotificationDock() {
	const dockContainer = document.createElement( 'div' );
	dockContainer.id = 'p2026-notification-dock-root';
	document.body.appendChild( dockContainer );

	const root = createRoot( dockContainer );
	root.render( <NotificationDock /> );
}

// Mount the notification dock immediately if DOM is ready, or wait for DOMContentLoaded.
// The deferred frontend script may load after DOMContentLoaded has already fired.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mountNotificationDock );
} else {
	mountNotificationDock();
}
