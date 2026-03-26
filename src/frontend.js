/**
 * P2026 — frontend enhancement entry point.
 *
 * Progressively enhances any post list on the page — whether rendered by the
 * Query Loop block, a classic theme loop, or anything else — with:
 *
 *   • Live polling for new posts (banner-based reveal, no auto-scroll)
 *   • Inline threaded comment expansion per post
 *   • Inline post editing via the Block Editor
 *
 * No custom block is needed for the feed; the theme owns post display.
 */
import { createRoot, createElement } from '@wordpress/element';
import { dispatch } from '@wordpress/data';
import { registerCoreBlocks } from '@wordpress/block-library';
import { setDefaultBlockName } from '@wordpress/blocks';
import '@wordpress/format-library';
import { initApiFetch } from './api';
import { STORE_NAME } from './store';
import { setupPostToolbar, observePosts } from './enhancer';
import FeedEnhancer from './components/FeedEnhancer';
import NewPostModal from './components/NewPostModal';
import './styles.scss';
import './modules';

// Register core block types so parse() and PostEditor work on the frontend.
// Guard against double-registration when view.js is also on the page.
if ( ! window.__p2026BlocksRegistered ) {
	window.__p2026BlocksRegistered = true;
	registerCoreBlocks();
	setDefaultBlockName( 'core/paragraph' );
}

initApiFetch();

/**
 * Find the best container to anchor the feed enhancer to.
 *
 * Supports:
 *   - FSE Query Loop:  <ul class="wp-block-post-template">
 *   - Classic loop:    <main id="main"> or <div class="site-main">
 */
function findFeedContainer() {
	return (
		document.querySelector( '.wp-block-post-template' ) ??
		document.querySelector( '#main, .site-main, [role="main"]' )
	);
}

/**
 * Collect all post elements visible in the current page's post list.
 *
 * Returns an array of { id, element } objects.
 * Handles both Query Loop `<li class="wp-block-post post-{id}">` and
 * classic theme `<article id="post-{id}">` markup.
 */
function collectPostElements() {
	const results = [];

	// Query Loop / block theme posts.
	document.querySelectorAll( '.wp-block-post' ).forEach( ( el ) => {
		const match = [ ...el.classList ].find( ( c ) =>
			/^post-\d+$/.test( c )
		);
		if ( match ) {
			results.push( {
				id: parseInt( match.replace( 'post-', '' ), 10 ),
				element: el,
			} );
		}
	} );

	// Classic theme posts (avoid double-counting any already found above).
	const foundIds = new Set( results.map( ( r ) => r.id ) );
	document.querySelectorAll( 'article[id^="post-"]' ).forEach( ( el ) => {
		const id = parseInt( el.id.replace( 'post-', '' ), 10 );
		if ( id && ! foundIds.has( id ) ) {
			results.push( { id, element: el } );
		}
	} );

	return results;
}

// Mount once the DOM is ready.
document.addEventListener( 'DOMContentLoaded', () => {
	// Always mount the modal root so the admin bar "New Post" button works
	// even on pages where no posts are present yet.
	const modalMount = document.createElement( 'div' );
	modalMount.id = 'p2026-modal-root';
	document.body.appendChild( modalMount );
	createRoot( modalMount ).render( createElement( NewPostModal ) );

	// Wire the admin bar "New Post" button if WordPress rendered one.
	// If the p2026/new-post block is already on the page, scroll to it and
	// focus the editor canvas. Otherwise, open the modal.
	const adminBarLink = document.querySelector(
		'#wp-admin-bar-p2026-new-post > a'
	);
	if ( adminBarLink ) {
		adminBarLink.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			const existing = document.querySelector( '.p2026-new-post-editor' );
			if ( existing ) {
				existing.scrollIntoView( {
					behavior: 'smooth',
					block: 'nearest',
				} );
				window.requestAnimationFrame( () => {
					const canvas = existing.querySelector(
						'[contenteditable="true"]'
					);
					( canvas ?? existing ).focus();
				} );
			} else {
				dispatch( STORE_NAME ).openNewPostModal();
			}
		} );
	}

	const feedContainer = findFeedContainer();
	const postElements = collectPostElements();

	// eslint-disable-next-line no-console
	console.log( '[p2026] DOMContentLoaded', {
		feedContainer,
		postCount: postElements.length,
		postIds: postElements.map( ( p ) => p.id ),
	} );

	if ( ! feedContainer && ! postElements.length ) {
		// eslint-disable-next-line no-console
		console.warn( '[p2026] No feed container or posts found — bailing.' );
		return; // Not a page with a post list — nothing to enhance.
	}

	// Append a plain-DOM toolbar to every post and start observing for
	// scroll-based cleanup.
	postElements.forEach( ( { id, element } ) =>
		setupPostToolbar( id, element )
	);
	observePosts( postElements );

	// Single React root for polling state and the new-posts banner.
	const mountPoint = document.createElement( 'div' );
	mountPoint.id = 'p2026-enhancer-root';
	mountPoint.style.display = 'none';
	document.body.appendChild( mountPoint );

	createRoot( mountPoint ).render(
		createElement( FeedEnhancer, { feedContainer, postElements } )
	);
} );
