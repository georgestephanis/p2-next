/**
 * NotificationDock — persistent notifications panel.
 *
 * Displays a sticky dock in the bottom-right corner with an unread count badge
 * that expands to show recent notifications when clicked.
 */
import { useEffect, useState, useRef } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button, Spinner, Dashicon } from '@wordpress/components';
import { sprintf, _n, __ } from '@wordpress/i18n';
import { STORE_NAME } from '../../store';
import NotificationItem from './NotificationItem';
import { startPolling } from '../../api';
import './interactivity-dock';
import './_notification-dock.scss';

export default function NotificationDock() {
	const [ isLoading, setIsLoading ] = useState( false );
	const stopPollingRef = useRef( null );

	const { fetchNotifications } = useDispatch( STORE_NAME );
	const notifications = useSelect( ( select ) =>
		select( STORE_NAME ).getNotifications()
	);
	const unreadCount = useSelect( ( select ) =>
		select( STORE_NAME ).getUnreadNotificationCount()
	);
	const isOpen = useSelect( ( select ) =>
		select( STORE_NAME ).isNotificationDockOpen()
	);

	// Fetch notifications on mount and start polling.
	useEffect( () => {
		setIsLoading( true );
		fetchNotifications().finally( () => setIsLoading( false ) );

		// Poll for new notifications every 10-15 seconds when visible.
		const pollFn = async () => {
			await fetchNotifications();
		};

		const stopPolling = startPolling( pollFn, 10, {
			minBackoffMultiplier: 1,
			maxBackoffMultiplier: 3,
			backoffFactor: 2,
		} );

		stopPollingRef.current = stopPolling;

		return () => {
			if ( stopPollingRef.current ) {
				stopPollingRef.current();
			}
		};
	}, [ fetchNotifications ] );

	return (
		<div
			className="p2026-notification-dock-wrapper"
			data-wp-interactive="p2026/notifications-dock"
		>
			{ /* Badge button in corner */ }
			<Button
				className="p2026-notification-dock-badge"
				data-wp-on--click="actions.toggleOpen"
				aria-label={ sprintf(
					/* translators: %d: number of unread notifications */
					_n(
						'%d unread notification',
						'%d unread notifications',
						unreadCount,
						'p2026'
					),
					unreadCount
				) }
				aria-expanded={ isOpen }
			>
				<Dashicon icon="bell" />
				{ unreadCount > 0 && (
					<span className="p2026-notification-count">
						{ unreadCount > 99 ? '99+' : unreadCount }
					</span>
				) }
			</Button>

			{ /* Dock panel */ }
			{ isOpen && (
				<div className="p2026-notification-dock-panel">
					<div className="p2026-notification-dock-header">
						<h2>{ __( 'Notifications', 'p2026' ) }</h2>
						<Button
							data-wp-on--click="actions.close"
							icon="no"
							label={ __( 'Close', 'p2026' ) }
							isSmall
						/>
					</div>

					{ ! isLoading && notifications.length === 0 && (
						<div className="p2026-notification-dock-empty">
							<p>{ __( 'No notifications yet.', 'p2026' ) }</p>
						</div>
					) }

					{ isLoading && ! notifications.length && (
						<div className="p2026-notification-dock-loading">
							<Spinner />
						</div>
					) }

					{ ! isLoading && notifications.length > 0 && (
						<>
							<div className="p2026-notification-dock-actions">
								{ unreadCount > 0 && (
									<Button
										isSmall
										isSecondary
										data-wp-on--click="actions.markAllRead"
									>
										{ __( 'Mark all as read', 'p2026' ) }
									</Button>
								) }
							</div>
							<ul className="p2026-notification-dock-list">
								{ notifications.map( ( notification ) => (
									<li key={ notification.meta_key }>
										<NotificationItem
											notification={ notification }
										/>
									</li>
								) ) }
							</ul>
						</>
					) }
				</div>
			) }
		</div>
	);
}
