/**
 * ParticipantList — popover showing users who reacted with an emoji.
 */
import { useEffect, useRef } from '@wordpress/element';
import { Popover } from '@wordpress/components';
import './_participant-list.scss';

export default function ParticipantList( {
	emoji,
	participants = [],
	isVisible = false,
	onClose = () => {},
	anchorEl = null,
} ) {
	const popoverRef = useRef( null );

	useEffect( () => {
		if ( ! isVisible ) {
			return;
		}

		// Close on escape key.
		const handleEscape = ( e ) => {
			if ( e.key === 'Escape' ) {
				onClose();
			}
		};

		document.addEventListener( 'keydown', handleEscape );

		return () => {
			document.removeEventListener( 'keydown', handleEscape );
		};
	}, [ isVisible, onClose ] );

	if ( ! isVisible || participants.length === 0 ) {
		return null;
	}

	return (
		<Popover
			className="p2026-participant-list"
			anchor={ anchorEl }
			focusOnMount={ false }
			noArrow={ false }
			onClose={ onClose }
		>
			<div
				ref={ popoverRef }
				role="dialog"
				aria-label={ `Users who reacted with ${ emoji }` }
			>
				<div className="p2026-participant-list-header">
					<span className="p2026-participant-emoji">{ emoji }</span>
					<span className="p2026-participant-count">
						{ participants.length }
					</span>
				</div>
				<ul className="p2026-participant-list-items">
					{ participants.map( ( user ) => (
						<li key={ user.id } className="p2026-participant-item">
							<span className="p2026-participant-name">
								{ user.name || 'Anonymous' }
							</span>
						</li>
					) ) }
				</ul>
			</div>
		</Popover>
	);
}
