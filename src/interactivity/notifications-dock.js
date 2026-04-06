/**
 * Interactivity: notifications dock open/close actions.
 */
import { store } from '@wordpress/interactivity';
import { dispatch, select } from '@wordpress/data';
import { STORE_NAME } from '../store';

store( 'p2026/notifications-dock', {
	actions: {
		toggleOpen: () => {
			const isOpen = select( STORE_NAME ).isNotificationDockOpen();
			const nextOpen = ! isOpen;

			dispatch( STORE_NAME ).setNotificationDockOpen( nextOpen );
			if ( nextOpen ) {
				// Keep existing behavior: refresh notifications when opening.
				dispatch( STORE_NAME ).fetchNotifications();
			}
		},

		close: () => {
			dispatch( STORE_NAME ).setNotificationDockOpen( false );
		},

		markAllRead: () => {
			dispatch( STORE_NAME ).markAllAsRead();
		},
	},
} );
