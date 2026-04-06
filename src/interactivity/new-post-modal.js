/**
 * Interactivity: New Post modal keyboard handling.
 */
import {
	dispatchStore,
	interactivityStore,
	interactivityWithSyncEvent,
} from './runtime';

interactivityStore( 'p2026/new-post-modal', {
	actions: {
		handleDocumentKeydown: ( event ) => {
			if ( event.key === 'Escape' ) {
				dispatchStore()?.closeNewPostModal();
			}
		},
		handleOverlayClick: interactivityWithSyncEvent( ( event ) => {
			if ( event.target === event.currentTarget ) {
				dispatchStore()?.closeNewPostModal();
			}
		} ),
	},
} );
