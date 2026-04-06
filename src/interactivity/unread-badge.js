/**
 * Interactivity: unread badge visibility sync.
 */
import { store } from '@wordpress/interactivity';
import { dispatch } from '@wordpress/data';
import { STORE_NAME } from '../store';

store( 'p2026/unread-badge', {
	actions: {
		handleVisibilityChange: () => {
			if ( document.visibilityState === 'hidden' ) {
				dispatch( STORE_NAME ).syncReadState();
			}
		},
	},
} );
