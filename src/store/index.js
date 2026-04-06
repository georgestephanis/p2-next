/**
 * P2026 — @wordpress/data store.
 *
 * Manages posts, comments, and UI state for the live feed and editors.
 */
import { createReduxStore, register } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';

export const STORE_NAME = 'p2026';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const DEFAULT_STATE = {
	posts: [],
	comments: {}, // { [postId]: Comment[] }
	lastFetched: null, // ISO string — used as `?after=` for polling
	pendingCount: 0, // new posts received but not yet shown
	pendingPosts: [], // buffer of polled posts awaiting reveal
	readState: {
		lastActivity: null, // ISO string — user's last activity timestamp
		unreadCount: 0, // count of posts created after lastActivity
	},
	notifications: [], // array of notification objects
	unreadNotificationCount: 0, // count of unread notifications
	ui: {
		expandedPosts: [], // post IDs whose comment thread is visible
		editingPost: null, // post ID currently being edited inline
		savingPost: null, // post ID being saved, 'new' for new-post, null when idle
		savingComment: false,
		newPostModalOpen: false,
		notificationDockOpen: false,
		postStateFilter: 'all',
	},
};

// ---------------------------------------------------------------------------
// Action creators
// ---------------------------------------------------------------------------
export const actions = {
	fetchPostsSuccess( posts, replace = false ) {
		return { type: 'FETCH_POSTS_SUCCESS', posts, replace };
	},
	pollPostsSuccess( posts ) {
		return { type: 'POLL_POSTS_SUCCESS', posts };
	},
	revealPendingPosts() {
		return { type: 'REVEAL_PENDING_POSTS' };
	},
	createPostSuccess( post ) {
		return { type: 'CREATE_POST_SUCCESS', post };
	},
	updatePostSuccess( post ) {
		return { type: 'UPDATE_POST_SUCCESS', post };
	},
	fetchCommentsSuccess( postId, comments ) {
		return { type: 'FETCH_COMMENTS_SUCCESS', postId, comments };
	},
	createCommentSuccess( postId, comment ) {
		return { type: 'CREATE_COMMENT_SUCCESS', postId, comment };
	},
	expandPost( postId ) {
		return { type: 'EXPAND_POST', postId };
	},
	collapsePost( postId ) {
		return { type: 'COLLAPSE_POST', postId };
	},
	setEditingPost( postId ) {
		return { type: 'SET_EDITING_POST', postId };
	},
	setSavingPost( context ) {
		return { type: 'SET_SAVING_POST', context };
	},
	setSavingComment( saving ) {
		return { type: 'SET_SAVING_COMMENT', saving };
	},
	openNewPostModal() {
		return { type: 'OPEN_NEW_POST_MODAL' };
	},
	closeNewPostModal() {
		return { type: 'CLOSE_NEW_POST_MODAL' };
	},
	setNotificationDockOpen( open ) {
		return { type: 'SET_NOTIFICATION_DOCK_OPEN', open: !! open };
	},

	setPostStateFilter( filter ) {
		return { type: 'SET_POST_STATE_FILTER', filter };
	},

	updatePostStateSuccess( postId, p2026State ) {
		return { type: 'UPDATE_POST_STATE_SUCCESS', postId, p2026State };
	},

	setReadState( readState ) {
		return { type: 'SET_READ_STATE', readState };
	},

	setUnreadCount( count ) {
		return { type: 'SET_UNREAD_COUNT', count };
	},

	setNotifications( notifications, unreadCount ) {
		return { type: 'SET_NOTIFICATIONS', notifications, unreadCount };
	},

	setUnreadNotificationCount( count ) {
		return { type: 'SET_UNREAD_NOTIFICATION_COUNT', count };
	},

	// Async thunks -------------------------------------------------------

	fetchPosts( { perPage = 20, seedOnly = false, since = null } = {} ) {
		return async ( { dispatch } ) => {
			// seedOnly: just record lastFetched from the page's existing content
			// so polling only picks up posts newer than what's already visible.
			if ( seedOnly ) {
				dispatch( {
					type: 'SET_LAST_FETCHED',
					timestamp: since ?? new Date().toISOString(),
				} );
				return;
			}
			const posts = await apiFetch( {
				path: `/wp/v2/posts?_embed&per_page=${ perPage }&orderby=date&order=desc`,
			} );
			dispatch( actions.fetchPostsSuccess( posts, true ) );
			dispatch( {
				type: 'SET_LAST_FETCHED',
				timestamp: new Date().toISOString(),
			} );
		};
	},

	pollForNewPosts() {
		return async ( { select, dispatch } ) => {
			const lastFetched = select.getLastFetched();
			if ( ! lastFetched ) {
				return;
			}
			const posts = await apiFetch( {
				path: `/wp/v2/posts?_embed&after=${ encodeURIComponent(
					lastFetched
				) }&orderby=date&order=desc`,
			} );
			if ( posts.length ) {
				dispatch( actions.pollPostsSuccess( posts ) );
			}
			dispatch( {
				type: 'SET_LAST_FETCHED',
				timestamp: new Date().toISOString(),
			} );
		};
	},

	createPost( { blocks, title = '' } ) {
		return async ( { dispatch } ) => {
			const { serialize } = await import( '@wordpress/blocks' );
			dispatch( actions.setSavingPost( 'new' ) );
			try {
				const post = await apiFetch( {
					path: '/wp/v2/posts',
					method: 'POST',
					data: {
						title,
						content: serialize( blocks ),
						status: 'publish',
					},
				} );
				// Re-fetch the post with _embed to get author/featured image.
				const full = await apiFetch( {
					path: `/wp/v2/posts/${ post.id }?_embed`,
				} );
				dispatch( actions.createPostSuccess( full ) );
			} finally {
				dispatch( actions.setSavingPost( null ) );
			}
		};
	},

	updatePost( postId, { blocks, title } ) {
		return async ( { dispatch } ) => {
			dispatch( actions.setSavingPost( postId ) );
			try {
				const { serialize } = await import( '@wordpress/blocks' );
				const data = { content: serialize( blocks ) };
				if ( title !== undefined ) {
					data.title = title;
				}
				await apiFetch( {
					path: `/wp/v2/posts/${ postId }`,
					method: 'POST',
					data,
				} );
				const full = await apiFetch( {
					path: `/wp/v2/posts/${ postId }?_embed`,
				} );
				dispatch( actions.updatePostSuccess( full ) );
				dispatch( actions.setEditingPost( null ) );
			} finally {
				dispatch( actions.setSavingPost( null ) );
			}
		};
	},

	fetchComments( postId ) {
		return async ( { dispatch } ) => {
			const comments = await apiFetch( {
				path: `/wp/v2/comments?post=${ postId }&per_page=100&orderby=date&order=asc`,
			} );
			dispatch( actions.fetchCommentsSuccess( postId, comments ) );
		};
	},

	createComment( { postId, parentId = 0, content, authorData = {} } ) {
		return async ( { dispatch } ) => {
			dispatch( actions.setSavingComment( true ) );
			try {
				const comment = await apiFetch( {
					path: '/wp/v2/comments',
					method: 'POST',
					data: {
						post: postId,
						parent: parentId,
						content,
						...authorData,
					},
				} );
				dispatch( actions.createCommentSuccess( postId, comment ) );
			} finally {
				dispatch( actions.setSavingComment( false ) );
			}
		};
	},

	fetchReadState() {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: '/p2026/v1/read-state',
				} );
				dispatch(
					actions.setReadState( {
						lastActivity: response.lastActivity,
						unreadCount: response.unreadCount,
					} )
				);
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to fetch read state:', error );
			}
		};
	},

	syncReadState() {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: '/p2026/v1/read-state/sync',
					method: 'POST',
				} );
				dispatch( actions.setUnreadCount( response.unreadCount ) );
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to sync read state:', error );
			}
		};
	},

	fetchNotifications() {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: '/p2026/v1/notifications?limit=20',
				} );
				dispatch(
					actions.setNotifications(
						response.notifications,
						response.unreadCount
					)
				);
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to fetch notifications:', error );
			}
		};
	},

	markNotificationAsRead( metaKey ) {
		return async ( { dispatch } ) => {
			try {
				const id = metaKey.replace( 'p2026_notification_', '' );
				const response = await apiFetch( {
					path: `/p2026/v1/notifications/${ id }/read`,
					method: 'POST',
				} );
				dispatch(
					actions.setUnreadNotificationCount( response.unreadCount )
				);
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to mark notification as read:', error );
			}
		};
	},

	markAllAsRead() {
		return async ( { dispatch } ) => {
			try {
				await apiFetch( {
					path: '/p2026/v1/notifications/read-all',
					method: 'POST',
				} );
				dispatch( actions.setUnreadNotificationCount( 0 ) );
				dispatch( actions.fetchNotifications() );
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to mark all as read:', error );
			}
		};
	},

	cyclePostState( postId ) {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: `/p2026/v1/posts/${ postId }/state`,
					method: 'POST',
					data: {
						source: 'menu',
					},
				} );
				dispatch(
					actions.updatePostStateSuccess(
						postId,
						response.p2026State
					)
				);
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to cycle post state:', error );
			}
		};
	},

	setPostState( postId, targetState ) {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: `/p2026/v1/posts/${ postId }/state`,
					method: 'POST',
					data: {
						state: targetState,
						source: 'menu',
					},
				} );
				dispatch(
					actions.updatePostStateSuccess(
						postId,
						response.p2026State
					)
				);
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Failed to set post state:', error );
			}
		};
	},
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function reducer( state = DEFAULT_STATE, action ) {
	switch ( action.type ) {
		case 'FETCH_POSTS_SUCCESS':
			return {
				...state,
				posts: action.replace
					? action.posts
					: mergeByIdPrepend( state.posts, action.posts ),
			};

		case 'POLL_POSTS_SUCCESS': {
			// Dedup against existing posts before buffering.
			const existingIds = new Set( state.posts.map( ( p ) => p.id ) );
			const fresh = action.posts.filter(
				( p ) => ! existingIds.has( p.id )
			);
			if ( ! fresh.length ) {
				return state;
			}
			return {
				...state,
				pendingPosts: [ ...fresh, ...state.pendingPosts ],
				pendingCount: state.pendingCount + fresh.length,
			};
		}

		case 'REVEAL_PENDING_POSTS':
			return {
				...state,
				posts: [ ...state.pendingPosts, ...state.posts ],
				pendingPosts: [],
				pendingCount: 0,
			};

		case 'CREATE_POST_SUCCESS':
			return {
				...state,
				posts: [ action.post, ...state.posts ],
			};

		case 'UPDATE_POST_SUCCESS':
			return {
				...state,
				posts: state.posts.map( ( p ) =>
					p.id === action.post.id ? action.post : p
				),
			};

		case 'FETCH_COMMENTS_SUCCESS':
			return {
				...state,
				comments: {
					...state.comments,
					[ action.postId ]: action.comments,
				},
			};

		case 'CREATE_COMMENT_SUCCESS': {
			const existing = state.comments[ action.postId ] ?? [];
			return {
				...state,
				comments: {
					...state.comments,
					[ action.postId ]: [ ...existing, action.comment ],
				},
			};
		}

		case 'SET_LAST_FETCHED':
			return { ...state, lastFetched: action.timestamp };

		case 'EXPAND_POST':
			return {
				...state,
				ui: {
					...state.ui,
					expandedPosts: state.ui.expandedPosts.includes(
						action.postId
					)
						? state.ui.expandedPosts
						: [ ...state.ui.expandedPosts, action.postId ],
				},
			};

		case 'COLLAPSE_POST':
			return {
				...state,
				ui: {
					...state.ui,
					expandedPosts: state.ui.expandedPosts.filter(
						( id ) => id !== action.postId
					),
				},
			};

		case 'SET_EDITING_POST':
			return {
				...state,
				ui: { ...state.ui, editingPost: action.postId },
			};

		case 'SET_SAVING_POST':
			return {
				...state,
				ui: { ...state.ui, savingPost: action.context },
			};

		case 'SET_SAVING_COMMENT':
			return {
				...state,
				ui: { ...state.ui, savingComment: action.saving },
			};

		case 'OPEN_NEW_POST_MODAL':
			return {
				...state,
				ui: { ...state.ui, newPostModalOpen: true },
			};

		case 'CLOSE_NEW_POST_MODAL':
			return {
				...state,
				ui: { ...state.ui, newPostModalOpen: false },
			};

		case 'SET_NOTIFICATION_DOCK_OPEN':
			return {
				...state,
				ui: { ...state.ui, notificationDockOpen: action.open },
			};

		case 'SET_POST_STATE_FILTER':
			return {
				...state,
				ui: {
					...state.ui,
					postStateFilter:
						action.filter === 'unresolved' ? 'unresolved' : 'all',
				},
			};

		case 'UPDATE_POST_STATE_SUCCESS':
			return {
				...state,
				posts: state.posts.map( ( post ) =>
					post.id === action.postId
						? { ...post, p2026State: action.p2026State }
						: post
				),
			};

		case 'SET_READ_STATE':
			return {
				...state,
				readState: action.readState,
			};

		case 'SET_UNREAD_COUNT':
			return {
				...state,
				readState: {
					...state.readState,
					unreadCount: action.count,
				},
			};

		case 'SET_NOTIFICATIONS':
			return {
				...state,
				notifications: action.notifications,
				unreadNotificationCount: action.unreadCount,
			};

		case 'SET_UNREAD_NOTIFICATION_COUNT':
			return {
				...state,
				unreadNotificationCount: action.count,
			};

		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectors = {
	getPosts: ( state ) => state.posts,
	getPostById: ( state, postId ) =>
		state.posts.find( ( post ) => post.id === postId ) ?? null,
	getVisiblePosts: ( state ) => {
		if ( state.ui.postStateFilter !== 'unresolved' ) {
			return state.posts;
		}

		return state.posts.filter(
			( post ) => post.p2026State?.slug === 'unresolved'
		);
	},
	getComments: ( state, postId ) => state.comments[ postId ] ?? [],
	getLastFetched: ( state ) => state.lastFetched,
	getPendingCount: ( state ) => state.pendingCount,
	getPendingPosts: ( state ) => state.pendingPosts,
	getExpandedPosts: ( state ) => state.ui.expandedPosts,
	isPostExpanded: ( state, postId ) =>
		state.ui.expandedPosts.includes( postId ),
	getEditingPost: ( state ) => state.ui.editingPost,
	isSavingPost: ( state, context ) => state.ui.savingPost === context,
	isSavingComment: ( state ) => state.ui.savingComment,
	isNewPostModalOpen: ( state ) => state.ui.newPostModalOpen,
	isNotificationDockOpen: ( state ) => state.ui.notificationDockOpen,
	getPostStateFilter: ( state ) => state.ui.postStateFilter,
	getPostCommentCount: ( state, postId ) =>
		state.posts.find( ( p ) => p.id === postId )?.comment_count ?? 0,
	getReadState: ( state ) => state.readState,
	getUnreadCount: ( state ) => state.readState?.unreadCount ?? 0,
	getNotifications: ( state ) => state.notifications,
	getUnreadNotificationCount: ( state ) => state.unreadNotificationCount,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mergeByIdPrepend( existing, incoming ) {
	const ids = new Set( existing.map( ( p ) => p.id ) );
	return [ ...incoming.filter( ( p ) => ! ids.has( p.id ) ), ...existing ];
}

// ---------------------------------------------------------------------------
// Register store
// ---------------------------------------------------------------------------
// Both view.js and frontend.js bundle their own copy of this module. To prevent
// double-registration (which causes @wordpress/data to recurse in select()),
// we share the single registered store instance via window. The first bundle
// to load creates and registers it; subsequent bundles reuse that instance
// without calling createReduxStore or register a second time.
const WINDOW_KEY = '__p2026Store';

const store =
	window[ WINDOW_KEY ] ??
	( () => {
		const s = createReduxStore( STORE_NAME, {
			reducer,
			actions,
			selectors,
		} );
		register( s );
		window[ WINDOW_KEY ] = s;
		return s;
	} )();

export default store;
