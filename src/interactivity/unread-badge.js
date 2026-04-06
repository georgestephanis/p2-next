/**
 * Interactivity: unread badge visibility sync.
 */
import { dispatchStore, interactivityStore } from './runtime';

interactivityStore( 'p2026/unread-badge', {
	actions: {
		handleVisibilityChange: () => {
			if ( document.visibilityState === 'hidden' ) {
				dispatchStore()?.syncReadState();
			}
		},
	},
} );
