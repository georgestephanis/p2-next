/**
 * P2 Next — plain-DOM post menu and on-demand React root management.
 *
 * Each post gets a three-dots trigger button and dropdown menu appended
 * at setup time (plain DOM, no React). The menu offers Edit, Delete, and
 * Copy link. Clicking Edit mounts a PostEnhancement React root into a hidden
 * slot inside the post; the visible editor is portaled into the content area
 * by PostEnhancement itself. Only one post can be React-active at a time.
 *
 * An IntersectionObserver deactivates the React root when the active post
 * scrolls fully out of view.
 */
import { createRoot, createElement } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import PostEnhancement from './components/PostEnhancement';

// ---------------------------------------------------------------------------
// Module-level state — one active root at a time.
// ---------------------------------------------------------------------------
let activeRoot = null;
let activePostElement = null;

// Module-level IntersectionObserver, created by observePosts().
let _observer = null;

// ---------------------------------------------------------------------------
// React root lifecycle
// ---------------------------------------------------------------------------

function activatePost( postId, slot, postElement ) {
	if ( activeRoot ) {
		activeRoot.unmount();
		activeRoot = null;
	}
	activePostElement = postElement;
	activeRoot = createRoot( slot );
	activeRoot.render(
		createElement( PostEnhancement, {
			postId,
			postElement,
			onDeactivate: deactivatePost,
		} )
	);
}

function deactivatePost() {
	if ( activeRoot ) {
		activeRoot.unmount();
		activeRoot = null;
	}
	activePostElement = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPermalink( postElement ) {
	return (
		postElement.querySelector( '.wp-block-post-title a, a[rel="bookmark"]' )
			?.href ?? ''
	);
}

function makeMenuItem( label, onClick ) {
	const li = document.createElement( 'li' );
	li.setAttribute( 'role', 'none' );
	const btn = document.createElement( 'button' );
	btn.type = 'button';
	btn.className = 'p2-next-menu-item';
	btn.setAttribute( 'role', 'menuitem' );
	btn.textContent = label;
	btn.addEventListener( 'click', onClick );
	li.appendChild( btn );
	return { li, btn };
}

// ---------------------------------------------------------------------------
// Plain DOM toolbar
// ---------------------------------------------------------------------------

/**
 * Append a three-dots menu to a post element.
 * Only visible controls the current user can actually use are rendered.
 * Also registers the post element with the IntersectionObserver if active.
 */
export function setupPostToolbar( postId, postElement ) {
	// Hidden slot — React root mounts here; visible output is portaled elsewhere.
	const slot = document.createElement( 'div' );
	slot.className = 'p2-next-post-react';
	postElement.appendChild( slot );

	// Register with the observer (safe to call before observePosts()).
	_observer?.observe( postElement );

	const currentUser = window.p2NextConfig?.currentUser;
	const canEdit =
		currentUser &&
		( currentUser.canUpdatePosts || currentUser.canPublish );

	// Nothing to show if the user has no actions available.
	if ( ! canEdit ) {
		return;
	}

	// -----------------------------------------------------------------------
	// Menu wrapper + trigger button
	// -----------------------------------------------------------------------
	const wrap = document.createElement( 'div' );
	wrap.className = 'p2-next-menu-wrap';

	const trigger = document.createElement( 'button' );
	trigger.type = 'button';
	trigger.className = 'p2-next-menu-trigger';
	trigger.setAttribute( 'aria-label', 'Post actions' );
	trigger.setAttribute( 'aria-expanded', 'false' );
	trigger.setAttribute( 'aria-haspopup', 'menu' );
	// Three middle dots — visually compact, semantically clear.
	trigger.innerHTML = '<span aria-hidden="true">&middot;&middot;&middot;</span>';
	wrap.appendChild( trigger );

	// -----------------------------------------------------------------------
	// Dropdown menu
	// -----------------------------------------------------------------------
	const dropdown = document.createElement( 'ul' );
	dropdown.className = 'p2-next-menu-dropdown';
	dropdown.hidden = true;
	dropdown.setAttribute( 'role', 'menu' );

	let outsideClickHandler = null;

	function openMenu() {
		dropdown.hidden = false;
		trigger.setAttribute( 'aria-expanded', 'true' );
		outsideClickHandler = ( e ) => {
			if ( ! wrap.contains( e.target ) ) {
				closeMenu();
			}
		};
		// Defer so the current click doesn't immediately close the menu.
		setTimeout( () =>
			document.addEventListener( 'click', outsideClickHandler )
		);
	}

	function closeMenu() {
		dropdown.hidden = true;
		trigger.setAttribute( 'aria-expanded', 'false' );
		if ( outsideClickHandler ) {
			document.removeEventListener( 'click', outsideClickHandler );
			outsideClickHandler = null;
		}
	}

	trigger.addEventListener( 'click', ( e ) => {
		e.stopPropagation();
		dropdown.hidden ? openMenu() : closeMenu();
	} );

	// Edit
	const { li: editLi } = makeMenuItem( 'Edit', () => {
		closeMenu();
		activatePost( postId, slot, postElement );
	} );
	dropdown.appendChild( editLi );

	// Copy link
	const { li: copyLi, btn: copyBtn } = makeMenuItem( 'Copy link', async () => {
		closeMenu();
		const url = getPermalink( postElement );
		if ( ! url ) {
			return;
		}
		try {
			await navigator.clipboard.writeText( url );
		} catch {
			// Fallback for browsers without clipboard API.
			const input = Object.assign( document.createElement( 'input' ), {
				value: url,
				style: 'position:fixed;opacity:0',
			} );
			document.body.appendChild( input );
			input.select();
			// eslint-disable-next-line no-undef
			document.execCommand( 'copy' );
			input.remove();
		}
		copyBtn.textContent = 'Copied!';
		setTimeout( () => {
			copyBtn.textContent = 'Copy link';
		}, 2000 );
	} );
	dropdown.appendChild( copyLi );

	// Delete (destructive — styled separately)
	const { li: deleteLi } = makeMenuItem( 'Delete', async () => {
		closeMenu();
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( 'Move this post to the trash?' ) ) {
			return;
		}
		try {
			await apiFetch( {
				path: `/wp/v2/posts/${ postId }`,
				method: 'DELETE',
			} );
			postElement.remove();
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[p2-next] Delete failed', err );
		}
	} );
	deleteLi.querySelector( 'button' ).classList.add( 'is-destructive' );
	dropdown.appendChild( deleteLi );

	wrap.appendChild( dropdown );
	postElement.appendChild( wrap );
}

// ---------------------------------------------------------------------------
// IntersectionObserver
// ---------------------------------------------------------------------------

/**
 * Begin observing a set of post elements. When the currently-active post
 * scrolls fully out of view the React root is torn down.
 *
 * Must be called before setupPostToolbar so the observer exists when
 * individual toolbars register themselves. Returns a disconnect function.
 */
export function observePosts( postElements ) {
	if ( ! ( 'IntersectionObserver' in window ) ) {
		return () => {};
	}

	_observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if (
					! entry.isIntersecting &&
					entry.target === activePostElement
				) {
					deactivatePost();
				}
			} );
		},
		{ threshold: 0 }
	);

	postElements.forEach( ( { element } ) => _observer.observe( element ) );

	return () => {
		_observer.disconnect();
		_observer = null;
	};
}
