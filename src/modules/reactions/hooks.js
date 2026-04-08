/**
 * useReactions hook — manage reactions state for posts/comments.
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
export const useReactions = (
	objectId,
	objectType = 'post'
) => {
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

	// Toggle reaction (add if not present, remove if present).
	const toggleReaction = useCallback(
		async ( emoji ) => {
			if ( userReaction === emoji ) {
				return removeReaction( emoji );
			}
			return addReaction( emoji );
		},
		[ userReaction, addReaction, removeReaction ]
	);

	return {
		reactions,
		userReaction,
		loading,
		error,
		addReaction,
		removeReaction,
		toggleReaction,
		refetch: fetchReactions,
	};
};
