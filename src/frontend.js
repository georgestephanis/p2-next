/**
 * P2 Next — frontend enhancement entry point.
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
import { registerCoreBlocks } from '@wordpress/block-library';
import { setDefaultBlockName } from '@wordpress/blocks';
import '@wordpress/format-library';
import { initApiFetch } from './api';
import FeedEnhancer from './components/FeedEnhancer';
import './styles.scss';

// Register core block types so parse() and PostEditor work on the frontend.
// Guard against double-registration when view.js is also on the page.
if ( ! window.__p2NextBlocksRegistered ) {
	window.__p2NextBlocksRegistered = true;
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
	const feedContainer = findFeedContainer();
	const postElements = collectPostElements();

	if ( ! feedContainer && ! postElements.length ) {
		return; // Not a page with a post list — nothing to enhance.
	}

	// Create a single React root outside the post list to host all portals.
	const mountPoint = document.createElement( 'div' );
	mountPoint.id = 'p2-next-enhancer-root';
	// Hidden from layout; all visible output is via portals into the real DOM.
	mountPoint.style.display = 'none';
	document.body.appendChild( mountPoint );

	createRoot( mountPoint ).render(
		createElement( FeedEnhancer, { feedContainer, postElements } )
	);
} );
