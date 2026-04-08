/**
 * ReactionPicker — emoji picker for adding new reactions.
 */
import { useCallback } from '@wordpress/element';
import './_reaction-picker.scss';

export default function ReactionPicker( {
	availableEmoji = [ '👍' ],
	onSelect = () => {},
} ) {
	const handleEmojiSelect = useCallback(
		( emoji ) => {
			onSelect( emoji );
		},
		[ onSelect ]
	);

	return (
		<div className="p2026-reaction-picker">
			<div className="p2026-reaction-picker-grid">
				{ availableEmoji.map( ( emoji ) => (
					<button
						type="button"
						key={ emoji }
						className="p2026-reaction-picker-item"
						onClick={ () =>
							handleEmojiSelect( emoji )
						}
						aria-label={ emoji }
						title={ emoji }
					>
						{ emoji }
					</button>
				) ) }
			</div>
		</div>
	);
}
