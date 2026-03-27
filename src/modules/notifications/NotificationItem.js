/**
 * NotificationItem — single notification renderer.
 *
 * Displays a notification with avatar, message, and date.
 * Click to navigate to the source post/comment and mark as read.
 */
import { useCallback } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../../store';
import './_notification-item.scss';

export default function NotificationItem( { notification } ) {
	const { markNotificationAsRead } = useDispatch( STORE_NAME );

	const handleClick = useCallback( () => {
		markNotificationAsRead( notification.meta_key );

		// Navigate to source.
		if ( notification.comment_id ) {
			window.location.href = `?p=${ notification.post_id }#comment-${ notification.comment_id }`;
		} else {
			window.location.href = `?p=${ notification.post_id }`;
		}
	}, [ notification, markNotificationAsRead ] );

	// Format notification message based on type.
	let message = '';
	switch ( notification.type ) {
		case 'mention':
			message = __( 'Mentioned you', 'p2026' );
			break;
		case 'reply':
			message = __( 'Replied to your post', 'p2026' );
			break;
		default:
			message = __( 'Notification', 'p2026' );
	}

	return (
		<button
			className={ `p2026-notification-item ${
				! notification.unread ? 'read' : ''
			}` }
			onClick={ handleClick }
		>
			<div className="p2026-notification-item-avatar">
				{ /* Placeholder avatar — future: fetch user data */ }
				<div className="p2026-notification-placeholder-avatar">
					{ String( notification.from_user ).charAt( 0 ) }
				</div>
			</div>
			<div className="p2026-notification-item-content">
				<p className="p2026-notification-item-message">{ message }</p>
				<small className="p2026-notification-item-date">
					{ new Date( notification.created_at ).toLocaleString() }
				</small>
			</div>
			{ notification.unread && (
				<div className="p2026-notification-item-unread-dot" />
			) }
		</button>
	);
}
