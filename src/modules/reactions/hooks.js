/**
 * useReactions hook — manage reactions state for posts/comments.
 * Now integrated with @wordpress/data store for global state management
 * and cross-module integration.
 */
import { useCallback, useEffect, useState } from '@wordpress/element';
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
	const [ optimisticState, setOptimisticState ] = useState( null );

	const { reactions, userReaction } = useSelect( ( select ) => {
		const reactionsData = select( STORE_NAME ).getReactionsForObject(
			objectType,
			objectId
		);
		const userId = window.p2026Config?.currentUser?.id ?? null;
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

	const effectiveReactions = optimisticState?.reactions ?? reactions;
	const effectiveUserReaction =
		null !== optimisticState?.userReaction &&
		undefined !== optimisticState?.userReaction
			? optimisticState.userReaction
			: userReaction;

	// Fetch reactions for this object.
	const fetchReactions = useCallback( async () => {
		await fetchReactionsForObject( objectType, objectId );
	}, [ objectId, objectType, fetchReactionsForObject ] );

	useEffect( () => {
		if ( objectId ) {
			fetchReactions();
		}
	}, [ objectId, objectType, fetchReactions ] );

	// Add a reaction.
	const handleAddReaction = useCallback(
		async ( emoji ) => {
			const currentUser = window.p2026Config?.currentUser ?? null;
			const nextReactions = {
				...effectiveReactions,
			};

			const existing = nextReactions[ emoji ] || {
				emoji,
				count: 0,
				users: [],
			};

			const nextUsers = Array.isArray( existing.users )
				? [ ...existing.users ]
				: [];

			if (
				currentUser?.id &&
				! nextUsers.some(
					( user ) =>
						Number( user?.id ) === Number( currentUser.id )
				)
			) {
				nextUsers.push( {
					id: currentUser.id,
					name: currentUser.name,
					url: '',
				} );
			}

			nextReactions[ emoji ] = {
				...existing,
				count: ( Number( existing.count ) || 0 ) + 1,
				users: nextUsers,
			};

			setOptimisticState( {
				reactions: nextReactions,
				userReaction: emoji,
			} );

			try {
				await addReaction( objectType, objectId, emoji );
				setOptimisticState( null );
				return true;
			} catch ( err ) {
				setOptimisticState( null );
				await fetchReactionsForObject( objectType, objectId );
				// eslint-disable-next-line no-console
				console.error( 'Failed to add reaction:', err );
				throw err;
			}
		},
		[
			objectId,
			objectType,
			addReaction,
			fetchReactionsForObject,
			effectiveReactions,
		]
	);

	// Remove a reaction.
	const handleRemoveReaction = useCallback(
		async ( emoji ) => {
			const currentUser = window.p2026Config?.currentUser ?? null;
			const nextReactions = {
				...effectiveReactions,
			};
			const existing = nextReactions[ emoji ];

			if ( existing ) {
				const nextUsers = Array.isArray( existing.users )
					? existing.users.filter(
							( user ) =>
								Number( user?.id ) !==
								Number( currentUser?.id )
					  )
					: [];

				const nextCount = Math.max(
					0,
					( Number( existing.count ) || 0 ) - 1
				);

				if ( nextCount > 0 ) {
					nextReactions[ emoji ] = {
						...existing,
						count: nextCount,
						users: nextUsers,
					};
				} else {
					delete nextReactions[ emoji ];
				}
			}

			setOptimisticState( {
				reactions: nextReactions,
				userReaction: null,
			} );

			try {
				await removeReaction( objectType, objectId, emoji );
				setOptimisticState( null );
				return true;
			} catch ( err ) {
				setOptimisticState( null );
				await fetchReactionsForObject( objectType, objectId );
				// eslint-disable-next-line no-console
				console.error( 'Failed to remove reaction:', err );
				throw err;
			}
		},
		[
			objectId,
			objectType,
			removeReaction,
			fetchReactionsForObject,
			effectiveReactions,
		]
	);

	// Toggle reaction (add if not present, remove if present).
	const toggleReaction = useCallback(
		async ( emoji ) => {
			if ( effectiveUserReaction === emoji ) {
				return handleRemoveReaction( emoji );
			}
			return handleAddReaction( emoji );
		},
		[
			effectiveUserReaction,
			handleAddReaction,
			handleRemoveReaction,
		]
	);

	return {
		reactions: effectiveReactions,
		userReaction: effectiveUserReaction,
		loading: false,
		error: null,
		addReaction: handleAddReaction,
		removeReaction: handleRemoveReaction,
		toggleReaction,
		refetch: fetchReactions,
	};
};
