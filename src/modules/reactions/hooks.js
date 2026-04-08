/**
 * useReactions hook — manage reactions state for posts/comments.
 * Now integrated with @wordpress/data store for global state management
 * and cross-module integration.
 */
import { useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { STORE_NAME } from '../../store';

/**
 * Hook to manage reactions for a given post or comment.
 *
 * @param {number} objectId   - Post or comment ID.
 * @param {string} objectType - 'post' or 'comment'.
 * @return {Object} reactions state and actions.
 */
export const useReactions = ( objectId, objectType = 'post' ) => {
	const { addReaction, removeReaction, fetchReactionsForObject } = useDispatch(
		STORE_NAME
	);

	const { reactions, userReaction } = useSelect( ( select ) => {
		const reactionsData = select( STORE_NAME ).getReactionsForObject(
			objectType,
			objectId
		);
		const userId = select( STORE_NAME ).getReadState()?.userId;
		const userReact = select( STORE_NAME ).getUserReactionForObject(
			objectType,
			objectId,
			userId
		);

		return {
			reactions: reactionsData,
			userReaction: userReact,
		};
	}, [ objectId, objectType ] );

	// Fetch reactions for this object.
	const fetchReactions = useCallback( async () => {
		await fetchReactionsForObject( objectType, objectId );
	}, [ objectId, objectType, fetchReactionsForObject ] );

	// Add a reaction.
	const handleAddReaction = useCallback(
		async ( emoji ) => {
			try {
				await addReaction( objectType, objectId, emoji );
				return true;
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to add reaction:', err );
				throw err;
			}
		},
		[ objectId, objectType, addReaction ]
	);

	// Remove a reaction.
	const handleRemoveReaction = useCallback(
		async ( emoji ) => {
			try {
				await removeReaction( objectType, objectId, emoji );
				return true;
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to remove reaction:', err );
				throw err;
			}
		},
		[ objectId, objectType, removeReaction ]
	);

	// Toggle reaction (add if not present, remove if present).
	const toggleReaction = useCallback(
		async ( emoji ) => {
			if ( userReaction === emoji ) {
				return handleRemoveReaction( emoji );
			}
			return handleAddReaction( emoji );
		},
		[ userReaction, handleAddReaction, handleRemoveReaction ]
	);

	return {
		reactions,
		userReaction,
		loading: false,
		error: null,
		addReaction: handleAddReaction,
		removeReaction: handleRemoveReaction,
		toggleReaction,
		refetch: fetchReactions,
	};
};
