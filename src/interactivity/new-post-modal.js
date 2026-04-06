/**
 * Interactivity: New Post modal keyboard handling.
 */
import { store, withSyncEvent } from '@wordpress/interactivity';
import { dispatch } from '@wordpress/data';
import { STORE_NAME } from '../store';

store( 'p2026/new-post-modal', {
	actions: {
		handleDocumentKeydown: ( event ) => {
			if ( event.key === 'Escape' ) {
				dispatch( STORE_NAME ).closeNewPostModal();
			}
		},
		handleOverlayClick: withSyncEvent( ( event ) => {
			if ( event.target === event.currentTarget ) {
				dispatch( STORE_NAME ).closeNewPostModal();
			}
		} ),
	},
} );
