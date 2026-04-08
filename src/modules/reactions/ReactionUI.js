/**
 * ReactionUI — main reactions container for posts and comments.
 *
 * Displays all reactions grouped by emoji with counts, and a button to add a new reaction.
 * Integrates with the Interactivity API store for state management.
 */
import { useState, useCallback, useEffect, useRef } from '@wordpress/element';
import { Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ReactionButton from './ReactionButton';
import ReactionPicker from './ReactionPicker';
import ParticipantList from './ParticipantList';
import './_reaction-ui.scss';

export default function ReactionUI( {
	objectId,
	objectType = 'post',
	reactions = {},
	userReaction = null,
	isLoading = false,
	error = null,
	canReact = true,
	onToggleReaction = () => {},
	availableEmoji = [ '👍' ],
} ) {
	const [ showPicker, setShowPicker ] = useState( false );
	const [ visibleParticipantEmoji, setVisibleParticipantEmoji ] =
		useState( null );
	const [ displayReactions, setDisplayReactions ] = useState( {} );
	const containerRef = useRef( null );
	const pickerButtonRef = useRef( null );
	const pickerPopoverRef = useRef( null );
	const reactionButtonRefs = useRef( {} );

	// Sync external reactions to local display state.
	useEffect( () => {
		setDisplayReactions( reactions );
	}, [ reactions ] );

	const handleTogglePicker = useCallback( () => {
		setShowPicker( ( isOpen ) => ! isOpen );
	}, [] );

	const handleClosePicker = useCallback( () => {
		setShowPicker( false );
	}, [] );

	const handleAddReaction = useCallback(
		( emoji ) => {
			onToggleReaction( emoji );
			handleClosePicker();
		},
		[ onToggleReaction, handleClosePicker ]
	);

	const handleToggleReaction = useCallback(
		( emoji ) => {
			onToggleReaction( emoji );
		},
		[ onToggleReaction ]
	);

	useEffect( () => {
		if ( ! showPicker ) {
			return undefined;
		}

		const handlePointerDown = ( event ) => {
			const target = event.target;
			if (
				pickerButtonRef.current?.contains( target ) ||
				pickerPopoverRef.current?.contains( target )
			) {
				return;
			}

			handleClosePicker();
		};

		document.addEventListener( 'pointerdown', handlePointerDown, true );

		return () => {
			document.removeEventListener(
				'pointerdown',
				handlePointerDown,
				true
			);
		};
	}, [ showPicker, handleClosePicker ] );

	if ( ! canReact ) {
		return null;
	}

	return (
		<div
			ref={ containerRef }
			className="p2026-reaction-ui"
			data-object-id={ objectId }
			data-object-type={ objectType }
		>
			<div className="p2026-reactions-container">
				{ Object.entries( displayReactions ).map(
					( [ emoji, reactionData ] ) => (
						<div
							key={ emoji }
							className="p2026-reaction-wrapper"
							ref={ ( el ) => {
								reactionButtonRefs.current[ emoji ] = el;
							} }
						>
							<ReactionButton
								emoji={ emoji }
								count={ reactionData.count || 0 }
								isActive={ userReaction === emoji }
								onToggle={ handleToggleReaction }
								onShowParticipants={
									setVisibleParticipantEmoji
								}
							/>
							{ visibleParticipantEmoji === emoji && (
								<ParticipantList
									emoji={ emoji }
									participants={ reactionData.users || [] }
									isVisible={
										visibleParticipantEmoji === emoji
									}
									anchorEl={
										reactionButtonRefs.current[ emoji ]
									}
									onClose={ () =>
										setVisibleParticipantEmoji( null )
									}
								/>
							) }
						</div>
					)
				) }

				{ canReact && (
					<div className="p2026-reaction-picker-wrapper">
						<button
							type="button"
							ref={ pickerButtonRef }
							className="p2026-add-reaction-button"
							onClick={ handleTogglePicker }
							disabled={ isLoading }
							aria-label={ __( 'Add reaction', 'p2026' ) }
							aria-pressed={ showPicker }
							aria-expanded={ showPicker }
						>
							+
						</button>

						{ showPicker && (
							<Popover
								className="p2026-reaction-picker-popover"
								anchor={ pickerButtonRef.current }
								focusOnMount={ false }
								noArrow={ false }
								onClose={ handleClosePicker }
							>
								<div ref={ pickerPopoverRef }>
									<ReactionPicker
										availableEmoji={ availableEmoji }
										onSelect={ handleAddReaction }
									/>
								</div>
							</Popover>
						) }
					</div>
				) }
			</div>

			{ error && (
				<div className="p2026-reaction-error">
					{ __( 'Error managing reactions.', 'p2026' ) }
				</div>
			) }
		</div>
	);
}
