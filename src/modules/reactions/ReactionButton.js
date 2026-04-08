/**
 * ReactionButton — single emoji reaction button with count.
 */
import { useState, useCallback } from '@wordpress/element';
import { Button } from '@wordpress/components';

export default function ReactionButton( {
	emoji,
	count = 0,
	isActive = false,
	onToggle = () => {},
	onShowParticipants = () => {},
} ) {
	const [ isLoading, setIsLoading ] = useState( false );

	const handleClick = useCallback( async () => {
		setIsLoading( true );
		try {
			await onToggle( emoji );
		} finally {
			setIsLoading( false );
		}
	}, [ emoji, onToggle ] );

	const buttonClasses = [ 'p2026-reaction-button', isActive && 'is-active' ]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div
			className="p2026-reaction-button-wrapper"
			onMouseEnter={ () => count > 0 && onShowParticipants( emoji ) }
		>
			<Button
				className={ buttonClasses }
				onClick={ handleClick }
				disabled={ isLoading }
				aria-pressed={ isActive }
				aria-label={ `${ emoji } ${ count }` }
			>
				<span className="p2026-reaction-emoji">{ emoji }</span>
				{ count > 0 && (
					<span className="p2026-reaction-count">{ count }</span>
				) }
			</Button>
		</div>
	);
}
