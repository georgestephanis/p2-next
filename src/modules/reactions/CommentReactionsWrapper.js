/**
 * CommentReactionsWrapper — mounts ReactionUI on a comment element.
 *
 * Used by Comment component to display reactions on comments.
 */
import { useState, useEffect } from '@wordpress/element';
import { useReactions } from './hooks';
import ReactionUI from './ReactionUI';

export default function CommentReactionsWrapper( { commentId } ) {
	const { reactions, userReaction, loading, error, toggleReaction } =
		useReactions( commentId, 'comment' );
	const [ readyToRender, setReadyToRender ] = useState( false );

	// Delay render to ensure DOM is stable.
	useEffect( () => {
		const timer = setTimeout( () => setReadyToRender( true ), 100 );
		return () => clearTimeout( timer );
	}, [] );

	if ( ! readyToRender ) {
		return null;
	}

	const config = window.p2026Config?.reactionsConfig || {
		mode: 'single',
		emoji: [ '👍' ],
	};

	return (
		<ReactionUI
			objectId={ commentId }
			objectType="comment"
			reactions={ reactions }
			userReaction={ userReaction }
			isLoading={ loading }
			error={ error }
			canReact={ !! window.p2026Config?.canComment }
			onToggleReaction={ toggleReaction }
			availableEmoji={ config.emoji }
		/>
	);
}
