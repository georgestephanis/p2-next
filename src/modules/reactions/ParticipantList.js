/**
 * ParticipantList — popover showing users who reacted with an emoji.
 */
import { useState, useEffect, useRef } from '@wordpress/element';
import './_participant-list.scss';

export default function ParticipantList( {
	emoji,
	participants = [],
	isVisible = false,
	onClose = () => {},
} ) {
	const [ position, setPosition ] = useState( { top: 0, left: 0 } );
	const popoverRef = useRef( null );
	const triggerRef = useRef( null );

	useEffect( () => {
		if ( ! isVisible || ! triggerRef.current || ! popoverRef.current ) {
			return;
		}

		// Position popover above the reaction button.
		const triggerRect = triggerRef.current.getBoundingClientRect();
		const popoverRect = popoverRef.current.getBoundingClientRect();

		setPosition( {
			top: triggerRect.top - popoverRect.height - 8,
			left:
				triggerRect.left +
				triggerRect.width / 2 -
				popoverRect.width / 2,
		} );

		// Close on escape key.
		const handleEscape = ( e ) => {
			if ( e.key === 'Escape' ) {
				onClose();
			}
		};

		const handleClickOutside = ( e ) => {
			if (
				popoverRef.current &&
				! popoverRef.current.contains( e.target ) &&
				triggerRef.current &&
				! triggerRef.current.contains( e.target )
			) {
				onClose();
			}
		};

		document.addEventListener( 'keydown', handleEscape );
		document.addEventListener( 'click', handleClickOutside );

		return () => {
			document.removeEventListener( 'keydown', handleEscape );
			document.removeEventListener( 'click', handleClickOutside );
		};
	}, [ isVisible, onClose ] );

	if ( ! isVisible || participants.length === 0 ) {
		return null;
	}

	return (
		<div
			ref={ popoverRef }
			className="p2026-participant-list"
			role="dialog"
			aria-label={ `Users who reacted with ${ emoji }` }
			style={ {
				position: 'fixed',
				top: `${ position.top }px`,
				left: `${ position.left }px`,
				zIndex: 100,
			} }
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
							{ user.display_name || user.slug || 'Anonymous' }
						</span>
					</li>
				) ) }
			</ul>
		</div>
	);
}
