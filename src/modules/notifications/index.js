/**
 * P2026 module: Notifications
 *
 * Mounts the notification dock component on the frontend.
 */
import { createRoot } from '@wordpress/element';
import onDomReady from '../../utils/on-dom-ready';
import NotificationDock from './NotificationDock';

function mountNotificationDock() {
	const dockContainer = document.createElement( 'div' );
	dockContainer.id = 'p2026-notification-dock-root';
	document.body.appendChild( dockContainer );

	const root = createRoot( dockContainer );
	root.render( <NotificationDock /> );
}

onDomReady( mountNotificationDock );
