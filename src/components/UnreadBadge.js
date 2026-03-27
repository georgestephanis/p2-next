/**
 * UnreadBadge — displays count of unread posts for the current user.
 *
 * Shows a pill-shaped badge with the unread count; hidden when count is 0.
 * Clicking the badge reveals the new posts banner.
 */
import { useEffect, useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { sprintf, _n } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import './unread-badge.scss';

export default function UnreadBadge() {
	const { fetchReadState, revealPendingPosts, syncReadState } = useDispatch(
		STORE_NAME
	);
	const unreadCount = useSelect( ( select ) =>
		select( STORE_NAME ).getUnreadCount()
	);

	// Fetch read state on mount.
	useEffect( () => {
		fetchReadState();
	}, [ fetchReadState ] );

	// Sync read state when page loses focus (user switches tabs).
	useEffect( () => {
		const handleVisibilityChange = () => {
			if ( document.visibilityState === 'hidden' ) {
				syncReadState();
			}
		};

		document.addEventListener( 'visibilitychange', handleVisibilityChange );

		return () => {
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange
			);
		};
	}, [ syncReadState ] );

	const handleClick = useCallback( () => {
		revealPendingPosts();
		syncReadState();
	}, [ revealPendingPosts, syncReadState ] );

	if ( unreadCount === 0 ) {
		return null;
	}

	return (
		<Button
			className="p2026-unread-badge"
			onClick={ handleClick }
			aria-label={ sprintf(
				/* translators: %d: number of unread posts */
				_n( '%d unread post', '%d unread posts', unreadCount, 'p2026' ),
				unreadCount
			) }
		>
			{ unreadCount > 100 ? '99+' : unreadCount }
		</Button>
	);
}
