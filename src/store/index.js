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
	ui: {
		expandedPosts: [], // post IDs whose comment thread is visible
		editingPost: null, // post ID currently being edited inline
		savingPost: null, // post ID being saved, 'new' for new-post, null when idle
		savingComment: false,
		newPostModalOpen: false,
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

		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectors = {
	getPosts: ( state ) => state.posts,
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
	getPostCommentCount: ( state, postId ) =>
		state.posts.find( ( p ) => p.id === postId )?.comment_count ?? 0,
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
