/**
 * P2 Next — plain-DOM post toolbar and on-demand React root management.
 *
 * Each post gets a `.p2-next-post-enhancement` div appended once at setup
 * time. It contains plain HTML buttons and a React slot. When the user
 * interacts, a React root is created in the slot and PostEnhancement renders
 * there. Only one post is ever React-active at a time; the root is torn down
 * and recreated when the user moves to a different post or the active post
 * scrolls out of view.
 */
import { createRoot, createElement } from '@wordpress/element';
import { dispatch } from '@wordpress/data';
import { STORE_NAME } from './store';
import PostEnhancement from './components/PostEnhancement';

// ---------------------------------------------------------------------------
// Module-level state — one active root at a time.
// ---------------------------------------------------------------------------
let activeRoot = null;
let activeEnhancementEl = null;

// ---------------------------------------------------------------------------
// React root lifecycle
// ---------------------------------------------------------------------------

/**
 * Mount PostEnhancement into the given enhancement element.
 * Tears down any previously active root first.
 */
function activatePost( postId, enhancementEl ) {
	if ( activeRoot ) {
		activeRoot.unmount();
		activeRoot = null;
	}

	// Hide the plain action buttons while React is in control.
	const actionsEl = enhancementEl.querySelector( '.p2-next-post-actions' );
	if ( actionsEl ) {
		actionsEl.hidden = true;
	}

	const slot = enhancementEl.querySelector( '.p2-next-post-react' );
	activeEnhancementEl = enhancementEl;
	activeRoot = createRoot( slot );
	activeRoot.render(
		createElement( PostEnhancement, {
			postId,
			onDeactivate: () => deactivatePost( enhancementEl ),
		} )
	);
}

/**
 * Tear down the active React root and restore the plain toolbar.
 */
function deactivatePost( enhancementEl ) {
	if ( activeRoot ) {
		activeRoot.unmount();
		activeRoot = null;
	}
	activeEnhancementEl = null;

	const actionsEl = enhancementEl?.querySelector( '.p2-next-post-actions' );
	if ( actionsEl ) {
		actionsEl.hidden = false;
	}
}

// ---------------------------------------------------------------------------
// Plain DOM toolbar
// ---------------------------------------------------------------------------

function getCommentCount( postElement ) {
	const link = postElement.querySelector(
		'.comments-link, a[href*="#comments"]'
	);
	const match = link?.textContent?.match( /\d+/ );
	return match ? parseInt( match[ 0 ], 10 ) : 0;
}

function makeButton( className, label ) {
	const btn = document.createElement( 'button' );
	btn.type = 'button';
	btn.className = className;
	btn.textContent = label;
	return btn;
}

/**
 * Append a toolbar to a post element and wire up event listeners.
 * Safe to call for both theme-rendered and dynamically injected posts.
 */
export function setupPostToolbar( postId, postElement ) {
	// eslint-disable-next-line no-console
	console.log( '[p2-next] setupPostToolbar', { postId, postElement } );

	const currentUser = window.p2NextConfig?.currentUser;
	const canEdit =
		currentUser &&
		( currentUser.canUpdatePosts || currentUser.canPublish );

	// eslint-disable-next-line no-console
	console.log( '[p2-next] toolbar config', {
		postId,
		currentUser,
		canEdit,
		p2NextConfig: window.p2NextConfig,
	} );

	const enhancement = document.createElement( 'div' );
	enhancement.className = 'p2-next-post-enhancement';

	// Plain action buttons — visible when React is not active.
	const actions = document.createElement( 'div' );
	actions.className = 'p2-next-post-actions';

	const commentCount = getCommentCount( postElement );
	const commentLabel =
		commentCount === 1 ? '1 comment' : `${ commentCount } comments`;

	// eslint-disable-next-line no-console
	console.log( '[p2-next] comment count for post', postId, ':', commentCount );

	const commentsBtn = makeButton( 'p2-next-comments-toggle', commentLabel );
	commentsBtn.addEventListener( 'click', () => {
		dispatch( STORE_NAME ).expandPost( postId );
		dispatch( STORE_NAME ).fetchComments( postId );
		activatePost( postId, enhancement );
	} );
	actions.appendChild( commentsBtn );

	if ( canEdit ) {
		const editBtn = makeButton( 'p2-next-edit-btn', 'Edit' );
		editBtn.addEventListener( 'click', () => {
			dispatch( STORE_NAME ).setEditingPost( postId );
			activatePost( postId, enhancement );
		} );
		actions.appendChild( editBtn );
	}

	enhancement.appendChild( actions );

	// Empty slot where the React root renders when active.
	const slot = document.createElement( 'div' );
	slot.className = 'p2-next-post-react';
	enhancement.appendChild( slot );

	postElement.appendChild( enhancement );

	// eslint-disable-next-line no-console
	console.log( '[p2-next] toolbar appended for post', postId, enhancement );

	return enhancement;
}

// ---------------------------------------------------------------------------
// IntersectionObserver — deactivate when active post leaves the viewport.
// ---------------------------------------------------------------------------

/**
 * Observe all post elements. When the currently-active post scrolls fully
 * out of view, the React root is torn down and the plain toolbar restored.
 *
 * Returns a cleanup function that disconnects the observer.
 */
export function observePosts( postElements ) {
	if ( ! ( 'IntersectionObserver' in window ) ) {
		return () => {};
	}

	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if (
					! entry.isIntersecting &&
					activeEnhancementEl &&
					entry.target.contains( activeEnhancementEl )
				) {
					deactivatePost( activeEnhancementEl );
				}
			} );
		},
		{ threshold: 0 }
	);

	postElements.forEach( ( { element } ) => observer.observe( element ) );

	return () => observer.disconnect();
}
