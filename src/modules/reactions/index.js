/**
 * P2026 Reactions Module
 *
 * Frontend reactions UI, REST API integration, and state management.
 */

import { useCallback, useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Hook to manage reactions for a given post or comment.
 *
 * @param {number} objectId   - Post or comment ID.
 * @param {string} objectType - 'post' or 'comment'.
 * @return {Object} reactions state and actions.
 */
export const useReactions = ( objectId, objectType = 'post' ) => {
	const [ reactions, setReactions ] = useState( {} );
	const [ userReaction, setUserReaction ] = useState( null );
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	// Fetch reactions for this object.
	const fetchReactions = useCallback( async () => {
		setLoading( true );
		setError( null );
		try {
			const data = await apiFetch( {
				path: `/p2026/v1/reactions?object_id=${ objectId }&object_type=${ objectType }`,
			} );
			setReactions( data );
		} catch ( err ) {
			setError( err );
		} finally {
			setLoading( false );
		}
	}, [ objectId, objectType ] );

	// Initial fetch.
	useEffect( () => {
		if ( objectId ) {
			fetchReactions();
		}
	}, [ objectId, objectType, fetchReactions ] );

	// Add a reaction.
	const addReaction = useCallback(
		async ( emoji ) => {
			try {
				const result = await apiFetch( {
					method: 'POST',
					path: '/p2026/v1/reactions',
					data: {
						object_id: objectId,
						object_type: objectType,
						emoji,
					},
				} );

				// Optimistically update local state.
				if ( ! reactions[ emoji ] ) {
					reactions[ emoji ] = {
						emoji,
						count: 0,
						users: [],
					};
				}
				reactions[ emoji ].count++;
				setUserReaction( emoji );
				setReactions( { ...reactions } );

				// Re-fetch to ensure consistency.
				await fetchReactions();
				return result;
			} catch ( err ) {
				setError( err );
				throw err;
			}
		},
		[ objectId, objectType, reactions, fetchReactions ]
	);

	// Remove a reaction.
	const removeReaction = useCallback(
		async ( emoji ) => {
			try {
				const result = await apiFetch( {
					method: 'DELETE',
					path: `/p2026/v1/reactions?object_id=${ objectId }&object_type=${ objectType }&emoji=${ encodeURIComponent(
						emoji
					) }`,
				} );

				// Optimistically update local state.
				if ( reactions[ emoji ] ) {
					reactions[ emoji ].count--;
					if ( reactions[ emoji ].count <= 0 ) {
						delete reactions[ emoji ];
					}
				}
				setUserReaction( null );
				setReactions( { ...reactions } );

				// Re-fetch to ensure consistency.
				await fetchReactions();
				return result;
			} catch ( err ) {
				setError( err );
				throw err;
			}
		},
		[ objectId, objectType, reactions, fetchReactions ]
	);

	return {
		reactions,
		userReaction,
		loading,
		error,
		addReaction,
		removeReaction,
		refetch: fetchReactions,
	};
};

/**
 * Reactions UI Component (to be implemented).
 *
 * This is a placeholder for the React component that renders reaction buttons,
 * counts, and participant lists. Implementation should:
 *
 * - Display available emoji based on config mode.
 * - Show aggregate counts per emoji.
 * - Handle click to add/remove reaction.
 * - Display participant list on hover/focus.
 * - Debounce rapid clicks.
 * - Integrate with post/comment enhancement portals.
 *
 * TODO: Implement ReactionUI component.
 */

/**
 * Initialize reactions module.
 *
 * This function will be called by the main frontend module bootstrap
 * to set up reaction UI on discovered post and comment elements.
 */
export const initReactionsModule = () => {
	// TODO: Discover post and comment elements and mount ReactionUI components.
};
