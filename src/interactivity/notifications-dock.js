/**
 * Interactivity: notifications dock open/close actions.
 */
import { dispatchStore, interactivityStore, selectStore } from './runtime';

interactivityStore( 'p2026/notifications-dock', {
	actions: {
		toggleOpen: () => {
			const isOpen = selectStore()?.isNotificationDockOpen() ?? false;
			const nextOpen = ! isOpen;

			dispatchStore()?.setNotificationDockOpen( nextOpen );
			if ( nextOpen ) {
				// Keep existing behavior: refresh notifications when opening.
				dispatchStore()?.fetchNotifications();
			}
		},

		close: () => {
			dispatchStore()?.setNotificationDockOpen( false );
		},

		markAllRead: () => {
			dispatchStore()?.markAllAsRead();
		},
	},
} );
