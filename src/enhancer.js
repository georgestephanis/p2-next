/**
 * P2026 — per-post React root mount.
 *
 * Each post gets a PostEnhancement React root mounted immediately. That
 * component owns the full post menu (three-dots trigger in the top-right
 * corner), comment expansion, and inline editing. All UI is React; there is
 * no longer a separate plain-DOM layer.
 *
 * The slot div is appended to the post element and is normally zero-height
 * because the menu is position:absolute. Comment threads and the editor
 * render in normal flow inside the slot when active.
 */
import { createRoot, createElement } from '@wordpress/element';
import PostEnhancement from './components/PostEnhancement';

/**
 * Mount a PostEnhancement React root into a post element.
 *
 * Ensures the post element is a positioned ancestor so the absolutely-placed
 * menu trigger sits in the top-right corner of the card. Returns a cleanup
 * function that unmounts the root.
 *
 * @param {number}      postId      WordPress post ID.
 * @param {HTMLElement} postElement The post's outermost element.
 * @return {Function} Cleanup / unmount function.
 */
export function setupPostToolbar( postId, postElement ) {
	// The menu is position:absolute, so the post element needs to be a
	// positioning context. Promote it only if it is still static.
	if ( window.getComputedStyle( postElement ).position === 'static' ) {
		postElement.style.position = 'relative';
	}

	const slot = document.createElement( 'div' );
	slot.className = 'p2026-post-react';
	postElement.appendChild( slot );

	const root = createRoot( slot );
	root.render( createElement( PostEnhancement, { postId, postElement } ) );

	return () => root.unmount();
}

/**
 * No-op — retained for API compatibility with frontend.js.
 *
 * The IntersectionObserver / lazy-activation pattern is no longer needed
 * now that React is mounted per-post up front.
 *
 * @return {Function} No-op disconnect function.
 */
export function observePosts() {
	return () => {};
}
