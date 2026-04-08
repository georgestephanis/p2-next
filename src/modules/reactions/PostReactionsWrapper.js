/**
 * PostReactionsWrapper — mounts ReactionUI on a post element.
 *
 * Used by PostEnhancement to display reactions on posts.
 */
import { useState } from '@wordpress/element';
import { useReactions } from './hooks';
import ReactionUI from './ReactionUI';

export default function PostReactionsWrapper( { postId } ) {
	const { reactions, userReaction, loading, error, toggleReaction } =
		useReactions( postId, 'post' );
	const [ readyToRender, setReadyToRender ] = useState( false );

	// Delay render to ensure DOM is stable.
	useState( () => {
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
			objectId={ postId }
			objectType="post"
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
